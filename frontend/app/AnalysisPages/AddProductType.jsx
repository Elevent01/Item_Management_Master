import React, { useState, useEffect } from 'react';
import { Building, Factory, Package, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Globe, Layers, Tag, Folder } from 'lucide-react';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

export default function AddProductType() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Master Data
  const [companiesWithPlants, setCompaniesWithPlants] = useState([]);
  const [allAccessibleSubCategories, setAllAccessibleSubCategories] = useState([]);
  const [existingProductTypes, setExistingProductTypes] = useState([]);
  
  // Form State
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [isCompanyWide, setIsCompanyWide] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [productTypeName, setProductTypeName] = useState('');
  const [productTypeCode, setProductTypeCode] = useState('');
  const [description, setDescription] = useState('');
  
  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterCompanyId, setFilterCompanyId] = useState('');

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

  // Fetch product types when user or filter changes
  useEffect(() => {
    if (currentUser?.id) {
      fetchProductTypes();
    }
  }, [filterCompanyId, currentUser]);

  const fetchInitialData = async (userId) => {
    try {
      // Fetch companies with plants
      const companiesRes = await fetch(`${API_BASE}/user/${userId}/companies-with-plants`);
      const companiesData = await companiesRes.json();
      setCompaniesWithPlants(companiesData.companies || []);

      // Fetch accessible subcategories
      const subCatsRes = await fetch(`${API_BASE}/user/${userId}/accessible-subcategories-for-product-type`);
      const subCatsData = await subCatsRes.json();
      setAllAccessibleSubCategories(subCatsData.subcategories || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setMessage({ type: 'error', text: 'Failed to load initial data' });
    }
  };

  const fetchProductTypes = async () => {
    if (!currentUser?.id) return;
    
    try {
      let url = `${API_BASE}/product-types/by-user/${currentUser.id}`;
      if (filterCompanyId) {
        url += `?company_id=${filterCompanyId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setExistingProductTypes(data.product_types || []);
    } catch (err) {
      console.error('Error fetching product types:', err);
      setMessage({ type: 'error', text: 'Failed to load product types' });
    }
  };

  const handleCompanyToggle = (companyId) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
    setSelectedPlant('');
  };

  const handleCreateProductType = async () => {
    if (!productTypeName.trim()) {
      setMessage({ type: 'error', text: 'Product type name is required' });
      return;
    }

    if (!productTypeCode.trim()) {
      setMessage({ type: 'error', text: 'Product type code is required' });
      return;
    }

    if (!isStandalone && !selectedSubCategory) {
      setMessage({ type: 'error', text: 'Please select a sub-category or choose standalone mode' });
      return;
    }

    if (isStandalone && selectedCompanies.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one company for standalone product type' });
      return;
    }

    if (!isCompanyWide && selectedCompanies.length > 1) {
      setMessage({ type: 'error', text: 'Plant-specific product types can only be created for a single company' });
      return;
    }

    if (!isCompanyWide && !selectedPlant) {
      setMessage({ type: 'error', text: 'Please select Plant or choose Company-wide' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('product_type_name', productTypeName.trim());
    formData.append('product_type_code', productTypeCode.trim().toUpperCase());
    formData.append('user_id', currentUser.id);
    
    if (!isStandalone && selectedSubCategory) {
      formData.append('sub_category_id', selectedSubCategory);
    } else {
      formData.append('company_ids', selectedCompanies.join(','));
      if (!isCompanyWide && selectedPlant) {
        formData.append('plant_id', selectedPlant);
      }
    }
    
    if (description.trim()) formData.append('description', description.trim());

    try {
      const res = await fetch(`${API_BASE}/product-types`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Product Type "${data.product_type_name}" created successfully with code ${data.product_type_code} (${data.scope})` 
        });
        
        // Reset form
        setProductTypeName('');
        setProductTypeCode('');
        setDescription('');
        setSelectedSubCategory('');
        setSelectedCompanies([]);
        setIsStandalone(false);
        setIsCompanyWide(true);
        setSelectedPlant('');
        
        fetchProductTypes();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create product type' });
      }
    } catch (err) {
      console.error('Error creating product type:', err);
      setMessage({ type: 'error', text: 'Error creating product type' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProductType = async (productTypeId, productTypeName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${productTypeName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/product-types/${productTypeId}?user_id=${currentUser.id}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchProductTypes();
      } else {
        setMessage({ type: 'error', text: data.detail });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting product type' });
    }
  };

  const getSelectedCompaniesNames = () => {
    return selectedCompanies.map(cid => {
      const company = companiesWithPlants.find(c => c.company_id === parseInt(cid));
      return company?.company_name || '';
    }).filter(Boolean).join(', ');
  };

  const getSelectedPlantName = () => {
    if (selectedCompanies.length !== 1) return '';
    const company = companiesWithPlants.find(c => c.company_id === parseInt(selectedCompanies[0]));
    const plant = company?.plants?.find(p => p.plant_id === parseInt(selectedPlant));
    return plant?.plant_name || '';
  };

  const getSelectedSubCategoryInfo = () => {
    return allAccessibleSubCategories.find(sc => sc.id === parseInt(selectedSubCategory));
  };

  const availablePlants = selectedCompanies.length === 1
    ? companiesWithPlants.find(c => c.company_id === parseInt(selectedCompanies[0]))?.plants || []
    : [];

  const filteredProductTypes = existingProductTypes.filter(pt =>
    pt.product_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pt.product_type_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubCategories = allAccessibleSubCategories.filter(sc =>
    sc.sub_category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sc.sub_category_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sc.category_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            <Package size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📦 Product Type Management</h2>
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
              Create Product Type
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
              View Product Types ({filteredProductTypes.length})
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
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>📦 PRODUCT TYPE RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Product type code must be unique across all companies</li>
                      <li>You can link to sub-category OR create standalone</li>
                      <li>Standalone types need company selection</li>
                      <li>Linked types inherit scope from sub-category</li>
                      <li>Use UPPERCASE for codes (e.g., STEEL, PLASTIC, ELEC)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Creation Mode Selection */}
              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={12} />
                  Creation Mode
                </h3>
                
                <div style={{ display: "flex", gap: "10px" }}>
                  <label style={{ 
                    flex: 1, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    padding: "8px 10px", 
                    border: !isStandalone ? "2px solid #8b5cf6" : "1px solid #e0e0e0",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: !isStandalone ? "#f3e8ff" : "white"
                  }}>
                    <input
                      type="radio"
                      checked={!isStandalone}
                      onChange={() => {
                        setIsStandalone(false);
                        setSelectedCompanies([]);
                        setSelectedPlant('');
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>
                        <Folder size={10} style={{ display: "inline", marginRight: "4px" }} />
                        Linked to Sub-Category
                      </div>
                      <div style={{ fontSize: "8px", color: "#666" }}>
                        Inherits scope from sub-category
                      </div>
                    </div>
                  </label>

                  <label style={{ 
                    flex: 1, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    padding: "8px 10px", 
                    border: isStandalone ? "2px solid #8b5cf6" : "1px solid #e0e0e0",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: isStandalone ? "#f3e8ff" : "white"
                  }}>
                    <input
                      type="radio"
                      checked={isStandalone}
                      onChange={() => {
                        setIsStandalone(true);
                        setSelectedSubCategory('');
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>
                        <Globe size={10} style={{ display: "inline", marginRight: "4px" }} />
                        Standalone
                      </div>
                      <div style={{ fontSize: "8px", color: "#666" }}>
                        Define your own scope
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sub-Category Selection (for linked mode) */}
              {!isStandalone && (
                <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Folder size={12} />
                    Select Sub-Category
                  </h3>

                  <div style={{ position: "relative", marginBottom: "8px" }}>
                    <Search size={12} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                    <input
                      type="text"
                      placeholder="Search sub-categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "9px", color: "#000" }}
                    />
                  </div>

                  <div>
                    <label style={s3}>
                      <Folder size={10} style={{ display: "inline", marginRight: "4px" }} />
                      Sub-Category <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      style={s2}
                    >
                      <option value="">Select Sub-Category</option>
                      {filteredSubCategories.map(sc => (
                        <option key={sc.id} value={sc.id}>
                          {sc.sub_category_name} ({sc.sub_category_code}) - {sc.scope_label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSubCategory && getSelectedSubCategoryInfo() && (
                    <div style={{ marginTop: "8px", padding: "8px", background: "#ede9fe", borderRadius: "4px" }}>
                      <div style={{ fontSize: "9px", color: "#000", fontWeight: "600", marginBottom: "4px" }}>
                        Selected Sub-Category Details:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "8px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🏢 {getSelectedSubCategoryInfo().company_code}
                          </span>
                          {getSelectedSubCategoryInfo().scope_label.includes('Multi-Company') ? (
                            <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🌐 Multi-Company
                            </span>
                          ) : getSelectedSubCategoryInfo().scope_label.includes('Plant') ? (
                            <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🏭 Plant-specific
                            </span>
                          ) : (
                            <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🌐 Company-wide
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "8px", color: "#666", fontStyle: "italic", marginTop: "2px" }}>
                          {getSelectedSubCategoryInfo().scope_label}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Company Selection (for standalone mode) */}
              {isStandalone && (
                <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Building size={12} />
                    Select Company/Companies <span style={{ color: "#dc2626" }}>*</span>
                  </h3>
                  
                  <div style={{ 
                    maxHeight: "150px", 
                    overflowY: "auto", 
                    border: "1px solid #e0e0e0", 
                    borderRadius: "4px", 
                    background: "white",
                    padding: "8px"
                  }}>
                    {companiesWithPlants.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#666", fontSize: "10px" }}>
                        No companies available
                      </div>
                    ) : (
                      companiesWithPlants.map(company => (
                        <label
                          key={company.company_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 8px",
                            cursor: "pointer",
                            borderRadius: "3px",
                            marginBottom: "4px",
                            background: selectedCompanies.includes(company.company_id) ? "#f3e8ff" : "transparent",
                            border: selectedCompanies.includes(company.company_id) ? "1px solid #8b5cf6" : "1px solid transparent"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCompanies.includes(company.company_id)}
                            onChange={() => handleCompanyToggle(company.company_id)}
                            style={{ cursor: "pointer" }}
                          />
                          <span style={{ fontSize: "9px", color: "#000", fontWeight: "500" }}>
                            {company.company_name} ({company.company_code})
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  {selectedCompanies.length > 0 && (
                    <div style={{ marginTop: "8px", padding: "6px 8px", background: "#ede9fe", borderRadius: "4px", fontSize: "9px", color: "#000", fontWeight: "500" }}>
                      <strong>Selected ({selectedCompanies.length}):</strong> {getSelectedCompaniesNames()}
                    </div>
                  )}
                </div>
              )}

              {/* Scope Selection (for standalone mode) */}
              {isStandalone && selectedCompanies.length > 0 && (
                <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe size={12} />
                    Product Type Scope
                  </h3>
                  
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <label style={{ 
                      flex: 1, 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      padding: "8px 10px", 
                      border: isCompanyWide ? "2px solid #8b5cf6" : "1px solid #e0e0e0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: isCompanyWide ? "#f3e8ff" : "white"
                    }}>
                      <input
                        type="radio"
                        checked={isCompanyWide}
                        onChange={() => {
                          setIsCompanyWide(true);
                          setSelectedPlant('');
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>
                          <Globe size={10} style={{ display: "inline", marginRight: "4px" }} />
                          Company-wide
                        </div>
                        <div style={{ fontSize: "8px", color: "#666" }}>
                          Apply to all plants in selected {selectedCompanies.length > 1 ? 'companies' : 'company'}
                        </div>
                      </div>
                    </label>

                    <label style={{ 
                      flex: 1, 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      padding: "8px 10px", 
                      border: !isCompanyWide ? "2px solid #8b5cf6" : "1px solid #e0e0e0",
                      borderRadius: "4px",
                      cursor: selectedCompanies.length > 1 ? "not-allowed" : "pointer",
                      background: !isCompanyWide ? "#f3e8ff" : "white",
                      opacity: selectedCompanies.length > 1 ? 0.5 : 1
                    }}>
                      <input
                        type="radio"
                        checked={!isCompanyWide}
                        onChange={() => selectedCompanies.length === 1 && setIsCompanyWide(false)}
                        disabled={selectedCompanies.length > 1}
                        style={{ cursor: selectedCompanies.length > 1 ? "not-allowed" : "pointer" }}
                      />
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>
                          <Factory size={10} style={{ display: "inline", marginRight: "4px" }} />
                          Plant-specific
                        </div>
                        <div style={{ fontSize: "8px", color: "#666" }}>
                          {selectedCompanies.length > 1 ? 'Only for single company' : 'Apply to specific plant only'}
                        </div>
                      </div>
                    </label>
                  </div>

                  {!isCompanyWide && selectedCompanies.length === 1 && (
                    <div>
                      <label style={s3}>
                        <Factory size={10} style={{ display: "inline", marginRight: "4px" }} />
                        Select Plant <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <select
                        value={selectedPlant}
                        onChange={(e) => setSelectedPlant(e.target.value)}
                        style={s2}
                      >
                        <option value="">Select Plant</option>
                        {availablePlants.map(p => (
                          <option key={p.plant_id} value={p.plant_id}>
                            {p.plant_name} ({p.plant_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!isCompanyWide && selectedPlant && (
                    <div style={{ marginTop: "8px", padding: "6px 8px", background: "#fef3c7", borderRadius: "4px", fontSize: "9px", color: "#000", fontWeight: "500" }}>
                      <strong>Scope:</strong> Only in {getSelectedPlantName()}
                    </div>
                  )}

                  {isCompanyWide && (
                    <div style={{ marginTop: "8px", padding: "6px 8px", background: "#dbeafe", borderRadius: "4px", fontSize: "9px", color: "#000", fontWeight: "500" }}>
                      <strong>Scope:</strong> All plants in {selectedCompanies.length > 1 ? `${selectedCompanies.length} companies` : getSelectedCompaniesNames()}
                    </div>
                  )}
                </div>
              )}

              {/* Product Type Details Form */}
              {(selectedSubCategory || (isStandalone && selectedCompanies.length > 0 && (isCompanyWide || selectedPlant))) && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Package size={12} />
                    Product Type Details
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>
                        Product Type Name <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={productTypeName}
                        onChange={(e) => setProductTypeName(e.target.value)}
                        placeholder="e.g., Steel, Plastic, Electronics"
                        style={s1}
                      />
                    </div>

                    <div>
                      <label style={s3}>
                        Product Type Code <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={productTypeCode}
                        onChange={(e) => setProductTypeCode(e.target.value.toUpperCase())}
                        placeholder="e.g., STEEL, PLASTIC, ELEC"
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
                      placeholder="Brief description of this product type"
                      style={{ ...s1, minHeight: "60px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button
                      onClick={() => {
                        setProductTypeName('');
                        setProductTypeCode('');
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
                      onClick={handleCreateProductType}
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
                          Create Product Type
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
                    placeholder="Search product types..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", color: "#000" }}
                  />
                </div>

                <select
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                  style={{ ...s2, maxWidth: "200px" }}
                >
                  <option value="">All Companies</option>
                  {companiesWithPlants.map(c => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
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

              {filteredProductTypes.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <Package size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Product Types Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>
                    {searchTerm ? 'Try adjusting your search' : 'Create the first product type'}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr",
                  gap: "10px" 
                }}>
                  {filteredProductTypes.map(pt => (
                    <div
                      key={pt.id}
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
                            {pt.product_type_name}
                          </h4>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "6px" }}>
                            Code: {pt.product_type_code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteProductType(pt.id, pt.product_type_name)}
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

                      {pt.description && (
                        <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>
                          {pt.description}
                        </p>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "8px", marginBottom: "8px" }}>
                        {pt.is_multi_company ? (
                          <>
                            <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🌐 Multi-Company ({pt.companies?.length || 0} companies)
                            </span>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {pt.companies?.map((comp, idx) => (
                                <span key={idx} style={{ padding: "2px 5px", background: "#dbeafe", color: "#000", borderRadius: "2px", fontSize: "7px" }}>
                                  {comp.code}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🏢 {pt.company?.name || 'N/A'}
                            </span>
                            {pt.scope.includes('Plant') ? (
                              <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                                🏭 {pt.plant?.code || 'Specific Plant'}
                              </span>
                            ) : (
                              <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                                🌐 All Plants
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: "8px", color: "#666", fontStyle: "italic", marginTop: "2px" }}>
                          {pt.scope_detail}
                        </div>
                      </div>

                      {pt.total_products > 0 && (
                        <div style={{ marginTop: "8px", padding: "6px", background: "#f9fafb", borderRadius: "3px", fontSize: "8px", color: "#000" }}>
                          📦 {pt.total_products} products
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