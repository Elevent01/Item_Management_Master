"""productClassification/product_models.py - Product Classification Database Models"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class ProductType(Base):
    """
    Product Type Table - Links to Sub-Category (Optional)
    - Can exist without sub-category (company-wide)
    - If linked to sub-category, inherits its company/plant scope
    - Multi-company support like Categories
    """
    __tablename__ = "product_types"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Optional link to sub-category
    sub_category_id = Column(Integer, ForeignKey("sub_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # For standalone product types (no sub-category)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Flag for multi-company product types
    is_multi_company = Column(Boolean, default=False, nullable=False)
    
    product_type_name = Column(String(255), nullable=False, index=True)
    product_type_code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        {'extend_existing': True}
    )
    
    # Relationships
    sub_category = relationship("SubCategory", foreign_keys=[sub_category_id])
    company = relationship("Company", foreign_keys=[company_id])
    plant = relationship("Plant", foreign_keys=[plant_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


class ProductTypeCompanyMapping(Base):
    """
    Product Type Company Mapping - For multi-company product types
    """
    __tablename__ = "product_type_company_mapping"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_type_id = Column(Integer, ForeignKey("product_types.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('product_type_id', 'company_id', name='unique_product_type_company_mapping'),
        {'extend_existing': True}
    )
    
    # Relationships
    product_type = relationship("ProductType", backref="company_mappings")
    company = relationship("Company")


class Product(Base):
    """
    Product Table - Links to Product Type
    - Inherits company/plant scope from product type
    - Auto-generated product code
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_type_id = Column(Integer, ForeignKey("product_types.id", ondelete="CASCADE"), nullable=False, index=True)
    
    product_name = Column(String(255), nullable=False, index=True)
    product_code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Additional product fields
    sku = Column(String(100), nullable=True, unique=True, index=True)
    barcode = Column(String(100), nullable=True, unique=True, index=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('product_type_id', 'product_name', name='unique_product_per_type'),
        {'extend_existing': True}
    )
    
    # Relationships
    product_type = relationship("ProductType", foreign_keys=[product_type_id], backref="products")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


class ProductClassification(Base):
    """
    Product Classification Table - Links to Product
    - Dynamic: Shows all products OR filtered by sub-category
    - Inherits scope from product
    """
    __tablename__ = "product_classifications"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    
    classification_name = Column(String(255), nullable=False, index=True)
    classification_code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Classification attributes
    grade = Column(String(50), nullable=True)
    quality_standard = Column(String(100), nullable=True)
    certification = Column(String(100), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('product_id', 'classification_name', name='unique_classification_per_product'),
        {'extend_existing': True}
    )
    
    # Relationships
    product = relationship("Product", foreign_keys=[product_id], backref="classifications")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])