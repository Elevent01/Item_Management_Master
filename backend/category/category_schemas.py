"""category/category_schemas.py - Category Management Schemas"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# ==================== CATEGORY SCHEMAS ====================

class CategoryBase(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=255)
    category_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    company_id: int
    plant_id: Optional[int] = None  # NOW OPTIONAL

class CategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    category_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(BaseModel):
    id: int
    company_id: int
    plant_id: Optional[int] = None  # NOW OPTIONAL
    category_name: str
    category_code: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class CategoryDetailResponse(CategoryResponse):
    """Detailed category with company, plant info"""
    company: dict
    plant: Optional[dict] = None  # NOW OPTIONAL
    total_subcategories: int = 0
    created_by_user: Optional[dict] = None
    scope: Optional[str] = None
    scope_detail: Optional[str] = None
    applies_to_all_plants: bool = False
    
    class Config:
        from_attributes = True

# ==================== SUB-CATEGORY SCHEMAS ====================

class SubCategoryBase(BaseModel):
    sub_category_name: str = Field(..., min_length=1, max_length=255)
    sub_category_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None

class SubCategoryCreate(SubCategoryBase):
    category_id: int  # Only need category_id now, no company/plant

class SubCategoryUpdate(BaseModel):
    sub_category_name: Optional[str] = None
    sub_category_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SubCategoryResponse(BaseModel):
    id: int
    category_id: int
    sub_category_name: str
    sub_category_code: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class SubCategoryDetailResponse(SubCategoryResponse):
    """Detailed sub-category with relationships"""
    category: dict
    created_by_user: Optional[dict] = None
    
    class Config:
        from_attributes = True

# ==================== CATEGORY LIST SCHEMAS ====================

class CategoryWithSubcategories(BaseModel):
    """Category with its subcategories"""
    id: int
    category_name: str
    category_code: str
    description: Optional[str]
    is_active: bool
    company_code: Optional[str] = None
    scope: Optional[str] = None
    scope_label: Optional[str] = None
    applies_to_all_plants: bool = False
    subcategories: List['SubCategorySimple'] = []

class SubCategorySimple(BaseModel):
    """Simple sub-category info"""
    id: int
    sub_category_name: str
    sub_category_code: str
    description: Optional[str]
    is_active: bool

class AccessibleCategoryInfo(BaseModel):
    """Category info for subcategory creation dropdown"""
    id: int
    category_name: str
    category_code: str
    company_code: str
    company_name: str
    plant_code: Optional[str] = None
    plant_name: Optional[str] = None
    scope_label: str
    scope_detail: str
    applies_to_all_plants: bool

# Enable forward references
CategoryWithSubcategories.model_rebuild()

# ==================== FILTER & SEARCH SCHEMAS ====================

class CategoryFilterRequest(BaseModel):
    """Filter parameters for category search"""
    company_id: Optional[int] = None
    plant_ids: Optional[List[int]] = None
    search_query: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryListResponse(BaseModel):
    """Paginated category list"""
    total: int
    categories: List[CategoryDetailResponse]
    page: int = 1
    page_size: int = 50