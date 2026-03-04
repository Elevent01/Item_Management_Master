"""category/category_models.py - Advanced Category Management with Multi-Company Support"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Category(Base):
    """
    Category Table - Multi-Company Support (Plant Optional)
    - Each category can belong to ONE or MULTIPLE companies
    - plant_id is NULLABLE - if NULL, category applies to ALL plants
    - If plant_id is set, category applies ONLY to that specific plant
    - User access based on their company/plant permissions
    - Multi-company categories use CategoryCompanyMapping table
    """
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # For single company categories (backward compatibility)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Flag to indicate if this is a multi-company category
    is_multi_company = Column(Boolean, default=False, nullable=False)
    
    category_name = Column(String(255), nullable=False, index=True)
    category_code = Column(String(50), nullable=False, unique=True, index=True)
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
    company = relationship("Company", foreign_keys=[company_id])
    plant = relationship("Plant", foreign_keys=[plant_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


class CategoryCompanyMapping(Base):
    """
    Category Company Mapping - For categories that span multiple companies
    - Allows a category to be associated with multiple companies
    - Used when is_multi_company = True
    """
    __tablename__ = "category_company_mapping"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('category_id', 'company_id', name='unique_category_company_mapping'),
        {'extend_existing': True}
    )
    
    # Relationships
    category = relationship("Category", backref="company_mappings")
    company = relationship("Company")


class SubCategory(Base):
    """
    Sub Category Table - Linked to Parent Category
    - Inherits company_id and plant_id from parent category automatically
    - Simple flat structure (no multi-level hierarchy)
    """
    __tablename__ = "sub_categories"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    
    sub_category_name = Column(String(255), nullable=False, index=True)
    sub_category_code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('category_id', 'sub_category_name', name='unique_subcategory_per_category'),
        {'extend_existing': True}
    )
    
    # Relationships
    category = relationship("Category", foreign_keys=[category_id], backref="subcategories")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


class CategoryPlantMapping(Base):
    """
    Category Plant Mapping - For categories that span multiple plants
    - Allows a category to be associated with multiple plants within same company
    """
    __tablename__ = "category_plant_mapping"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('category_id', 'plant_id', name='unique_category_plant_mapping'),
        {'extend_existing': True}
    )
    
    # Relationships
    category = relationship("Category", backref="plant_mappings")
    plant = relationship("Plant")