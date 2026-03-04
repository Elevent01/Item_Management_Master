import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const ItemMasterWarehouseDetails = () => {
  const [formData, setFormData] = useState({
    storageTemperature: '0.0',
    temperatureTolerance: '0.0',
    potencyItem: false,
    dependencyItem: false,
    forcedPutaway: false,
    multiBatchPallet: false,
    itemConsider: false
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
      {/* Warehouse Details Section */}
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
          Warehouse
        </h3>

        {/* First Row - Storage Temperature and Temperature Tolerance */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "12px"
        }}>
          {/* Storage Temperature */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Storage Temperature
            </label>
            <input
              type="text"
              name="storageTemperature"
              value={formData.storageTemperature}
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

          {/* Temperature Tolerance */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "4px"
            }}>
              Temperature Tolerance
            </label>
            <input
              type="text"
              name="temperatureTolerance"
              value={formData.temperatureTolerance}
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

        {/* Second Row - Checkboxes */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "12px"
        }}>
          {/* Potency Item */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              name="potencyItem"
              checked={formData.potencyItem}
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
              Potency Item
            </label>
          </div>

          {/* Dependency Item */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              name="dependencyItem"
              checked={formData.dependencyItem}
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
              Dependency Item
            </label>
          </div>
        </div>

        {/* Third Row - More Checkboxes */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px"
        }}>
          {/* Forced Putaway */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              name="forcedPutaway"
              checked={formData.forcedPutaway}
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
              Forced Putaway
            </label>
          </div>

          {/* Multi-Batch Pallet */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              name="multiBatchPallet"
              checked={formData.multiBatchPallet}
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
              Multi-Batch Pallet
            </label>
          </div>
        </div>

        {/* Fourth Row - Item Consider */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginTop: "12px"
        }}>
          {/* Item Consider */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              name="itemConsider"
              checked={formData.itemConsider}
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
              Item Consider
            </label>
          </div>

          {/* Empty space to maintain grid alignment */}
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default ItemMasterWarehouseDetails;
