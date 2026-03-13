"""category/category_routes.py - Complete Category Management with Multi-Company Support"""
from fastapi import APIRouter, HTTPException, Depends, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
import re

from database import get_db
import db_models as models
from category import category_models as cat_models
from category import category_schemas as schemas
from user import user_models

router = APIRouter()

# ==================== UTILITY FUNCTIONS ====================

def get_user_accessible_companies(db: Session, user_id: int) -> List[int]:
    """Get list of company IDs user has access to"""
    query = db.query(user_models.UserCompanyAccess.company_id).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).distinct()
    
    company_ids = [cid for (cid,) in query.all() if cid]
    return company_ids


def get_user_accessible_plants(db: Session, user_id: int, company_id: int = None) -> List[int]:
    """Get list of plant IDs user has access to"""
    query = db.query(user_models.UserCompanyAccess.plant_id).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.plant_id.isnot(None)
    )
    
    if company_id:
        query = query.filter(user_models.UserCompanyAccess.company_id == company_id)
    
    plant_ids = [pid for (pid,) in query.all() if pid]
    return plant_ids


def check_user_company_access(db: Session, user_id: int, company_id: int) -> bool:
    """Check if user has access to specific company"""
    access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first()
    return access is not None


def check_user_plant_access(db: Session, user_id: int, plant_id: int) -> bool:
    """Check if user has access to specific plant"""
    access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.plant_id == plant_id
    ).first()
    return access is not None


def get_category_companies(db: Session, category_id: int) -> List[dict]:
    """Get all companies associated with a category"""
    category = db.query(cat_models.Category).filter(cat_models.Category.id == category_id).first()
    
    if not category:
        return []
    
    if category.is_multi_company:
        # Multi-company category
        mappings = db.query(cat_models.CategoryCompanyMapping).filter(
            cat_models.CategoryCompanyMapping.category_id == category_id
        ).options(joinedload(cat_models.CategoryCompanyMapping.company)).all()
        
        return [{
            "id": m.company.id,
            "name": m.company.company_name,
            "code": m.company.company_code
        } for m in mappings]
    else:
        # Single company category
        if category.company_id:
            company = db.query(models.Company).filter(models.Company.id == category.company_id).first()
            if company:
                return [{
                    "id": company.id,
                    "name": company.company_name,
                    "code": company.company_code
                }]
    
    return []


# ==================== CATEGORY CRUD ENDPOINTS ====================

@router.get("/user/{user_id}/companies-with-plants")
async def get_user_companies_with_plants(user_id: int, db: Session = Depends(get_db)):
    """Get all companies and their plants that user has access to"""
    accesses = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).options(
        joinedload(user_models.UserCompanyAccess.company),
        joinedload(user_models.UserCompanyAccess.plant)
    ).all()
    
    # Group by company
    companies_dict = {}
    
    for access in accesses:
        company_id = access.company_id
        
        if company_id not in companies_dict:
            companies_dict[company_id] = {
                "company_id": company_id,
                "company_name": access.company.company_name,
                "company_code": access.company.company_code,
                "plants": []
            }
        
        if access.plant_id and access.plant:
            # Check if plant already added
            plant_exists = any(p["plant_id"] == access.plant_id for p in companies_dict[company_id]["plants"])
            
            if not plant_exists:
                companies_dict[company_id]["plants"].append({
                    "plant_id": access.plant_id,
                    "plant_name": access.plant.plant_name,
                    "plant_code": access.plant.plant_code,
                    "plant_type": access.plant.plant_type.type_name if access.plant.plant_type else None
                })
    
    return {"companies": list(companies_dict.values())}


@router.post("/categories", response_model=dict)
async def create_category(
    category_name: str = Form(...),
    category_code: str = Form(...),
    company_ids: str = Form(...),  # Comma-separated company IDs
    plant_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Create new category with single or multiple companies
    - company_ids: Comma-separated IDs (e.g., "1" or "1,2,3")
    - If plant_id provided: Single company + plant-specific
    - If no plant_id: Company-wide for selected companies
    """
    
    # Parse company IDs
    try:
        company_id_list = [int(cid.strip()) for cid in company_ids.split(",") if cid.strip()]
    except:
        raise HTTPException(status_code=400, detail="Invalid company_ids format")
    
    if not company_id_list:
        raise HTTPException(status_code=400, detail="At least one company must be selected")
    
    # Check if plant_id provided with multiple companies
    if plant_id and len(company_id_list) > 1:
        raise HTTPException(
            status_code=400, 
            detail="Plant-specific categories can only be created for a single company"
        )
    
    # Validate all companies exist and user has access
    for cid in company_id_list:
        company = db.query(models.Company).filter(models.Company.id == cid).first()
        if not company:
            raise HTTPException(status_code=404, detail=f"Company ID {cid} not found")
        
        if not check_user_company_access(db, user_id, cid):
            raise HTTPException(status_code=403, detail=f"No access to company ID {cid}")
    
    # Validate plant if provided
    plant = None
    if plant_id:
        plant = db.query(models.Plant).filter(
            models.Plant.id == plant_id,
            models.Plant.company_id == company_id_list[0]
        ).first()
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found or doesn't belong to company")
        
        if not check_user_plant_access(db, user_id, plant_id):
            raise HTTPException(status_code=403, detail="No access to this plant")
    
    # Check for duplicate category code
    existing_code = db.query(cat_models.Category).filter(
        cat_models.Category.category_code == category_code.strip().upper()
    ).first()
    
    if existing_code:
        raise HTTPException(
            status_code=400,
            detail=f"Category code '{category_code}' already exists"
        )
    
    # Determine if multi-company
    is_multi_company = len(company_id_list) > 1
    
    # Create category
    db_category = cat_models.Category(
        company_id=company_id_list[0] if not is_multi_company else None,
        plant_id=plant_id,
        is_multi_company=is_multi_company,
        category_name=category_name.strip(),
        category_code=category_code.strip().upper(),
        description=description.strip() if description else None,
        is_active=True,
        created_by=user_id
    )
    
    db.add(db_category)
    db.flush()  # Get category ID
    
    # Create company mappings for multi-company categories
    if is_multi_company:
        for cid in company_id_list:
            mapping = cat_models.CategoryCompanyMapping(
                category_id=db_category.id,
                company_id=cid
            )
            db.add(mapping)
    
    db.commit()
    db.refresh(db_category)
    
    # Build response
    if is_multi_company:
        companies = db.query(models.Company).filter(models.Company.id.in_(company_id_list)).all()
        company_names = ", ".join([c.company_name for c in companies])
        scope_info = f"Multiple Companies: {company_names}"
    elif plant_id:
        scope_info = f"Plant: {plant.plant_name}"
    else:
        company = db.query(models.Company).filter(models.Company.id == company_id_list[0]).first()
        scope_info = f"All plants in {company.company_name}"
    
    return {
        "message": "Category created successfully",
        "category_id": db_category.id,
        "category_name": db_category.category_name,
        "category_code": db_category.category_code,
        "scope": scope_info,
        "is_multi_company": is_multi_company,
        "applies_to_all_plants": plant_id is None
    }


@router.get("/categories/by-user/{user_id}")
async def get_categories_by_user(
    user_id: int,
    company_id: Optional[int] = Query(None),
    plant_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all categories accessible to user"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id, company_id)
    
    if not accessible_companies:
        return {"categories": [], "total": 0}
    
    # Build query for single-company categories
    single_company_query = db.query(cat_models.Category).filter(
        cat_models.Category.is_multi_company == False,
        or_(
            and_(
                cat_models.Category.company_id.in_(accessible_companies),
                cat_models.Category.plant_id.is_(None)
            ),
            cat_models.Category.plant_id.in_(accessible_plants) if accessible_plants else False
        )
    )
    
    # Build query for multi-company categories
    multi_company_subquery = db.query(cat_models.CategoryCompanyMapping.category_id).filter(
        cat_models.CategoryCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_query = db.query(cat_models.Category).filter(
        cat_models.Category.is_multi_company == True,
        cat_models.Category.id.in_(multi_company_subquery)
    )
    
    # Combine queries
    query = single_company_query.union(multi_company_query).options(
        joinedload(cat_models.Category.company),
        joinedload(cat_models.Category.plant)
    )
    
    # Apply filters
    if company_id:
        query = query.filter(
            or_(
                cat_models.Category.company_id == company_id,
                cat_models.Category.id.in_(
                    db.query(cat_models.CategoryCompanyMapping.category_id).filter(
                        cat_models.CategoryCompanyMapping.company_id == company_id
                    )
                )
            )
        )
    
    if plant_id:
        query = query.filter(
            or_(
                cat_models.Category.plant_id == plant_id,
                cat_models.Category.plant_id.is_(None)
            )
        )
    
    if search:
        query = query.filter(
            or_(
                cat_models.Category.category_name.ilike(f"%{search}%"),
                cat_models.Category.category_code.ilike(f"%{search}%")
            )
        )
    
    if is_active is not None:
        query = query.filter(cat_models.Category.is_active == is_active)
    
    categories = query.order_by(cat_models.Category.category_name).all()
    
    # Format response
    result = []
    for cat in categories:
        subcat_count = db.query(func.count(cat_models.SubCategory.id)).filter(
            cat_models.SubCategory.category_id == cat.id
        ).scalar()
        
        # Get companies
        companies_list = get_category_companies(db, cat.id)
        
        # Determine scope
        if cat.is_multi_company:
            scope = "Multi-Company"
            company_codes = ", ".join([c["code"] for c in companies_list])
            scope_detail = f"Multiple companies: {company_codes}"
        elif cat.plant_id is None:
            scope = "Company-wide"
            scope_detail = f"All plants in {cat.company.company_code}"
        else:
            scope = "Plant-specific"
            scope_detail = f"Only in {cat.plant.plant_code}"
        
        result.append({
            "id": cat.id,
            "category_name": cat.category_name,
            "category_code": cat.category_code,
            "description": cat.description,
            "is_active": cat.is_active,
            "company": companies_list[0] if companies_list else None,
            "companies": companies_list if cat.is_multi_company else None,
            "plant": {
                "id": cat.plant.id,
                "name": cat.plant.plant_name,
                "code": cat.plant.plant_code
            } if cat.plant else None,
            "scope": scope,
            "scope_detail": scope_detail,
            "applies_to_all_plants": cat.plant_id is None,
            "is_multi_company": cat.is_multi_company,
            "total_subcategories": subcat_count,
            "created_at": cat.created_at
        })
    
    return {"categories": result, "total": len(result)}


@router.get("/user/{user_id}/accessible-categories")
async def get_accessible_categories_for_subcategory(user_id: int, db: Session = Depends(get_db)):
    """Get all categories accessible to user for subcategory creation"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id)
    
    if not accessible_companies:
        return {"categories": []}
    
    # Single-company categories
    single_company_cats = db.query(cat_models.Category).filter(
        cat_models.Category.is_multi_company == False,
        or_(
            and_(
                cat_models.Category.company_id.in_(accessible_companies),
                cat_models.Category.plant_id.is_(None)
            ),
            cat_models.Category.plant_id.in_(accessible_plants) if accessible_plants else False
        ),
        cat_models.Category.is_active == True
    ).options(
        joinedload(cat_models.Category.company),
        joinedload(cat_models.Category.plant)
    ).all()
    
    # Multi-company categories
    multi_company_subquery = db.query(cat_models.CategoryCompanyMapping.category_id).filter(
        cat_models.CategoryCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_cats = db.query(cat_models.Category).filter(
        cat_models.Category.is_multi_company == True,
        cat_models.Category.id.in_(multi_company_subquery),
        cat_models.Category.is_active == True
    ).all()
    
    # Combine and format
    result = []
    
    for cat in single_company_cats + multi_company_cats:
        companies_list = get_category_companies(db, cat.id)
        
        if cat.is_multi_company:
            company_codes = ", ".join([c["code"] for c in companies_list])
            scope_label = f"Multi-Company ({company_codes})"
            scope_detail = f"Available in {len(companies_list)} companies"
        elif cat.plant_id is None:
            scope_label = f"Company-wide ({cat.company.company_code})"
            scope_detail = f"All plants in {cat.company.company_name}"
        else:
            scope_label = f"Plant: {cat.plant.plant_code}"
            scope_detail = f"Only in {cat.plant.plant_name}"
        
        result.append({
            "id": cat.id,
            "category_name": cat.category_name,
            "category_code": cat.category_code,
            "company_code": companies_list[0]["code"] if companies_list else None,
            "company_name": companies_list[0]["name"] if companies_list else None,
            "plant_code": cat.plant.plant_code if cat.plant else None,
            "plant_name": cat.plant.plant_name if cat.plant else None,
            "scope_label": scope_label,
            "scope_detail": scope_detail,
            "applies_to_all_plants": cat.plant_id is None,
            "is_multi_company": cat.is_multi_company
        })
    
    return {"categories": result}


@router.get("/categories/{category_id}/details")
async def get_category_details(category_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    """Get complete category details with subcategories"""
    
    category = db.query(cat_models.Category).options(
        joinedload(cat_models.Category.company),
        joinedload(cat_models.Category.plant),
        joinedload(cat_models.Category.created_by_user)
    ).filter(cat_models.Category.id == category_id).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check user access
    companies_list = get_category_companies(db, category_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if category.plant_id and not check_user_plant_access(db, user_id, category.plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get subcategories
    subcategories = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id == category_id
    ).all()
    
    # Determine scope
    if category.is_multi_company:
        scope = "Multi-Company"
        company_codes = ", ".join([c["code"] for c in companies_list])
        scope_detail = f"Multiple companies: {company_codes}"
    elif category.plant_id is None:
        scope = "Company-wide"
        scope_detail = f"All plants in {category.company.company_code}"
    else:
        scope = "Plant-specific"
        scope_detail = f"Only in {category.plant.plant_code}"
    
    return {
        "id": category.id,
        "category_name": category.category_name,
        "category_code": category.category_code,
        "description": category.description,
        "is_active": category.is_active,
        "company": companies_list[0] if companies_list else None,
        "companies": companies_list if category.is_multi_company else None,
        "plant": {
            "id": category.plant.id,
            "name": category.plant.plant_name,
            "code": category.plant.plant_code
        } if category.plant else None,
        "scope": scope,
        "scope_detail": scope_detail,
        "applies_to_all_plants": category.plant_id is None,
        "is_multi_company": category.is_multi_company,
        "subcategories": [{
            "id": sc.id,
            "name": sc.sub_category_name,
            "code": sc.sub_category_code,
            "description": sc.description,
            "is_active": sc.is_active
        } for sc in subcategories],
        "created_by": {
            "id": category.created_by_user.id,
            "name": category.created_by_user.full_name
        } if category.created_by_user else None,
        "created_at": category.created_at,
        "updated_at": category.updated_at
    }


@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    category_name: Optional[str] = Form(None),
    category_code: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update category"""
    
    category = db.query(cat_models.Category).filter(cat_models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check user access
    companies_list = get_category_companies(db, category_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if category.plant_id and not check_user_plant_access(db, user_id, category.plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if category_name:
        category.category_name = category_name.strip()
    
    if category_code:
        existing_code = db.query(cat_models.Category).filter(
            cat_models.Category.category_code == category_code.strip().upper(),
            cat_models.Category.id != category_id
        ).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="Category code already exists")
        
        category.category_code = category_code.strip().upper()
    
    if description is not None:
        category.description = description.strip() if description else None
    
    if is_active is not None:
        category.is_active = is_active
    
    category.updated_by = user_id
    
    db.commit()
    db.refresh(category)
    
    return {
        "message": "Category updated successfully",
        "category_id": category.id,
        "category_name": category.category_name,
        "category_code": category.category_code
    }


@router.delete("/categories/{category_id}")
async def delete_category(category_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    """Delete category (soft delete)"""
    
    category = db.query(cat_models.Category).filter(cat_models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check user access
    companies_list = get_category_companies(db, category_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if category.plant_id and not check_user_plant_access(db, user_id, category.plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if has active subcategories
    active_subcats = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id == category_id,
        cat_models.SubCategory.is_active == True
    ).count()
    
    if active_subcats > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {active_subcats} active subcategories"
        )
    
    category.is_active = False
    category.updated_by = user_id
    
    db.commit()
    
    return {"message": f"Category '{category.category_name}' deactivated successfully"}


# ==================== SUB-CATEGORY ENDPOINTS ====================

@router.post("/subcategories", response_model=dict)
async def create_subcategory(
    category_id: int = Form(...),
    sub_category_name: str = Form(...),
    sub_category_code: str = Form(...),
    description: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Create new sub-category"""
    
    category = db.query(cat_models.Category).options(
        joinedload(cat_models.Category.company),
        joinedload(cat_models.Category.plant)
    ).filter(cat_models.Category.id == category_id).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check user access
    companies_list = get_category_companies(db, category_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if category.plant_id and not check_user_plant_access(db, user_id, category.plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check duplicate name
    existing_name = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id == category_id,
        cat_models.SubCategory.sub_category_name == sub_category_name.strip()
    ).first()
    
    if existing_name:
        raise HTTPException(
            status_code=400,
            detail=f"Sub-category '{sub_category_name}' already exists in this category"
        )
    
    # Check duplicate code
    existing_code = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.sub_category_code == sub_category_code.strip().upper()
    ).first()
    
    if existing_code:
        raise HTTPException(
            status_code=400,
            detail=f"Sub-category code '{sub_category_code}' already exists"
        )
    
    db_subcat = cat_models.SubCategory(
        category_id=category_id,
        sub_category_name=sub_category_name.strip(),
        sub_category_code=sub_category_code.strip().upper(),
        description=description.strip() if description else None,
        is_active=True,
        created_by=user_id
    )
    
    db.add(db_subcat)
    db.commit()
    db.refresh(db_subcat)
    
    # Build scope info
    if category.is_multi_company:
        company_codes = ", ".join([c["code"] for c in companies_list])
        scope_info = f"Multi-Company ({company_codes})"
    elif category.plant_id is None:
        scope_info = f"Company-wide ({category.company.company_code})"
    else:
        scope_info = f"Plant-specific ({category.plant.plant_code})"
    
    return {
        "message": "Sub-category created successfully",
        "subcategory_id": db_subcat.id,
        "subcategory_name": db_subcat.sub_category_name,
        "subcategory_code": db_subcat.sub_category_code,
        "category": category.category_name,
        "category_scope": scope_info
    }


@router.get("/categories/{category_id}/subcategories")
async def get_subcategories(
    category_id: int,
    user_id: int = Query(...),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get all sub-categories for a category"""
    
    category = db.query(cat_models.Category).options(
        joinedload(cat_models.Category.company),
        joinedload(cat_models.Category.plant)
    ).filter(cat_models.Category.id == category_id).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check user access
    companies_list = get_category_companies(db, category_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if category.plant_id and not check_user_plant_access(db, user_id, category.plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id == category_id
    )
    
    if not include_inactive:
        query = query.filter(cat_models.SubCategory.is_active == True)
    
    subcategories = query.order_by(cat_models.SubCategory.sub_category_name).all()
    
    # Build scope info
    if category.is_multi_company:
        company_codes = ", ".join([c["code"] for c in companies_list])
        scope = "Multi-Company"
        scope_detail = f"Multiple companies: {company_codes}"
    elif category.plant_id is None:
        scope = "Company-wide"
        scope_detail = f"All plants in {category.company.company_code}"
    else:
        scope = "Plant-specific"
        scope_detail = f"Only in {category.plant.plant_code}"
    
    return {
        "category": {
            "id": category.id,
            "name": category.category_name,
            "code": category.category_code,
            "company_code": companies_list[0]["code"] if companies_list else None,
            "plant_code": category.plant.plant_code if category.plant else None,
            "scope": scope,
            "scope_detail": scope_detail,
            "applies_to_all_plants": category.plant_id is None,
            "is_multi_company": category.is_multi_company
        },
        "subcategories": [{
            "id": sc.id,
            "sub_category_name": sc.sub_category_name,
            "sub_category_code": sc.sub_category_code,
            "description": sc.description,
            "is_active": sc.is_active,
            "created_at": sc.created_at
        } for sc in subcategories],
        "total": len(subcategories)
    }


@router.put("/subcategories/{subcategory_id}")
async def update_subcategory(
    subcategory_id: int,
    sub_category_name: Optional[str] = Form(None),
    sub_category_code: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update sub-category"""
    
    subcat = db.query(cat_models.SubCategory).options(
        joinedload(cat_models.SubCategory.category)
    ).filter(cat_models.SubCategory.id == subcategory_id).first()
    
    if not subcat:
        raise HTTPException(status_code=404, detail="Sub-category not found")
    
    # Check user access
    companies_list = get_category_companies(db, subcat.category_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if subcat.category.plant_id and not check_user_plant_access(db, user_id, subcat.category.plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if sub_category_name:
        existing = db.query(cat_models.SubCategory).filter(
            cat_models.SubCategory.category_id == subcat.category_id,
            cat_models.SubCategory.sub_category_name == sub_category_name.strip(),
            cat_models.SubCategory.id != subcategory_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Sub-category name already exists in this category")
        
        subcat.sub_category_name = sub_category_name.strip()
    
    if sub_category_code:
        existing_code = db.query(cat_models.SubCategory).filter(
            cat_models.SubCategory.sub_category_code == sub_category_code.strip().upper(),
            cat_models.SubCategory.id != subcategory_id
        ).first()
        if existing_code:
            raise HTTPException(status_code=400, detail="Sub-category code already exists")
        
        subcat.sub_category_code = sub_category_code.strip().upper()
    
    if description is not None:
        subcat.description = description.strip() if description else None
    
    if is_active is not None:
        subcat.is_active = is_active
    
    subcat.updated_by = user_id
    
    db.commit()
    db.refresh(subcat)
    
    return {
        "message": "Sub-category updated successfully",
        "subcategory_id": subcat.id,
        "subcategory_name": subcat.sub_category_name,
        "subcategory_code": subcat.sub_category_code
    }


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    """Delete sub-category (soft delete)"""
    
    subcat = db.query(cat_models.SubCategory).options(
        joinedload(cat_models.SubCategory.category)
    ).filter(cat_models.SubCategory.id == subcategory_id).first()
    
    if not subcat:
        raise HTTPException(status_code=404, detail="Sub-category not found")
    
    # Check user access
    companies_list = get_category_companies(db, subcat.category_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if subcat.category.plant_id and not check_user_plant_access(db, user_id, subcat.category.plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    subcat.is_active = False
    subcat.updated_by = user_id
    
    db.commit()
    
    return {"message": f"Sub-category '{subcat.sub_category_name}' deactivated successfully"}


@router.get("/categories/tree/by-plant/{plant_id}")
async def get_category_tree(
    plant_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Get all categories and subcategories for a plant"""
    
    if not check_user_plant_access(db, user_id, plant_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Single-company categories
    single_company_cats = db.query(cat_models.Category).filter(
        cat_models.Category.company_id == plant.company_id,
        cat_models.Category.is_multi_company == False,
        or_(
            cat_models.Category.plant_id.is_(None),
            cat_models.Category.plant_id == plant_id
        ),
        cat_models.Category.is_active == True
    ).all()
    
    # Multi-company categories
    multi_company_subquery = db.query(cat_models.CategoryCompanyMapping.category_id).filter(
        cat_models.CategoryCompanyMapping.company_id == plant.company_id
    )
    
    multi_company_cats = db.query(cat_models.Category).filter(
        cat_models.Category.is_multi_company == True,
        cat_models.Category.id.in_(multi_company_subquery),
        cat_models.Category.is_active == True
    ).all()
    
    # Build result
    result = []
    for cat in single_company_cats + multi_company_cats:
        subcats = db.query(cat_models.SubCategory).filter(
            cat_models.SubCategory.category_id == cat.id,
            cat_models.SubCategory.is_active == True
        ).all()
        
        companies_list = get_category_companies(db, cat.id)
        
        if cat.is_multi_company:
            company_codes = ", ".join([c["code"] for c in companies_list])
            scope = "Multi-Company"
            scope_detail = f"Multiple companies: {company_codes}"
        elif cat.plant_id is None:
            scope = "Company-wide"
            scope_detail = "Available in all plants"
        else:
            scope = "Plant-specific"
            scope_detail = "Only in this plant"
        
        result.append({
            "id": cat.id,
            "category_name": cat.category_name,
            "category_code": cat.category_code,
            "description": cat.description,
            "scope": scope,
            "scope_detail": scope_detail,
            "applies_to_all_plants": cat.plant_id is None,
            "is_multi_company": cat.is_multi_company,
            "subcategories": [{
                "id": sc.id,
                "sub_category_name": sc.sub_category_name,
                "sub_category_code": sc.sub_category_code,
                "description": sc.description
            } for sc in subcats]
        })
    
    return {"plant_id": plant_id, "categories": result, "total": len(result)}