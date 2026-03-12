"""
userDeptAccess/user_dept_access_routes.py
──────────────────────────────────────────────────────────────────────────────
FastAPI router — User Department Data Access Control

Endpoints
---------
GET  /user-dept-access/companies
    → All companies with how many users each has

GET  /user-dept-access/companies/{company_id}/users
    → All users of a company with their role/dept/desg + how many depts granted

GET  /user-dept-access/user/{user_id}/detail
    → Full user detail: companies they belong to + granted depts per company

GET  /user-dept-access/user/{user_id}/company/{company_id}/departments
    → Granted department IDs for a user in a company (used by other modules)

POST /user-dept-access/bulk-set
    → Replace all dept access for user+company in one call (admin save)

DELETE /user-dept-access/{access_id}
    → Remove single dept grant

DELETE /user-dept-access/user/{user_id}/company/{company_id}/clear
    → Remove ALL dept grants for user in a company
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from typing import List, Optional

from database import get_db
import db_models as models                                    # Company, Plant, Role, Dept, Desg
from user import user_models                                  # User, UserCompanyAccess
from userDeptAccess.user_dept_access_models import UserDeptDataAccess
from userDeptAccess.user_dept_access_schemas import (
    UserDeptAccessCreate,
    UserDeptAccessBulkSet,
    UserDeptAccessResponse,
    CompanyWithUserCount,
    UserInCompany,
    UserAllowedDepts,
    UserAccessDetail,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# 1. GET  all companies with user count
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/user-dept-access/companies",
    response_model=List[CompanyWithUserCount],
    summary="All companies with user count (left panel)"
)
def get_companies_with_user_count(db: Session = Depends(get_db)):
    """
    Returns all companies. For each company, counts how many distinct users
    have UserCompanyAccess entries — i.e. how many users belong to that company.
    Used to populate the left panel of the admin page.
    """
    companies = db.query(models.Company).filter(models.Company.is_active == True).all()

    result = []
    for company in companies:
        user_count = (
            db.query(func.count(func.distinct(user_models.UserCompanyAccess.user_id)))
            .filter(user_models.UserCompanyAccess.company_id == company.id)
            .scalar()
        ) or 0

        result.append(CompanyWithUserCount(
            id=company.id,
            company_name=company.company_name,
            company_code=getattr(company, "company_code", None),
            user_count=user_count
        ))

    return sorted(result, key=lambda x: x.company_name)


# ══════════════════════════════════════════════════════════════════════════════
# 2. GET  users of a company
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/user-dept-access/companies/{company_id}/users",
    response_model=List[UserInCompany],
    summary="Users in a company with their role/dept/desg + granted dept count"
)
def get_users_in_company(company_id: int, db: Session = Depends(get_db)):
    """
    Returns all users who have UserCompanyAccess for this company.
    For each user, includes their role/dept/desg and how many departments
    have been granted for data access.
    """
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

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

    # Deduplicate by user_id (user may have multiple access rows for same company)
    seen_users = {}
    for acc in accesses:
        uid = acc.user_id
        if uid not in seen_users:
            # Count how many depts are granted for this user+company
            granted_count = (
                db.query(func.count(UserDeptDataAccess.id))
                .filter(
                    UserDeptDataAccess.user_id == uid,
                    UserDeptDataAccess.company_id == company_id,
                    UserDeptDataAccess.is_granted == True,
                )
                .scalar()
            ) or 0

            seen_users[uid] = UserInCompany(
                id=acc.user.id,
                full_name=acc.user.full_name,
                email=acc.user.email,
                user_id=acc.user.user_id,
                is_active=acc.user.is_active,
                role_name=acc.role.role_name if acc.role else None,
                dept_name=acc.department.department_name if acc.department else None,
                desg_name=acc.designation.designation_name if acc.designation else None,
                granted_dept_count=granted_count,
            )

    return list(seen_users.values())


# ══════════════════════════════════════════════════════════════════════════════
# 3. GET  full user detail
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/user-dept-access/user/{user_id}/detail",
    summary="Full user detail: company accesses + granted depts per company"
)
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # All company accesses
    accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(user_models.UserCompanyAccess.user_id == user_id)
        .options(
            joinedload(user_models.UserCompanyAccess.company),
            joinedload(user_models.UserCompanyAccess.plant),
            joinedload(user_models.UserCompanyAccess.role),
            joinedload(user_models.UserCompanyAccess.department),
            joinedload(user_models.UserCompanyAccess.designation),
        )
        .all()
    )

    # Group by company
    company_map = {}
    for acc in accesses:
        cid = acc.company_id
        if cid not in company_map:
            company_map[cid] = {
                "company_id": cid,
                "company_name": acc.company.company_name if acc.company else None,
                "company_code": getattr(acc.company, "company_code", None),
                "role": {"id": acc.role.id, "name": acc.role.role_name} if acc.role else None,
                "department": {"id": acc.department.id, "name": acc.department.department_name} if acc.department else None,
                "designation": {"id": acc.designation.id, "name": acc.designation.designation_name} if acc.designation else None,
                "plants": [],
            }
        if acc.plant:
            plant_entry = {"id": acc.plant.id, "plant_name": acc.plant.plant_name}
            if plant_entry not in company_map[cid]["plants"]:
                company_map[cid]["plants"].append(plant_entry)

    # Granted depts per company
    dept_grants = (
        db.query(UserDeptDataAccess)
        .filter(
            UserDeptDataAccess.user_id == user_id,
            UserDeptDataAccess.is_granted == True,
        )
        .options(
            joinedload(UserDeptDataAccess.company),
            joinedload(UserDeptDataAccess.department),
        )
        .all()
    )

    dept_by_company: dict = {}
    for grant in dept_grants:
        cid = grant.company_id
        if cid not in dept_by_company:
            dept_by_company[cid] = {
                "company_id": cid,
                "company_name": grant.company.company_name if grant.company else None,
                "granted_departments": [],
            }
        dept_by_company[cid]["granted_departments"].append({
            "access_id": grant.id,
            "department_id": grant.department_id,
            "department_name": grant.department.department_name if grant.department else None,
        })

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "user_id": user.user_id,
        "is_active": user.is_active,
        "company_accesses": list(company_map.values()),
        "dept_access_by_company": list(dept_by_company.values()),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 4. GET  allowed dept IDs — used by other modules to filter data
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/user-dept-access/user/{user_id}/company/{company_id}/departments",
    response_model=UserAllowedDepts,
    summary="Get dept IDs a user can see data from (for data filtering)"
)
def get_user_allowed_depts(user_id: int, company_id: int, db: Session = Depends(get_db)):
    """
    Called by other modules (e.g. item_creation_req) before returning data.
    Returns list of department IDs user is allowed to see.
    Empty list = no access at all.
    """
    grants = (
        db.query(UserDeptDataAccess)
        .filter(
            UserDeptDataAccess.user_id == user_id,
            UserDeptDataAccess.company_id == company_id,
            UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    return UserAllowedDepts(
        user_id=user_id,
        company_id=company_id,
        department_ids=[g.department_id for g in grants],
    )


# ══════════════════════════════════════════════════════════════════════════════
# 5. GET  all departments in a company (for the dropdown in admin UI)
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/user-dept-access/companies/{company_id}/all-departments",
    summary="All departments available in the system (for adding access)"
)
def get_all_departments(company_id: int, db: Session = Depends(get_db)):
    """
    Returns all departments from the departments master table.
    Company filter is accepted for API consistency but departments are global.
    """
    depts = db.query(models.Department).filter(models.Department.is_active == True).all()
    return [{"id": d.id, "department_name": d.department_name} for d in depts]


# ══════════════════════════════════════════════════════════════════════════════
# 6. POST  bulk set — replace all dept access for user+company
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/user-dept-access/bulk-set",
    summary="Set all dept access for user+company (replaces existing)"
)
def bulk_set_dept_access(payload: UserDeptAccessBulkSet, db: Session = Depends(get_db)):
    """
    Replaces ALL department grants for user+company with the new list.
    Pass department_ids=[] to revoke all access.
    """
    # Validate user
    user = db.query(user_models.User).filter(user_models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate company
    company = db.query(models.Company).filter(models.Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Validate user has access to this company
    has_access = (
        db.query(user_models.UserCompanyAccess)
        .filter(
            user_models.UserCompanyAccess.user_id == payload.user_id,
            user_models.UserCompanyAccess.company_id == payload.company_id,
        )
        .first()
    )
    if not has_access:
        raise HTTPException(
            status_code=400,
            detail="User does not have access to this company. Assign company access first."
        )

    # Validate all department IDs exist
    if payload.department_ids:
        existing_depts = (
            db.query(models.Department.id)
            .filter(models.Department.id.in_(payload.department_ids))
            .all()
        )
        existing_ids = {d.id for d in existing_depts}
        invalid = set(payload.department_ids) - existing_ids
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid department IDs: {list(invalid)}"
            )

    # Delete existing grants for this user+company
    db.query(UserDeptDataAccess).filter(
        UserDeptDataAccess.user_id == payload.user_id,
        UserDeptDataAccess.company_id == payload.company_id,
    ).delete()

    # Insert new grants
    for dept_id in payload.department_ids:
        grant = UserDeptDataAccess(
            user_id=payload.user_id,
            company_id=payload.company_id,
            department_id=dept_id,
            is_granted=True,
            created_by=payload.created_by,
        )
        db.add(grant)

    db.commit()

    return {
        "message": "Department access updated successfully",
        "user_id": payload.user_id,
        "company_id": payload.company_id,
        "granted_departments": payload.department_ids,
        "total": len(payload.department_ids),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 7. DELETE  single access row
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/user-dept-access/{access_id}",
    summary="Remove single department grant"
)
def remove_dept_access(access_id: int, db: Session = Depends(get_db)):
    grant = db.query(UserDeptDataAccess).filter(UserDeptDataAccess.id == access_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Access record not found")
    db.delete(grant)
    db.commit()
    return {"message": "Department access removed", "id": access_id}


# ══════════════════════════════════════════════════════════════════════════════
# 8. DELETE  clear all for user+company
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/user-dept-access/user/{user_id}/company/{company_id}/clear",
    summary="Clear all dept access for a user in a company"
)
def clear_user_company_dept_access(user_id: int, company_id: int, db: Session = Depends(get_db)):
    deleted = (
        db.query(UserDeptDataAccess)
        .filter(
            UserDeptDataAccess.user_id == user_id,
            UserDeptDataAccess.company_id == company_id,
        )
        .delete()
    )
    db.commit()
    return {
        "message": f"Cleared {deleted} department access record(s)",
        "user_id": user_id,
        "company_id": company_id,
    }