import React, { useState, useEffect, useCallback } from 'react';
import { Building, Factory, DollarSign, Search, Eye, CheckCircle, XCircle, AlertCircle, Loader, Grid, List, Plus, Save, Info, Globe, Upload } from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'http://localhost:8000/api';

export default function AddGLMaster() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [backendError, setBackendError] = useState(false);
  
  // Master Data
  const [companiesWithPlants, setCompaniesWithPlants] = useState([]);
  const [glTypes, setGLTypes] = useState([]);
  const [glCategories, setGLCategories] = useState([]);
  const [existingGLAccounts, setExistingGLAccounts] = useState([]);
  
  // Form State
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [isCompanyWide, setIsCompanyWide] = useState(true);
  const [glCode, setGLCode] = useState('');
  const [glName, setGLName] = useState('');
  const [selectedGLType, setSelectedGLType] = useState('');
  const [selectedGLCategory, setSelectedGLCategory] = useState('');
  const [isPostable, setIsPostable] = useState(true);
  const [currencyCode, setCurrencyCode] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // View State
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [filterCompanyId, setFilterCompanyId] = useState('');

  // Excel Import
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [showGLTypeSelector, setShowGLTypeSelector] = useState(false);
  const [importGLTypeId, setImportGLTypeId] = useState('');
  const [importGLCategoryId, setImportGLCategoryId] = useState('');

  const fetchGLAccounts = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setBackendError(false);
    try {
      let url = `${API_BASE}/gl-accounts/by-user/${currentUser.id}`;
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
      setExistingGLAccounts(data.gl_accounts || []);
    } catch (err) {
      console.error('Error fetching GL accounts:', err);
      setBackendError(true);
      
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timeout. Please check if backend is running.' });
      } else if (err.message.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to backend. Please ensure the server is running on http://localhost:8000' });
      } else {
        setMessage({ type: 'error', text: `Failed to load GL accounts: ${err.message}` });
      }
    }
  }, [currentUser, filterCompanyId]);

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
      fetchGLTypes();
      fetchGLCategories();
    }
  }, [currentUser]);

  // Fetch GL accounts when user or filter changes
  useEffect(() => {
    if (currentUser?.id) {
      fetchGLAccounts();
    }
  }, [filterCompanyId, currentUser]);

  // When GL Type changes → reset category selection
  useEffect(() => {
    setSelectedGLCategory('');
  }, [selectedGLType]);

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

  const fetchGLTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/gl-types?is_active=true`);
      const data = await res.json();
      setGLTypes(data || []);
    } catch (err) {
      console.error('Error fetching GL types:', err);
    }
  };

  const fetchGLCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/gl-categories?is_active=true`);
      const data = await res.json();
      setGLCategories(data || []);
    } catch (err) {
      console.error('Error fetching GL categories:', err);
    }
  };




  const handleCreateGLAccount = async () => {
    if (!glCode.trim()) {
      setMessage({ type: 'error', text: 'GL Code is required' });
      return;
    }

    if (!glName.trim()) {
      setMessage({ type: 'error', text: 'GL Name is required' });
      return;
    }

    if (selectedCompanies.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one Company' });
      return;
    }

    if (selectedCompanies.length > 1) {
      setMessage({ type: 'error', text: 'GL Accounts can only be created for a single company at a time' });
      return;
    }

    if (!isCompanyWide && !selectedPlant) {
      setMessage({ type: 'error', text: 'Please select Plant or choose Company-wide' });
      return;
    }

    if (!selectedGLType) {
      setMessage({ type: 'error', text: 'Please select GL Type' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('gl_code', glCode.trim().toUpperCase());
    formData.append('gl_name', glName.trim());
    formData.append('company_id', selectedCompanies[0]);
    formData.append('gl_type_id', selectedGLType);
    
    if (!isCompanyWide && selectedPlant) {
      formData.append('plant_id', selectedPlant);
    }
    
    if (selectedGLCategory) formData.append('gl_category_id', selectedGLCategory);
    formData.append('is_postable', isPostable);
    if (currencyCode.trim()) formData.append('currency_code', currencyCode.trim());
    if (remarks.trim()) formData.append('remarks', remarks.trim());
    formData.append('user_id', currentUser.id);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(`${API_BASE}/gl-accounts`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `GL Account "${data.gl_code}" created successfully - ${data.scope}` 
        });
        
        setGLCode('');
        setGLName('');
        setSelectedGLType('');
        setSelectedGLCategory('');
        setIsPostable(true);
        setCurrencyCode('');
        setRemarks('');
        setIsCompanyWide(true);
        setSelectedCompanies([]);
        setSelectedPlant('');
        
        fetchGLAccounts();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to create GL account' });
      }
    } catch (err) {
      console.error('Error creating GL account:', err);
      
      if (err.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timeout. Operation took too long.' });
      } else if (err.message.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: 'Cannot connect to backend. Please check your connection.' });
      } else {
        setMessage({ type: 'error', text: `Error creating GL account: ${err.message}` });
      }
    } finally {
      setLoading(false);
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

  // ✅ Filtered categories — only show categories belonging to selected GL Type
  const filteredCategoriesByType = selectedGLType
    ? glCategories.filter(cat => String(cat.gl_type_id) === String(selectedGLType))
    : [];

  const filteredGLAccounts = existingGLAccounts.filter(gl =>
    gl.gl_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gl.gl_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            <DollarSign size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>💰 GL Master Management</h2>
          </div>
          <button
            onClick={() => { setImportGLTypeId(''); setImportGLCategoryId(''); setShowGLTypeSelector(true); }}
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "4px", color: "white", fontSize: "10px", fontWeight: "600", cursor: "pointer" }}
            title="Import GL Accounts from Excel"
          >
            <Upload size={11} /> Import Excel
          </button>
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
              Create GL Account
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
              View GL Accounts ({filteredGLAccounts.length})
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
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>💰 GL ACCOUNT RULES</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "9px", color: "#000", lineHeight: "1.5" }}>
                      <li>GL Code must be unique within the company</li>
                      <li>GL Accounts are created per company</li>
                      <li>Can be Company-wide or Plant-specific</li>
                      <li>GL Type (ASSET, LIABILITY, etc.) is mandatory</li>
                      <li>Use UPPERCASE for GL codes (e.g., 1001, 2001, 3001)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building size={12} />
                  Select Company <span style={{ color: "#dc2626" }}>*</span>
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
                          type="radio"
                          checked={selectedCompanies.includes(company.company_id)}
                          onChange={() => {
                            setSelectedCompanies([company.company_id]);
                            setSelectedPlant('');
                          }}
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
                    <strong>Selected:</strong> {getSelectedCompaniesNames()}
                  </div>
                )}
              </div>

              {selectedCompanies.length > 0 && (
                <div style={{ marginBottom: "12px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "8px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe size={12} />
                    GL Account Scope
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
                          Apply to all plants in company
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
                      cursor: "pointer",
                      background: !isCompanyWide ? "#f3e8ff" : "white"
                    }}>
                      <input
                        type="radio"
                        checked={!isCompanyWide}
                        onChange={() => setIsCompanyWide(false)}
                        style={{ cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: "600", color: "#000" }}>
                          <Factory size={10} style={{ display: "inline", marginRight: "4px" }} />
                          Plant-specific
                        </div>
                        <div style={{ fontSize: "8px", color: "#666" }}>
                          Apply to specific plant only
                        </div>
                      </div>
                    </label>
                  </div>

                  {!isCompanyWide && (
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
                      <strong>Scope:</strong> All plants in {getSelectedCompaniesNames()}
                    </div>
                  )}
                </div>
              )}

              {selectedCompanies.length > 0 && (isCompanyWide || selectedPlant) && (
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "6px", padding: "12px" }}>
                  <h3 style={{ fontSize: "10px", fontWeight: "700", marginBottom: "10px", color: "#000", display: "flex", alignItems: "center", gap: "6px" }}>
                    <DollarSign size={12} />
                    GL Account Details
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>
                        GL Code <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={glCode}
                        onChange={(e) => setGLCode(e.target.value.toUpperCase())}
                        placeholder="e.g., 1001, 2001, 3001"
                        style={s1}
                      />
                      <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                        Will be auto-converted to UPPERCASE
                      </p>
                    </div>

                    <div>
                      <label style={s3}>
                        GL Name <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={glName}
                        onChange={(e) => setGLName(e.target.value)}
                        placeholder="e.g., Cash in Hand, Bank Account"
                        style={s1}
                      />
                    </div>
                  </div>

                  {/* ✅ GL Type + GL Category with proper filtration */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>
                        GL Type <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <select
                        value={selectedGLType}
                        onChange={(e) => setSelectedGLType(e.target.value)}
                        style={s2}
                      >
                        <option value="">Select GL Type</option>
                        {glTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.type_name} ({type.type_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={s3}>
                        GL Category (Optional)
                        {selectedGLType && (
                          <span style={{ marginLeft: "6px", fontSize: "8px", color: "#8b5cf6", fontWeight: "500" }}>
                            — {filteredCategoriesByType.length} available for selected type
                          </span>
                        )}
                      </label>
                      <select
                        value={selectedGLCategory}
                        onChange={(e) => setSelectedGLCategory(e.target.value)}
                        style={{
                          ...s2,
                          borderColor: selectedGLType && filteredCategoriesByType.length === 0 ? "#fca5a5" : "#e0e0e0",
                          background: !selectedGLType ? "#f9fafb" : "white",
                          cursor: !selectedGLType ? "not-allowed" : "pointer",
                          color: !selectedGLType ? "#9ca3af" : "#000"
                        }}
                        disabled={!selectedGLType}
                      >
                        {!selectedGLType ? (
                          <option value="">— Select GL Type first —</option>
                        ) : filteredCategoriesByType.length === 0 ? (
                          <option value="">No categories for this type</option>
                        ) : (
                          <>
                            <option value="">Select GL Category</option>
                            {filteredCategoriesByType.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.category_name} ({cat.category_code})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {selectedGLType && filteredCategoriesByType.length === 0 && (
                        <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#dc2626" }}>
                          No categories linked to this GL Type. Add from GL Category page.
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={s3}>Currency Code (Optional)</label>
                      <input
                        type="text"
                        value={currencyCode}
                        onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                        placeholder="e.g., INR, USD, EUR"
                        maxLength={10}
                        style={s1}
                      />
                    </div>

                    <div>
                      <label style={{ ...s3, display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="checkbox"
                          checked={isPostable}
                          onChange={(e) => setIsPostable(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        Is Postable
                      </label>
                      <p style={{ margin: "2px 0 0 0", fontSize: "8px", color: "#666" }}>
                        Check if transactions can be posted to this GL
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={s3}>Remarks (Optional)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Brief remarks about this GL account"
                      style={{ ...s1, minHeight: "60px", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button
                      onClick={() => {
                        setGLCode('');
                        setGLName('');
                        setSelectedGLType('');
                        setSelectedGLCategory('');
                        setIsPostable(true);
                        setCurrencyCode('');
                        setRemarks('');
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
                      onClick={handleCreateGLAccount}
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
                          Create GL Account
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
                    placeholder="Search GL accounts..."
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

              {filteredGLAccounts.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#000" }}>
                  <DollarSign size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <h3 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "#000" }}>No GL Accounts Found</h3>
                  <p style={{ fontSize: "10px", color: "#666" }}>
                    {searchTerm ? 'Try adjusting your search' : 'Select company to create GL accounts'}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: viewMode === 'grid' ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr",
                  gap: "10px" 
                }}>
                  {filteredGLAccounts.map(gl => (
                    <div
                      key={gl.id}
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
                            {gl.gl_name}
                          </h4>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "6px" }}>
                            Code: {gl.gl_code}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "8px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 6px", background: "#dbeafe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            🏢 {gl.company.name} ({gl.company.code})
                          </span>
                          {gl.plant ? (
                            <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🏭 {gl.plant.name}
                            </span>
                          ) : (
                            <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🌍 All Plants
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 6px", background: "#ede9fe", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            📊 {gl.gl_type.type_name}
                          </span>
                          {gl.gl_category && (
                            <span style={{ padding: "3px 6px", background: "#fef3c7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🏷️ {gl.gl_category.category_name}
                            </span>
                          )}
                          {gl.is_postable ? (
                            <span style={{ padding: "3px 6px", background: "#dcfce7", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              ✅ Postable
                            </span>
                          ) : (
                            <span style={{ padding: "3px 6px", background: "#fee2e2", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                              🚫 Non-Postable
                            </span>
                          )}
                        </div>
                        {gl.currency_code && (
                          <span style={{ padding: "3px 6px", background: "#f3e8ff", color: "#000", borderRadius: "3px", fontWeight: "500" }}>
                            💱 {gl.currency_code}
                          </span>
                        )}
                      </div>

                      {gl.child_count > 0 && (
                        <div style={{ marginTop: "8px", padding: "6px", background: "#f9fafb", borderRadius: "3px", fontSize: "8px", color: "#000" }}>
                          📚 {gl.child_count} child GL accounts
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

      {showGLTypeSelector && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", width: "560px", maxWidth: "95vw", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "linear-gradient(to right, #8b5cf6, #a78bfa)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: "700" }}>📥 Import GL Accounts — Select GL Type & Category</span>
              <button onClick={() => setShowGLTypeSelector(false)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", padding: "2px" }}>
                <XCircle size={16} />
              </button>
            </div>
            <div style={{ padding: "16px" }}>
              <p style={{ fontSize: "10px", color: "#374151", marginBottom: "8px", fontWeight: "600" }}>Step 1 — Select GL Type <span style={{ color: "#dc2626" }}>*</span></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                {glTypes.map(type => (
                  <button key={type.id} onClick={() => { setImportGLTypeId(String(type.id)); setImportGLCategoryId(''); }}
                    style={{ padding: "5px 12px", borderRadius: "20px", border: importGLTypeId === String(type.id) ? "2px solid #7c3aed" : "1px solid #d1d5db", background: importGLTypeId === String(type.id) ? "#7c3aed" : "white", color: importGLTypeId === String(type.id) ? "white" : "#374151", fontSize: "10px", fontWeight: "600", cursor: "pointer" }}>
                    {type.type_name} <span style={{ fontSize: "8px", opacity: 0.8 }}>({type.type_code})</span>
                  </button>
                ))}
              </div>
              {importGLTypeId && (
                <>
                  <p style={{ fontSize: "10px", color: "#374151", marginBottom: "8px", fontWeight: "600" }}>Step 2 — Select GL Category (Optional)</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                    <button onClick={() => setImportGLCategoryId('')}
                      style={{ padding: "5px 12px", borderRadius: "20px", border: importGLCategoryId === '' ? "2px solid #7c3aed" : "1px solid #d1d5db", background: importGLCategoryId === '' ? "#7c3aed" : "white", color: importGLCategoryId === '' ? "white" : "#374151", fontSize: "10px", fontWeight: "600", cursor: "pointer" }}>
                      None
                    </button>
                    {glCategories.filter(cat => String(cat.gl_type_id) === importGLTypeId).map(cat => (
                      <button key={cat.id} onClick={() => setImportGLCategoryId(String(cat.id))}
                        style={{ padding: "5px 12px", borderRadius: "20px", border: importGLCategoryId === String(cat.id) ? "2px solid #7c3aed" : "1px solid #d1d5db", background: importGLCategoryId === String(cat.id) ? "#7c3aed" : "white", color: importGLCategoryId === String(cat.id) ? "white" : "#374151", fontSize: "10px", fontWeight: "600", cursor: "pointer" }}>
                        {cat.category_name} <span style={{ fontSize: "8px", opacity: 0.8 }}>({cat.category_code})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button onClick={() => setShowGLTypeSelector(false)} style={{ padding: "6px 14px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: "pointer", color: "#000" }}>Cancel</button>
                <button disabled={!importGLTypeId} onClick={() => { setShowGLTypeSelector(false); setShowImportPopup(true); }}
                  style={{ padding: "6px 16px", background: importGLTypeId ? "linear-gradient(to right, #8b5cf6, #a78bfa)" : "#d1d5db", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "600", cursor: importGLTypeId ? "pointer" : "not-allowed", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Upload size={11} /> Continue →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => setShowImportPopup(false)}
        onSuccess={(results) => {
          const successCount = results.filter(r => r.status === 'success').length;
          if (successCount > 0) {
            setMessage({ type: 'success', text: `✅ ${successCount} GL Account(s) imported from Excel successfully!` });
            fetchGLAccounts();
          }
        }}
        fields={[
          { key: 'gl_code',       label: 'GL Code',       required: true  },
          { key: 'gl_name',       label: 'GL Name',       required: true  },
          { key: 'currency_code', label: 'Currency Code', required: false },
          { key: 'remarks',       label: 'Remarks',       required: false },
        ]}
        extraFormData={{
          gl_type_id: importGLTypeId,
          ...(importGLCategoryId ? { gl_category_id: importGLCategoryId } : {}),
          company_id: selectedCompanies[0] || '',
        }}
        apiEndpoint={`${API_BASE}/gl-accounts`}
        apiMethod="POST"
        title="Import GL Accounts from Excel"
        accentColor="#8b5cf6"
      />

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}