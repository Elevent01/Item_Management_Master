"""
itemmaster/workflow_routes.py
─────────────────────────────────────────────────────────────────────────────
Dynamic Approval Workflow Engine  –  All API Endpoints

ENDPOINT MAP
────────────
TEMPLATE MANAGEMENT (admin)
  POST   /workflow/templates/                        create template + steps
  GET    /workflow/templates/                        list all templates
  GET    /workflow/templates/{template_id}           get one template (with steps)
  PUT    /workflow/templates/{template_id}           update template meta
  DELETE /workflow/templates/{template_id}           soft delete (is_active=False)

STEP MANAGEMENT (admin)
  POST   /workflow/templates/{template_id}/steps/    add step to template
  PUT    /workflow/steps/{step_id}                   update step
  DELETE /workflow/steps/{step_id}                   delete step

APPROVER MANAGEMENT (admin)
  POST   /workflow/steps/{step_id}/approvers/        add approver to step
  DELETE /workflow/approvers/{approver_id}           remove approver

NOTIFICATION MANAGEMENT (admin)
  POST   /workflow/notifications/                    add notification rule
  GET    /workflow/notifications/{template_id}       list for template
  DELETE /workflow/notifications/{notif_id}          remove rule

INSTANCE (runtime)
  POST   /workflow/submit/                           submit request → create instance
  POST   /workflow/action/{instance_id}              approve / reject / return / comment
  GET    /workflow/instance/{instance_id}            full instance with timeline
  GET    /workflow/status/{entity_type}/{entity_id}  quick status of a request

INBOX (approver's queue)
  GET    /workflow/inbox/{user_id}                   all pending items for this user

REQUEST TRACKER (submitter's view)
  GET    /workflow/my-requests/{user_id}             all requests submitted by user
  GET    /workflow/timeline/{entity_type}/{entity_id} step-by-step timeline
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
import db_models as gmodels                     # Company, Role, Dept, Desg
from user import user_models as umodels         # User, UserCompanyAccess
from itemmaster.workflow_models import (
    WorkflowTemplate, WorkflowStep, WorkflowStepApprover,
    WorkflowInstance, WorkflowStepInstance, WorkflowAction,
    WorkflowNotification,
    WorkflowStatusEnum, StepStatusEnum, ActionTypeEnum, ApprovalTypeEnum,
)
from itemmaster.workflow_schemas import (
    WorkflowTemplateCreate, WorkflowTemplateUpdate, WorkflowTemplateResponse,
    WorkflowStepCreate, WorkflowStepUpdate, WorkflowStepResponse,
    StepApproverCreate, StepApproverResponse,
    WorkflowInstanceCreate, WorkflowInstanceResponse,
    WorkflowActionCreate, WorkflowActionResponse,
    NotificationCreate, NotificationResponse,
    InboxItem, RequestTimeline, TimelineStep,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _load_template(db: Session, template_id: int) -> WorkflowTemplate:
    t = (
        db.query(WorkflowTemplate)
        .options(
            joinedload(WorkflowTemplate.steps)
            .joinedload(WorkflowStep.approvers)
            .joinedload(WorkflowStepApprover.role),
            joinedload(WorkflowTemplate.steps)
            .joinedload(WorkflowStep.approvers)
            .joinedload(WorkflowStepApprover.department),
            joinedload(WorkflowTemplate.steps)
            .joinedload(WorkflowStep.approvers)
            .joinedload(WorkflowStepApprover.designation),
            joinedload(WorkflowTemplate.company),
        )
        .filter(WorkflowTemplate.id == template_id)
        .first()
    )
    if not t:
        raise HTTPException(404, "Workflow template not found")
    return t


def _load_instance(db: Session, instance_id: int) -> WorkflowInstance:
    inst = (
        db.query(WorkflowInstance)
        .options(
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.actions)
            .joinedload(WorkflowAction.performer),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_role),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_dept),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_desg),
            joinedload(WorkflowInstance.actions)
            .joinedload(WorkflowAction.performer),
            joinedload(WorkflowInstance.submitter),
        )
        .filter(WorkflowInstance.id == instance_id)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Workflow instance not found")
    return inst


def _get_user_accesses(db: Session, user_id: int):
    """Return all UserCompanyAccess rows for a user."""
    return (
        db.query(umodels.UserCompanyAccess)
        .options(
            joinedload(umodels.UserCompanyAccess.role),
            joinedload(umodels.UserCompanyAccess.department),
            joinedload(umodels.UserCompanyAccess.designation),
        )
        .filter(umodels.UserCompanyAccess.user_id == user_id)
        .all()
    )


def _user_can_approve_step(
    db: Session, user_id: int, step_id: int
) -> bool:
    """
    Returns True if the user has any UserCompanyAccess row that matches
    at least one active WorkflowStepApprover for the given step.
    NULL in an approver field = wildcard (matches anything).
    """
    approvers = (
        db.query(WorkflowStepApprover)
        .filter(
            WorkflowStepApprover.step_id == step_id,
            WorkflowStepApprover.is_active == True,
        )
        .all()
    )
    if not approvers:
        return False

    user_accesses = _get_user_accesses(db, user_id)

    for approver in approvers:
        for access in user_accesses:
            role_match  = (approver.role_id is None        or approver.role_id        == access.role_id)
            dept_match  = (approver.department_id is None  or approver.department_id  == access.department_id)
            desg_match  = (approver.designation_id is None or approver.designation_id == access.designation_id)
            co_match    = (approver.company_id is None     or approver.company_id     == access.company_id)
            if role_match and dept_match and desg_match and co_match:
                return True
    return False


def _evaluate_condition(step: WorkflowStep, entity_data: dict) -> bool:
    """
    Evaluate a step's skip condition against the entity's field values.
    Returns True if the step SHOULD be active (condition satisfied OR no condition).
    """
    if not step.condition_field:
        return True
    field_val = str(entity_data.get(step.condition_field, ""))
    cond_val  = str(step.condition_value or "")
    op        = (step.condition_op or "eq").lower()

    if op == "eq":   return field_val == cond_val
    if op == "neq":  return field_val != cond_val
    if op == "gt":
        try: return float(field_val) > float(cond_val)
        except: return False
    if op == "lt":
        try: return float(field_val) < float(cond_val)
        except: return False
    return True


def _advance_instance(db: Session, instance: WorkflowInstance):
    """
    After a step completes, find the next PENDING step and activate it.
    If no more steps, mark instance as APPROVED.
    """
    pending_steps = sorted(
        [si for si in instance.step_instances
         if si.status == StepStatusEnum.PENDING and not si.is_skipped],
        key=lambda s: s.step_order_snapshot
    )
    if pending_steps:
        next_step = pending_steps[0]
        next_step.started_at = datetime.utcnow()
        instance.current_step_id = next_step.step_id
        instance.status = WorkflowStatusEnum.IN_REVIEW

        # Set due_at from SLA
        step_def = db.query(WorkflowStep).filter(WorkflowStep.id == next_step.step_id).first()
        if step_def and step_def.sla_hours:
            next_step.due_at = datetime.utcnow() + timedelta(hours=step_def.sla_hours)
    else:
        # All steps done → APPROVED
        instance.status = WorkflowStatusEnum.APPROVED
        instance.completed_at = datetime.utcnow()
        instance.current_step_id = None


# ═══════════════════════════════════════════════════════════════════════════════
#  TEMPLATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/templates/", response_model=WorkflowTemplateResponse, status_code=201,
             summary="Create workflow template with steps and approvers")
def create_template(payload: WorkflowTemplateCreate, db: Session = Depends(get_db)):
    # Duplicate code check
    if db.query(WorkflowTemplate).filter(WorkflowTemplate.code == payload.code.upper()).first():
        raise HTTPException(400, f"Template with code '{payload.code}' already exists")

    tmpl = WorkflowTemplate(
        code=payload.code.upper(),
        name=payload.name,
        description=payload.description,
        company_id=payload.company_id,
    )
    db.add(tmpl)
    db.flush()

    for step_data in sorted(payload.steps, key=lambda s: s.step_order):
        step = WorkflowStep(
            template_id=tmpl.id,
            step_order=step_data.step_order,
            step_name=step_data.step_name,
            step_description=step_data.step_description,
            approval_type=step_data.approval_type,
            condition_field=step_data.condition_field,
            condition_value=step_data.condition_value,
            condition_op=step_data.condition_op,
            sla_hours=step_data.sla_hours,
        )
        db.add(step)
        db.flush()

        for apr in step_data.approvers:
            db.add(WorkflowStepApprover(
                step_id=step.id,
                role_id=apr.role_id,
                department_id=apr.department_id,
                designation_id=apr.designation_id,
                company_id=apr.company_id,
            ))

    db.commit()
    return _load_template(db, tmpl.id)


@router.get("/workflow/templates/", response_model=List[WorkflowTemplateResponse],
            summary="List all workflow templates")
def list_templates(
    company_id: Optional[int] = Query(None),
    is_active:  Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(WorkflowTemplate)
    if company_id is not None:
        q = q.filter(WorkflowTemplate.company_id == company_id)
    if is_active is not None:
        q = q.filter(WorkflowTemplate.is_active == is_active)
    templates = q.order_by(WorkflowTemplate.id).all()
    return [_load_template(db, t.id) for t in templates]


@router.get("/workflow/templates/{template_id}", response_model=WorkflowTemplateResponse,
            summary="Get one workflow template")
def get_template(template_id: int, db: Session = Depends(get_db)):
    return _load_template(db, template_id)


@router.put("/workflow/templates/{template_id}", response_model=WorkflowTemplateResponse,
            summary="Update workflow template")
def update_template(template_id: int, payload: WorkflowTemplateUpdate, db: Session = Depends(get_db)):
    tmpl = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template not found")
    for field in ("name", "description", "company_id", "is_active"):
        v = getattr(payload, field, None)
        if v is not None:
            setattr(tmpl, field, v)
    db.commit()
    return _load_template(db, template_id)


@router.delete("/workflow/templates/{template_id}", summary="Deactivate workflow template")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tmpl = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template not found")
    tmpl.is_active = False
    db.commit()
    return {"message": f"Template {template_id} deactivated"}


# ═══════════════════════════════════════════════════════════════════════════════
#  STEP MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/templates/{template_id}/steps/", response_model=WorkflowStepResponse,
             status_code=201, summary="Add step to template")
def add_step(template_id: int, payload: WorkflowStepCreate, db: Session = Depends(get_db)):
    tmpl = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template not found")

    step = WorkflowStep(
        template_id=template_id,
        step_order=payload.step_order,
        step_name=payload.step_name,
        step_description=payload.step_description,
        approval_type=payload.approval_type,
        condition_field=payload.condition_field,
        condition_value=payload.condition_value,
        condition_op=payload.condition_op,
        sla_hours=payload.sla_hours,
    )
    db.add(step)
    db.flush()

    for apr in payload.approvers:
        db.add(WorkflowStepApprover(
            step_id=step.id,
            role_id=apr.role_id,
            department_id=apr.department_id,
            designation_id=apr.designation_id,
            company_id=apr.company_id,
        ))
    db.commit()
    db.refresh(step)
    return step


@router.put("/workflow/steps/{step_id}", response_model=WorkflowStepResponse,
            summary="Update a workflow step")
def update_step(step_id: int, payload: WorkflowStepUpdate, db: Session = Depends(get_db)):
    step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")
    for field in ("step_order", "step_name", "step_description", "approval_type",
                  "condition_field", "condition_value", "condition_op", "sla_hours", "is_active"):
        v = getattr(payload, field, None)
        if v is not None:
            setattr(step, field, v)
    db.commit()
    db.refresh(step)
    return step


@router.delete("/workflow/steps/{step_id}", summary="Delete a workflow step")
def delete_step(step_id: int, db: Session = Depends(get_db)):
    step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")
    db.delete(step)
    db.commit()
    return {"message": f"Step {step_id} deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
#  APPROVER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/steps/{step_id}/approvers/", response_model=StepApproverResponse,
             status_code=201, summary="Add approver to step")
def add_approver(step_id: int, payload: StepApproverCreate, db: Session = Depends(get_db)):
    step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")
    apr = WorkflowStepApprover(
        step_id=step_id,
        role_id=payload.role_id,
        department_id=payload.department_id,
        designation_id=payload.designation_id,
        company_id=payload.company_id,
    )
    db.add(apr)
    db.commit()
    db.refresh(apr)
    return apr


@router.delete("/workflow/approvers/{approver_id}", summary="Remove approver from step")
def delete_approver(approver_id: int, db: Session = Depends(get_db)):
    apr = db.query(WorkflowStepApprover).filter(WorkflowStepApprover.id == approver_id).first()
    if not apr:
        raise HTTPException(404, "Approver not found")
    db.delete(apr)
    db.commit()
    return {"message": f"Approver {approver_id} removed"}


# ═══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/notifications/", response_model=NotificationResponse,
             status_code=201, summary="Add notification rule")
def add_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    notif = WorkflowNotification(**payload.dict())
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


@router.get("/workflow/notifications/{template_id}", response_model=List[NotificationResponse],
            summary="List notification rules for template")
def list_notifications(template_id: int, db: Session = Depends(get_db)):
    return (
        db.query(WorkflowNotification)
        .filter(WorkflowNotification.template_id == template_id,
                WorkflowNotification.is_active == True)
        .all()
    )


@router.delete("/workflow/notifications/{notif_id}", summary="Remove notification rule")
def delete_notification(notif_id: int, db: Session = Depends(get_db)):
    n = db.query(WorkflowNotification).filter(WorkflowNotification.id == notif_id).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    db.delete(n)
    db.commit()
    return {"message": f"Notification {notif_id} removed"}


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANCE – SUBMIT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/submit/", response_model=WorkflowInstanceResponse,
             status_code=201, summary="Submit a request into the workflow")
def submit_request(payload: WorkflowInstanceCreate, db: Session = Depends(get_db)):
    """
    Creates a WorkflowInstance + all WorkflowStepInstances in PENDING state.
    The first eligible step is activated immediately.
    entity_data is fetched from the DB to evaluate conditional steps.
    """
    # Find template
    tmpl = (
        db.query(WorkflowTemplate)
        .options(joinedload(WorkflowTemplate.steps).joinedload(WorkflowStep.approvers))
        .filter(
            WorkflowTemplate.code == payload.template_code.upper(),
            WorkflowTemplate.is_active == True,
        )
        .first()
    )
    if not tmpl:
        raise HTTPException(404, f"Active workflow template '{payload.template_code}' not found")

    # Check no existing active instance
    existing = (
        db.query(WorkflowInstance)
        .filter(
            WorkflowInstance.entity_type == payload.entity_type,
            WorkflowInstance.entity_id   == payload.entity_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "A workflow instance already exists for this request")

    # Fetch entity data for conditional step evaluation
    # Currently supports ITEM_CREATION; extend here for other entity types
    entity_data = {}
    if payload.entity_type == "ITEM_CREATION":
        from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
        record = db.query(ItemBasicInfoItemMaster).filter(
            ItemBasicInfoItemMaster.id == payload.entity_id
        ).first()
        if record:
            entity_data = {
                "item_type":   record.item_type,
                "department":  record.department,
                "company_id":  record.company_id,
            }

    # Create instance
    instance = WorkflowInstance(
        template_id  = tmpl.id,
        entity_type  = payload.entity_type,
        entity_id    = payload.entity_id,
        status       = WorkflowStatusEnum.PENDING,
        submitted_by = payload.submitted_by,
        submitted_at = datetime.utcnow(),
    )
    db.add(instance)
    db.flush()

    # Create step instances (pre-create all, evaluate skip conditions)
    active_steps = sorted(
        [s for s in tmpl.steps if s.is_active],
        key=lambda s: s.step_order
    )
    step_instances = []
    for step in active_steps:
        should_activate = _evaluate_condition(step, entity_data)
        si = WorkflowStepInstance(
            instance_id            = instance.id,
            step_id                = step.id,
            step_order_snapshot    = step.step_order,
            step_name_snapshot     = step.step_name,
            approval_type_snapshot = step.approval_type,
            status     = StepStatusEnum.PENDING,
            is_skipped = not should_activate,
        )
        db.add(si)
        step_instances.append(si)
    db.flush()

    # Log SUBMIT action
    db.add(WorkflowAction(
        instance_id  = instance.id,
        action_type  = ActionTypeEnum.SUBMIT,
        performed_by = payload.submitted_by,
        comments     = "Request submitted",
    ))

    # Activate first non-skipped step
    _advance_instance(db, instance)

    db.commit()
    return _load_instance(db, instance.id)


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANCE – ACTION (approve / reject / return / comment)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/action/{instance_id}", response_model=WorkflowInstanceResponse,
             summary="Take action on a workflow instance (approve / reject / return / comment)")
def take_action(
    instance_id: int,
    payload: WorkflowActionCreate,
    db: Session = Depends(get_db)
):
    instance = _load_instance(db, instance_id)

    if instance.status in (WorkflowStatusEnum.APPROVED,
                           WorkflowStatusEnum.REJECTED,
                           WorkflowStatusEnum.CANCELLED):
        raise HTTPException(400, f"Instance is already {instance.status.value}; no further action allowed")

    # Find the currently active step instance
    active_si = next(
        (si for si in instance.step_instances
         if si.status == StepStatusEnum.PENDING
         and not si.is_skipped
         and si.step_order_snapshot == min(
             s.step_order_snapshot for s in instance.step_instances
             if s.status == StepStatusEnum.PENDING and not s.is_skipped
         )),
        None
    )
    if active_si is None and payload.action_type not in (ActionTypeEnum.CANCEL, ActionTypeEnum.COMMENT):
        raise HTTPException(400, "No active step found")

    # Permission check (skip for CANCEL and COMMENT from submitter)
    if payload.action_type in (ActionTypeEnum.APPROVE, ActionTypeEnum.REJECT, ActionTypeEnum.RETURN):
        if not _user_can_approve_step(db, payload.performed_by, active_si.step_id):
            raise HTTPException(403, "You are not authorised to act on this step")

    # Log the action
    db.add(WorkflowAction(
        instance_id      = instance_id,
        step_instance_id = active_si.id if active_si else None,
        action_type      = payload.action_type,
        performed_by     = payload.performed_by,
        comments         = payload.comments,
    ))

    # ── APPROVE ──────────────────────────────────────────────────────
    if payload.action_type == ActionTypeEnum.APPROVE:
        # For ANY: one approval = step done
        # For ALL: check if all required approvers have approved
        if active_si.approval_type_snapshot == ApprovalTypeEnum.ANY:
            active_si.status       = StepStatusEnum.APPROVED
            active_si.completed_at = datetime.utcnow()
            db.flush()
            _advance_instance(db, instance)

        else:  # ALL
            # Count distinct approvers who have approved this step
            approved_actions = (
                db.query(WorkflowAction)
                .filter(
                    WorkflowAction.step_instance_id == active_si.id,
                    WorkflowAction.action_type == ActionTypeEnum.APPROVE,
                )
                .all()
            )
            approver_defs = (
                db.query(WorkflowStepApprover)
                .filter(
                    WorkflowStepApprover.step_id  == active_si.step_id,
                    WorkflowStepApprover.is_active == True,
                )
                .all()
            )
            unique_approvers_acted = {a.performed_by for a in approved_actions}
            if len(unique_approvers_acted) >= len(approver_defs):
                active_si.status       = StepStatusEnum.APPROVED
                active_si.completed_at = datetime.utcnow()
                db.flush()
                _advance_instance(db, instance)

    # ── REJECT ───────────────────────────────────────────────────────
    elif payload.action_type == ActionTypeEnum.REJECT:
        active_si.status       = StepStatusEnum.REJECTED
        active_si.completed_at = datetime.utcnow()
        instance.status        = WorkflowStatusEnum.REJECTED
        instance.completed_at  = datetime.utcnow()

    # ── RETURN (send back to submitter for correction) ────────────────
    elif payload.action_type == ActionTypeEnum.RETURN:
        active_si.status       = StepStatusEnum.RETURNED
        active_si.completed_at = datetime.utcnow()
        instance.status        = WorkflowStatusEnum.RETURNED

    # ── CANCEL ────────────────────────────────────────────────────────
    elif payload.action_type == ActionTypeEnum.CANCEL:
        if payload.performed_by != instance.submitted_by:
            raise HTTPException(403, "Only the submitter can cancel their own request")
        instance.status       = WorkflowStatusEnum.CANCELLED
        instance.completed_at = datetime.utcnow()

    db.commit()
    return _load_instance(db, instance_id)


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANCE – READ
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflow/instance/{instance_id}", response_model=WorkflowInstanceResponse,
            summary="Get full workflow instance with timeline")
def get_instance(instance_id: int, db: Session = Depends(get_db)):
    return _load_instance(db, instance_id)


@router.get("/workflow/status/{entity_type}/{entity_id}",
            summary="Quick status check for a submitted request")
def get_status(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    inst = (
        db.query(WorkflowInstance)
        .filter(
            WorkflowInstance.entity_type == entity_type,
            WorkflowInstance.entity_id   == entity_id,
        )
        .first()
    )
    if not inst:
        return {"status": "NOT_SUBMITTED", "instance_id": None}
    return {
        "status":          inst.status.value,
        "instance_id":     inst.id,
        "submitted_at":    inst.submitted_at,
        "completed_at":    inst.completed_at,
        "current_step_id": inst.current_step_id,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  INBOX – approver sees their pending items
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflow/inbox/{user_id}", response_model=List[InboxItem],
            summary="Approver inbox – all pending items this user can act on")
def get_inbox(
    user_id:    int,
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns every WorkflowStepInstance that:
      1. Is PENDING
      2. Belongs to an IN_REVIEW or PENDING instance
      3. The user is authorised to approve (via WorkflowStepApprover matching)
    """
    # Fetch all PENDING step instances
    q = (
        db.query(WorkflowStepInstance)
        .options(
            joinedload(WorkflowStepInstance.instance)
            .joinedload(WorkflowInstance.submitter),
        )
        .join(WorkflowStepInstance.instance)
        .filter(
            WorkflowStepInstance.status == StepStatusEnum.PENDING,
            WorkflowStepInstance.is_skipped == False,
            WorkflowInstance.status.in_([
                WorkflowStatusEnum.PENDING,
                WorkflowStatusEnum.IN_REVIEW,
            ]),
        )
    )
    if entity_type:
        q = q.filter(WorkflowInstance.entity_type == entity_type)

    all_pending = q.all()

    # Filter to only those this user can approve
    inbox = []
    for si in all_pending:
        # Must be the CURRENT active step (lowest order among pending)
        pending_orders = [
            s.step_order_snapshot for s in si.instance.step_instances
            if s.status == StepStatusEnum.PENDING and not s.is_skipped
        ]
        if not pending_orders:
            continue
        if si.step_order_snapshot != min(pending_orders):
            continue

        if _user_can_approve_step(db, user_id, si.step_id):
            inbox.append(InboxItem(
                instance_id       = si.instance_id,
                entity_type       = si.instance.entity_type,
                entity_id         = si.instance.entity_id,
                instance_status   = si.instance.status,
                step_instance_id  = si.id,
                step_name         = si.step_name_snapshot,
                step_order        = si.step_order_snapshot,
                step_status       = si.status,
                submitted_by_name = si.instance.submitter.full_name if si.instance.submitter else None,
                submitted_at      = si.instance.submitted_at,
                due_at            = si.due_at,
            ))

    return inbox


# ═══════════════════════════════════════════════════════════════════════════════
#  MY REQUESTS – submitter tracks their own submissions
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflow/my-requests/{user_id}",
            summary="All workflow instances submitted by a user")
def my_requests(
    user_id:     int,
    entity_type: Optional[str] = Query(None),
    status:      Optional[WorkflowStatusEnum] = Query(None),
    skip:        int = Query(0, ge=0),
    limit:       int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    q = (
        db.query(WorkflowInstance)
        .filter(WorkflowInstance.submitted_by == user_id)
    )
    if entity_type:
        q = q.filter(WorkflowInstance.entity_type == entity_type)
    if status:
        q = q.filter(WorkflowInstance.status == status)

    records = q.order_by(WorkflowInstance.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "instance_id":    r.id,
            "entity_type":    r.entity_type,
            "entity_id":      r.entity_id,
            "status":         r.status.value,
            "submitted_at":   r.submitted_at,
            "completed_at":   r.completed_at,
        }
        for r in records
    ]


@router.get("/workflow/timeline/{entity_type}/{entity_id}",
            response_model=RequestTimeline,
            summary="Step-by-step timeline for a request")
def get_timeline(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    inst = (
        db.query(WorkflowInstance)
        .options(
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.actions)
            .joinedload(WorkflowAction.performer),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_role),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_dept),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_desg),
        )
        .filter(
            WorkflowInstance.entity_type == entity_type,
            WorkflowInstance.entity_id   == entity_id,
        )
        .first()
    )
    if not inst:
        raise HTTPException(404, "No workflow instance found for this request")

    steps = []
    for si in sorted(inst.step_instances, key=lambda s: s.step_order_snapshot):
        steps.append(TimelineStep(
            step_order    = si.step_order_snapshot,
            step_name     = si.step_name_snapshot,
            status        = si.status,
            is_skipped    = si.is_skipped,
            assigned_role = si.assigned_role.role_name if si.assigned_role else None,
            assigned_dept = si.assigned_dept.department_name if si.assigned_dept else None,
            assigned_desg = si.assigned_desg.designation_name if si.assigned_desg else None,
            started_at    = si.started_at,
            completed_at  = si.completed_at,
            due_at        = si.due_at,
            actions       = [
                WorkflowActionResponse(
                    id               = a.id,
                    instance_id      = a.instance_id,
                    step_instance_id = a.step_instance_id,
                    action_type      = a.action_type,
                    performed_by     = a.performed_by,
                    performer        = a.performer,
                    comments         = a.comments,
                    created_at       = a.created_at,
                ) for a in si.actions
            ],
        ))

    return RequestTimeline(
        instance_id    = inst.id,
        entity_id      = inst.entity_id,
        overall_status = inst.status,
        submitted_at   = inst.submitted_at,
        completed_at   = inst.completed_at,
        steps          = steps,
    )