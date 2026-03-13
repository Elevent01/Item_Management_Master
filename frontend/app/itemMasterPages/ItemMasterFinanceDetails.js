import React, { useState } from 'react';

const ItemMasterFinanceDetails = () => {
  const [formData, setFormData] = useState({
    taxGroup: '',
    methodOfCosting: 'WAC - WEIGHTED AVERAGE COST',
    batchCosting: false,
    standardPrice: '',
    costingMethodNo: '1',
    serialNoCosting: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#fff"
    }}>
      {/* Finance Details Section */}
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
          Finance Details
        </h3>

        {/* First Row - Tax Group and Standard Price */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "12px"
        }}>
          {/* Tax Group */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Tax Group
            </label>
            <input
              type="text"
              name="taxGroup"
              value={formData.taxGroup}
              onChange={handleInputChange}
              placeholder="Enter Tax Group for Search"
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

          {/* Standard Price */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Standard Price
            </label>
            <input
              type="text"
              name="standardPrice"
              value={formData.standardPrice}
              onChange={handleInputChange}
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
        </div>

        {/* Second Row - Method of Costing and Costing Method No. */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "12px"
        }}>
          {/* Method of Costing */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Method of Costing
            </label>
            <input
              type="text"
              name="methodOfCosting"
              value={formData.methodOfCosting}
              onChange={handleInputChange}
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

          {/* Costing Method No. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Costing Method No.
            </label>
            <input
              type="text"
              name="costingMethodNo"
              value={formData.costingMethodNo}
              onChange={handleInputChange}
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
        </div>

        {/* Third Row - Batch Costing and Serial No. Costing */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px"
        }}>
          {/* Batch Costing */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              name="batchCosting"
              checked={formData.batchCosting}
              onChange={handleInputChange}
              style={{
                width: "14px",
                height: "14px",
                cursor: "pointer"
              }}
            />
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              cursor: "pointer"
            }}>
              Batch Costing
            </label>
          </div>

          {/* Serial No. Costing */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              name="serialNoCosting"
              checked={formData.serialNoCosting}
              onChange={handleInputChange}
              style={{
                width: "14px",
                height: "14px",
                cursor: "pointer"
              }}
            />
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              cursor: "pointer"
            }}>
              Serial No. Costing
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemMasterFinanceDetails;
