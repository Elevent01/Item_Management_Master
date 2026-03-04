"""productClassification/product_schemas.py - Product Classification Schemas"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# ==================== PRODUCT TYPE SCHEMAS ====================

class ProductTypeBase(BaseModel):
    product_type_name: str = Field(..., min_length=1, max_length=255)
    product_type_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None

class ProductTypeCreate(ProductTypeBase):
    sub_category_id: Optional[int] = None
    company_ids: Optional[List[int]] = None  # For multi-company
    plant_id: Optional[int] = None

class ProductTypeUpdate(BaseModel):
    product_type_name: Optional[str] = None
    product_type_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ProductTypeResponse(BaseModel):
    id: int
    product_type_name: str
    product_type_code: str
    description: Optional[str]
    sub_category_id: Optional[int]
    company_id: Optional[int]
    plant_id: Optional[int]
    is_multi_company: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ProductTypeDetailResponse(ProductTypeResponse):
    """Detailed product type with relationships"""
    sub_category: Optional[dict] = None
    company: Optional[dict] = None
    companies: Optional[List[dict]] = None
    plant: Optional[dict] = None
    scope: Optional[str] = None
    scope_detail: Optional[str] = None
    total_products: int = 0
    created_by_user: Optional[dict] = None
    
    class Config:
        from_attributes = True

# ==================== PRODUCT SCHEMAS ====================

class ProductBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=255)
    product_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None

class ProductCreate(ProductBase):
    product_type_id: int

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: int
    product_type_id: int
    product_name: str
    product_code: str
    description: Optional[str]
    sku: Optional[str]
    barcode: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ProductDetailResponse(ProductResponse):
    """Detailed product with relationships"""
    product_type: dict
    total_classifications: int = 0
    created_by_user: Optional[dict] = None
    scope_info: Optional[dict] = None
    
    class Config:
        from_attributes = True

# ==================== PRODUCT CLASSIFICATION SCHEMAS ====================

class ProductClassificationBase(BaseModel):
    classification_name: str = Field(..., min_length=1, max_length=255)
    classification_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    grade: Optional[str] = None
    quality_standard: Optional[str] = None
    certification: Optional[str] = None

class ProductClassificationCreate(ProductClassificationBase):
    product_id: int

class ProductClassificationUpdate(BaseModel):
    classification_name: Optional[str] = None
    classification_code: Optional[str] = None
    description: Optional[str] = None
    grade: Optional[str] = None
    quality_standard: Optional[str] = None
    certification: Optional[str] = None
    is_active: Optional[bool] = None

class ProductClassificationResponse(BaseModel):
    id: int
    product_id: int
    classification_name: str
    classification_code: str
    description: Optional[str]
    grade: Optional[str]
    quality_standard: Optional[str]
    certification: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ProductClassificationDetailResponse(ProductClassificationResponse):
    """Detailed classification with relationships"""
    product: dict
    created_by_user: Optional[dict] = None
    
    class Config:
        from_attributes = True

# ==================== LIST & FILTER SCHEMAS ====================

class ProductTypeWithProducts(BaseModel):
    """Product Type with its products"""
    id: int
    product_type_name: str
    product_type_code: str
    description: Optional[str]
    is_active: bool
    scope: Optional[str]
    scope_detail: Optional[str]
    products: List['ProductSimple'] = []

class ProductSimple(BaseModel):
    """Simple product info"""
    id: int
    product_name: str
    product_code: str
    description: Optional[str]
    is_active: bool
    total_classifications: int = 0

class ClassificationSimple(BaseModel):
    """Simple classification info"""
    id: int
    classification_name: str
    classification_code: str
    description: Optional[str]
    grade: Optional[str]
    is_active: bool

# Enable forward references
ProductTypeWithProducts.model_rebuild()