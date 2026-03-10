"""main.py """

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

# Import routers
from company import router as company_router
from role_dep_desg import router as role_dep_desg_router
from ocr_routers import router as ocr_router
from plant import router as plant_router
from user.user_routes import router as user_router
from user.auth_routes import router as auth_router  
from user.biometric_routes import router as biometric_router
from user.protected_routes import router as protected_router
from user.user_access_analytics import router as analytics_router
from role.role_rbac_routes import router as rbac_router
from role.role_sync import router as sync_router

# ✅ Import UOM System
from uomSystem.uom_routes import router as uom_router
from uomSystem import uom_models

# ✅ Import Category System
from category.category_routes import router as category_router
from category import category_models

# ✅ Import Product Classification System  
from productClassification.product_routers import router as product_router
from productClassification import product_models

# ✅ Import Finance & Accounting System  
from financeAccounting.finance_routes import router as finance_router
from financeAccounting import finance_models

# ✅ Import Finance Reports (GL Mapping & Framework Builder)
from financeAccounting.finance_reports_routes import router as finance_reports_router
from financeAccounting import finance_report_models

# ✅ Import Sonata Custom Fields System
from sonataCustomFields.sonata_custom_router import router as sonata_custom_router
from sonataCustomFields import sonata_custom_models

# 🚀 Import Page Creation System
from autoCreation.page_creation_routes import router as page_creation_router
from autoCreation.page_links_routes import router as page_links_router
from autoCreation.config_file_routes import router as config_file_router
from autoCreation.icon_creator_backend import router as icon_creator_router

# ✅ Excel Importer
from services.excel_importer import router as excel_router

# ✅ Import Item Master – Item Code Creation Request
from itemmaster.item_creation_req_routes import router as item_creation_req_router
from itemmaster import item_creation_req_models

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="🏢 RBAC + Biometric + Category + Product + Finance + Sonata Custom Fields + Page Creation + Icon Creator System",
    description="Complete System with Authentication, Authorization, UOM, Category, Product Classification, Finance, Sonata Custom Fields, Automated Page Creation & Icon Management",
    version="13.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(company_router, prefix="/api", tags=["Company Management"])
app.include_router(role_dep_desg_router, prefix="/api", tags=["Role-Department-Designation"])
app.include_router(rbac_router, prefix="/api/rbac", tags=["RBAC - Access Control"])  
app.include_router(sync_router, prefix="/api", tags=["RBAC - Auto Sync"])
app.include_router(ocr_router, prefix="/api/ocr", tags=["OCR"])
app.include_router(plant_router, prefix="/api", tags=["Plant Management"])
app.include_router(user_router, prefix="/api", tags=["User Management (Admin)"])
app.include_router(auth_router, prefix="/api", tags=["🔐 Authentication"])  
app.include_router(protected_router, prefix="/api", tags=["🔒 Protected User Routes"])
app.include_router(biometric_router, prefix="/api", tags=["👆 Biometric Authentication"])
app.include_router(analytics_router, prefix="/api", tags=["📊 User Access Analytics"])
app.include_router(uom_router, prefix="/api", tags=["📏 UOM System"])
app.include_router(category_router, prefix="/api", tags=["📂 Category Management"])
app.include_router(product_router, prefix="/api", tags=["📦 Product Classification"])
app.include_router(finance_router, prefix="/api", tags=["💰 Finance & Accounting"])
app.include_router(finance_reports_router, prefix="/api", tags=["📊 Finance Reports & GL Mapping"])
app.include_router(sonata_custom_router, prefix="/api", tags=["🗂️ Sonata Custom Fields"])
app.include_router(page_creation_router, prefix="/api/pages", tags=["🚀 Page Creation System"])
app.include_router(page_links_router, prefix="/api/links", tags=["🔗 Page Links Management"])
app.include_router(config_file_router, prefix="/api/configs", tags=["⚙️ Config File Management"])
app.include_router(icon_creator_router, tags=["🎨 Icon Creator System"])
app.include_router(excel_router, tags=["📊 Excel / CSV Importer"])
app.include_router(item_creation_req_router, prefix="/api", tags=["📋 Item Master – Item Code Creation Request"])


@app.get("/")
def read_root():
    return {
        "message": "🏢 Complete RBAC + Biometric + UOM + Category + Product + Finance + Sonata Custom Fields + Page Creation + Icon Creator System",
        "version": "13.0.0",
        "status": "operational",
        "features": [
            "✅ User Authentication with Token Management",
            "✅ User-Specific Data Access",
            "✅ Role-Based Access Control (RBAC)",
            "✅ Biometric Authentication (Fingerprint + Face)",
            "✅ Protected Routes with Authorization",
            "✅ Dynamic Menu Based on User Access",
            "✅ Unit of Measurement (UOM) System",
            "✅ Advanced Category Management",
            "✅ Product Classification System",
            "✅ Finance & Accounting Module",
            "✅ Sonata Custom Fields Module",
            "✅ Automated Page Creation & Management",
            "✅ Icon Page Creator with Auto-Registration",
            "✅ Item Master – Item Code Creation Request"
        ],
        "docs": "https://item-management-master-1.onrender.com/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "13.0.0",
        "modules": {
            "authentication": True,
            "authorization": True,
            "rbac": True,
            "biometric": True,
            "uom_system": True,
            "category_management": True,
            "product_classification": True,
            "finance_accounting": True,
            "sonata_custom_fields": True,
            "page_creation": True,
            "icon_creator": True,
            "item_code_creation_request": True
        }
    }

import uvicorn
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)