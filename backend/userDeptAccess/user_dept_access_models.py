"""
userDeptAccess/user_dept_access_models.py
──────────────────────────────────────────────────────────────────────────────
User Global Department Data Access Control

PURPOSE
-------
Controls WHICH DEPARTMENTS' DATA a user can see — globally across all pages.
SEPARATE from page access (role/dept/desg via CompanyRolePageAccess).
This only filters what data is visible to the user.

BEHAVIOR
--------
- No rows for user+company  →  user sees NOTHING (default closed / secure)
- Rows present             →  user sees ONLY those departments' data

Page access (which pages are visible) remains unchanged.
"""

from sqlalchemy import (
    Column, Integer, Boolean, DateTime, ForeignKey,
    UniqueConstraint, Text, func
)
from sqlalchemy.orm import relationship
from database import Base


class UserDeptDataAccess(Base):
    """
    Grants a user visibility into a specific department's data within a company.

    One row = one department the user can see data from.
    No rows for that user+company = no data visible at all.
    """
    __tablename__ = "user_dept_data_access"

    id            = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_id    = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    is_granted    = Column(Boolean, default=True, nullable=False)
    notes         = Column(Text, nullable=True)

    created_by    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "user_id", "company_id", "department_id",
            name="unique_user_company_dept_access"
        ),
    )

    user       = relationship("User", foreign_keys=[user_id])
    creator    = relationship("User", foreign_keys=[created_by])
    company    = relationship("Company")
    department = relationship("Department")