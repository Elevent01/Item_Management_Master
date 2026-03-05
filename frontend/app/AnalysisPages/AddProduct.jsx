import React, { useState, useEffect } from 'react';
import { Building, Factory, Package, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Globe, Layers, Tag, Box } from 'lucide-react';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

export default function AddProduct() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Master Data
  const [accessibleProductTypes, setAccessibleProductTypes] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);
  
  // Form State
  const [selectedProductType, setSelectedProductType] = useState('');
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState(''); // NEW: Product Code field
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  
  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterProductTypeId, setFilterProductTypeId] = useState('');
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

  // Fetch products when user or filters change
  useEffect(() => {
    if (currentUser?.id) {
      fetchProducts();
    }
  }, [filterProductTypeId, filterSubCategoryId, currentUser]);

  const fetchInitialData = async (userId) => {
    try {
      // Fetch accessible product types
      const productTypesRes = await fetch(`${API_BASE}/user/${userId}/accessible-product-types`);
      const productTypesData = await productTypesRes.json();
      setAccessibleProductTypes(productTypesData.product_types || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setMessage({ type: 'error', text: 'Failed to load initial data' });
    }
  };

  const fetchProducts = async () => {
    if (!currentUser?.id) return;
    
    try {
      let url = `${API_BASE}/products/by-user/${currentUser.id}`;
      const params = new URLSearchParams();
      
      if (filterProductTypeId) params.append('product_type_id', filterProductTypeId);
      if (filterSubCategoryId) params.append('sub_category_id', filterSubCategoryId);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setExistingProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setMessage({ type: 'error', text: 'Failed to load products' });
    }
  };

  const handleCreateProduct = async () => {
    if (!productName.trim()) {
      setMessage({ type: 'error', text: 'Product name is required' });
      return;
    }

    if (!selectedProductType) {
      setMessage({ type: 'error', text: 'Please select a product type' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('product_name', productName.trim());
    formData.append('product_type_id', selectedProductType);
    formData.append('user_id', currentUser.id);
    
    // NEW: Add product_code if provided
    if (productCode.trim()) formData.append('product_code', productCode.trim());
    
    if (description.trim()) formData.append('description', description.trim());
    if (sku.trim()) formData.append('sku', sku.trim());
    if (barcode.trim()) formData.append('barcode', barcode.trim());

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Product "${data.product_name}" created successfully with code ${data.product_code}` 
        });
        
        // Reset form
        setProductName('');
        setProductCode(''); // NEW: Reset product code
        setDescription('');
        setSku('');
        setBarcode('');
        
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create product' });
      }
    } catch (err) {
      console.error('Error creating product:', err);
      setMessage({ type: 'error', text: 'Error creating product' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${productName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/products/${productId}?user_id=${currentUser.id}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: data.detail });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting product' });
    }
  };

  const getSelectedProductTypeInfo = () => {
    return accessibleProductTypes.find(pt => pt.id === parseInt(selectedProductType));
  };

  const filteredProducts = existingProducts.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueSubCategories = [...new Map(accessibleProductTypes.map(pt => 
    [pt.sub_category_id, { id: pt.sub_category_id, name: pt.scope_label }]
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
            <Box size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📦 Product Management</h2>
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
              Create Product
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
              View Products ({filteredProducts.length})
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
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>📦 PRODUCT RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Product code will be auto-generated if not provided</li>
                      <li>You can provide custom product code (must be unique)</li>
                      <li>SKU and Barcode are optional but must be unique if provided</li>
                      <li>Products inherit scope from their product type</li>
                      <li>Select product type to see its scope details</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Product Type Selection */}
              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Package size={12} />
                  Select Product Type
                </h3>

                <div>
                  <label style={s3}>
                    <Package size={10} style={{ display: "inline", marginRight: "4px" }} />
                    Product Type <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={selectedProductType}
                    onChange={(e) => {
                      setSelectedProductType(e.target.value);
                      setProductName('');
                      setProductCode(''); // NEW: Reset product code
                      setDescription('');
                      setSku('');
                      setBarcode('');
                    }}
                    style={s2}
                  >
                    <option value="">Select Product Type</option>
                    {accessibleProductTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>
                        {pt.product_type_name} ({pt.product_type_code}) - {pt.scope_label}
                      </option>
                    ))}
                  </select>
                  {accessibleProductTypes.length > 0 && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                      Showing {accessibleProductTypes.length} accessible product types
                    </p>
                  )}
                </div>

                {selectedProductType && getSelectedProductTypeInfo() && (
                  <div style={{ marginTop: "8px", padding: "8px", background: "#ede9fe", borderRadius: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#000", fontWeight: "600", marginBottom: "4px" }}>
                      Selected Product Type Details:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "8px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {getSelectedProductTypeInfo().is_multi_company ? (
                          <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🌍 Multi-Company
                          </span>
                        ) : (
                          <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🏢 {getSelectedProductTypeInfo().company_code}
                          </span>
                        )}
                        {getSelectedProductTypeInfo().sub_category_id && (
                          <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            📚 Linked to SubCategory
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "8px", color: "#666", fontStyle: "italic", marginTop: "2px" }}>
                        {getSelectedProductTypeInfo().scope_label}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Details Form */}
              {selectedProductType && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Box size={12} />
                    Product Details
                  </h3>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>
                      Product Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Steel Rod 10mm, Plastic Bottle 500ml"
                      style={s1}
                    />
                  </div>

                  {/* NEW: Product Code Field */}
                  <div style={{ marginBottom: "10px" }}>
                    <label style={s3}>
                      Product Code (Optional - Auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      placeholder="e.g., STEEL-ROD-0001 (Leave empty for auto-generation)"
                      style={s1}
                    />
                    <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666", fontStyle: "italic" }}>
                      💡 Leave empty to auto-generate based on product type and name
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>SKU (Optional)</label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g., SKU123456"
                        style={s1}
                      />
                    </div>

                    <div>
                      <label style={s3}>Barcode (Optional)</label>
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="e.g., 1234567890123"
                        style={s1}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={s3}>Description (Optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this product"
                      style={{ ...s1, minHeight: "60px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button
                      onClick={() => {
                        setProductName('');
                        setProductCode(''); // NEW: Reset product code
                        setDescription('');
                        setSku('');
                        setBarcode('');
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
                      onClick={handleCreateProduct}
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
                          Create Product
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
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                </div>

                <select
                  value={filterProductTypeId}
                  onChange={(e) => setFilterProductTypeId(e.target.value)}
                  style={{ ...s2, maxWidth: "200px" }}
                >
                  <option value="">All Product Types</option>
                  {accessibleProductTypes.map(pt => (
                    <option key={pt.id} value={pt.id}>
                      {pt.product_type_name}
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

              {filteredProducts.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <Box size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Products Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>
                    {searchTerm ? 'Try adjusting your search' : 'Create the first product'}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr",
                  gap: "10px" 
                }}>
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
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
                            {product.product_name}
                          </h4>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "6px" }}>
                            Code: {product.product_code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.product_name)}
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

                      {product.description && (
                        <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>
                          {product.description}
                        </p>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "8px", marginBottom: "8px" }}>
                        <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                          📦 {product.product_type.name}
                        </span>
                        {product.sku && (
                          <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🏷️ SKU: {product.sku}
                          </span>
                        )}
                        {product.barcode && (
                          <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🔄 Barcode: {product.barcode}
                          </span>
                        )}
                      </div>

                      {product.total_classifications > 0 && (
                        <div style={{ marginTop: "8px", padding: "6px", background: "#f9fafb", borderRadius: "3px", fontSize: "8px", color: "#000" }}>
                          🏷️ {product.total_classifications} classifications
                        </div>
                      )}
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