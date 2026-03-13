// app/icons/AbcMaster.js
"use client";
import { usePanelWidth } from "../context/PanelWidthContext";
import { abcLinks } from "../config/abcLinks";

export default function AbcMaster() {
  const { addTab } = usePanelWidth();

  const handleItemClick = (item) => {
    addTab(item.path, item.name);
  };

  return (
    <div style={{ padding: "20px", width: "100%", height: "100%", overflow: "auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
          🎨 abc
        </h1>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Manage abc settings and configurations
        </p>
      </div>

      {/* Grid Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "16px",
        }}
      >
        {abcLinks.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              onClick={() => handleItemClick(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8f9fa";
                e.currentTarget.style.borderColor = "#8b5cf6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e0e0e0";
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                  {item.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
