import React, { useState, useEffect } from 'react';
import { Building, Factory, Package, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Globe, Layers, Tag, Box, Award } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function AddProductClassification() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Master Data
  const [accessibleProducts, setAccessibleProducts] = useState([]);
  const [existingClassifications, setExistingClassifications] = useState([]);
  
  // Form State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [classificationName, setClassificationName] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState('');
  const [qualityStandard, setQualityStandard] = useState('');
  const [certification, setCertification] = useState('');
  
  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterSubCategoryId, setFilterSubCategoryId] = useState('');

  // Get current user
  useEffect(() => {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const user = parsed.user;
        setCurrentUser(user);
        if (user?.id) {
          fetchInitialData(user.id);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setMessage({ type: 'error', text: 'Failed to load user data' });
      }
    }
  }, []);

  // Fetch classifications when user or filters change
  useEffect(() => {
    if (currentUser?.id) {
      fetchClassifications();
    }
  }, [filterProductId, filterSubCategoryId, currentUser]);

  const fetchInitialData = async (userId) => {
    try {
      // Fetch accessible products for classification
      const productsRes = await fetch(`${API_BASE}/user/${userId}/accessible-products-for-classification`);
      const productsData = await productsRes.json();
      setAccessibleProducts(productsData.products || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setMessage({ type: 'error', text: 'Failed to load initial data' });
    }
  };

  const fetchClassifications = async () => {
    if (!currentUser?.id) return;
    
    try {
      let url = `${API_BASE}/product-classifications/by-user/${currentUser.id}`;
      const params = new URLSearchParams();
      
      if (filterProductId) params.append('product_id', filterProductId);
      if (filterSubCategoryId) params.append('sub_category_id', filterSubCategoryId);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setExistingClassifications(data.classifications || []);
    } catch (err) {
      console.error('Error fetching classifications:', err);
      setMessage({ type: 'error', text: 'Failed to load classifications' });
    }
  };

  const handleCreateClassification = async () => {
    if (!classificationName.trim()) {
      setMessage({ type: 'error', text: 'Classification name is required' });
      return;
    }

    if (!selectedProduct) {
      setMessage({ type: 'error', text: 'Please select a product' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('classification_name', classificationName.trim());
    formData.append('product_id', selectedProduct);
    formData.append('user_id', currentUser.id);
    
    if (description.trim()) formData.append('description', description.trim());
    if (grade.trim()) formData.append('grade', grade.trim());
    if (qualityStandard.trim()) formData.append('quality_standard', qualityStandard.trim());
    if (certification.trim()) formData.append('certification', certification.trim());

    try {
      const res = await fetch(`${API_BASE}/product-classifications`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Classification "${data.classification_name}" created successfully with code ${data.classification_code}` 
        });
        
        // Reset form
        setClassificationName('');
        setDescription('');
        setGrade('');
        setQualityStandard('');
        setCertification('');
        
        fetchClassifications();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create classification' });
      }
    } catch (err) {
      console.error('Error creating classification:', err);
      setMessage({ type: 'error', text: 'Error creating classification' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClassification = async (classificationId, classificationName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${classificationName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/product-classifications/${classificationId}?user_id=${currentUser.id}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchClassifications();
      } else {
        setMessage({ type: 'error', text: data.detail });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting classification' });
    }
  };

  const getSelectedProductInfo = () => {
    return accessibleProducts.find(p => p.id === parseInt(selectedProduct));
  };

  const filteredClassifications = existingClassifications.filter(classification =>
    classification.classification_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classification.classification_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classification.grade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueProducts = [...new Map(accessibleProducts.map(p => 
    [p.id, p]
  )).values()];

  const uniqueSubCategories = [...new Map(accessibleProducts.map(p => 
    [p.product_type.sub_category_id, { 
      id: p.product_type.sub_category_id, 
      name: p.product_type.sub_category_name || 'Standalone Products' 
    }]
  ).filter(item => item[0])).values()];

  // Styles
  const s1 = { width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", boxSizing: "border-box", color: "#000" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "9px", fontWeight: "600", marginBottom: "4px", color: "#000" };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>🏷️ Product Classification Management</h2>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div style={{ 
            margin: "8px 12px 0 12px", 
            padding: "6px 8px", 
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            border: message.type === 'success' ? "1px solid #86efac" : "1px solid #fca5a5",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            {message.type === 'success' ? <CheckCircle size={12} style={{ color: "#16a34a" }} /> : <AlertCircle size={12} style={{ color: "#dc2626" }} />}
            <span style={{ fontSize: "10px", color: "#000", fontWeight: "500", flex: 1 }}>
              {message.text}
            </span>
            <button
              onClick={() => setMessage(null)}
              style={{ padding: "2px", border: "none", background: "transparent", cursor: "pointer" }}
            >
              <XCircle size={12} color={message.type === 'success' ? '#16a34a' : '#dc2626'} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", background: "#f9fafb", flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: "6px 12px",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              border: "none",
              background: activeTab === 'create' ? 'white' : 'transparent',
              color: activeTab === 'create' ? '#8b5cf6' : '#000',
              borderBottom: activeTab === 'create' ? '2px solid #8b5cf6' : 'none'
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <Plus size={12} />
              Create Classification
            </div>
          </button>
          <button
            onClick={() => setActiveTab('view')}
            style={{
              flex: 1,
              padding: "6px 12px",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              border: "none",
              background: activeTab === 'view' ? 'white' : 'transparent',
              color: activeTab === 'view' ? '#8b5cf6' : '#000',
              borderBottom: activeTab === 'view' ? '2px solid #8b5cf6' : 'none'
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <Eye size={12} />
              View Classifications ({filteredClassifications.length})
            </div>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {/* CREATE TAB */}
          {activeTab === 'create' && (
            <div>
              {/* Info Box */}
              <div style={{ background: "#e9d5ff", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <Info size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>🏷️ CLASSIFICATION RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Classification code will be auto-generated based on product</li>
                      <li>Grade, Quality Standard, and Certification are optional</li>
                      <li>Classifications inherit scope from their product</li>
                      <li>Select product to see its scope details</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Box size={12} />
                  Select Product
                </h3>

                <div>
                  <label style={s3}>
                    <Box size={10} style={{ display: "inline", marginRight: "4px" }} />
                    Product <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => {
                      setSelectedProduct(e.target.value);
                      setClassificationName('');
                      setDescription('');
                      setGrade('');
                      setQualityStandard('');
                      setCertification('');
                    }}
                    style={s2}
                  >
                    <option value="">Select Product</option>
                    {uniqueProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.product_code}) - {p.scope_label}
                      </option>
                    ))}
                  </select>
                  {accessibleProducts.length > 0 && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                      Showing {uniqueProducts.length} accessible products
                    </p>
                  )}
                </div>

                {selectedProduct && getSelectedProductInfo() && (
                  <div style={{ marginTop: "8px", padding: "8px", background: "#ede9fe", borderRadius: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#000", fontWeight: "600", marginBottom: "4px" }}>
                      Selected Product Details:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "8px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                          📦 {getSelectedProductInfo().product_type_name}
                        </span>
                        {getSelectedProductInfo().product_type_sub_category_name && (
                          <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            📚 {getSelectedProductInfo().product_type_sub_category_name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "8px", color: "#666", fontStyle: "italic", marginTop: "2px" }}>
                        {getSelectedProductInfo().scope_label}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Classification Details Form */}
              {selectedProduct && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Award size={12} />
                    Classification Details
                  </h3>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>
                      Classification Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={classificationName}
                      onChange={(e) => setClassificationName(e.target.value)}
                      placeholder="e.g., Grade A, Premium Quality, Export Standard"
                      style={s1}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>Grade (Optional)</label>
                      <input
                        type="text"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder="e.g., A, B, C"
                        style={s1}
                      />
                    </div>

                    <div>
                      <label style={s3}>Quality Standard (Optional)</label>
                      <input
                        type="text"
                        value={qualityStandard}
                        onChange={(e) => setQualityStandard(e.target.value)}
                        placeholder="e.g., ISO 9001, ASTM"
                        style={s1}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>Certification (Optional)</label>
                    <input
                      type="text"
                      value={certification}
                      onChange={(e) => setCertification(e.target.value)}
                      placeholder="e.g., Organic, Fair Trade"
                      style={s1}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={s3}>Description (Optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this classification"
                      style={{ ...s1, minHeight: "60px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button
                      onClick={() => {
                        setClassificationName('');
                        setDescription('');
                        setGrade('');
                        setQualityStandard('');
                        setCertification('');
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                        color: "#000"
                      }}
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleCreateClassification}
                      disabled={loading}
                      style={{
                        padding: "6px 16px",
                        background: loading ? "#d1d5db" : "linear-gradient(to right, #8b5cf6, #a78bfa)",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: loading ? "not-allowed" : "pointer",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save size={12} />
                          Create Classification
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW TAB */}
          {activeTab === 'view' && (
            <div>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="Search classifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                </div>

                <select
                  value={filterProductId}
                  onChange={(e) => setFilterProductId(e.target.value)}
                  style={{ ...s2, maxWidth: "200px" }}
                >
                  <option value="">All Products</option>
                  {uniqueProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_name}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: "6px 10px",
                      background: viewMode === 'grid' ? '#8b5cf6' : 'white',
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: viewMode === 'grid' ? 'white' : '#000'
                    }}
                  >
                    <Grid size={12} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: "6px 10px",
                      background: viewMode === 'list' ? '#8b5cf6' : 'white',
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: viewMode === 'list' ? 'white' : '#000'
                    }}
                  >
                    <List size={12} />
                  </button>
                </div>
              </div>

              {filteredClassifications.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <Award size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Classifications Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>
                    {searchTerm ? 'Try adjusting your search' : 'Create the first classification'}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr",
                  gap: "10px" 
                }}>
                  {filteredClassifications.map(classification => (
                    <div
                      key={classification.id}
                      style={{
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: "6px",
                        padding: "12px",
                        transition: "all 0.2s",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.15)";
                        e.currentTarget.style.borderColor = "#8b5cf6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = "#e0e0e0";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#000", marginBottom: "3px" }}>
                            {classification.classification_name}
                          </h4>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "6px" }}>
                            Code: {classification.classification_code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClassification(classification.id, classification.classification_name)}
                          style={{
                            padding: "3px 6px",
                            background: "#fee2e2",
                            border: "1px solid #ef4444",
                            borderRadius: "3px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px"
                          }}
                        >
                          <Trash2 size={10} color="#dc2626" />
                        </button>
                      </div>

                      {classification.description && (
                        <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>
                          {classification.description}
                        </p>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "8px", marginBottom: "8px" }}>
                        <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                          📦 {classification.product.name}
                        </span>
                        {classification.grade && (
                          <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🏆 Grade: {classification.grade}
                          </span>
                        )}
                        {classification.quality_standard && (
                          <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            📋 {classification.quality_standard}
                          </span>
                        )}
                        {classification.certification && (
                          <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            ✅ {classification.certification}
                          </span>
                        )}
                      </div>

                      <div style={{ marginTop: "8px", padding: "4px 6px", background: "#f9fafb", borderRadius: "3px", fontSize: "7px", color: "#666" }}>
                        Product Type: {classification.product_type.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #a78bfa, #8b5cf6)", flexShrink: 0 }}></div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}