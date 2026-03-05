import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import ItemMasterWarehouseDetails from "../ItemMasterPages/ItemMasterWarehouseDetails.js";
import ItemMasterPurchaseDetails from "../ItemMasterPages/ItemMasterPurchaseDetails.js";

const API_BASE = 'https://item-management-master-1.onrender.com/api';

// ==================== RENDER ITEM MASTER WAREHOUSE AND PURCHASE COMPONENT WITH RBAC ====================
const RenderItemMasterWarehouseAndPurchase = () => {
  const [loading, setLoading] = useState(true);
  const [accessibleComponents, setAccessibleComponents] = useState([]);
  const [error, setError] = useState(null);

  // 🔥 FETCH USER'S ACCESS
  useEffect(() => {
    fetchAccess();
  }, []);

  const fetchAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [WAREHOUSE & PURCHASE] Fetching user accessible pages...');

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
        console.log('⚡️ [WAREHOUSE & PURCHASE] Fetching user details from backend...');
        try {
          const userDetailsRes = await fetch(`${API_BASE}/users/${user.id}`);
          if (userDetailsRes.ok) {
            const completeUserData = await userDetailsRes.json();
            user = completeUserData;
            parsed.user = completeUserData;
            sessionStorage.setItem('userData', JSON.stringify(parsed));
          }
        } catch (err) {
          console.error('❌ [WAREHOUSE & PURCHASE] Failed to fetch user details:', err);
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
      console.log('📡 [WAREHOUSE & PURCHASE] Fetching menu from:', menuUrl);

      const menuRes = await fetch(menuUrl);
      
      if (!menuRes.ok) {
        const errorData = await menuRes.json();
        console.error('❌ [WAREHOUSE & PURCHASE] API Error:', errorData);
        setError(`API Error: ${errorData.detail || 'Failed to load menu'}`);
        setLoading(false);
        return;
      }

      const menuJson = await menuRes.json();
      console.log('✅ [WAREHOUSE & PURCHASE] Menu loaded:', menuJson);

      if (!menuJson.menu || menuJson.menu.length === 0) {
        setError('No pages accessible. This user has no page access granted.');
        setLoading(false);
        return;
      }

      // 🎯 CHECK WHICH COMPONENTS USER HAS ACCESS TO
      const components = checkComponentAccess(menuJson.menu);
      console.log('🎯 [WAREHOUSE & PURCHASE] Accessible components:', components);

      if (components.length === 0) {
        setError('No access to Warehouse or Purchase Details pages. Contact administrator to grant access.');
        setLoading(false);
        return;
      }

      setAccessibleComponents(components);
      setLoading(false);

    } catch (err) {
      console.error('❌ [WAREHOUSE & PURCHASE] Error:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  // 🔍 CHECK WHICH COMPONENTS USER HAS ACCESS TO
  const checkComponentAccess = (menuPages) => {
    const accessibleComps = [];
    
    const searchPages = (pages) => {
      pages.forEach(page => {
        // Check for Warehouse Details access
        if (page.page_name === 'Item Master Warehouse Details' || page.page_name === 'Warehouse Details' || page.page_name === 'Warehouse') {
          if (!accessibleComps.includes('warehouse')) {
            accessibleComps.push('warehouse');
          }
        }
        
        // Check for Purchase Details access
        if (page.page_name === 'Item Master Purchase Details' || page.page_name === 'Purchase Details') {
          if (!accessibleComps.includes('purchase')) {
            accessibleComps.push('purchase');
          }
        }
        
        // Search in children
        if (page.children && page.children.length > 0) {
          searchPages(page.children);
        }
      });
    };

    searchPages(menuPages);
    return accessibleComps;
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <h2 className="m-0 text-xs font-semibold">Item Master Warehouse & Purchase 🏭</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
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
        ) : accessibleComponents.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "48px" }}>🔒</div>
            <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>No Access</div>
            <div style={{ fontSize: "10px", color: "#7f1d1d", textAlign: "center", maxWidth: "400px" }}>
              You don't have access to Warehouse or Purchase Details pages. Please contact your administrator.
            </div>
          </div>
        ) : (
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            width: "100%",
            height: "100%"
          }}>
            {/* Render only accessible components */}
            {accessibleComponents.includes('warehouse') && <ItemMasterWarehouseDetails />}
            {accessibleComponents.includes('purchase') && <ItemMasterPurchaseDetails />}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default RenderItemMasterWarehouseAndPurchase;
