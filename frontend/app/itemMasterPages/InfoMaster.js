import React, { useState, useEffect } from 'react';
import { Search, X, ChevronDown, AlertCircle } from 'lucide-react';

// ==================== IMPORT ORIGINAL PAGES ====================
import ItemInfoMaster from "../ItemMasterPages/ItemInfoMaster.js";
import BreezCustomFields from "../ItemMasterPages/BreezCustomFields.js";
import SonataCustomFields from "../ItemMasterPages/SonataCustomFields.js";
import SweetNutritionCustomFields from "../ItemMasterPages/SweetNutritionCustomFields.js";

const API_BASE = 'https://item-management-master-1.onrender.com/api';

// ==================== MAIN INFO MASTER COMPONENT WITH RBAC ====================
const InfoMaster = () => {
  const [loading, setLoading] = useState(true);
  const [accessibleOptions, setAccessibleOptions] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [isActive, setIsActive] = useState(true);

  // 🔥 FETCH USER'S ACCESSIBLE PAGES
  useEffect(() => {
    fetchAccessiblePages();
  }, []);

  const fetchAccessiblePages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [INFO MASTER] Fetching user accessible pages...');

      const storedUser = sessionStorage.getItem('userData');
      if (!storedUser) {
        setError('No user data found in session. Please login again.');
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(storedUser);
      let user = parsed?.user;

      if (!user || !user.id) {
        setError('Invalid user data structure. User ID missing.');
        setLoading(false);
        return;
      }

      // If accesses missing, fetch from backend
      if (!user.accesses || user.accesses.length === 0) {
        console.log('⚡️ [INFO MASTER] Fetching user details from backend...');
        try {
          const userDetailsRes = await fetch(`${API_BASE}/users/${user.id}`);
          if (userDetailsRes.ok) {
            const completeUserData = await userDetailsRes.json();
            user = completeUserData;
            parsed.user = completeUserData;
            sessionStorage.setItem('userData', JSON.stringify(parsed));
          }
        } catch (err) {
          console.error('❌ [INFO MASTER] Failed to fetch user details:', err);
        }
      }

      if (!user.accesses || user.accesses.length === 0) {
        setError('No company access found for this user.');
        setLoading(false);
        return;
      }

      const primaryAccess = user.accesses.find(acc => acc.is_primary_company) || user.accesses[0];
      const primaryCompanyId = primaryAccess.company?.id;

      if (!primaryCompanyId) {
        setError('Primary company ID is missing in access data.');
        setLoading(false);
        return;
      }

      // Fetch accessible menu
      const menuUrl = `${API_BASE}/rbac/users/${user.id}/accessible-menu?company_id=${primaryCompanyId}`;
      console.log('📡 [INFO MASTER] Fetching menu from:', menuUrl);

      const menuRes = await fetch(menuUrl);
      
      if (!menuRes.ok) {
        const errorData = await menuRes.json();
        console.error('❌ [INFO MASTER] API Error:', errorData);
        setError(`API Error: ${errorData.detail || 'Failed to load menu'}`);
        setLoading(false);
        return;
      }

      const menuJson = await menuRes.json();
      console.log('✅ [INFO MASTER] Menu loaded:', menuJson);

      if (!menuJson.menu || menuJson.menu.length === 0) {
        setError('No pages accessible. This user has no page access granted.');
        setLoading(false);
        return;
      }

      // 🎯 EXTRACT PAGES (Item Info Master + Custom Fields)
      const accessiblePages = extractAccessiblePages(menuJson.menu);
      console.log('🎯 [INFO MASTER] Accessible pages:', accessiblePages);

      if (accessiblePages.length === 0) {
        setError('No Item Master pages accessible. Contact administrator to grant access.');
        setLoading(false);
        return;
      }

      // Map to dropdown options
      const options = accessiblePages.map(page => ({
        value: page.type,
        label: page.page_name,
        page_url: page.page_url,
        component: page.component
      }));

      setAccessibleOptions(options);
      
      // Set first tab as active for multiple custom fields
      const customFieldsOptions = options.filter(opt => opt.value !== 'item-info');
      if (customFieldsOptions.length > 0) {
        setActiveTab(customFieldsOptions[0].value);
      }
      
      setLoading(false);

    } catch (err) {
      console.error('❌ [INFO MASTER] Error:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  // 🔍 EXTRACT ACCESSIBLE PAGES FROM MENU HIERARCHY
  const extractAccessiblePages = (menuPages) => {
    const accessiblePages = [];
    
    // Define page name to type and component mapping
    const pageMap = {
      'Add Item Info': {
        type: 'item-info',
        component: ItemInfoMaster
      },
      'Breez Custom Fields': {
        type: 'breez',
        component: BreezCustomFields
      },
      'Sonata Custom Fields': {
        type: 'sonata',
        component: SonataCustomFields
      },
      'Sweet Nutrition Custom Fields': {
        type: 'sweet',
        component: SweetNutritionCustomFields
      }
    };

    const searchPages = (pages) => {
      pages.forEach(page => {
        // Check if this page is one of our target pages
        if (pageMap[page.page_name]) {
          accessiblePages.push({
            type: pageMap[page.page_name].type,
            page_name: page.page_name,
            page_url: page.page_url,
            permissions: page.permissions || [],
            component: pageMap[page.page_name].component
          });
        }
        
        // Search in children
        if (page.children && page.children.length > 0) {
          searchPages(page.children);
        }
      });
    };

    searchPages(menuPages);
    return accessiblePages;
  };

  // Separate Item Info Master and Custom Fields
  const itemInfoOption = accessibleOptions.find(opt => opt.value === 'item-info');
  const customFieldsOptions = accessibleOptions.filter(opt => opt.value !== 'item-info');
  const hasMultipleCustomFields = customFieldsOptions.length > 1;

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header with Active/Inactive Button */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Create Item Code 👇</h2>
        <button 
          onClick={() => setIsActive(!isActive)} 
          style={{ 
            padding: '2px 12px', 
            background: isActive ? '#10b981' : '#ef4444', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 3, 
            cursor: 'pointer', 
            fontSize: 10, 
            fontWeight: 500,
            height: '18px',
            lineHeight: '14px'
          }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-2.5 overflow-auto">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "32px" }}>⏳</div>
            <div style={{ fontSize: "11px", color: "#666" }}>Loading accessible pages...</div>
          </div>
        ) : error ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <AlertCircle size={40} style={{ color: "#ef4444" }} />
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>Access Error</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px", background: "#fee2e2", padding: "10px", borderRadius: "6px", border: "1px solid #fca5a5" }}>
              {error}
            </div>
          </div>
        ) : accessibleOptions.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "48px" }}>🔒</div>
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>No Access</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px" }}>
              You don't have access to any Item Master pages. Please contact your administrator.
            </div>
          </div>
        ) : (
          <div>
            {/* Render Item Info Master if accessible */}
            {itemInfoOption && (
              <div style={{ marginBottom: "20px" }}>
                <ItemInfoMaster />
              </div>
            )}

            {/* Render Custom Fields - with or without tabs */}
            {customFieldsOptions.length > 0 && (
              <div>
                {hasMultipleCustomFields ? (
                  // Multiple custom fields - show tabs
                  <div>
                    {/* Tabs Header */}
                    <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "16px" }}>
                      {customFieldsOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setActiveTab(option.value)}
                          style={{
                            padding: "8px 16px",
                            fontSize: "11px",
                            fontWeight: "500",
                            background: activeTab === option.value ? "#60a5fa" : "transparent",
                            color: activeTab === option.value ? "white" : "#6b7280",
                            border: "none",
                            borderBottom: activeTab === option.value ? "2px solid #2563eb" : "2px solid transparent",
                            cursor: "pointer",
                            marginBottom: "-2px",
                            transition: "all 0.2s"
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* Active Tab Content */}
                    {customFieldsOptions.map((option) => {
                      if (activeTab === option.value) {
                        const Component = option.component;
                        return (
                          <div key={option.value}>
                            <Component />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  // Single custom field - show directly without tabs
                  <div>
                    {customFieldsOptions.map((option) => {
                      const Component = option.component;
                      return (
                        <div key={option.value}>
                          <Component />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default InfoMaster;
