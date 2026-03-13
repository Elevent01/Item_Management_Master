"""productClassification/product_routes.py - Complete Product Classification Management"""
from fastapi import APIRouter, HTTPException, Depends, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
import re

from database import get_db
import db_models as models
from productClassification import product_models as prod_models
from category import category_models as cat_models
from productClassification import product_schemas as schemas
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


def get_product_type_companies(db: Session, product_type_id: int) -> List[dict]:
    """Get all companies associated with a product type"""
    product_type = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.id == product_type_id
    ).first()
    
    if not product_type:
        return []
    
    if product_type.is_multi_company:
        # Multi-company product type
        mappings = db.query(prod_models.ProductTypeCompanyMapping).filter(
            prod_models.ProductTypeCompanyMapping.product_type_id == product_type_id
        ).options(joinedload(prod_models.ProductTypeCompanyMapping.company)).all()
        
        return [{
            "id": m.company.id,
            "name": m.company.company_name,
            "code": m.company.company_code
        } for m in mappings]
    else:
        # Single company product type
        if product_type.company_id:
            company = db.query(models.Company).filter(
                models.Company.id == product_type.company_id
            ).first()
            if company:
                return [{
                    "id": company.id,
                    "name": company.company_name,
                    "code": company.company_code
                }]
    
    return []


def generate_product_type_code(db: Session, name: str) -> str:
    """Generate unique product type code"""
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    base_code = clean_name[:6] if len(clean_name) >= 6 else clean_name.ljust(6, 'X')
    
    existing_codes = db.query(prod_models.ProductType.product_type_code).filter(
        prod_models.ProductType.product_type_code.like(f"{base_code}-%")
    ).all()
    
    if not existing_codes:
        return f"{base_code}-001"
    
    max_num = 0
    for (code,) in existing_codes:
        try:
            num = int(code.split('-')[-1])
            max_num = max(max_num, num)
        except (ValueError, IndexError):
            continue
    
    return f"{base_code}-{max_num + 1:03d}"


def generate_product_code(db: Session, product_type_id: int, name: str) -> str:
    """Generate unique product code"""
    product_type = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.id == product_type_id
    ).first()
    
    if not product_type:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    pt_code = product_type.product_type_code.split('-')[0]
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    prod_base = clean_name[:4] if len(clean_name) >= 4 else clean_name.ljust(4, 'X')
    
    base_pattern = f"{pt_code}-{prod_base}"
    
    existing_codes = db.query(prod_models.Product.product_code).filter(
        prod_models.Product.product_type_id == product_type_id
    ).all()
    
    existing_codes_set = {code[0] for code in existing_codes}
    
    max_num = 0
    for code in existing_codes_set:
        try:
            parts = code.split('-')
            if len(parts) >= 2:
                num = int(parts[-1])
                max_num = max(max_num, num)
        except (ValueError, IndexError):
            continue
    
    return f"{base_pattern}-{max_num + 1:04d}"


def generate_classification_code(db: Session, product_id: int, name: str) -> str:
    """Generate unique classification code"""
    product = db.query(prod_models.Product).filter(
        prod_models.Product.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    prod_code = product.product_code.split('-')[0]
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    class_base = clean_name[:4] if len(clean_name) >= 4 else clean_name.ljust(4, 'X')
    
    base_pattern = f"{prod_code}-CLS-{class_base}"
    
    existing_codes = db.query(prod_models.ProductClassification.classification_code).filter(
        prod_models.ProductClassification.product_id == product_id
    ).all()
    
    existing_codes_set = {code[0] for code in existing_codes}
    
    max_num = 0
    for code in existing_codes_set:
        try:
            parts = code.split('-')
            if len(parts) >= 3:
                num = int(parts[-1])
                max_num = max(max_num, num)
        except (ValueError, IndexError):
            continue
    
    return f"{base_pattern}-{max_num + 1:03d}"


# ==================== PRODUCT TYPE CRUD ENDPOINTS ====================

@router.get("/user/{user_id}/accessible-subcategories-for-product-type")
async def get_accessible_subcategories(user_id: int, db: Session = Depends(get_db)):
    """Get all subcategories accessible to user for product type creation"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id)
    
    if not accessible_companies:
        return {"subcategories": []}
    
    # Get accessible categories first
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
    ).all()
    
    multi_company_subquery = db.query(cat_models.CategoryCompanyMapping.category_id).filter(
        cat_models.CategoryCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_cats = db.query(cat_models.Category).filter(
        cat_models.Category.is_multi_company == True,
        cat_models.Category.id.in_(multi_company_subquery),
        cat_models.Category.is_active == True
    ).all()
    
    category_ids = [c.id for c in single_company_cats + multi_company_cats]
    
    if not category_ids:
        return {"subcategories": []}
    
    # Get subcategories
    subcategories = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id.in_(category_ids),
        cat_models.SubCategory.is_active == True
    ).options(
        joinedload(cat_models.SubCategory.category)
    ).all()
    
    result = []
    for sc in subcategories:
        cat = sc.category
        
        if cat.is_multi_company:
            companies = get_product_type_companies(db, cat.id)
            company_codes = ", ".join([c["code"] for c in companies])
            scope_label = f"{cat.category_name} > {sc.sub_category_name} (Multi-Company: {company_codes})"
        elif cat.plant_id:
            scope_label = f"{cat.category_name} > {sc.sub_category_name} (Plant: {cat.plant.plant_code})"
        else:
            scope_label = f"{cat.category_name} > {sc.sub_category_name} (Company: {cat.company.company_code})"
        
        result.append({
            "id": sc.id,
            "sub_category_name": sc.sub_category_name,
            "sub_category_code": sc.sub_category_code,
            "category_name": cat.category_name,
            "category_code": cat.category_code,
            "scope_label": scope_label
        })
    
    return {"subcategories": result}


@router.post("/product-types", response_model=dict)
async def create_product_type(
    product_type_name: str = Form(...),
    product_type_code: Optional[str] = Form(None),  # CHANGED: Now optional manual code
    sub_category_id: Optional[int] = Form(None),
    company_ids: Optional[str] = Form(None),
    plant_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Create new product type
    - product_type_code: Optional manual code, auto-generated if not provided
    - Optional sub_category_id: If provided, inherits scope from subcategory
    - If no sub_category: company_ids required (comma-separated)
    - plant_id: Optional, only for single company
    """
    
    # CHANGED: Use manual code if provided, otherwise auto-generate
    if product_type_code and product_type_code.strip():
        final_code = product_type_code.strip()
    else:
        final_code = generate_product_type_code(db, product_type_name)
    
    # Check duplicate code
    existing_code = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.product_type_code == final_code
    ).first()
    
    if existing_code:
        raise HTTPException(status_code=400, detail="Product type code already exists")
    
    # Scenario 1: Linked to SubCategory
    if sub_category_id:
        subcategory = db.query(cat_models.SubCategory).options(
            joinedload(cat_models.SubCategory.category)
        ).filter(cat_models.SubCategory.id == sub_category_id).first()
        
        if not subcategory:
            raise HTTPException(status_code=404, detail="SubCategory not found")
        
        category = subcategory.category
        
        # Inherit scope from category
        db_product_type = prod_models.ProductType(
            sub_category_id=sub_category_id,
            company_id=category.company_id,
            plant_id=category.plant_id,
            is_multi_company=category.is_multi_company,
            product_type_name=product_type_name.strip(),
            product_type_code=final_code,  # CHANGED: Use final_code
            description=description.strip() if description else None,
            is_active=True,
            created_by=user_id
        )
        
        db.add(db_product_type)
        db.flush()
        
        # If multi-company, create mappings
        if category.is_multi_company:
            cat_companies = db.query(cat_models.CategoryCompanyMapping).filter(
                cat_models.CategoryCompanyMapping.category_id == category.id
            ).all()
            
            for cc in cat_companies:
                mapping = prod_models.ProductTypeCompanyMapping(
                    product_type_id=db_product_type.id,
                    company_id=cc.company_id
                )
                db.add(mapping)
        
        db.commit()
        db.refresh(db_product_type)
        
        scope_info = f"Linked to SubCategory: {subcategory.sub_category_name} ({category.category_name})"
        
    else:
        # Scenario 2: Standalone (no subcategory)
        if not company_ids:
            raise HTTPException(
                status_code=400,
                detail="company_ids required when creating standalone product type"
            )
        
        try:
            company_id_list = [int(cid.strip()) for cid in company_ids.split(",") if cid.strip()]
        except:
            raise HTTPException(status_code=400, detail="Invalid company_ids format")
        
        if not company_id_list:
            raise HTTPException(status_code=400, detail="At least one company must be selected")
        
        # Validate companies
        for cid in company_id_list:
            company = db.query(models.Company).filter(models.Company.id == cid).first()
            if not company:
                raise HTTPException(status_code=404, detail=f"Company ID {cid} not found")
            
            if not check_user_company_access(db, user_id, cid):
                raise HTTPException(status_code=403, detail=f"No access to company ID {cid}")
        
        # Validate plant
        if plant_id:
            if len(company_id_list) > 1:
                raise HTTPException(
                    status_code=400,
                    detail="Plant-specific product types can only be for single company"
                )
            
            plant = db.query(models.Plant).filter(
                models.Plant.id == plant_id,
                models.Plant.company_id == company_id_list[0]
            ).first()
            
            if not plant:
                raise HTTPException(status_code=404, detail="Plant not found")
            
            if not check_user_plant_access(db, user_id, plant_id):
                raise HTTPException(status_code=403, detail="No access to this plant")
        
        is_multi_company = len(company_id_list) > 1
        
        db_product_type = prod_models.ProductType(
            sub_category_id=None,
            company_id=company_id_list[0] if not is_multi_company else None,
            plant_id=plant_id,
            is_multi_company=is_multi_company,
            product_type_name=product_type_name.strip(),
            product_type_code=final_code,  # CHANGED: Use final_code
            description=description.strip() if description else None,
            is_active=True,
            created_by=user_id
        )
        
        db.add(db_product_type)
        db.flush()
        
        # Create company mappings for multi-company
        if is_multi_company:
            for cid in company_id_list:
                mapping = prod_models.ProductTypeCompanyMapping(
                    product_type_id=db_product_type.id,
                    company_id=cid
                )
                db.add(mapping)
        
        db.commit()
        db.refresh(db_product_type)
        
        if is_multi_company:
            companies = db.query(models.Company).filter(
                models.Company.id.in_(company_id_list)
            ).all()
            company_names = ", ".join([c.company_name for c in companies])
            scope_info = f"Multi-Company: {company_names}"
        elif plant_id:
            plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
            scope_info = f"Plant: {plant.plant_name}"
        else:
            company = db.query(models.Company).filter(
                models.Company.id == company_id_list[0]
            ).first()
            scope_info = f"Company-wide: {company.company_name}"
    
    return {
        "message": "Product Type created successfully",
        "product_type_id": db_product_type.id,
        "product_type_name": db_product_type.product_type_name,
        "product_type_code": db_product_type.product_type_code,
        "scope": scope_info
    }


@router.get("/product-types/by-user/{user_id}")
async def get_product_types_by_user(
    user_id: int,
    sub_category_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    plant_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all product types accessible to user with dynamic filtering"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id, company_id)
    
    if not accessible_companies:
        return {"product_types": [], "total": 0}
    
    # Build query for single-company product types
    single_company_query = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.is_multi_company == False,
        or_(
            and_(
                prod_models.ProductType.company_id.in_(accessible_companies),
                prod_models.ProductType.plant_id.is_(None)
            ),
            prod_models.ProductType.plant_id.in_(accessible_plants) if accessible_plants else False
        )
    )
    
    # Build query for multi-company product types
    multi_company_subquery = db.query(prod_models.ProductTypeCompanyMapping.product_type_id).filter(
        prod_models.ProductTypeCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_query = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.is_multi_company == True,
        prod_models.ProductType.id.in_(multi_company_subquery)
    )
    
    # Combine queries
    query = single_company_query.union(multi_company_query).options(
        joinedload(prod_models.ProductType.sub_category),
        joinedload(prod_models.ProductType.company),
        joinedload(prod_models.ProductType.plant)
    )
    
    # Apply filters
    if sub_category_id:
        query = query.filter(prod_models.ProductType.sub_category_id == sub_category_id)
    
    if company_id:
        query = query.filter(
            or_(
                prod_models.ProductType.company_id == company_id,
                prod_models.ProductType.id.in_(
                    db.query(prod_models.ProductTypeCompanyMapping.product_type_id).filter(
                        prod_models.ProductTypeCompanyMapping.company_id == company_id
                    )
                )
            )
        )
    
    if plant_id:
        query = query.filter(
            or_(
                prod_models.ProductType.plant_id == plant_id,
                prod_models.ProductType.plant_id.is_(None)
            )
        )
    
    if search:
        query = query.filter(
            or_(
                prod_models.ProductType.product_type_name.ilike(f"%{search}%"),
                prod_models.ProductType.product_type_code.ilike(f"%{search}%")
            )
        )
    
    if is_active is not None:
        query = query.filter(prod_models.ProductType.is_active == is_active)
    
    product_types = query.order_by(prod_models.ProductType.product_type_name).all()
    
    # Format response
    result = []
    for pt in product_types:
        product_count = db.query(func.count(prod_models.Product.id)).filter(
            prod_models.Product.product_type_id == pt.id
        ).scalar()
        
        companies_list = get_product_type_companies(db, pt.id)
        
        # Determine scope
        if pt.sub_category_id:
            scope = "Linked to SubCategory"
            scope_detail = f"SubCategory: {pt.sub_category.sub_category_name}"
        elif pt.is_multi_company:
            scope = "Multi-Company Standalone"
            company_codes = ", ".join([c["code"] for c in companies_list])
            scope_detail = f"Companies: {company_codes}"
        elif pt.plant_id:
            scope = "Plant-Specific Standalone"
            scope_detail = f"Plant: {pt.plant.plant_code}"
        else:
            scope = "Company-Wide Standalone"
            scope_detail = f"Company: {pt.company.company_code}"
        
        result.append({
            "id": pt.id,
            "product_type_name": pt.product_type_name,
            "product_type_code": pt.product_type_code,
            "description": pt.description,
            "is_active": pt.is_active,
            "sub_category": {
                "id": pt.sub_category.id,
                "name": pt.sub_category.sub_category_name,
                "code": pt.sub_category.sub_category_code
            } if pt.sub_category else None,
            "company": companies_list[0] if companies_list else None,
            "companies": companies_list if pt.is_multi_company else None,
            "plant": {
                "id": pt.plant.id,
                "name": pt.plant.plant_name,
                "code": pt.plant.plant_code
            } if pt.plant else None,
            "scope": scope,
            "scope_detail": scope_detail,
            "is_multi_company": pt.is_multi_company,
            "total_products": product_count,
            "created_at": pt.created_at
        })
    
    return {"product_types": result, "total": len(result)}


@router.get("/product-types/{product_type_id}/details")
async def get_product_type_details(
    product_type_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Get complete product type details"""
    
    product_type = db.query(prod_models.ProductType).options(
        joinedload(prod_models.ProductType.sub_category),
        joinedload(prod_models.ProductType.company),
        joinedload(prod_models.ProductType.plant),
        joinedload(prod_models.ProductType.created_by_user)
    ).filter(prod_models.ProductType.id == product_type_id).first()
    
    if not product_type:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get products
    products = db.query(prod_models.Product).filter(
        prod_models.Product.product_type_id == product_type_id
    ).all()
    
    # Determine scope
    if product_type.sub_category_id:
        scope = "Linked to SubCategory"
        scope_detail = f"SubCategory: {product_type.sub_category.sub_category_name}"
    elif product_type.is_multi_company:
        scope = "Multi-Company Standalone"
        company_codes = ", ".join([c["code"] for c in companies_list])
        scope_detail = f"Companies: {company_codes}"
    elif product_type.plant_id:
        scope = "Plant-Specific Standalone"
        scope_detail = f"Plant: {product_type.plant.plant_code}"
    else:
        scope = "Company-Wide Standalone"
        scope_detail = f"Company: {product_type.company.company_code}"
    
    return {
        "id": product_type.id,
        "product_type_name": product_type.product_type_name,
        "product_type_code": product_type.product_type_code,
        "description": product_type.description,
        "is_active": product_type.is_active,
        "sub_category": {
            "id": product_type.sub_category.id,
            "name": product_type.sub_category.sub_category_name,
            "code": product_type.sub_category.sub_category_code
        } if product_type.sub_category else None,
        "company": companies_list[0] if companies_list else None,
        "companies": companies_list if product_type.is_multi_company else None,
        "plant": {
            "id": product_type.plant.id,
            "name": product_type.plant.plant_name,
            "code": product_type.plant.plant_code
        } if product_type.plant else None,
        "scope": scope,
        "scope_detail": scope_detail,
        "is_multi_company": product_type.is_multi_company,
        "products": [{
            "id": p.id,
            "product_name": p.product_name,
            "product_code": p.product_code,
            "description": p.description,
            "sku": p.sku,
            "is_active": p.is_active
        } for p in products],
        "created_by": {
            "id": product_type.created_by_user.id,
            "name": product_type.created_by_user.full_name
        } if product_type.created_by_user else None,
        "created_at": product_type.created_at,
        "updated_at": product_type.updated_at
    }


@router.put("/product-types/{product_type_id}")
async def update_product_type(
    product_type_id: int,
    product_type_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update product type (code cannot be changed)"""
    
    product_type = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.id == product_type_id
    ).first()
    
    if not product_type:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if product_type_name:
        product_type.product_type_name = product_type_name.strip()
    
    if description is not None:
        product_type.description = description.strip() if description else None
    
    if is_active is not None:
        product_type.is_active = is_active
    
    product_type.updated_by = user_id
    
    db.commit()
    db.refresh(product_type)
    
    return {
        "message": "Product Type updated successfully",
        "product_type_id": product_type.id,
        "product_type_name": product_type.product_type_name
    }


@router.delete("/product-types/{product_type_id}")
async def delete_product_type(
    product_type_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Delete product type (soft delete)"""
    
    product_type = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.id == product_type_id
    ).first()
    
    if not product_type:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if has active products
    active_products = db.query(prod_models.Product).filter(
        prod_models.Product.product_type_id == product_type_id,
        prod_models.Product.is_active == True
    ).count()
    
    if active_products > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete product type with {active_products} active products"
        )
    
    product_type.is_active = False
    product_type.updated_by = user_id
    
    db.commit()
    
    return {"message": f"Product Type '{product_type.product_type_name}' deactivated successfully"}


# ==================== PRODUCT CRUD ENDPOINTS ====================

@router.get("/user/{user_id}/accessible-product-types")
async def get_accessible_product_types(
    user_id: int,
    sub_category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all product types accessible to user for product creation"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id)
    
    if not accessible_companies:
        return {"product_types": []}
    
    # Single-company product types
    single_company_pts = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.is_multi_company == False,
        or_(
            and_(
                prod_models.ProductType.company_id.in_(accessible_companies),
                prod_models.ProductType.plant_id.is_(None)
            ),
            prod_models.ProductType.plant_id.in_(accessible_plants) if accessible_plants else False
        ),
        prod_models.ProductType.is_active == True
    ).options(
        joinedload(prod_models.ProductType.sub_category),
        joinedload(prod_models.ProductType.company),
        joinedload(prod_models.ProductType.plant)
    ).all()
    
    # Multi-company product types
    multi_company_subquery = db.query(prod_models.ProductTypeCompanyMapping.product_type_id).filter(
        prod_models.ProductTypeCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_pts = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.is_multi_company == True,
        prod_models.ProductType.id.in_(multi_company_subquery),
        prod_models.ProductType.is_active == True
    ).options(
        joinedload(prod_models.ProductType.sub_category)
    ).all()
    
    all_pts = single_company_pts + multi_company_pts
    
    # Apply subcategory filter
    if sub_category_id:
        all_pts = [pt for pt in all_pts if pt.sub_category_id == sub_category_id]
    
    result = []
    for pt in all_pts:
        companies_list = get_product_type_companies(db, pt.id)
        
        if pt.sub_category_id:
            scope_label = f"{pt.product_type_name} (SubCat: {pt.sub_category.sub_category_name})"
        elif pt.is_multi_company:
            company_codes = ", ".join([c["code"] for c in companies_list])
            scope_label = f"{pt.product_type_name} (Multi-Company: {company_codes})"
        elif pt.plant_id:
            scope_label = f"{pt.product_type_name} (Plant: {pt.plant.plant_code})"
        else:
            scope_label = f"{pt.product_type_name} (Company: {pt.company.company_code})"
        
        result.append({
            "id": pt.id,
            "product_type_name": pt.product_type_name,
            "product_type_code": pt.product_type_code,
            "scope_label": scope_label,
            "sub_category_id": pt.sub_category_id
        })
    
    return {"product_types": result}


@router.post("/products", response_model=dict)
async def create_product(
    product_name: str = Form(...),
    product_type_id: int = Form(...),
    product_code: Optional[str] = Form(None),  # CHANGED: Now optional manual code
    description: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    barcode: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Create new product"""
    
    product_type = db.query(prod_models.ProductType).filter(
        prod_models.ProductType.id == product_type_id
    ).first()
    
    if not product_type:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check duplicate name
    existing_name = db.query(prod_models.Product).filter(
        prod_models.Product.product_type_id == product_type_id,
        prod_models.Product.product_name == product_name.strip()
    ).first()
    
    if existing_name:
        raise HTTPException(
            status_code=400,
            detail=f"Product '{product_name}' already exists in this product type"
        )
    
    # CHANGED: Use manual code if provided, otherwise auto-generate
    if product_code and product_code.strip():
        final_product_code = product_code.strip()
        # Check if manually provided code already exists
        existing_code = db.query(prod_models.Product).filter(
            prod_models.Product.product_code == final_product_code
        ).first()
        if existing_code:
            raise HTTPException(status_code=400, detail=f"Product code '{final_product_code}' already exists")
    else:
        final_product_code = generate_product_code(db, product_type_id, product_name)
    
    # Check duplicate SKU
    if sku:
        existing_sku = db.query(prod_models.Product).filter(
            prod_models.Product.sku == sku.strip()
        ).first()
        if existing_sku:
            raise HTTPException(status_code=400, detail=f"SKU '{sku}' already exists")
    
    # Check duplicate barcode
    if barcode:
        existing_barcode = db.query(prod_models.Product).filter(
            prod_models.Product.barcode == barcode.strip()
        ).first()
        if existing_barcode:
            raise HTTPException(status_code=400, detail=f"Barcode '{barcode}' already exists")
    
    db_product = prod_models.Product(
        product_type_id=product_type_id,
        product_name=product_name.strip(),
        product_code=final_product_code,  # CHANGED: Use final_product_code
        description=description.strip() if description else None,
        sku=sku.strip() if sku else None,
        barcode=barcode.strip() if barcode else None,
        is_active=True,
        created_by=user_id
    )
    
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    return {
        "message": "Product created successfully",
        "product_id": db_product.id,
        "product_name": db_product.product_name,
        "product_code": db_product.product_code,
        "product_type": product_type.product_type_name
    }


@router.get("/products/by-user/{user_id}")
async def get_products_by_user(
    user_id: int,
    product_type_id: Optional[int] = Query(None),
    sub_category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all products accessible to user with dynamic filtering"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id)
    
    if not accessible_companies:
        return {"products": [], "total": 0}
    
    # Get accessible product types first
    single_company_pts = db.query(prod_models.ProductType.id).filter(
        prod_models.ProductType.is_multi_company == False,
        or_(
            and_(
                prod_models.ProductType.company_id.in_(accessible_companies),
                prod_models.ProductType.plant_id.is_(None)
            ),
            prod_models.ProductType.plant_id.in_(accessible_plants) if accessible_plants else False
        )
    ).all()
    
    multi_company_subquery = db.query(prod_models.ProductTypeCompanyMapping.product_type_id).filter(
        prod_models.ProductTypeCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_pts = db.query(prod_models.ProductType.id).filter(
        prod_models.ProductType.is_multi_company == True,
        prod_models.ProductType.id.in_(multi_company_subquery)
    ).all()
    
    accessible_pt_ids = [pt_id for (pt_id,) in single_company_pts + multi_company_pts]
    
    if not accessible_pt_ids:
        return {"products": [], "total": 0}
    
    # Build query
    query = db.query(prod_models.Product).filter(
        prod_models.Product.product_type_id.in_(accessible_pt_ids)
    ).options(
        joinedload(prod_models.Product.product_type)
    )
    
    # Apply filters
    if product_type_id:
        query = query.filter(prod_models.Product.product_type_id == product_type_id)
    
    if sub_category_id:
        query = query.join(prod_models.ProductType).filter(
            prod_models.ProductType.sub_category_id == sub_category_id
        )
    
    if search:
        query = query.filter(
            or_(
                prod_models.Product.product_name.ilike(f"%{search}%"),
                prod_models.Product.product_code.ilike(f"%{search}%"),
                prod_models.Product.sku.ilike(f"%{search}%")
            )
        )
    
    if is_active is not None:
        query = query.filter(prod_models.Product.is_active == is_active)
    
    products = query.order_by(prod_models.Product.product_name).all()
    
    # Format response
    result = []
    for p in products:
        classification_count = db.query(func.count(prod_models.ProductClassification.id)).filter(
            prod_models.ProductClassification.product_id == p.id
        ).scalar()
        
        result.append({
            "id": p.id,
            "product_name": p.product_name,
            "product_code": p.product_code,
            "description": p.description,
            "sku": p.sku,
            "barcode": p.barcode,
            "is_active": p.is_active,
            "product_type": {
                "id": p.product_type.id,
                "name": p.product_type.product_type_name,
                "code": p.product_type.product_type_code
            },
            "total_classifications": classification_count,
            "created_at": p.created_at
        })
    
    return {"products": result, "total": len(result)}


@router.get("/products/{product_id}/details")
async def get_product_details(
    product_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Get complete product details"""
    
    product = db.query(prod_models.Product).options(
        joinedload(prod_models.Product.product_type),
        joinedload(prod_models.Product.created_by_user)
    ).filter(prod_models.Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product.product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get classifications
    classifications = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.product_id == product_id
    ).all()
    
    return {
        "id": product.id,
        "product_name": product.product_name,
        "product_code": product.product_code,
        "description": product.description,
        "sku": product.sku,
        "barcode": product.barcode,
        "is_active": product.is_active,
        "product_type": {
            "id": product.product_type.id,
            "name": product.product_type.product_type_name,
            "code": product.product_type.product_type_code
        },
        "classifications": [{
            "id": c.id,
            "classification_name": c.classification_name,
            "classification_code": c.classification_code,
            "description": c.description,
            "grade": c.grade,
            "quality_standard": c.quality_standard,
            "certification": c.certification,
            "is_active": c.is_active
        } for c in classifications],
        "created_by": {
            "id": product.created_by_user.id,
            "name": product.created_by_user.full_name
        } if product.created_by_user else None,
        "created_at": product.created_at,
        "updated_at": product.updated_at
    }


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    product_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    barcode: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update product (code cannot be changed)"""
    
    product = db.query(prod_models.Product).filter(
        prod_models.Product.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product.product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if product_name:
        existing = db.query(prod_models.Product).filter(
            prod_models.Product.product_type_id == product.product_type_id,
            prod_models.Product.product_name == product_name.strip(),
            prod_models.Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Product name already exists")
        
        product.product_name = product_name.strip()
    
    if description is not None:
        product.description = description.strip() if description else None
    
    if sku is not None:
        if sku.strip():
            existing_sku = db.query(prod_models.Product).filter(
                prod_models.Product.sku == sku.strip(),
                prod_models.Product.id != product_id
            ).first()
            if existing_sku:
                raise HTTPException(status_code=400, detail="SKU already exists")
        product.sku = sku.strip() if sku else None
    
    if barcode is not None:
        if barcode.strip():
            existing_barcode = db.query(prod_models.Product).filter(
                prod_models.Product.barcode == barcode.strip(),
                prod_models.Product.id != product_id
            ).first()
            if existing_barcode:
                raise HTTPException(status_code=400, detail="Barcode already exists")
        product.barcode = barcode.strip() if barcode else None
    
    if is_active is not None:
        product.is_active = is_active
    
    product.updated_by = user_id
    
    db.commit()
    db.refresh(product)
    
    return {
        "message": "Product updated successfully",
        "product_id": product.id,
        "product_name": product.product_name,
        "product_code": product.product_code
    }


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Delete product (soft delete)"""
    
    product = db.query(prod_models.Product).filter(
        prod_models.Product.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product.product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if has active classifications
    active_classifications = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.product_id == product_id,
        prod_models.ProductClassification.is_active == True
    ).count()
    
    if active_classifications > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete product with {active_classifications} active classifications"
        )
    
    product.is_active = False
    product.updated_by = user_id
    
    db.commit()
    
    return {"message": f"Product '{product.product_name}' deactivated successfully"}


# ==================== PRODUCT CLASSIFICATION CRUD ENDPOINTS ====================

@router.get("/user/{user_id}/accessible-products-for-classification")
async def get_accessible_products(
    user_id: int,
    sub_category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all products accessible to user for classification creation"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id)
    
    if not accessible_companies:
        return {"products": []}
    
    # Get accessible product types
    single_company_pts = db.query(prod_models.ProductType.id).filter(
        prod_models.ProductType.is_multi_company == False,
        or_(
            and_(
                prod_models.ProductType.company_id.in_(accessible_companies),
                prod_models.ProductType.plant_id.is_(None)
            ),
            prod_models.ProductType.plant_id.in_(accessible_plants) if accessible_plants else False
        ),
        prod_models.ProductType.is_active == True
    ).all()
    
    multi_company_subquery = db.query(prod_models.ProductTypeCompanyMapping.product_type_id).filter(
        prod_models.ProductTypeCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_pts = db.query(prod_models.ProductType.id).filter(
        prod_models.ProductType.is_multi_company == True,
        prod_models.ProductType.id.in_(multi_company_subquery),
        prod_models.ProductType.is_active == True
    ).all()
    
    accessible_pt_ids = [pt_id for (pt_id,) in single_company_pts + multi_company_pts]
    
    if not accessible_pt_ids:
        return {"products": []}
    
    # Build query
    query = db.query(prod_models.Product).filter(
        prod_models.Product.product_type_id.in_(accessible_pt_ids),
        prod_models.Product.is_active == True
    ).options(
        joinedload(prod_models.Product.product_type)
    )
    
    # Apply subcategory filter if provided
    if sub_category_id:
        query = query.join(prod_models.ProductType).filter(
            prod_models.ProductType.sub_category_id == sub_category_id
        )
    
    products = query.order_by(prod_models.Product.product_name).all()
    
    result = []
    for p in products:
        pt = p.product_type
        
        if pt.sub_category_id:
            scope_label = f"{p.product_name} ({pt.product_type_name} > {pt.sub_category.sub_category_name})"
        else:
            scope_label = f"{p.product_name} ({pt.product_type_name})"
        
        result.append({
            "id": p.id,
            "product_name": p.product_name,
            "product_code": p.product_code,
            "product_type_name": pt.product_type_name,
            "scope_label": scope_label
        })
    
    return {"products": result}


@router.post("/product-classifications", response_model=dict)
async def create_product_classification(
    classification_name: str = Form(...),
    product_id: int = Form(...),
    classification_code: Optional[str] = Form(None),  # CHANGED: Now optional manual code
    description: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    quality_standard: Optional[str] = Form(None),
    certification: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Create new product classification"""
    
    product = db.query(prod_models.Product).options(
        joinedload(prod_models.Product.product_type)
    ).filter(prod_models.Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check access
    companies_list = get_product_type_companies(db, product.product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check duplicate name
    existing_name = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.product_id == product_id,
        prod_models.ProductClassification.classification_name == classification_name.strip()
    ).first()
    
    if existing_name:
        raise HTTPException(
            status_code=400,
            detail=f"Classification '{classification_name}' already exists for this product"
        )
    
    # CHANGED: Use manual code if provided, otherwise auto-generate
    if classification_code and classification_code.strip():
        final_classification_code = classification_code.strip()
        # Check if manually provided code already exists
        existing_code = db.query(prod_models.ProductClassification).filter(
            prod_models.ProductClassification.classification_code == final_classification_code
        ).first()
        if existing_code:
            raise HTTPException(status_code=400, detail=f"Classification code '{final_classification_code}' already exists")
    else:
        final_classification_code = generate_classification_code(db, product_id, classification_name)
    
    db_classification = prod_models.ProductClassification(
        product_id=product_id,
        classification_name=classification_name.strip(),
        classification_code=final_classification_code,  # CHANGED: Use final_classification_code
        description=description.strip() if description else None,
        grade=grade.strip() if grade else None,
        quality_standard=quality_standard.strip() if quality_standard else None,
        certification=certification.strip() if certification else None,
        is_active=True,
        created_by=user_id
    )
    
    db.add(db_classification)
    db.commit()
    db.refresh(db_classification)
    
    return {
        "message": "Product Classification created successfully",
        "classification_id": db_classification.id,
        "classification_name": db_classification.classification_name,
        "classification_code": db_classification.classification_code,
        "product": product.product_name,
        "product_type": product.product_type.product_type_name
    }


@router.get("/product-classifications/by-user/{user_id}")
async def get_classifications_by_user(
    user_id: int,
    product_id: Optional[int] = Query(None),
    sub_category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all classifications accessible to user"""
    
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id)
    
    if not accessible_companies:
        return {"classifications": [], "total": 0}
    
    # Get accessible product types
    single_company_pts = db.query(prod_models.ProductType.id).filter(
        prod_models.ProductType.is_multi_company == False,
        or_(
            and_(
                prod_models.ProductType.company_id.in_(accessible_companies),
                prod_models.ProductType.plant_id.is_(None)
            ),
            prod_models.ProductType.plant_id.in_(accessible_plants) if accessible_plants else False
        )
    ).all()
    
    multi_company_subquery = db.query(prod_models.ProductTypeCompanyMapping.product_type_id).filter(
        prod_models.ProductTypeCompanyMapping.company_id.in_(accessible_companies)
    ).distinct()
    
    multi_company_pts = db.query(prod_models.ProductType.id).filter(
        prod_models.ProductType.is_multi_company == True,
        prod_models.ProductType.id.in_(multi_company_subquery)
    ).all()
    
    accessible_pt_ids = [pt_id for (pt_id,) in single_company_pts + multi_company_pts]
    
    if not accessible_pt_ids:
        return {"classifications": [], "total": 0}
    
    # Get accessible products
    accessible_product_ids = db.query(prod_models.Product.id).filter(
        prod_models.Product.product_type_id.in_(accessible_pt_ids)
    ).all()
    accessible_product_ids = [pid for (pid,) in accessible_product_ids]
    
    if not accessible_product_ids:
        return {"classifications": [], "total": 0}
    
    # Build query
    query = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.product_id.in_(accessible_product_ids)
    ).options(
        joinedload(prod_models.ProductClassification.product).joinedload(prod_models.Product.product_type)
    )
    
    # Apply filters
    if product_id:
        query = query.filter(prod_models.ProductClassification.product_id == product_id)
    
    if sub_category_id:
        query = query.join(prod_models.Product).join(prod_models.ProductType).filter(
            prod_models.ProductType.sub_category_id == sub_category_id
        )
    
    if search:
        query = query.filter(
            or_(
                prod_models.ProductClassification.classification_name.ilike(f"%{search}%"),
                prod_models.ProductClassification.classification_code.ilike(f"%{search}%")
            )
        )
    
    if is_active is not None:
        query = query.filter(prod_models.ProductClassification.is_active == is_active)
    
    classifications = query.order_by(prod_models.ProductClassification.classification_name).all()
    
    # Format response
    result = []
    for c in classifications:
        result.append({
            "id": c.id,
            "classification_name": c.classification_name,
            "classification_code": c.classification_code,
            "description": c.description,
            "grade": c.grade,
            "quality_standard": c.quality_standard,
            "certification": c.certification,
            "is_active": c.is_active,
            "product": {
                "id": c.product.id,
                "name": c.product.product_name,
                "code": c.product.product_code
            },
            "product_type": {
                "id": c.product.product_type.id,
                "name": c.product.product_type.product_type_name,
                "code": c.product.product_type.product_type_code
            },
            "created_at": c.created_at
        })
    
    return {"classifications": result, "total": len(result)}


@router.get("/product-classifications/{classification_id}/details")
async def get_classification_details(
    classification_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Get complete classification details"""
    
    classification = db.query(prod_models.ProductClassification).options(
        joinedload(prod_models.ProductClassification.product).joinedload(prod_models.Product.product_type),
        joinedload(prod_models.ProductClassification.created_by_user)
    ).filter(prod_models.ProductClassification.id == classification_id).first()
    
    if not classification:
        raise HTTPException(status_code=404, detail="Classification not found")
    
    # Check access
    companies_list = get_product_type_companies(db, classification.product.product_type_id)
    has_access = any(check_user_company_access(db, user_id, c["id"]) for c in companies_list)
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": classification.id,
        "classification_name": classification.classification_name,
        "classification_code": classification.classification_code,
        "description": classification.description,
        "grade": classification.grade,
        "quality_standard": classification.quality_standard,
        "certification": classification.certification,
        "is_active": classification.is_active,
        "product": {
            "id": classification.product.id,
            "name": classification.product.product_name,
            "code": classification.product.product_code
        },
        "product_type": {
            "id": classification.product.product_type.id,
            "name": classification.product.product_type.product_type_name,
            "code": classification.product.product_type.product_type_code
        },
        "created_by": {
            "id": classification.created_by_user.id,
            "name": classification.created_by_user.full_name
        } if classification.created_by_user else None,
        "created_at": classification.created_at,
        "updated_at": classification.updated_at
    }

@router.put("/product-classifications/{classification_id}")
async def update_product_classification(
    classification_id: int,
    classification_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    quality_standard: Optional[str] = Form(None),
    certification: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update product classification (code cannot be changed)"""

    classification = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.id == classification_id
    ).first()

    if not classification:
        raise HTTPException(status_code=404, detail="Classification not found")

    # Check access
    companies_list = get_product_type_companies(
        db, classification.product.product_type_id
    )
    has_access = any(
        check_user_company_access(db, user_id, c["id"]) for c in companies_list
    )

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    if classification_name:
        existing = db.query(prod_models.ProductClassification).filter(
            prod_models.ProductClassification.product_id == classification.product_id,
            prod_models.ProductClassification.classification_name == classification_name.strip(),
            prod_models.ProductClassification.id != classification_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Classification name already exists")

        classification.classification_name = classification_name.strip()

    if description is not None:
        classification.description = description.strip() if description else None

    if grade is not None:
        classification.grade = grade.strip() if grade else None

    if quality_standard is not None:
        classification.quality_standard = quality_standard.strip() if quality_standard else None

    if certification is not None:
        classification.certification = certification.strip() if certification else None

    if is_active is not None:
        classification.is_active = is_active

    classification.updated_by = user_id

    db.commit()
    db.refresh(classification)

    return {
        "message": "Product Classification updated successfully",
        "classification_id": classification.id,
        "classification_name": classification.classification_name,
        "classification_code": classification.classification_code
    }


@router.delete("/product-classifications/{classification_id}")
async def delete_product_classification(
    classification_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Delete product classification (soft delete)"""

    classification = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.id == classification_id
    ).first()

    if not classification:
        raise HTTPException(status_code=404, detail="Classification not found")

    # Check access
    companies_list = get_product_type_companies(
        db, classification.product.product_type_id
    )
    has_access = any(
        check_user_company_access(db, user_id, c["id"]) for c in companies_list
    )

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    classification.is_active = False
    classification.updated_by = user_id

    db.commit()

    return {
        "message": f"Product Classification '{classification.classification_name}' deactivated successfully"
    }
