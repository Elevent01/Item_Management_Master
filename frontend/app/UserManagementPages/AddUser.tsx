"use client";
import { UserPlus } from "lucide-react";
import { useState } from "react";

export default function AddUser() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = () => {
    if (!formData.fullName || !formData.email || !formData.role) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      console.log("User Data:", formData);
      setSuccess("User created successfully!");
      
      setTimeout(() => {
        setFormData({
          fullName: "",
          email: "",
          role: "",
        });
        setSuccess("");
      }, 1500);
      
      setLoading(false);
    }, 500);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "4px 8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "11px",
    boxSizing: "border-box",
    color: "#333",
    backgroundColor: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "10px",
    fontWeight: "500",
    marginBottom: "3px",
    color: "#555",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "1100px",
          height: "85%",
          maxHeight: "600px",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0px 12px",
            height: "32px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, #4b5563, #60a5fa)",
            color: "white",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UserPlus size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
              Add New User
            </h2>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {error && (
            <div style={{ padding: "6px 10px", background: "#fee", color: "#c00", borderRadius: "4px", marginBottom: "8px", fontSize: "10px" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: "6px 10px", background: "#efe", color: "#080", borderRadius: "4px", marginBottom: "8px", fontSize: "10px" }}>
              {success}
            </div>
          )}

          {/* User Information */}
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
              User Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={labelStyle}>
                  Full Name <span style={{ color: "#c00" }}>*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Email Address <span style={{ color: "#c00" }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Role <span style={{ color: "#c00" }}>*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer with Buttons */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          gap: "10px", 
          padding: "0px 12px",
          height: "32px",
          borderTop: "1px solid #e0e0e0",
          background: "linear-gradient(to right, #4b5563, #60a5fa)",
          flexShrink: 0,
          alignItems: "center",
        }}>
          <button
            type="button"
            onClick={() => setFormData({ fullName: "", email: "", role: "" })}
            style={{
              padding: "4px 14px",
              background: loading ? "#ccc" : "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              color: "white",
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "4px 18px",
              background: loading ? "#ccc" : "rgba(255, 255, 255, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              color: "white",
            }}
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}