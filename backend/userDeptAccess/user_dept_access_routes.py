"""
userDeptAccess/user_dept_access_routes.py
──────────────────────────────────────────────────────────────────────────────
User Department Data Access Control — API Routes

ENDPOINTS
---------
GET  /user-dept-access/companies
     → List of all companies with user_count (how many users have access)

GET  /user-dept-access/companies/{company_id}/users
     → List of users who have access to a company, with their role/dept/desg
       + granted_dept_count (how many dept data-access rows exist for this user+company)

GET  /user-dept-access/user/{user_id}/detail
     → Full detail of a user:
         - basic info (name, email, phone, is_active)
         - company_accesses: [{company, role, department, designation}, ...]
         - dept_access_by_company: [{company_id, granted_departments:[{department_id,...}]}]

GET  /user-dept-access/companies/{company_id}/all-departments
     → All departments in the system (used to populate the dept picker)
       NOTE: departments are global (not per-company in this schema)
             so we return ALL departments — admin picks which ones apply

POST /user-dept-access/bulk-set
     Body: { user_id, company_id, department_ids: [int, ...], update_reason? }
     → Replace all UserDeptDataAccess rows for user+company with the new list
     → Writes an audit row to UserDeptDataAccessHistory
     → Returns summary

DELETE /user-dept-access/clear/{user_id}/{company_id}
     → Remove all dept access for a user+company (set to "no access")
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


# ── Pydantic schemas (inline to keep file self-contained) ─────────────────────

class BulkSetRequest(BaseModel):
    user_id: int
    company_id: int
    department_ids: List[int]
    update_reason: Optional[str] = None
    performed_by: Optional[int] = None  # admin user id if available


# ── Helper: get granted dept ids for user+company ────────────────────────────

def _get_granted_dept_ids(db: Session, user_id: int, company_id: int) -> List[int]:
    rows = db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == user_id,
        dept_models.UserDeptDataAccess.company_id == company_id,
        dept_models.UserDeptDataAccess.is_granted == True,
    ).all()
    return [r.department_id for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
# 1. GET /user-dept-access/companies
#    Returns all companies with user_count
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies")
def get_companies_with_user_count(db: Session = Depends(get_db)):
    """
    Returns every company that exists, with how many distinct users have
    a UserCompanyAccess row for that company.
    """
    # All companies
    companies = db.query(models.Company).order_by(models.Company.company_name).all()

    # Count users per company from user_company_access
    user_counts = (
        db.query(
            user_models.UserCompanyAccess.company_id,
            func.count(distinct(user_models.UserCompanyAccess.user_id)).label("cnt")
        )
        .group_by(user_models.UserCompanyAccess.company_id)
        .all()
    )
    count_map = {row.company_id: row.cnt for row in user_counts}

    result = []
    for c in companies:
        result.append({
            "id": c.id,
            "company_name": c.company_name,
            "company_code": c.company_code,
            "user_count": count_map.get(c.id, 0),
        })

    return result


# ══════════════════════════════════════════════════════════════════════════════
# 2. GET /user-dept-access/companies/{company_id}/users
#    Returns users in a company with role/dept/desg + granted_dept_count
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies/{company_id}/users")
def get_users_for_company(company_id: int, db: Session = Depends(get_db)):
    """
    Returns all users that have UserCompanyAccess for this company.
    Each user row includes:
      - basic info
      - role_name, dept_name, desg_name  (from their access record for THIS company)
      - granted_dept_count               (how many dept data-access rows they have for this company)
      - company_accesses                 (all companies they have access to, as chips)
    """
    # Fetch all UserCompanyAccess rows for this company, with eager loads
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

    # Deduplicate by user_id — keep first access row per user for this company
    seen_users = {}
    for acc in accesses:
        uid = acc.user_id
        if uid not in seen_users:
            seen_users[uid] = acc

    if not seen_users:
        return []

    # For each unique user, also get ALL their company accesses (for chips)
    all_user_ids = list(seen_users.keys())
    all_accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(user_models.UserCompanyAccess.user_id.in_(all_user_ids))
        .options(
            joinedload(user_models.UserCompanyAccess.company),
        )
        .all()
    )

    # Build map: user_id → list of unique companies
    user_companies_map: dict = {}
    for acc in all_accesses:
        uid = acc.user_id
        cid = acc.company_id
        if uid not in user_companies_map:
            user_companies_map[uid] = {}
        if cid not in user_companies_map[uid] and acc.company:
            user_companies_map[uid][cid] = {
                "id": acc.company.id,
                "name": acc.company.company_name,
                "code": acc.company.company_code,
            }

    # Count dept access rows per user for THIS company
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
    for uid, acc in seen_users.items():
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
            # Role / dept / desg for THIS company
            "role_name": acc.role.role_name if acc.role else None,
            "dept_name": acc.department.department_name if acc.department else None,
            "desg_name": acc.designation.designation_name if acc.designation else None,
            # How many dept-data-access rows for this company
            "granted_dept_count": dept_count_map.get(uid, 0),
            # All companies this user has access to (for chips in Col 2)
            "company_accesses": [
                {
                    "company_id": cid,
                    "company": {"id": v["id"], "name": v["name"], "code": v["code"]},
                }
                for cid, v in user_companies_map.get(uid, {}).items()
            ],
        })

    # Sort by name
    result.sort(key=lambda x: x["full_name"])
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3. GET /user-dept-access/user/{user_id}/detail
#    Full user detail for Col 3
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/user/{user_id}/detail")
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    """
    Returns:
      - user basic info
      - company_accesses: list of {company, role, department, designation}
        (deduplicated per company — one row per company)
      - dept_access_by_company: list of {company_id, granted_departments:[{department_id, department_name}]}
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # All UserCompanyAccess rows for this user
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

    # Deduplicate by company_id — one row per company for context display
    seen_companies = {}
    for acc in accesses:
        cid = acc.company_id
        if cid not in seen_companies:
            seen_companies[cid] = acc

    company_accesses_list = []
    for cid, acc in seen_companies.items():
        company_accesses_list.append({
            "company_id": cid,
            "company": {
                "id": acc.company.id,
                "name": acc.company.company_name,
                "code": acc.company.company_code,
            } if acc.company else None,
            "role": {
                "id": acc.role.id,
                "name": acc.role.role_name,
            } if acc.role else None,
            "department": {
                "id": acc.department.id,
                "name": acc.department.department_name,
            } if acc.department else None,
            "designation": {
                "id": acc.designation.id,
                "name": acc.designation.designation_name,
            } if acc.designation else None,
            "is_primary_company": acc.is_primary_company,
        })

    # Dept data access rows for this user (all companies)
    dept_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id == user_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .options(joinedload(dept_models.UserDeptDataAccess.department))
        .all()
    )

    # Group by company_id
    dept_by_company: dict = {}
    for row in dept_rows:
        cid = row.company_id
        if cid not in dept_by_company:
            dept_by_company[cid] = []
        dept_by_company[cid].append({
            "department_id": row.department_id,
            "department_name": row.department.department_name if row.department else None,
            "is_granted": row.is_granted,
        })

    dept_access_by_company = [
        {
            "company_id": cid,
            "granted_departments": depts,
        }
        for cid, depts in dept_by_company.items()
    ]

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "user_id": user.user_id,
        "is_active": user.is_active,
        "company_accesses": company_accesses_list,
        "dept_access_by_company": dept_access_by_company,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 4. GET /user-dept-access/companies/{company_id}/all-departments
#    All departments (global) — used for the dept picker in Col 3
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies/{company_id}/all-departments")
def get_all_departments(company_id: int, db: Session = Depends(get_db)):
    """
    Returns ALL departments in the system.
    Departments are not tied to companies in this schema — they are global.
    The frontend will show these as the picker options.

    company_id is accepted in the URL for future per-company filtering
    but currently returns all departments.
    """
    depts = db.query(models.Department).order_by(models.Department.department_name).all()
    return [
        {
            "id": d.id,
            "department_name": d.department_name,
            "department_code": d.department_code,
        }
        for d in depts
    ]


# ══════════════════════════════════════════════════════════════════════════════
# 5. POST /user-dept-access/bulk-set
#    Replace all dept access rows for user+company with new list
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/user-dept-access/bulk-set")
def bulk_set_dept_access(payload: BulkSetRequest, db: Session = Depends(get_db)):
    """
    Atomically replaces all UserDeptDataAccess rows for a user+company.
    - Deletes existing rows
    - Inserts new rows for each department_id in the list
    - Writes audit log to UserDeptDataAccessHistory
    - department_ids = []  →  user sees NO data (all access revoked)

    NOTE: This only affects DATA visibility (UserDeptDataAccess).
          Page access (CompanyRolePageAccess) is NOT touched.
    """
    # Validate user exists
    user = db.query(user_models.User).filter(user_models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User id={payload.user_id} not found")

    # Validate company exists
    company = db.query(models.Company).filter(models.Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company id={payload.company_id} not found")

    # Validate all department_ids exist
    if payload.department_ids:
        found_depts = db.query(models.Department).filter(
            models.Department.id.in_(payload.department_ids)
        ).all()
        found_ids = {d.id for d in found_depts}
        bad_ids = set(payload.department_ids) - found_ids
        if bad_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid department ids: {sorted(bad_ids)}"
            )

    # ── Snapshot BEFORE ──────────────────────────────────────────────────────
    existing = db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == payload.user_id,
        dept_models.UserDeptDataAccess.company_id == payload.company_id,
    ).all()
    ids_before = ",".join(str(r.department_id) for r in existing) if existing else ""

    # ── Delete existing rows ──────────────────────────────────────────────────
    db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == payload.user_id,
        dept_models.UserDeptDataAccess.company_id == payload.company_id,
    ).delete(synchronize_session=False)

    # ── Insert new rows ───────────────────────────────────────────────────────
    new_dept_ids = list(set(payload.department_ids))  # deduplicate
    for dept_id in new_dept_ids:
        row = dept_models.UserDeptDataAccess(
            user_id=payload.user_id,
            company_id=payload.company_id,
            department_id=dept_id,
            is_granted=True,
            update_reason=payload.update_reason,
            created_by=payload.performed_by,
            updated_by=payload.performed_by,
        )
        db.add(row)

    # ── Audit log ─────────────────────────────────────────────────────────────
    ids_after = ",".join(str(i) for i in sorted(new_dept_ids)) if new_dept_ids else ""
    action = "BULK_SET" if new_dept_ids else "CLEARED"

    history = dept_models.UserDeptDataAccessHistory(
        user_id=payload.user_id,
        company_id=payload.company_id,
        action=action,
        department_ids_before=ids_before,
        department_ids_after=ids_after,
        update_reason=payload.update_reason,
        performed_by=payload.performed_by,
    )
    db.add(history)

    db.commit()

    return {
        "success": True,
        "message": f"Department access updated for user '{user.full_name}' in company '{company.company_name}'",
        "user_id": payload.user_id,
        "company_id": payload.company_id,
        "departments_granted": len(new_dept_ids),
        "action": action,
        "department_ids": sorted(new_dept_ids),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6. DELETE /user-dept-access/clear/{user_id}/{company_id}
#    Remove all dept access for a user+company
# ══════════════════════════════════════════════════════════════════════════════

@router.delete("/user-dept-access/clear/{user_id}/{company_id}")
def clear_dept_access(user_id: int, company_id: int, db: Session = Depends(get_db)):
    """Revoke all department data access for a user+company."""
    existing = db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == user_id,
        dept_models.UserDeptDataAccess.company_id == company_id,
    ).all()
    ids_before = ",".join(str(r.department_id) for r in existing) if existing else ""

    deleted = db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == user_id,
        dept_models.UserDeptDataAccess.company_id == company_id,
    ).delete(synchronize_session=False)

    history = dept_models.UserDeptDataAccessHistory(
        user_id=user_id,
        company_id=company_id,
        action="CLEARED",
        department_ids_before=ids_before,
        department_ids_after="",
        update_reason="Manual clear",
    )
    db.add(history)
    db.commit()

    return {
        "success": True,
        "deleted_rows": deleted,
        "message": "All department access cleared"
    }