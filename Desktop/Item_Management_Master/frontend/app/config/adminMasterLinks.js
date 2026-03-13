// app/config/adminMasterLinks.js
import { Briefcase, Building2, DollarSign, Eye, Factory, FileText, FolderPlus, Grid, Layout, Palette, Settings, Shield, UserPlus, Users, ShieldCheck } from "lucide-react";
// Import your page components here
import AddCompany from "../components/AddCompany";
import AddCompanyType from "../AdminIconPages/AddCompanyType";
import AddCurrency from "../AdminIconPages/AddCurrency";
import AddIndustryType from "../AdminIconPages/AddIndustryType";
import AddRoleDepDesg from "../AdminIconPages/AddRoleDepDesg";
import AddPlantType from "../AdminIconPages/AddPlantType";
import AddPlant from "../AdminIconPages/AddPlant";
import PlantCompanyDetails from "../AdminIconPages/PlantCompanyDetails";
import UserManagementSystem from "../AdminIconPages/AddUser";
import UserPlantCompanyAccess from "../AdminIconPages/UsersPlantCompanyAccess";
// 🔥 FIX: RoleAccessForCompaniesPlant direct import hata diya — circular dependency thi
// (RoleAccessForCompaniesPlant → PageLinksConfig → iconLoader → adminMasterLinks → loop!)
// Lazy wrapper banaya — kaam exactly same karega, sirf load time defer hoga
let _RoleAccess = null;
const RoleAccessForCompaniesPlant = (props) => {
  if (!_RoleAccess) _RoleAccess = require("../AdminIconPages/RoleAccessForCompaniesPlant").default;
  const C = _RoleAccess;
  return <C {...props} />;
};
import LeftMenuPanelWithPageAccess from "../components/LeftMenuPannelWithPageAccess"; 
import CreationMaster from "../AdminIconPages/CreationMaster";
import EmptyPageCreator from "../PageCreatorSystem/EmptyPageCreator";
import ConfigLinksCreator from "../PageCreatorSystem/ConfigLinksCreator";
import IconPageCreator from "../PageCreatorSystem/IconPageCreator";
import UserDeptAccessPage from "../AdminIconPages/UserDeptAccessPage";

// ========================================
// ADMIN MASTER LINKS - CENTRAL CONFIG
// ========================================

export const adminMasterLinks = [
{ 
    name: "Add Company", 
    icon: Building2, 
    path: "add-company",
    component: AddCompany,
  },
  { 
    name: "Company Types", 
    icon: Briefcase, 
    path: "add-company-type",
    component: AddCompanyType,
  },
  { 
    name: "Industry Types", 
    icon: Factory, 
    path: "add-industry-type",
    component: AddIndustryType,
  },
  { 
    name: "Add Currency", 
    icon: DollarSign, 
    path: "add-currency",
    component: AddCurrency,
  },
  { 
    name: "Role, Dept & Designation", 
    icon: Users, 
    path: "add-role-dep-desg",
    component: AddRoleDepDesg,
  },
  { 
    name: "Plant Types", 
    icon: Settings, 
    path: "add-plant-type",
    component: AddPlantType,
  },
  { 
    name: "Add Plant", 
    icon: Factory, 
    path: "add-plant",
    component: AddPlant,
  },
  { 
    name: "Plant & Company Details", 
    icon: Eye, 
    path: "plant-company-details",
    component: PlantCompanyDetails,
  },
  { 
    name: "Add User", 
    icon: UserPlus, 
    path: "add-user",
    component: UserManagementSystem,
  },
  { 
    name: "User Access Control", 
    icon: Users, 
    path: "user-plant-company-access",
    component: UserPlantCompanyAccess,
  },
  { 
    name: "Role Access Control", 
    icon: Shield, 
    path: "role-access-companies-plant",
    component: RoleAccessForCompaniesPlant,
  },
  { 
    name: "User Dept Data Access", 
    icon: ShieldCheck, 
    path: "user-dept-access",
    component: UserDeptAccessPage,
  },
  { 
    name: "Left Menu Panel", 
    icon: Layout,   
    path: "left-menu-panel",
    component: LeftMenuPanelWithPageAccess,
  },
  { 
    name: "Creation Master", 
    icon: FileText, 
    path: "creation-master",
    component: CreationMaster,
  },
  { 
    name: "Empty Page Creator", 
    icon: FolderPlus, 
    path: "empty-page-creator",
    component: EmptyPageCreator,
  },
  { 
    name: "Config Links Creator", 
    icon: Grid, 
    path: "config-links-creator",
    component: ConfigLinksCreator,
  },
  { 
    name: "Icon Page Creator", 
    icon: Palette, 
    path: "page-creator-icon",  
    component: IconPageCreator
  }
];
