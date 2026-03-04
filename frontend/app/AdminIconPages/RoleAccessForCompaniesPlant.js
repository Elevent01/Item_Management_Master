import React, { useState, useEffect } from 'react';
import { Shield, Building, Users, Briefcase, Award, FileText, Plus, Save, Trash2, Eye, Check, X, Search, ChevronDown, ChevronRight, AlertCircle, CheckCircle, RefreshCw, Database, XCircle } from 'lucide-react';

// ==================== 🔥 IMPORT FROM CONFIG FILE ====================
import { getAllPagesForSync } from '../config/PageLinksConfig';

const API_BASE = 'http://localhost:8000/api';

// ==================== MAIN COMPONENT ====================
const RoleAccessForCompaniesPlant = () => {
  const [activeTab, setActiveTab] = useState('grant-access');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [revoking, setRevoking] = useState(null);

  // Master Data
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [pages, setPages] = useState([]);

  // Form State
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedPages, setSelectedPages] = useState({});

  // View State
  const [grantedAccess, setGrantedAccess] = useState([]);
  const [expandedPages, setExpandedPages] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [viewSearchTerm, setViewSearchTerm] = useState(''); // 🔥 NEW: Search for View Access tab

  // Add Page Modal
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPage, setNewPage] = useState({
    page_name: '',
    page_url: '',
    icon_name: '',
    description: ''
  });

  // ==================== 🔥 EXTRACT MODULE NAME FROM URL ====================
  const getModuleNameFromUrl = (pageUrl) => {
    if (!pageUrl) return 'Other';
    
    // Remove leading slash and split by '/'
    const parts = pageUrl.replace(/^\//, '').split('/');
    
    if (parts.length === 0) return 'Other';
    
    // Get first part (module name like "admin-master", "finance", etc.)
    const module = parts[0];
    
    // Convert to Title Case (admin-master → Admin Master)
    const titleCase = module
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return titleCase;
  };

  // ==================== 🔥 GROUP PAGES BY MODULE (FROM URL) ====================
  const groupPagesByModule = (pagesList) => {
    const grouped = {};
    pagesList.forEach(page => {
      const moduleName = getModuleNameFromUrl(page.page_url);
      if (!grouped[moduleName]) {
        grouped[moduleName] = [];
      }
      grouped[moduleName].push(page);
    });
    return grouped;
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    fetchCompanies();
    fetchRoles();
    fetchDepartments();
    fetchDesignations();
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedCompany && selectedRole && selectedDepartment && selectedDesignation) {
      fetchGrantedAccess();
    }
  }, [selectedCompany, selectedRole, selectedDepartment, selectedDesignation]);

  // Auto-hide message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ==================== 🔥 AUTO-SYNC FUNCTION - USING CONFIG FILE ====================
  const autoSyncPages = async () => {
    setSyncing(true);
    setMessage(null);
    
    try {
      const allPages = getAllPagesForSync();
      
      console.log('🔄 Auto-syncing pages from PageLinksConfig.js...', allPages.length);
      
      if (allPages.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'No pages found in PageLinksConfig.js. Please check your config files.' 
        });
        setSyncing(false);
        return;
      }

      const response = await fetch(`${API_BASE}/rbac/sync-pages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(allPages)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Pages synced:', result);
      
      setMessage({ 
        type: 'success', 
        text: `Auto-sync completed! Created: ${result.created}, Updated: ${result.updated}, Total: ${result.total}` 
      });
      
      setTimeout(() => {
        fetchPages();
      }, 1000);
      
    } catch (err) {
      console.error('❌ Sync error:', err);
      setMessage({ 
        type: 'error', 
        text: `Sync failed: ${err.message}. Check if backend API is running at ${API_BASE}` 
      });
    } finally {
      setSyncing(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/companies-for-plant`);
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/roles`);
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/departments`);
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await fetch(`${API_BASE}/designations`);
      const data = await res.json();
      setDesignations(data);
    } catch (err) {
      console.error('Error fetching designations:', err);
    }
  };

  const fetchPages = async () => {
    try {
      const res = await fetch(`${API_BASE}/rbac/pages`);
      if (!res.ok) throw new Error('Failed to fetch pages');
      
      const data = await res.json();

      const pagesWithPermissions = await Promise.all(
        data.map(async (page) => {
          try {
            const permRes = await fetch(`${API_BASE}/rbac/pages/${page.id}/permissions`);
            const permissions = await permRes.json();
            return { ...page, permissions };
          } catch (err) {
            console.error(`Error fetching permissions for page ${page.id}:`, err);
            return { ...page, permissions: [] };
          }
        })
      );
      setPages(pagesWithPermissions);
    } catch (err) {
      console.error('Error fetching pages:', err);
      setPages([]);
    }
  };

  const fetchGrantedAccess = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/rbac/access-by-role?company_id=${selectedCompany}&role_id=${selectedRole}&department_id=${selectedDepartment}&designation_id=${selectedDesignation}`
      );
      const data = await res.json();
      
      const grouped = {};
      data.forEach((item) => {
        if (!grouped[item.page_id]) {
          grouped[item.page_id] = {
            page_id: item.page_id,
            page_name: item.page_name,
            page_url: item.page_url,
            permissions: []
          };
        }
        grouped[item.page_id].permissions.push({
          permission_id: item.permission_id,
          permission_type: item.permission_type,
          access_id: item.access_id
        });
      });
      
      setGrantedAccess(Object.values(grouped));

      const preSelected = {};
      Object.values(grouped).forEach((item) => {
        preSelected[item.page_id] = item.permissions.map(p => p.permission_id);
      });
      setSelectedPages(preSelected);
    } catch (err) {
      console.error('Error fetching granted access:', err);
      setGrantedAccess([]);
    }
  };

  const handlePagePermissionToggle = (pageId, permissionId) => {
    setSelectedPages((prev) => {
      const current = prev[pageId] || [];
      const updated = current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];
      return { ...prev, [pageId]: updated };
    });
  };

  const handleSelectAllPermissions = (pageId, permissions) => {
    const allPermissionIds = permissions.map((p) => p.id);
    setSelectedPages((prev) => ({
      ...prev,
      [pageId]: allPermissionIds
    }));
  };

  const handleDeselectAllPermissions = (pageId) => {
    setSelectedPages((prev) => ({
      ...prev,
      [pageId]: []
    }));
  };

  const handleGrantAccess = async () => {
    if (!selectedCompany || !selectedRole || !selectedDepartment || !selectedDesignation) {
      setMessage({ type: 'error', text: 'Please select Company, Role, Department, and Designation' });
      return;
    }

    const pagePermissions = Object.entries(selectedPages)
      .filter(([_, permissions]) => permissions.length > 0)
      .map(([pageId, permissionIds]) => ({
        page_id: parseInt(pageId),
        permission_ids: permissionIds
      }));

    if (pagePermissions.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one page permission' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('company_id', selectedCompany);
    formData.append('role_id', selectedRole);
    formData.append('department_id', selectedDepartment);
    formData.append('designation_id', selectedDesignation);
    formData.append('page_permissions_json', JSON.stringify(pagePermissions));

    try {
      const res = await fetch(`${API_BASE}/rbac/grant-access`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Access granted successfully! Created: ${data.created}, Updated: ${data.updated}` 
        });
        fetchGrantedAccess();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error granting access' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error granting access' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId, pageName, permissionType) => {
    if (!window.confirm(`Are you sure you want to revoke "${permissionType}" permission for "${pageName}"?`)) {
      return;
    }

    setRevoking(accessId);
    
    try {
      const res = await fetch(`${API_BASE}/rbac/revoke-access/${accessId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Successfully revoked "${permissionType}" permission for "${pageName}"` 
        });
        fetchGrantedAccess();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.detail || 'Error revoking access' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error revoking access' });
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllPermissionsForPage = async (pageId, pageName, permissions) => {
    if (!window.confirm(`Are you sure you want to revoke ALL ${permissions.length} permissions for "${pageName}"?`)) {
      return;
    }

    setRevoking(`page_${pageId}`);
    
    try {
      let successCount = 0;
      let failCount = 0;

      for (const perm of permissions) {
        try {
          const res = await fetch(`${API_BASE}/rbac/revoke-access/${perm.access_id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
        }
      }

      if (successCount > 0) {
        setMessage({ 
          type: 'success', 
          text: `Revoked ${successCount} permission(s) for "${pageName}". ${failCount > 0 ? `Failed: ${failCount}` : ''}` 
        });
        fetchGrantedAccess();
      } else {
        setMessage({ type: 'error', text: `Failed to revoke permissions for "${pageName}"` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error revoking permissions' });
    } finally {
      setRevoking(null);
    }
  };

  const handleAddNewPage = async () => {
    if (!newPage.page_name || !newPage.page_url) {
      alert('Page name and URL are required');
      return;
    }

    const formData = new FormData();
    formData.append('page_name', newPage.page_name);
    formData.append('page_url', newPage.page_url);
    formData.append('icon_name', newPage.icon_name);
    formData.append('description', newPage.description);
    formData.append('display_order', 0);

    try {
      const res = await fetch(`${API_BASE}/rbac/pages`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const createdPage = await res.json();
        
        const permissionTypes = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'];
        for (const permType of permissionTypes) {
          const permFormData = new FormData();
          permFormData.append('permission_type', permType);
          await fetch(`${API_BASE}/rbac/pages/${createdPage.id}/permissions`, {
            method: 'POST',
            body: permFormData
          });
        }

        alert('Page added successfully!');
        setShowAddPage(false);
        setNewPage({ page_name: '', page_url: '', icon_name: '', description: '' });
        fetchPages();
      } else {
        const data = await res.json();
        alert(data.detail || 'Error adding page');
      }
    } catch (err) {
      alert('Error adding page');
    }
  };

  const toggleModule = (moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };

  const filteredPages = pages.filter((page) =>
    page.page_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.page_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔥 NEW: Filter granted access based on view search term
  const filteredGrantedAccess = Array.isArray(grantedAccess) 
    ? grantedAccess.filter((item) =>
        (item.page_name || '').toLowerCase().includes(viewSearchTerm.toLowerCase()) ||
        (item.page_url || '').toLowerCase().includes(viewSearchTerm.toLowerCase())
      )
    : [];

  const groupedPages = groupPagesByModule(filteredPages);

  const getCompanyName = (id) => companies.find((c) => c.id === parseInt(id))?.company_name || 'Unknown';
  const getRoleName = (id) => roles.find((r) => r.id === parseInt(id))?.role_name || 'Unknown';
  const getDepartmentName = (id) => departments.find((d) => d.id === parseInt(id))?.department_name || 'Unknown';
  const getDesignationName = (id) => designations.find((d) => d.id === parseInt(id))?.designation_name || 'Unknown';

  // Inline styles
  const s1 = { 
    width: "100%", 
    padding: "6px 8px", 
    fontSize: "10px", 
    border: "1px solid #d1d5db", 
    borderRadius: "4px",
    background: "#fff",
    color: "#1f2937"
  };

  const s2 = { 
    padding: "6px 10px", 
    fontSize: "10px", 
    border: "1px solid #d1d5db", 
    borderRadius: "4px", 
    cursor: "pointer",
    background: "#fff",
    color: "#1f2937",
    width: "100%"
  };

  const s3 = { 
    display: "block", 
    fontSize: "10px", 
    fontWeight: "600", 
    marginBottom: "4px", 
    color: "#374151" 
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header - Fixed with same style as InfoMaster */}
      <div 
        className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white flex-shrink-0" 
        style={{ height: '24px', paddingRight: '8px' }}
      >
        <h2 className="m-0 text-xs font-semibold">Role Access Management 🔐</h2>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={autoSyncPages}
            disabled={syncing}
            style={{
              padding: '2px 10px',
              background: syncing ? '#9ca3af' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: 9,
              fontWeight: 500,
              height: '18px',
              lineHeight: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {syncing ? (
              <>
                <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                Syncing...
              </>
            ) : (
              <>
                <Database size={10} />
                Sync Pages
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fixed Selection Header - Company, Role, Dept, Designation */}
      <div className="px-2.5 py-2 bg-gray-50 border-b border-gray-300 flex-shrink-0">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {/* Company */}
          <div>
            <label style={s3}>
              <Building size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Company
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={s2}
            >
              <option value="">Select Company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label style={s3}>
              <Shield size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={s2}
            >
              <option value="">Select Role</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.role_name}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label style={s3}>
              <Briefcase size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={s2}
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.department_name}</option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div>
            <label style={s3}>
              <Award size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Designation
            </label>
            <select
              value={selectedDesignation}
              onChange={(e) => setSelectedDesignation(e.target.value)}
              style={s2}
            >
              <option value="">Select Designation</option>
              {designations.map(d => (
                <option key={d.id} value={d.id}>{d.designation_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            marginTop: '8px',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '10px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {message.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs with Grant Access button */}
      <div className="px-2.5 py-1.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('grant-access')}
            style={{
              padding: '4px 12px',
              fontSize: '10px',
              fontWeight: '500',
              background: activeTab === 'grant-access' ? '#60a5fa' : 'transparent',
              color: activeTab === 'grant-access' ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'grant-access' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s'
            }}
          >
            <Shield size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Grant Access
          </button>
          <button
            onClick={() => setActiveTab('view-access')}
            style={{
              padding: '4px 12px',
              fontSize: '10px',
              fontWeight: '500',
              background: activeTab === 'view-access' ? '#60a5fa' : 'transparent',
              color: activeTab === 'view-access' ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'view-access' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            View Access
          </button>
        </div>

        {/* 🔥 MODIFIED: Grant Access Button - Removed from here, moved inside the tab content */}
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-auto p-2.5">
        {activeTab === 'grant-access' ? (
          <div>
            {selectedCompany && selectedRole && selectedDepartment && selectedDesignation ? (
              <div>
                {/* 🔥 MODIFIED: Fixed Search Bar using sticky positioning */}
                <div style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 10, 
                  backgroundColor: '#fff', 
                  paddingBottom: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search pages by name or URL..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px 6px 32px',
                        fontSize: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#fff',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                  
                  {/* 🔥 NEW: Grant Selected Access button moved here below search */}
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleGrantAccess}
                      disabled={loading || Object.keys(selectedPages).length === 0}
                      style={{
                        padding: '6px 14px',
                        background: loading || Object.keys(selectedPages).length === 0 ? '#d1d5db' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: loading || Object.keys(selectedPages).length === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Save size={11} />
                      {loading ? 'Granting...' : 'Grant Selected Access'}
                    </button>
                  </div>
                </div>

                {/* Pages List - Grouped by Module */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(groupedPages).length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: '11px', color: '#6b7280', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <Search size={32} style={{ margin: '0 auto 8px', color: '#d1d5db' }} />
                      <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>No Pages Found</div>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {searchTerm ? 'Try a different search term' : 'Click "Sync Pages" to load pages from config'}
                      </div>
                    </div>
                  ) : (
                    Object.entries(groupedPages).map(([moduleName, modulePages]) => (
                      <div key={moduleName} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
                        {/* Module Header */}
                        <div
                          onClick={() => toggleModule(moduleName)}
                          style={{
                            padding: '8px 12px',
                            background: 'linear-gradient(to right, #f3f4f6, #e5e7eb)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: expandedModules[moduleName] ? '1px solid #e5e7eb' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {expandedModules[moduleName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <FileText size={14} style={{ color: '#60a5fa' }} />
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1f2937' }}>{moduleName}</span>
                            <span style={{ fontSize: '9px', color: '#6b7280', background: '#e5e7eb', padding: '2px 6px', borderRadius: '10px', fontWeight: '600' }}>
                              {modulePages.length} {modulePages.length === 1 ? 'page' : 'pages'}
                            </span>
                          </div>
                        </div>

                        {/* Module Pages */}
                        {expandedModules[moduleName] && (
                          <div style={{ padding: '8px' }}>
                            {modulePages.map((page) => (
                              <div
                                key={page.id}
                                style={{
                                  padding: '8px',
                                  marginBottom: '6px',
                                  background: '#f9fafb',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>
                                      {page.page_name}
                                    </div>
                                    <div style={{ fontSize: '9px', color: '#6b7280' }}>
                                      {page.page_url}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      onClick={() => handleSelectAllPermissions(page.id, page.permissions)}
                                      style={{ 
                                        padding: '2px 6px', 
                                        border: '1px solid #10b981', 
                                        background: '#d1fae5', 
                                        borderRadius: '3px', 
                                        fontSize: '9px', 
                                        cursor: 'pointer', 
                                        color: '#065f46',
                                        fontWeight: '500'
                                      }}
                                    >
                                      Select All
                                    </button>
                                    <button
                                      onClick={() => handleDeselectAllPermissions(page.id)}
                                      style={{ 
                                        padding: '2px 6px', 
                                        border: '1px solid #ef4444', 
                                        background: '#fee2e2', 
                                        borderRadius: '3px', 
                                        fontSize: '9px', 
                                        cursor: 'pointer', 
                                        color: '#991b1b',
                                        fontWeight: '500'
                                      }}
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {page.permissions && page.permissions.length > 0 ? (
                                    page.permissions.map((permission) => {
                                      const isSelected = (selectedPages[page.id] || []).includes(permission.id);
                                      return (
                                        <label
                                          key={permission.id}
                                          style={{
                                            padding: '4px 10px',
                                            fontSize: '9px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: isSelected ? '#dbeafe' : '#fff',
                                            border: `1px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                                            color: isSelected ? '#1e40af' : '#6b7280',
                                            fontWeight: isSelected ? '600' : '500',
                                            transition: 'all 0.2s'
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handlePagePermissionToggle(page.id, permission.id)}
                                            style={{ margin: 0, cursor: 'pointer', width: '12px', height: '12px' }}
                                          />
                                          {permission.permission_type}
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <div style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>
                                      No permissions defined for this page
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '11px', color: '#6b7280' }}>
                <div style={{ marginBottom: '12px', fontSize: '48px' }}>👆</div>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '12px' }}>Select Hierarchy First</div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>Choose Company, Role, Department, and Designation above to grant access</div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {selectedCompany && selectedRole && selectedDepartment && selectedDesignation ? (
              <div>
                <div style={{ marginBottom: '12px', padding: '8px 10px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '4px', fontSize: '10px', color: '#1e40af' }}>
                  <strong>Currently viewing access for:</strong> {getCompanyName(selectedCompany)} → {getRoleName(selectedRole)} → {getDepartmentName(selectedDepartment)} → {getDesignationName(selectedDesignation)}
                </div>
                
                {/* 🔥 NEW: Search bar for View Access tab */}
                <div style={{ 
                  marginBottom: '12px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: '#fff',
                  paddingBottom: '8px'
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search granted pages by name or URL..."
                      value={viewSearchTerm}
                      onChange={(e) => setViewSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px 6px 32px',
                        fontSize: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#fff',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                {!Array.isArray(filteredGrantedAccess) || filteredGrantedAccess.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '11px', color: '#6b7280' }}>
                    <div style={{ marginBottom: '12px', fontSize: '48px' }}>
                      {viewSearchTerm ? '🔍' : '🔒'}
                    </div>
                    <div style={{ fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '12px' }}>
                      {viewSearchTerm ? 'No Matching Pages Found' : 'No Access Granted'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      {viewSearchTerm ? 'Try a different search term' : 'Go to "Grant Access" tab to assign permissions'}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredGrantedAccess.map((item) => (
                      <div key={item.page_id} style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={15} style={{ color: '#60a5fa' }} />
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1f2937' }}>{item.page_name}</div>
                              <div style={{ fontSize: '9px', color: '#6b7280' }}>{item.page_url}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeAllPermissionsForPage(item.page_id, item.page_name, item.permissions)}
                            disabled={revoking === `page_${item.page_id}`}
                            style={{
                              padding: '4px 10px',
                              background: revoking === `page_${item.page_id}` ? '#d1d5db' : '#fee2e2',
                              border: '1px solid #ef4444',
                              borderRadius: '4px',
                              fontSize: '9px',
                              fontWeight: '600',
                              cursor: revoking === `page_${item.page_id}` ? 'not-allowed' : 'pointer',
                              color: '#991b1b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <XCircle size={11} />
                            {revoking === `page_${item.page_id}` ? 'Revoking...' : `Revoke All (${item.permissions.length})`}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {item.permissions.map((perm) => (
                            <div
                              key={perm.permission_id}
                              style={{
                                padding: '5px 10px',
                                background: '#d1fae5',
                                color: '#065f46',
                                borderRadius: '12px',
                                fontSize: '9px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                border: '1px solid #10b981'
                              }}
                            >
                              <Check size={11} />
                              {perm.permission_type}
                              <button
                                onClick={() => handleRevokeAccess(perm.access_id, item.page_name, perm.permission_type)}
                                disabled={revoking === perm.access_id}
                                style={{
                                  padding: '2px 4px',
                                  background: revoking === perm.access_id ? '#9ca3af' : '#ef4444',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: revoking === perm.access_id ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  marginLeft: '2px'
                                }}
                                title={`Revoke ${perm.permission_type}`}
                              >
                                {revoking === perm.access_id ? (
                                  <RefreshCw size={9} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <X size={9} style={{ color: 'white' }} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '11px', color: '#6b7280' }}>
                <div style={{ marginBottom: '12px', fontSize: '48px' }}>👆</div>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '12px' }}>Select Hierarchy First</div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>Choose Company, Role, Department, and Designation to view access</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - same as InfoMaster */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700 flex-shrink-0" style={{ height: '8px' }} />

      {/* Add Page Modal */}
      {showAddPage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#1f2937' }}>Add New Page</h3>
              <button
                onClick={() => setShowAddPage(false)}
                style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={s3}>Page Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  value={newPage.page_name}
                  onChange={(e) => setNewPage({ ...newPage, page_name: e.target.value })}
                  placeholder="e.g., Add Company, Add Industry Type"
                  style={s1}
                />
              </div>

              <div>
                <label style={s3}>Page URL <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  value={newPage.page_url}
                  onChange={(e) => setNewPage({ ...newPage, page_url: e.target.value })}
                  placeholder="e.g., /admin-master/add-company"
                  style={s1}
                />
                <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '3px' }}>
                  💡 Module name will be auto-extracted from URL (e.g., "admin-master" → "Admin Master")
                </div>
              </div>

              <div>
                <label style={s3}>Icon Name (Optional)</label>
                <input
                  value={newPage.icon_name}
                  onChange={(e) => setNewPage({ ...newPage, icon_name: e.target.value })}
                  placeholder="e.g., Building2, Factory, etc."
                  style={s1}
                />
              </div>

              <div>
                <label style={s3}>Description (Optional)</label>
                <textarea
                  value={newPage.description}
                  onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
                  placeholder="Brief description of this page"
                  style={{ ...s1, minHeight: '60px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddPage(false)}
                style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', color: '#374151', fontWeight: '500' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewPage}
                style={{ padding: '6px 14px', background: '#4b5563', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={12} />
                Add Page
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RoleAccessForCompaniesPlant;
