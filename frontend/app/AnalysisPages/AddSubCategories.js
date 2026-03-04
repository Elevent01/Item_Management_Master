import React, { useState, useEffect } from 'react';
import { Building, Factory, FolderPlus, Folder, Search, Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Loader, ChevronDown, ChevronRight, Grid, List, Plus, Save, Layers, Info, Globe } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function AddSubCategories() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Master Data
  const [allAccessibleCategories, setAllAccessibleCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subCategoryName, setSubCategoryName] = useState('');
  const [subCategoryCode, setSubCategoryCode] = useState('');
  const [description, setDescription] = useState('');
  
  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  // Get current user
  useEffect(() => {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const user = parsed.user;
        setCurrentUser(user);
        if (user?.id) {
          fetchAllAccessibleCategories(user.id);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
        setMessage({ type: 'error', text: 'Failed to load user data' });
      }
    }
  }, []);

  // Fetch subcategories when category selected
  useEffect(() => {
    if (currentUser?.id && selectedCategory) {
      fetchSubCategories();
    }
  }, [selectedCategory, currentUser]);

  const fetchAllAccessibleCategories = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/user/${userId}/accessible-categories`);
      const data = await res.json();
      setAllAccessibleCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setMessage({ type: 'error', text: 'Failed to load categories' });
    }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/categories/${selectedCategory}/subcategories?user_id=${currentUser.id}&include_inactive=false`
      );
      const data = await res.json();
      setSubCategories(data.subcategories || []);
    } catch (err) {
      console.error('Error fetching subcategories:', err);
    }
  };

  const handleCreateSubCategory = async () => {
    if (!subCategoryName.trim()) {
      setMessage({ type: 'error', text: 'Sub-category name is required' });
      return;
    }

    if (!subCategoryCode.trim()) {
      setMessage({ type: 'error', text: 'Sub-category code is required' });
      return;
    }

    if (!selectedCategory) {
      setMessage({ type: 'error', text: 'Please select a parent category' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('category_id', selectedCategory);
    formData.append('sub_category_name', subCategoryName.trim());
    formData.append('sub_category_code', subCategoryCode.trim().toUpperCase());
    formData.append('user_id', currentUser.id);
    if (description.trim()) formData.append('description', description.trim());

    try {
      const res = await fetch(`${API_BASE}/subcategories`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Sub-category "${data.subcategory_name}" created successfully with code ${data.subcategory_code}` 
        });
        
        // Reset form
        setSubCategoryName('');
        setSubCategoryCode('');
        setDescription('');
        
        // Refresh subcategories
        fetchSubCategories();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create sub-category' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error creating sub-category' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubCategory = async (subCatId, subCatName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${subCatName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/subcategories/${subCatId}?user_id=${currentUser.id}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchSubCategories();
      } else {
        setMessage({ type: 'error', text: data.detail });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting sub-category' });
    }
  };

  const getSelectedCategoryInfo = () => {
    return allAccessibleCategories.find(c => c.id === parseInt(selectedCategory));
  };

  const filteredCategories = allAccessibleCategories.filter(cat =>
    cat.category_name.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
    cat.category_code.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
    cat.company_code.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  const filteredSubCategories = subCategories.filter(subcat =>
    subcat.sub_category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subcat.sub_category_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Layers size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📚 Sub-Category Management</h2>
          </div>
        </div>

        {/* Success/Error Messages */}
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
              Create Sub-Category
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
              View Sub-Categories ({filteredSubCategories.length})
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
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>📚 SUB-CATEGORY RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Sub-category code must be unique across all categories</li>
                      <li>Sub-category name must be unique within the parent category</li>
                      <li>Sub-categories inherit scope from their parent category</li>
                      <li>Use UPPERCASE for codes (e.g., GRADA, TYPE1, PREM)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Folder size={12} />
                  Select Parent Category
                </h3>

                {/* Category Search */}
                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <Search size={12} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="Search categories by name, code, or company..."
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "9px", color: "#000" }}
                  />
                </div>

                <div>
                  <label style={s3}>
                    <Folder size={10} style={{ display: "inline", marginRight: "4px" }} />
                    Parent Category <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSubCategoryName('');
                      setSubCategoryCode('');
                      setDescription('');
                    }}
                    style={s2}
                  >
                    <option value="">Select Category</option>
                    {filteredCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.category_name} ({c.category_code}) - {c.company_code} {c.applies_to_all_plants ? '🌐 All Plants' : `🏭 ${c.plant_code}`}
                      </option>
                    ))}
                  </select>
                  {allAccessibleCategories.length > 0 && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                      Showing {filteredCategories.length} of {allAccessibleCategories.length} accessible categories
                    </p>
                  )}
                </div>

                {selectedCategory && getSelectedCategoryInfo() && (
                  <div style={{ marginTop: "8px", padding: "8px", background: "#ede9fe", borderRadius: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#000", fontWeight: "600", marginBottom: "4px" }}>
                      Selected Category Details:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "8px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                          🏢 {getSelectedCategoryInfo().company_name} ({getSelectedCategoryInfo().company_code})
                        </span>
                        {getSelectedCategoryInfo().applies_to_all_plants ? (
                          <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🌐 Company-wide (All Plants)
                          </span>
                        ) : (
                          <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🏭 {getSelectedCategoryInfo().plant_name} ({getSelectedCategoryInfo().plant_code})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "8px", color: "#666", fontStyle: "italic", marginTop: "2px" }}>
                        {getSelectedCategoryInfo().scope_detail}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-Category Form */}
              {selectedCategory && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Layers size={12} />
                    Sub-Category Details
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>
                        Sub-Category Name <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={subCategoryName}
                        onChange={(e) => setSubCategoryName(e.target.value)}
                        placeholder="e.g., Grade A, Type 1, Premium"
                        style={s1}
                      />
                    </div>

                    <div>
                      <label style={s3}>
                        Sub-Category Code <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={subCategoryCode}
                        onChange={(e) => setSubCategoryCode(e.target.value.toUpperCase())}
                        placeholder="e.g., GRADA, TYPE1, PREM"
                        style={s1}
                      />
                      <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                        Will be auto-converted to UPPERCASE
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={s3}>Description (Optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this sub-category"
                      style={{ ...s1, minHeight: "60px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button
                      onClick={() => {
                        setSubCategoryName('');
                        setSubCategoryCode('');
                        setDescription('');
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
                      onClick={handleCreateSubCategory}
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
                          Create Sub-Category
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
              {!selectedCategory ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <Folder size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>Select a Category First</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>
                    Please select a parent category from the Create tab to view its sub-categories
                  </p>
                </div>
              ) : (
                <>
                  {/* Selected Category Info */}
                  {getSelectedCategoryInfo() && (
                    <div style={{ marginBottom: "12px", padding: "10px", background: "#f8f9fa", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#000", marginBottom: "6px" }}>
                        Viewing Sub-Categories for:
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "8px" }}>
                        <span style={{ padding: "4px 8px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "600" }}>
                          📂 {getSelectedCategoryInfo().category_name} ({getSelectedCategoryInfo().category_code})
                        </span>
                        <span style={{ padding: "4px 8px", background: "#dbeafe", color: "#000", borderRadius: "3px" }}>
                          🏢 {getSelectedCategoryInfo().company_code}
                        </span>
                        {getSelectedCategoryInfo().applies_to_all_plants ? (
                          <span style={{ padding: "4px 8px", background: "#dcfce7", color: "#000", borderRadius: "3px" }}>
                            🌐 All Plants
                          </span>
                        ) : (
                          <span style={{ padding: "4px 8px", background: "#fef3c7", color: "#000", borderRadius: "3px" }}>
                            🏭 {getSelectedCategoryInfo().plant_code}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Filters */}
                  <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
                      <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input
                        type="text"
                        placeholder="Search sub-categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                      />
                    </div>

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

                  {/* Sub-Categories Display */}
                  {filteredSubCategories.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                      <Layers size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                      <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Sub-Categories Found</h3>
                      <p style={{ fontSize: "10px", color: "#666" }}>
                        {searchTerm ? 'Try adjusting your search' : 'Create the first sub-category for this category'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(250px, 1fr))" : "1fr",
                      gap: "10px" 
                    }}>
                      {filteredSubCategories.map(subcat => (
                        <div
                          key={subcat.id}
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
                                {subcat.sub_category_name}
                              </h4>
                              <p style={{ fontSize: "9px", color: "#666", marginBottom: "6px" }}>
                                Code: {subcat.sub_category_code}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteSubCategory(subcat.id, subcat.sub_category_name)}
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

                          {subcat.description && (
                            <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>
                              {subcat.description}
                            </p>
                          )}

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "8px" }}>
                            <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              📂 Parent: {getSelectedCategoryInfo()?.category_name || 'Unknown'}
                            </span>
                          </div>

                          <div style={{ marginTop: "8px", padding: "4px 6px", background: "#f9fafb", borderRadius: "3px", fontSize: "7px", color: "#666" }}>
                            Created: {new Date(subcat.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
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
