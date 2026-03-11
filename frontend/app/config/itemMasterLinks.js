// app/config/itemMasterLinks.js
import { Candy, Info, Music, Package, PlusCircle, Wind, Warehouse, FileBox, DollarSign, TrendingUp, ShoppingCart, Building2, ClipboardList, Settings, Inbox, ClipboardCheck, BarChart2, BadgeCheck } from "lucide-react";

// Import the components
import ItemInfoMaster from "../ItemMasterPages/ItemInfoMaster.js";
import BreezCustomFields from "../ItemMasterPages/BreezCustomFields.js";
import SonataCustomFields from "../ItemMasterPages/SonataCustomFields.js";
import SonataItemCapacityPage from "../SonataCustomFields/SonataItemCapacityPage.js";
import SonataItemGradePage from "../SonataCustomFields/SonataItemGradePage.js";
import SweetNutritionCustomFields from "../ItemMasterPages/SweetNutritionCustomFields.js";
import CreateItemMaster from "../ItemMasterPages/CreateItemMaster.js";
import InfoMaster from "../ItemMasterPages/InfoMaster.js";
import ItemMasterInventory from "../ItemMasterPages/ItemMasterInventory.js";
import RenderItemMasterInventory from "../ItemMasterPages/RenderItemMasterInventory.js";
import ItemMasterSalesDetail from "../ItemMasterPages/ItemMasterSalesDetail.js";
import ItemMasterFinanceDetails from "../ItemMasterPages/ItemMasterFinanceDetails.js";
import RenderItemMasterSalesAndFinance from "../ItemMasterPages/RenderItemMasterSalesAndFinance.js";
import ItemMasterWarehouseDetails from "../ItemMasterPages/ItemMasterWarehouseDetails.js";
import ItemMasterPurchaseDetails from "../ItemMasterPages/ItemMasterPurchaseDetails.js";
import RenderItemMasterWarehouseAndPurchase from "../ItemMasterPages/RenderItemMasterWarehouseAndPurchase.js";
import ItemCodeCreationReq from "../ItemMasterPages/ItemCodeCreationReq.js";
import WorkflowAdmin from "../ItemMasterPages/WorkflowAdmin.js";
import WorkflowInbox from "../ItemMasterPages/WorkflowInbox.js";
import WorkflowMyRequests from "../ItemMasterPages/WorkflowMyRequests.js";
import WorkflowStatusBadge from "../ItemMasterPages/WorkflowStatusBadge.js";
import WorkflowDashboard from "../ItemMasterPages/WorkflowDashboard.js";

export const itemMasterLinks = [
  { 
    name: "Add Item Info", 
    icon: Package, 
    path: "add-item-info",
    component: ItemInfoMaster,
    description: "Create and manage item information with UOM, GL codes, and classifications"
  },
  { 
    name: "Breez Custom Fields", 
    icon: Wind, 
    path: "breez-custom-fields",
    component: BreezCustomFields,
    description: "Manage Breez-specific custom fields including item weight, categories, and specifications"
  },
  { 
    name: "Sonata Custom Fields", 
    icon: Music, 
    path: "sonata-custom-fields",
    component: SonataCustomFields,
    description: "Configure Sonata custom fields for batch requirements, capacity, and item grades"
  },
  { 
    name: "Sonata Item Capacity", 
    icon: Music, 
    path: "sonata-item-capacity",
    component: SonataItemCapacityPage,
    description: "Manage Sonata Item Capacity master data company and plant wise"
  },
  { 
    name: "Sonata Item Grade", 
    icon: Music, 
    path: "sonata-item-grade",
    component: SonataItemGradePage,
    description: "Manage Sonata Item Grade master data company and plant wise"
  },
  { 
    name: "Sweet Nutrition Custom Fields", 
    icon: Candy, 
    path: "sweet-nutrition-custom-fields",
    component: SweetNutritionCustomFields,
    description: "Manage Sweet Nutrition custom fields including categories, brands, and flavours"
  },
  { 
    name: "Item Master", 
    icon: PlusCircle, 
    path: "create-item-master",
    component: CreateItemMaster,
    description: "Create new item master record with all required information"
  },
  { 
    name: "Info Master Custom", 
    icon: Info, 
    path: "info-master",
    component: InfoMaster,
    description: "Manage info master data and configurations"
  },
  { 
    name: "Item Master Inventory", 
    icon: Warehouse, 
    path: "item-master-inventory",
    component: ItemMasterInventory,
    description: "Manage item inventory details including stock levels, reorder points, and dimensions"
  },
  { 
    name: "Render Item Master Inventory", 
    icon: FileBox, 
    path: "render-item-master-inventory",
    component: RenderItemMasterInventory,
    description: "Render item master inventory with RBAC access control"
  },
  { 
    name: "Item Master Sales Detail", 
    icon: TrendingUp, 
    path: "item-master-sales-detail",
    component: ItemMasterSalesDetail,
    description: "Manage item sales details including item class, VED class, and price control"
  },
  { 
    name: "Item Master Finance Details", 
    icon: DollarSign, 
    path: "item-master-finance-details",
    component: ItemMasterFinanceDetails,
    description: "Manage item finance details including tax group, costing method, and pricing"
  },
  { 
    name: "Render Item Master Sales & Finance", 
    icon: DollarSign, 
    path: "render-item-master-sales-finance",
    component: RenderItemMasterSalesAndFinance,
    description: "Render item master sales and finance details with RBAC access control"
  },
  { 
    name: "Item Master Warehouse Details", 
    icon: Building2, 
    path: "item-master-warehouse-details",
    component: ItemMasterWarehouseDetails,
    description: "Manage item warehouse details including storage temperature and handling"
  },
  { 
    name: "Item Master Purchase Details", 
    icon: ShoppingCart, 
    path: "item-master-purchase-details",
    component: ItemMasterPurchaseDetails,
    description: "Manage item purchase details including vendor analysis and tolerances"
  },
  { 
    name: "Render Item Master Warehouse & Purchase", 
    icon: Building2, 
    path: "render-item-master-warehouse-purchase",
    component: RenderItemMasterWarehouseAndPurchase,
    description: "Render item master warehouse and purchase details with RBAC access control"
  },
  { 
    name: "Item Code Creation Request", 
    icon: ClipboardList, 
    path: "item-code-creation-req",
    component: ItemCodeCreationReq,
    description: "Raise and manage item code creation requests with company, plant, and document attachments"
  },
  { 
    name: "Workflow Setup", 
    icon: Settings, 
    path: "workflow-admin",
    component: WorkflowAdmin,
    description: "Configure workflow templates, steps and approvers for approval processes"
  },
  { 
    name: "Approval Inbox", 
    icon: Inbox, 
    path: "workflow-inbox",
    component: WorkflowInbox,
    description: "View and act on pending approval requests assigned to you"
  },
  { 
    name: "My Requests", 
    icon: ClipboardCheck, 
    path: "workflow-my-requests",
    component: WorkflowMyRequests,
    description: "Track status of all approval requests submitted by you"
  },
  { 
    name: "Workflow Status", 
    icon: BadgeCheck, 
    path: "workflow-status",
    component: WorkflowStatusBadge,
    description: "Check live workflow status and submit requests for approval"
  },
  { 
    name: "Workflow Dashboard", 
    icon: BarChart2, 
    path: "workflow-dashboard",
    component: WorkflowDashboard,
    description: "Management overview of all active workflows and templates"
  },
];