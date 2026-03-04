"""financeAccounting/finance_models.py - Finance & Accounting Database Models"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# ==================== GL TYPE MASTER ====================
class GLType(Base):
    """GL Type Master - ASSET, LIABILITY, INCOME, EXPENSE, EQUITY"""
    __tablename__ = "gl_type_master"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    type_code = Column(String(50), nullable=False, unique=True, index=True)
    type_name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sub_types = relationship("GLSubType", back_populates="gl_type", cascade="all, delete-orphan")
    gl_accounts = relationship("GLMaster", back_populates="gl_type")


# ==================== GL SUB TYPE MASTER ====================
class GLSubType(Base):
    """
    GL Sub-Type Master - e.g. Current Assets, Non-Current Assets under ASSET
    Maps to IFRS sub-classification and Indian Companies Act Schedule III
    """
    __tablename__ = "gl_sub_type_master"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sub_type_code = Column(String(50), nullable=False, unique=True, index=True)
    sub_type_name = Column(String(150), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    
    # Parent GL Type
    gl_type_id = Column(Integer, ForeignKey("gl_type_master.id"), nullable=False)
    
    display_order = Column(Integer, nullable=True)          # For ordered display in reports
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('gl_type_id', 'sub_type_code', name='unique_subtype_code_per_type'),
    )
    
    # Relationships
    gl_type = relationship("GLType", back_populates="sub_types")
    gl_categories = relationship("GLCategory", back_populates="gl_sub_type")


# ==================== GL CATEGORY MASTER ====================
class GLCategory(Base):
    """GL Category Master - Inventory, Sales, Tax, etc."""
    __tablename__ = "gl_category_master"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    category_code = Column(String(50), nullable=False, unique=True, index=True)
    category_name = Column(String(150), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    
    # GL Type link - e.g., ASSET, LIABILITY, INCOME, EXPENSE
    gl_type_id = Column(Integer, ForeignKey("gl_type_master.id"), nullable=False)
    
    # GL Sub-Type link (optional but recommended)
    gl_sub_type_id = Column(Integer, ForeignKey("gl_sub_type_master.id"), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    gl_type = relationship("GLType", foreign_keys=[gl_type_id])
    gl_sub_type = relationship("GLSubType", back_populates="gl_categories")
    gl_accounts = relationship("GLMaster", back_populates="gl_category")




# ==================== GL SUB CATEGORY MASTER ====================
class GLSubCategory(Base):
    """GL Sub-Category Master — child of GLCategory"""
    __tablename__ = "gl_sub_category_master"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    sub_category_code = Column(String(80), nullable=False, unique=True, index=True)
    sub_category_name = Column(String(150), nullable=False, unique=True)
    description      = Column(Text, nullable=True)

    gl_type_id       = Column(Integer, ForeignKey("gl_type_master.id"),     nullable=False)
    gl_sub_type_id   = Column(Integer, ForeignKey("gl_sub_type_master.id"), nullable=True)
    gl_category_id   = Column(Integer, ForeignKey("gl_category_master.id"), nullable=False)

    is_active  = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    gl_type     = relationship("GLType",     foreign_keys=[gl_type_id])
    gl_sub_type = relationship("GLSubType",  foreign_keys=[gl_sub_type_id])
    gl_category = relationship("GLCategory", foreign_keys=[gl_category_id], backref="sub_categories")

# ==================== GL MASTER (Core - SAP FI Level) ====================
class GLMaster(Base):
    """
    GL Master - Main Chart of Accounts
    - Multi-company support
    - Plant-specific GL optional
    - Hierarchical structure support
    """
    __tablename__ = "gl_master"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Company & Plant Support (same as Category system)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # GL Details
    gl_code = Column(String(50), nullable=False, index=True)
    gl_name = Column(String(200), nullable=False)
    
    # Classification
    gl_type_id = Column(Integer, ForeignKey("gl_type_master.id"), nullable=False)
    gl_sub_type_id = Column(Integer, ForeignKey("gl_sub_type_master.id"), nullable=True)
    gl_category_id = Column(Integer, ForeignKey("gl_category_master.id"), nullable=True)
    
    # Hierarchy Support (Chart of Accounts)
    parent_gl_id = Column(Integer, ForeignKey("gl_master.id"), nullable=True)
    
    # Posting Controls
    is_postable = Column(Boolean, default=True, nullable=False)  # Can transactions be posted?
    currency_code = Column(String(10), nullable=True)  # Multi-currency support
    
    # Status & Metadata
    remarks = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('company_id', 'gl_code', name='unique_gl_company_code'),
    )
    
    # Relationships
    company = relationship("Company", foreign_keys=[company_id])
    plant = relationship("Plant", foreign_keys=[plant_id])
    gl_type = relationship("GLType", back_populates="gl_accounts")
    gl_sub_type = relationship("GLSubType", foreign_keys=[gl_sub_type_id])
    gl_category = relationship("GLCategory", back_populates="gl_accounts")
    parent_gl = relationship("GLMaster", remote_side=[id], backref="child_gls")
    
    # History
    name_history = relationship("GLNameHistory", back_populates="gl_account", cascade="all, delete-orphan")
    status_history = relationship("GLStatusHistory", back_populates="gl_account", cascade="all, delete-orphan")


# ==================== GL NAME HISTORY ====================
class GLNameHistory(Base):
    """Track GL Account name changes (SAP-style audit)"""
    __tablename__ = "gl_name_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    gl_id = Column(Integer, ForeignKey("gl_master.id", ondelete="CASCADE"), nullable=False)
    
    old_name = Column(String(200), nullable=False)
    new_name = Column(String(200), nullable=False)
    
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(Text, nullable=True)
    
    # Relationships
    gl_account = relationship("GLMaster", back_populates="name_history")


# ==================== GL STATUS HISTORY ====================
class GLStatusHistory(Base):
    """Track GL Account block/unblock changes"""
    __tablename__ = "gl_status_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    gl_id = Column(Integer, ForeignKey("gl_master.id", ondelete="CASCADE"), nullable=False)
    
    old_status = Column(Boolean, nullable=False)
    new_status = Column(Boolean, nullable=False)
    
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(Text, nullable=True)
    
    # Relationships
    gl_account = relationship("GLMaster", back_populates="status_history")


# ==================== ITEM INFO MASTER (GL Reference) ====================
class ItemInfoMaster(Base):
    """
    Item Master with GL Mapping
    - References GL Master for accounting integration
    - Supports stock/non-stock items
    """
    __tablename__ = "item_info_master"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    item_code = Column(String(100), nullable=False, index=True)
    item_name = Column(String(200), nullable=False)
    
    # GL Mapping (Core Integration)
    gl_id = Column(Integer, ForeignKey("gl_master.id"), nullable=False)
    
    # Item Classification
    is_stock = Column(Boolean, default=True, nullable=False)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('company_id', 'item_code', name='unique_item_company_code'),
    )
    
    # Relationships
    company = relationship("Company")
    gl_account = relationship("GLMaster")