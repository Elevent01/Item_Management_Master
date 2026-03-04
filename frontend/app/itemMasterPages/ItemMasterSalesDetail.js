import React, { useState } from 'react';

const ItemMasterSalesDetail = () => {
  const [formData, setFormData] = useState({
    itemClass: 'Always',
    vedClass: 'Vital',
    priceControlCode: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#fff"
    }}>
      {/* Sales Details Section */}
      <div style={{
        padding: "12px",
        borderBottom: "1px solid #e5e7eb"
      }}>
        <h3 style={{
          margin: "0 0 12px 0",
          fontSize: "13px",
          fontWeight: "600",
          color: "#374151"
        }}>
          Sales Details
        </h3>

        {/* First Row - Item Class and VED Class */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "12px"
        }}>
          {/* Item Class */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Item Class
            </label>
            <select
              name="itemClass"
              value={formData.itemClass}
              onChange={handleInputChange}
              style={{
                padding: "6px 8px",
                fontSize: "11px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: "#fff",
                color: "#374151",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="Always">Always</option>
              <option value="Sometimes">Sometimes</option>
              <option value="Never">Never</option>
            </select>
          </div>

          {/* VED Class */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              VED Class
            </label>
            <select
              name="vedClass"
              value={formData.vedClass}
              onChange={handleInputChange}
              style={{
                padding: "6px 8px",
                fontSize: "11px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: "#fff",
                color: "#374151",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="Vital">Vital</option>
              <option value="Essential">Essential</option>
              <option value="Desirable">Desirable</option>
            </select>
          </div>
        </div>

        {/* Second Row - Price Control Code */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px"
        }}>
          {/* Price Control Code */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Price Control Code
            </label>
            <input
              type="text"
              name="priceControlCode"
              value={formData.priceControlCode}
              onChange={handleInputChange}
              placeholder="Enter Price Control Code for Search"
              style={{
                padding: "6px 8px",
                fontSize: "11px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: "#fff",
                color: "#374151",
                outline: "none"
              }}
            />
          </div>

          {/* Empty space to maintain grid alignment */}
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default ItemMasterSalesDetail;
