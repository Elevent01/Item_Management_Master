"""
userDeptAccess/user_dept_access_routes.py
──────────────────────────────────────────────────────────────────────────────
NEW FLOW:
  Col 1 → All companies with user_count
  Col 2 → Click company → users in that company (primary company shown first)
  Col 3A → Click user → show user's ALL companies (from UserCompanyAccess)
  Col 3B → Click one of those companies → show ONLY departments that are
           registered for that user+company in UserCompanyAccess
           (NOT all global departments — only the ones linked at registration)
  Save   → Store in user_dept_data_access (data-only, NO page access change)

IMPORTANT:
  - Departments shown = only those linked to user via UserCompanyAccess for
    that specific company. Page access is NOT touched here.
  - Saving writes to user_dept_data_access table only.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
import db_models as models
from user import user_models
from userDeptAccess import user_dept_access_models as dept_models

router = APIRouter()


# ── Inline Pydantic schemas ───────────────────────────────────────────────────

class BulkSetRequest(BaseModel):
    user_id: int
    company_id: int
    department_ids: List[int]
    update_reason: Optional[str] = None
    performed_by: Optional[int] = None


# ══════════════════════════════════════════════════════════════════════════════
# 1. GET /user-dept-access/companies
#    All companies with how many users have access to each
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies")
def get_companies_with_user_count(db: Session = Depends(get_db)):
    companies = db.query(models.Company).order_by(models.Company.company_name).all()

    user_counts = (
        db.query(
            user_models.UserCompanyAccess.company_id,
            func.count(distinct(user_models.UserCompanyAccess.user_id)).label("cnt")
        )
        .group_by(user_models.UserCompanyAccess.company_id)
        .all()
    )
    count_map = {row.company_id: row.cnt for row in user_counts}

    return [
        {
            "id": c.id,
            "company_name": c.company_name,
            "company_code": c.company_code,
            "user_count": count_map.get(c.id, 0),
        }
        for c in companies
    ]


# ══════════════════════════════════════════════════════════════════════════════
# 2. GET /user-dept-access/companies/{company_id}/users
#    Users in a company — primary company users shown first.
#    Each user has granted_dept_count for this company.
#    User appears only ONCE (deduplicated).
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies/{company_id}/users")
def get_users_for_company(company_id: int, db: Session = Depends(get_db)):
    # All access rows for this company
    accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(user_models.UserCompanyAccess.company_id == company_id)
        .options(
            joinedload(user_models.UserCompanyAccess.user),
            joinedload(user_models.UserCompanyAccess.role),
            joinedload(user_models.UserCompanyAccess.department),
            joinedload(user_models.UserCompanyAccess.designation),
        )
        .all()
    )

    # Deduplicate by user_id — prefer is_primary_company=True row
    user_map: dict = {}
    for acc in accesses:
        uid = acc.user_id
        if uid not in user_map:
            user_map[uid] = acc
        elif acc.is_primary_company:
            user_map[uid] = acc  # prefer primary

    if not user_map:
        return []

    # Dept access count per user for THIS company
    dept_counts = (
        db.query(
            dept_models.UserDeptDataAccess.user_id,
            func.count(dept_models.UserDeptDataAccess.id).label("cnt")
        )
        .filter(
            dept_models.UserDeptDataAccess.company_id == company_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .group_by(dept_models.UserDeptDataAccess.user_id)
        .all()
    )
    dept_count_map = {row.user_id: row.cnt for row in dept_counts}

    result = []
    for uid, acc in user_map.items():
        u = acc.user
        if not u:
            continue
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "user_id": u.user_id,
            "is_active": u.is_active,
            "is_primary_company": acc.is_primary_company,
            "role_name": acc.role.role_name if acc.role else None,
            "dept_name": acc.department.department_name if acc.department else None,
            "desg_name": acc.designation.designation_name if acc.designation else None,
            "granted_dept_count": dept_count_map.get(uid, 0),
        })

    # Primary company users first, then alphabetical
    result.sort(key=lambda x: (0 if x["is_primary_company"] else 1, x["full_name"]))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3. GET /user-dept-access/user/{user_id}/companies
#    All companies a user has access to (from UserCompanyAccess).
#    Each entry includes role/dept/desg + already-granted dept-data-access count.
#    Primary company comes first.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/user/{user_id}/companies")
def get_user_companies(user_id: int, db: Session = Depends(get_db)):
    """
    Returns all companies the user has access to, with:
      - role, department, designation (from UserCompanyAccess)
      - granted_dept_ids: list of department IDs already granted (data access)
      - granted_dept_count
    Primary company first.
    """
    accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(user_models.UserCompanyAccess.user_id == user_id)
        .options(
            joinedload(user_models.UserCompanyAccess.company),
            joinedload(user_models.UserCompanyAccess.role),
            joinedload(user_models.UserCompanyAccess.department),
            joinedload(user_models.UserCompanyAccess.designation),
        )
        .all()
    )

    # Deduplicate by company_id, prefer primary
    company_map: dict = {}
    for acc in accesses:
        cid = acc.company_id
        if cid not in company_map:
            company_map[cid] = acc
        elif acc.is_primary_company:
            company_map[cid] = acc

    # Existing dept data access rows for this user (all companies)
    dept_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id == user_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    # Map: company_id → [dept_id, ...]
    granted_map: dict = {}
    for row in dept_rows:
        granted_map.setdefault(row.company_id, []).append(row.department_id)

    result = []
    for cid, acc in company_map.items():
        if not acc.company:
            continue
        result.append({
            "company_id": cid,
            "company_name": acc.company.company_name,
            "company_code": acc.company.company_code,
            "is_primary_company": acc.is_primary_company,
            "role_id": acc.role_id,
            "role_name": acc.role.role_name if acc.role else None,
            "department_id": acc.department_id,
            "department_name": acc.department.department_name if acc.department else None,
            "designation_id": acc.designation_id,
            "designation_name": acc.designation.designation_name if acc.designation else None,
            "granted_dept_ids": granted_map.get(cid, []),
            "granted_dept_count": len(granted_map.get(cid, [])),
        })

    # Primary first
    result.sort(key=lambda x: (0 if x["is_primary_company"] else 1, x["company_name"]))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 4. GET /user-dept-access/user/{user_id}/company/{company_id}/departments
#    ONLY departments registered for this user+company in UserCompanyAccess.
#    These are the departments the user was assigned at registration time.
#    NOT all global departments — only the relevant ones for this user+company.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/user/{user_id}/company/{company_id}/departments")
def get_user_company_departments(user_id: int, company_id: int, db: Session = Depends(get_db)):
    """
    Returns departments that are relevant for this user+company.
    Fetched from UserCompanyAccess.department_id for this user+company.

    Also returns which of those are already granted (data access).
    Page access is NOT affected.
    """
    # Get all UserCompanyAccess rows for this user+company
    accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id == company_id,
        )
        .options(joinedload(user_models.UserCompanyAccess.department))
        .all()
    )

    if not accesses:
        raise HTTPException(
            status_code=404,
            detail=f"No access record found for user {user_id} in company {company_id}"
        )

    # Collect unique departments from UserCompanyAccess
    dept_map: dict = {}
    for acc in accesses:
        if acc.department and acc.department_id not in dept_map:
            dept_map[acc.department_id] = {
                "id": acc.department.id,
                "department_name": acc.department.department_name,
                "department_code": acc.department.department_code,
            }

    # Which of these are already granted (data access)?
    granted_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id == user_id,
            dept_models.UserDeptDataAccess.company_id == company_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    granted_ids = {row.department_id for row in granted_rows}

    return {
        "user_id": user_id,
        "company_id": company_id,
        "departments": list(dept_map.values()),
        "granted_dept_ids": list(granted_ids),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 5. GET /user-dept-access/user/{user_id}/detail  (kept for Col3 header info)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/user/{user_id}/detail")
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "user_id": user.user_id,
        "is_active": user.is_active,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6. POST /user-dept-access/bulk-set
#    Replace dept data access for user+company. NO page access change.
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/user-dept-access/bulk-set")
def bulk_set_dept_access(payload: BulkSetRequest, db: Session = Depends(get_db)):
    """
    Atomically replaces UserDeptDataAccess rows for user+company.
    ONLY affects data visibility — page access (CompanyRolePageAccess) untouched.
    department_ids=[] means revoke all (user sees no data).
    """
    user = db.query(user_models.User).filter(user_models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User id={payload.user_id} not found")

    company = db.query(models.Company).filter(models.Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company id={payload.company_id} not found")

    if payload.department_ids:
        found = db.query(models.Department).filter(
            models.Department.id.in_(payload.department_ids)
        ).all()
        found_ids = {d.id for d in found}
        bad = set(payload.department_ids) - found_ids
        if bad:
            raise HTTPException(status_code=400, detail=f"Invalid department ids: {sorted(bad)}")

    # Snapshot before
    existing = db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == payload.user_id,
        dept_models.UserDeptDataAccess.company_id == payload.company_id,
    ).all()
    ids_before = ",".join(str(r.department_id) for r in existing)

    # Delete old rows
    db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == payload.user_id,
        dept_models.UserDeptDataAccess.company_id == payload.company_id,
    ).delete(synchronize_session=False)

    # Insert new rows
    new_ids = list(set(payload.department_ids))
    for dept_id in new_ids:
        db.add(dept_models.UserDeptDataAccess(
            user_id=payload.user_id,
            company_id=payload.company_id,
            department_id=dept_id,
            is_granted=True,
            update_reason=payload.update_reason,
            created_by=payload.performed_by,
            updated_by=payload.performed_by,
        ))

    # Audit log
    ids_after = ",".join(str(i) for i in sorted(new_ids))
    db.add(dept_models.UserDeptDataAccessHistory(
        user_id=payload.user_id,
        company_id=payload.company_id,
        action="BULK_SET" if new_ids else "CLEARED",
        department_ids_before=ids_before,
        department_ids_after=ids_after,
        update_reason=payload.update_reason,
        performed_by=payload.performed_by,
    ))

    db.commit()

    return {
        "success": True,
        "message": f"Data access updated for '{user.full_name}' in '{company.company_name}'",
        "departments_granted": len(new_ids),
        "department_ids": sorted(new_ids),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 7. GET /user-dept-access/companies/{company_id}/all-departments  (fallback)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies/{company_id}/all-departments")
def get_all_departments_fallback(company_id: int, db: Session = Depends(get_db)):
    """Fallback — returns all global departments (not used in new flow)."""
    depts = db.query(models.Department).order_by(models.Department.department_name).all()
    return [{"id": d.id, "department_name": d.department_name, "department_code": d.department_code} for d in depts]