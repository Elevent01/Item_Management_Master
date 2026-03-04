import React, { useState, useEffect } from 'react';
import { Building, Factory, FolderPlus, Search, Eye, Trash2, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Globe } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function AddCategories() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [backendError, setBackendError] = useState(false);
  
  // Master Data
  const [companiesWithPlants, setCompaniesWithPlants] = useState([]);
  const [existingCategories, setExistingCategories] = useState([]);
  
  // Form State
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [isCompanyWide, setIsCompanyWide] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [description, setDescription] = useState('');
  
  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterCompanyId, setFilterCompanyId] = useState('');

  // Load user data on mount
  useEffect(() => {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        const user = parsed.user;
        setCurrentUser(user);
      } catch (e) {
        console.error('Error parsing user data:', e);
        setMessage({ type: 'error', text: 'Failed to load user data' });
      }
    } else {
      setMessage({ type: 'error', text: 'No user data found. Please login again.' });
    }
  }, []);

  // Fetch companies when user is loaded
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserCompaniesWithPlants(currentUser.id);
    }
  }, [currentUser]);

  // Fetch categories when user or filter changes
  useEffect(() => {
    if (currentUser?.id) {
      fetchCategories();
    }
  }, [filterCompanyId, currentUser]);

  const fetchUserCompaniesWithPlants = async (userId) => {
    setBackendError(false);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`${API_BASE}/user/${userId}/companies-with-plants`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setCompaniesWithPlants(data.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setBackendError(true);
      
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timeout. Please check if backend is running.' });
      } else if (err.message.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to backend. Please ensure the server is running on http://localhost:8000' });
      } else {
        setMessage({ type: 'error', text: `Failed to load companies: ${err.message}` });
      }
    }
  };

  const fetchCategories = async () => {
    if (!currentUser?.id) return;
    
    setBackendError(false);
    try {
      let url = `${API_BASE}/categories/by-user/${currentUser.id}`;
      if (filterCompanyId) {
        url += `?company_id=${filterCompanyId}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setExistingCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setBackendError(true);
      
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timeout. Please check if backend is running.' });
      } else if (err.message.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to backend. Please ensure the server is running on http://localhost:8000' });
      } else {
        setMessage({ type: 'error', text: `Failed to load categories: ${err.message}` });
      }
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

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      return;
    }

    if (!categoryCode.trim()) {
      setMessage({ type: 'error', text: 'Category code is required' });
      return;
    }

    if (selectedCompanies.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one Company' });
      return;
    }

    if (!isCompanyWide && selectedCompanies.length > 1) {
      setMessage({ type: 'error', text: 'Plant-specific categories can only be created for a single company' });
      return;
    }

    if (!isCompanyWide && !selectedPlant) {
      setMessage({ type: 'error', text: 'Please select Plant or choose Company-wide' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('category_name', categoryName.trim());
    formData.append('category_code', categoryCode.trim().toUpperCase());
    formData.append('company_ids', selectedCompanies.join(','));
    
    if (!isCompanyWide && selectedPlant) {
      formData.append('plant_id', selectedPlant);
    }
    
    formData.append('user_id', currentUser.id);
    if (description.trim()) formData.append('description', description.trim());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Category "${data.category_name}" created successfully with code ${data.category_code} (${data.scope})` 
        });
        
        setCategoryName('');
        setCategoryCode('');
        setDescription('');
        setIsCompanyWide(true);
        setSelectedCompanies([]);
        setSelectedPlant('');
        
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create category' });
      }
    } catch (err) {
      console.error('Error creating category:', err);
      
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timeout. Operation took too long.' });
      } else if (err.message.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to backend. Please check your connection.' });
      } else {
        setMessage({ type: 'error', text: `Error creating category: ${err.message}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to deactivate "${categoryName}"?`)) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(
        `${API_BASE}/categories/${categoryId}?user_id=${currentUser.id}`,
        { 
          method: 'DELETE',
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: data.detail });
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timeout. Please try again.' });
      } else if (err.message.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to backend. Please check your connection.' });
      } else {
        setMessage({ type: 'error', text: `Error deleting category: ${err.message}` });
      }
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

  const availablePlants = selectedCompanies.length === 1
    ? companiesWithPlants.find(c => c.company_id === parseInt(selectedCompanies[0]))?.plants || []
    : [];

  const filteredCategories = existingCategories.filter(cat =>
    cat.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.category_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const s1 = { width: "100%", padding: "6px 8px", border: "1px solid #e0e0e0", borderRadius: "4px", fontSize: "10px", boxSizing: "border-box", color: "#000" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "9px", fontWeight: "600", marginBottom: "4px", color: "#000" };

  // Show loading state while user data is being loaded
  if (!currentUser) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Loader size={48} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: "14px", color: "#666" }}>Loading user data...</p>
        </div>
      </div>
    );
  }

  // Show backend error state
  if (backendError && companiesWithPlants.length === 0) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ textAlign: "center", maxWidth: "500px" }}>
          <AlertCircle size={64} style={{ margin: "0 auto 16px", color: "#dc2626" }} />
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "12px", color: "#000" }}>Backend Connection Error</h2>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px", lineHeight: "1.6" }}>
            Unable to connect to the backend server. Please ensure:
          </p>
          <ul style={{ textAlign: "left", fontSize: "13px", color: "#666", lineHeight: "1.8", marginBottom: "20px" }}>
            <li>The FastAPI backend is running on <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: "3px" }}>http://localhost:8000</code></li>
            <li>CORS is properly configured in the backend</li>
            <li>No firewall is blocking the connection</li>
            <li>The API endpoints are available</li>
          </ul>
          <button
            onClick={() => {
              setBackendError(false);
              if (currentUser?.id) {
                fetchUserCompaniesWithPlants(currentUser.id);
              }
            }}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(to right, #8b5cf6, #a78bfa)",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              color: "white"
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FolderPlus size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>📂 Category Management (Multi-Company)</h2>
          </div>
        </div>

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
              Create Category
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
              View Categories ({filteredCategories.length})
            </div>
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {activeTab === 'create' && (
            <div>
              <div style={{ background: "#e9d5ff", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                  <Info size={14} style={{ color: "#000", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>📂 CATEGORY RULES (MULTI-COMPANY)</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>Category code must be unique across all companies</li>
                      <li>You can select SINGLE or MULTIPLE companies</li>
                      <li>Company-wide categories apply to ALL plants in selected companies</li>
                      <li>Plant-specific categories can only be created for a SINGLE company</li>
                      <li>Use UPPERCASE for category codes (e.g., RM, FG, PKG)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building size={12} />
                  Select Company/Companies <span style={{ color: "#dc2626" }}>*</span>
                </h3>
                
                <div style={{ 
                  maxHeight: "200px", 
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

              {selectedCompanies.length > 0 && (
                <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe size={12} />
                    Category Scope
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

              {selectedCompanies.length > 0 && (isCompanyWide || selectedPlant) && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FolderPlus size={12} />
                    Category Details
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>
                        Category Name <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g., Raw Materials, Finished Goods"
                        style={s1}
                      />
                    </div>

                    <div>
                      <label style={s3}>
                        Category Code <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={categoryCode}
                        onChange={(e) => setCategoryCode(e.target.value.toUpperCase())}
                        placeholder="e.g., RM, FG, PKG"
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
                      placeholder="Brief description of this category"
                      style={{ ...s1, minHeight: "60px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button
                      onClick={() => {
                        setCategoryName('');
                        setCategoryCode('');
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
                        // CONTINUATION OF THE COMPONENT - This is the view tab section
// Place this after the create tab closing div

                      }}
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleCreateCategory}
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
                          Create Category
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'view' && (
            <div>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="Search categories..."
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

              {filteredCategories.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <FolderPlus size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No Categories Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>
                    {searchTerm ? 'Try adjusting your search' : 'Select companies to create categories'}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr",
                  gap: "10px" 
                }}>
                  {filteredCategories.map(cat => (
                    <div
                      key={cat.id}
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
                            {cat.category_name}
                          </h4>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "6px" }}>
                            Code: {cat.category_code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.category_name)}
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

                      {cat.description && (
                        <p style={{ fontSize: "9px", color: "#000", marginBottom: "8px", lineHeight: "1.4" }}>
                          {cat.description}
                        </p>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "8px", marginBottom: "8px" }}>
                        {cat.is_multi_company ? (
                          <>
                            <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🌐 Multi-Company ({cat.companies?.length || 0} companies)
                            </span>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {cat.companies?.map((comp, idx) => (
                                <span key={idx} style={{ padding: "2px 5px", background: "#dbeafe", color: "#000", borderRadius: "2px", fontSize: "7px" }}>
                                  {comp.code}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🏢 {cat.company?.name || 'N/A'}
                            </span>
                            {cat.applies_to_all_plants ? (
                              <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                                🌐 All Plants
                              </span>
                            ) : (
                              <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                                🏭 {cat.plant?.name || 'Specific Plant'}
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: "8px", color: "#666", fontStyle: "italic" }}>
                          {cat.scope_detail}
                        </div>
                      </div>

                      {cat.total_subcategories > 0 && (
                        <div style={{ marginTop: "8px", padding: "6px", background: "#f9fafb", borderRadius: "3px", fontSize: "8px", color: "#000" }}>
                          📚 {cat.total_subcategories} subcategories
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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