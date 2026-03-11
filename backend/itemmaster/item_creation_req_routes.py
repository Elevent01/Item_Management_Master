"""itemmaster/item_creation_req_routes.py
   FastAPI router  –  Item Code Creation Request
   ─────────────────────────────────────────────
   Endpoints
   ---------
   GET    /item-creation-req/user/{user_id}/companies-plants
       → companies & plants the user has access to  (for dropdowns)

   POST   /item-creation-req/
       → create new request  (auto-resolves creator role/dept/desg)

   GET    /item-creation-req/
       → list all requests  (optional filters: company_id, is_active)

   GET    /item-creation-req/{req_id}
       → single request with full relations

   PUT    /item-creation-req/{req_id}
       → update request

   DELETE /item-creation-req/{req_id}
       → soft-delete  (is_active = False)

   DELETE /item-creation-req/{req_id}/hard
       → permanent delete
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional

from database import get_db
import db_models as models                                    # Company, Plant …
from user import user_models as user_models                   # User, UserCompanyAccess
from itemmaster.item_creation_req_models import (
    ItemBasicInfoItemMaster,
    OptionalDocumentItemBasicInfoItemMaster,
)
from itemmaster.item_creation_req_schemas import (
    ItemBasicInfoCreate,
    ItemBasicInfoUpdate,
    ItemBasicInfoResponse,
    CompanyWithPlantsOption,
    PlantOption,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
#  1.  GET  companies + plants accessible by the user
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-creation-req/user/{user_id}/companies-plants",
    response_model=List[CompanyWithPlantsOption],
    summary="Get companies and plants the user has access to"
)
def get_user_companies_plants(user_id: int, db: Session = Depends(get_db)):
    """
    Returns the list of companies (and their plants) that the logged-in user
    has been granted access to  –  used to populate the Company / Plant
    dropdowns on the Item Code Creation Request form.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch all UserCompanyAccess rows for this user
    accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(user_models.UserCompanyAccess.user_id == user_id)
        .all()
    )

    # Build company → plants map
    company_map: dict[int, dict] = {}
    for acc in accesses:
        cid = acc.company_id
        if cid not in company_map:
            company = db.query(models.Company).filter(models.Company.id == cid).first()
            if not company:
                continue
            company_map[cid] = {
                "id":           company.id,
                "company_name": company.company_name,
                "company_code": company.company_code,
                "plants":       {}
            }
        if acc.plant_id:
            pid = acc.plant_id
            if pid not in company_map[cid]["plants"]:
                plant = db.query(models.Plant).filter(models.Plant.id == pid).first()
                if plant:
                    company_map[cid]["plants"][pid] = PlantOption(
                        id=plant.id,
                        plant_name=plant.plant_name,
                        plant_code=getattr(plant, "plant_code", None)
                    )

    # Serialise to response schema
    result = []
    for entry in company_map.values():
        result.append(CompanyWithPlantsOption(
            id=entry["id"],
            company_name=entry["company_name"],
            company_code=entry["company_code"],
            plants=list(entry["plants"].values())
        ))

    return result


# ══════════════════════════════════════════════════════════════════════════════
#  2.  POST  create a new request
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-creation-req/",
    response_model=ItemBasicInfoResponse,
    status_code=201,
    summary="Create Item Code Creation Request"
)
def create_item_creation_request(payload: ItemBasicInfoCreate, db: Session = Depends(get_db)):

    # Create main record
    req = ItemBasicInfoItemMaster(
        item_name         = payload.item_name,
        item_description  = payload.item_description,
        item_short_name   = payload.item_short_name,
        item_type         = payload.item_type,
        department        = payload.department,
        required_date     = payload.required_date,
        business_reason   = payload.business_reason,
        company_id        = payload.company_id,
        plant_id          = payload.plant_id,
        created_by        = payload.created_by,
    )
    db.add(req)
    db.flush()   # get req.id before committing

    # Optional documents
    if payload.optional_documents:
        od = payload.optional_documents
        doc = OptionalDocumentItemBasicInfoItemMaster(
            item_master_basic_info_id = req.id,
            reference_image_url       = od.reference_image_url,
            vendor_quotation_url      = od.vendor_quotation_url,
            sample_photo_url          = od.sample_photo_url,
            product_link              = od.product_link,
        )
        db.add(doc)

    db.commit()
    db.refresh(req)

    return _load_full(db, req.id)


# ══════════════════════════════════════════════════════════════════════════════
#  3.  GET  list all requests
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-creation-req/",
    response_model=List[ItemBasicInfoResponse],
    summary="List Item Code Creation Requests"
)
def list_item_creation_requests(
    company_id: Optional[int] = Query(None),
    plant_id:   Optional[int] = Query(None),
    is_active:  Optional[bool] = Query(None),
    created_by: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    q = db.query(ItemBasicInfoItemMaster)

    if company_id is not None:
        q = q.filter(ItemBasicInfoItemMaster.company_id == company_id)
    if plant_id is not None:
        q = q.filter(ItemBasicInfoItemMaster.plant_id == plant_id)
    if is_active is not None:
        q = q.filter(ItemBasicInfoItemMaster.is_active == is_active)
    if created_by is not None:
        q = q.filter(ItemBasicInfoItemMaster.created_by == created_by)

    records = q.order_by(ItemBasicInfoItemMaster.created_at.desc()).offset(skip).limit(limit).all()
    return [_load_full(db, r.id) for r in records]


# ══════════════════════════════════════════════════════════════════════════════
#  4.  GET  single request
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-creation-req/{req_id}",
    response_model=ItemBasicInfoResponse,
    summary="Get single Item Code Creation Request"
)
def get_item_creation_request(req_id: int, db: Session = Depends(get_db)):
    return _load_full(db, req_id)


# ══════════════════════════════════════════════════════════════════════════════
#  5.  PUT  update
# ══════════════════════════════════════════════════════════════════════════════

@router.put(
    "/item-creation-req/{req_id}",
    response_model=ItemBasicInfoResponse,
    summary="Update Item Code Creation Request"
)
def update_item_creation_request(
    req_id: int,
    payload: ItemBasicInfoUpdate,
    db: Session = Depends(get_db)
):
    req = db.query(ItemBasicInfoItemMaster).filter(ItemBasicInfoItemMaster.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Update scalar fields (only those explicitly set)
    update_fields = {
        "item_name", "item_description", "item_short_name", "item_type",
        "department", "required_date", "business_reason",
        "company_id", "plant_id", "updated_by", "is_active"
    }
    for field in update_fields:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(req, field, value)

    # Update optional documents
    if payload.optional_documents is not None:
        od = payload.optional_documents
        if req.optional_documents:
            doc = req.optional_documents
        else:
            doc = OptionalDocumentItemBasicInfoItemMaster(
                item_master_basic_info_id=req.id
            )
            db.add(doc)

        doc.reference_image_url  = od.reference_image_url  if od.reference_image_url  is not None else doc.reference_image_url
        doc.vendor_quotation_url = od.vendor_quotation_url if od.vendor_quotation_url is not None else doc.vendor_quotation_url
        doc.sample_photo_url     = od.sample_photo_url     if od.sample_photo_url     is not None else doc.sample_photo_url
        doc.product_link         = od.product_link         if od.product_link         is not None else doc.product_link

    db.commit()
    db.refresh(req)
    return _load_full(db, req_id)


# ══════════════════════════════════════════════════════════════════════════════
#  6.  DELETE  soft
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/item-creation-req/{req_id}",
    summary="Soft-delete Item Code Creation Request (is_active = False)"
)
def soft_delete_item_creation_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(ItemBasicInfoItemMaster).filter(ItemBasicInfoItemMaster.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.is_active = False
    db.commit()
    return {"message": f"Request {req_id} deactivated successfully", "id": req_id}


# ══════════════════════════════════════════════════════════════════════════════
#  7.  DELETE  hard (permanent)
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/item-creation-req/{req_id}/hard",
    summary="Permanently delete Item Code Creation Request"
)
def hard_delete_item_creation_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(ItemBasicInfoItemMaster).filter(ItemBasicInfoItemMaster.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    db.delete(req)
    db.commit()
    return {"message": f"Request {req_id} permanently deleted", "id": req_id}


# ══════════════════════════════════════════════════════════════════════════════
#  INTERNAL helper – eager-load everything for response
# ══════════════════════════════════════════════════════════════════════════════

def _load_full(db: Session, req_id: int) -> ItemBasicInfoItemMaster:
    req = (
        db.query(ItemBasicInfoItemMaster)
        .options(
            joinedload(ItemBasicInfoItemMaster.company),
            joinedload(ItemBasicInfoItemMaster.plant),
            joinedload(ItemBasicInfoItemMaster.creator),
            joinedload(ItemBasicInfoItemMaster.optional_documents),
        )
        .filter(ItemBasicInfoItemMaster.id == req_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req