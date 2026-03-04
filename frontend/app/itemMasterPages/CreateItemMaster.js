import React, { useState } from 'react';
import InfoMaster from './InfoMaster';
import RenderItemMasterInventory from './RenderItemMasterInventory';
import RenderItemMasterSalesAndFinance from './RenderItemMasterSalesAndFinance';
import RenderItemMasterWarehouseAndPurchase from './RenderItemMasterWarehouseAndPurchase';
import { FileText, ArrowRight, Package, Warehouse } from 'lucide-react';

const CreateItemMaster = () => {
  const [activeTab, setActiveTab] = useState('info');

  const handleNext = () => {
    if (activeTab === 'info') {
      setActiveTab('inventory');
    } else if (activeTab === 'inventory') {
      setActiveTab('salesfinance');
    } else if (activeTab === 'salesfinance') {
      setActiveTab('warehousepurchase');
    }
  };

  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      padding: 0,
      margin: 0
    }}>
      {/* Content - Full Height */}
      <div style={{ 
        flex: 1, 
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }}>
        {activeTab === 'info' && <InfoMaster />}
        {activeTab === 'inventory' && <RenderItemMasterInventory />}
        {activeTab === 'salesfinance' && <RenderItemMasterSalesAndFinance />}
        {activeTab === 'warehousepurchase' && <RenderItemMasterWarehouseAndPurchase />}
      </div>

      {/* Tabs and Next Button - Connected to bottom (Footer) */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        height: "15px",
        backgroundColor: "transparent",
        flexShrink: 0,
        paddingLeft: "8px",
        paddingRight: "8px"
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              padding: "0 10px",
              height: "15px",
              fontSize: "9px",
              fontWeight: "500",
              background: activeTab === 'info' ? "linear-gradient(to right, #9ca3af, #93c5fd)" : "#e5e7eb",
              color: activeTab === 'info' ? "#fff" : "#6b7280",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              borderBottomLeftRadius: "4px",
              borderBottomRightRadius: "4px",
              transition: "all 0.2s",
              lineHeight: "15px"
            }}
          >
            <FileText size={10} />
            1. Item Info
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            disabled={activeTab === 'inventory'}
            style={{
              padding: "0 10px",
              height: "15px",
              fontSize: "9px",
              fontWeight: "500",
              background: activeTab === 'inventory' ? "linear-gradient(to right, #9ca3af, #93c5fd)" : "#e5e7eb",
              color: activeTab === 'inventory' ? "#fff" : "#6b7280",
              border: "none",
              cursor: activeTab === 'inventory' ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              borderBottomLeftRadius: "4px",
              borderBottomRightRadius: "4px",
              transition: "all 0.2s",
              lineHeight: "15px",
              opacity: activeTab === 'inventory' ? 0.8 : 1
            }}
          >
            <Package size={10} />
            2. Inventory
          </button>

          <button
            onClick={() => setActiveTab('salesfinance')}
            disabled={activeTab === 'salesfinance'}
            style={{
              padding: "0 10px",
              height: "15px",
              fontSize: "9px",
              fontWeight: "500",
              background: activeTab === 'salesfinance' ? "linear-gradient(to right, #9ca3af, #93c5fd)" : "#e5e7eb",
              color: activeTab === 'salesfinance' ? "#fff" : "#6b7280",
              border: "none",
              cursor: activeTab === 'salesfinance' ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              borderBottomLeftRadius: "4px",
              borderBottomRightRadius: "4px",
              transition: "all 0.2s",
              lineHeight: "15px",
              opacity: activeTab === 'salesfinance' ? 0.8 : 1
            }}
          >
            3. Sales & Finance
          </button>

          <button
            onClick={() => setActiveTab('warehousepurchase')}
            disabled={activeTab === 'warehousepurchase'}
            style={{
              padding: "0 10px",
              height: "15px",
              fontSize: "9px",
              fontWeight: "500",
              background: activeTab === 'warehousepurchase' ? "linear-gradient(to right, #9ca3af, #93c5fd)" : "#e5e7eb",
              color: activeTab === 'warehousepurchase' ? "#fff" : "#6b7280",
              border: "none",
              cursor: activeTab === 'warehousepurchase' ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              borderBottomLeftRadius: "4px",
              borderBottomRightRadius: "4px",
              transition: "all 0.2s",
              lineHeight: "15px",
              opacity: activeTab === 'warehousepurchase' ? 0.8 : 1
            }}
          >
            <Warehouse size={10} />
            4. Warehouse & Purchase
          </button>
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={activeTab === 'warehousepurchase'}
          style={{
            padding: "0 14px",
            height: "20px",
            fontSize: "11px",
            fontWeight: "600",
            background: activeTab === 'warehousepurchase' ? "#9ca3af" : "linear-gradient(to right, #10b981, #059669)",
            color: "#fff",
            border: "none",
            cursor: activeTab === 'warehousepurchase' ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            borderBottomLeftRadius: "4px",
            borderBottomRightRadius: "4px",
            transition: "all 0.2s",
            lineHeight: "20px",
            opacity: activeTab === 'warehousepurchase' ? 0.6 : 1
          }}
        >
          Next
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default CreateItemMaster;