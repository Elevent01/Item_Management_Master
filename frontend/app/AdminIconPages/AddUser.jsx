import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Key, Users, Building, Factory, UserCheck, X, Check, AlertCircle, Eye, EyeOff, Copy, CheckCircle, Save, ShieldCheck } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const UserManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserAccess, setCurrentUserAccess] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    primary_company_id: null,
    additional_companies: [],
    selected_plants: [],
    role_id: '',
    department_id: '',
    designation_id: '',
    primary_plant_id: null
  });

  const [plantsByCompany, setPlantsByCompany] = useState({});

  // 🔥 Merged role access list for selected primary company
  const [companyRoleAccessList, setCompanyRoleAccessList] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableDesignations, setAvailableDesignations] = useState([]);
  const [rbacLoading, setRbacLoading] = useState(false);

  const [accessiblePages, setAccessiblePages] = useState([]);
  const [errors, setErrors] = useState({});

  // ✅ Get current user from session
  useEffect(() => {
    const storedData = sessionStorage.getItem('userData');
    if (storedData) {
      try {
        const userData = JSON.parse(storedData);
        if (userData.user && userData.user.id) {
          setCurrentUserId(userData.user.id);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchCurrentUserAccess();
    }
  }, [currentUserId]);

  const fetchCurrentUserAccess = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_BASE}/users/${currentUserId}/accessible-companies-plants`);
      const data = await res.json();
      setCurrentUserAccess(data);
      setCompanies(data.companies || []);
    } catch (err) {
      console.error('Error fetching current user access:', err);
    }
  };

  useEffect(() => {
    if (currentUserId) fetchFilteredUsers();
  }, [currentUserId]);

  const fetchFilteredUsers = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users?current_user_id=${currentUserId}`);
      const filteredUsers = await res.json();
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 When primary company changes
  useEffect(() => {
    if (formData.primary_company_id) {
      fetchCompanyRbacData(formData.primary_company_id);
      fetchPlantsForCompany(formData.primary_company_id);
    } else {
      setCompanyRoleAccessList([]);
      setAvailableRoles([]);
      setAvailableDepartments([]);
      setAvailableDesignations([]);
    }
  }, [formData.primary_company_id]);

  // Fetch plants for additional companies
  useEffect(() => {
    formData.additional_companies.forEach(companyId => {
      if (!plantsByCompany[companyId]) fetchPlantsForCompany(companyId);
    });
  }, [formData.additional_companies]);

  // 🔥 Cascading: role → departments
  useEffect(() => {
    if (formData.role_id && companyRoleAccessList.length > 0) {
      const roleId = parseInt(formData.role_id);
      const deptMap = new Map();
      companyRoleAccessList
        .filter(e => e.role_id === roleId)
        .forEach(e => {
          if (!deptMap.has(e.department_id))
            deptMap.set(e.department_id, { id: e.department_id, department_name: e.department_name });
        });
      setAvailableDepartments(Array.from(deptMap.values()));
      setAvailableDesignations([]);
      setFormData(prev => ({ ...prev, department_id: '', designation_id: '' }));
    } else if (!formData.role_id) {
      setAvailableDepartments([]);
      setAvailableDesignations([]);
    }
  }, [formData.role_id, companyRoleAccessList]);

  // 🔥 Cascading: role+dept → designations
  useEffect(() => {
    if (formData.role_id && formData.department_id && companyRoleAccessList.length > 0) {
      const roleId = parseInt(formData.role_id);
      const deptId = parseInt(formData.department_id);
      const desgMap = new Map();
      companyRoleAccessList
        .filter(e => e.role_id === roleId && e.department_id === deptId)
        .forEach(e => {
          if (!desgMap.has(e.designation_id))
            desgMap.set(e.designation_id, { id: e.designation_id, designation_name: e.designation_name });
        });
      setAvailableDesignations(Array.from(desgMap.values()));
      setFormData(prev => ({ ...prev, designation_id: '' }));
    } else if (!formData.department_id) {
      setAvailableDesignations([]);
    }
  }, [formData.department_id, formData.role_id, companyRoleAccessList]);

  // Accessible pages
  useEffect(() => {
    if (formData.primary_company_id && formData.role_id && formData.department_id && formData.designation_id) {
      fetchAccessiblePages();
    } else {
      setAccessiblePages([]);
    }
  }, [formData.primary_company_id, formData.role_id, formData.department_id, formData.designation_id]);

  // 🔥 CORE: Fetch from BOTH sources and merge
  const fetchCompanyRbacData = async (companyId) => {
    setRbacLoading(true);
    try {
      // Source 1: role_access table (specific combos)
      let roleAccessRows = [];
      try {
        const res1 = await fetch(`${API_BASE}/role-access/by-company/${companyId}`);
        if (res1.ok) roleAccessRows = await res1.json();
      } catch (e) { console.warn('role-access API failed:', e); }

      // Source 2: company_role_page_access table (page-level access)
      let rbacOptions = { roles: [], departments: [], designations: [] };
      try {
        const res2 = await fetch(`${API_BASE}/companies/${companyId}/rbac-options`);
        if (res2.ok) rbacOptions = await res2.json();
      } catch (e) { console.warn('rbac-options API failed:', e); }

      // Build unified merged list
      const mergedMap = new Map();

      // Priority 1: role_access rows (exact combos)
      roleAccessRows.forEach(row => {
        const key = `${row.role_id}-${row.department_id}-${row.designation_id}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            role_id: parseInt(row.role_id),
            role_name: row.role_name,
            department_id: parseInt(row.department_id),
            department_name: row.department_name,
            designation_id: parseInt(row.designation_id),
            designation_name: row.designation_name
          });
        }
      });

      // Priority 2: rbac-options cross-product (fallback if role_access has nothing)
      if (mergedMap.size === 0 && rbacOptions.roles.length > 0) {
        rbacOptions.roles.forEach(role => {
          rbacOptions.departments.forEach(dept => {
            rbacOptions.designations.forEach(desg => {
              const key = `${role.id}-${dept.id}-${desg.id}`;
              if (!mergedMap.has(key)) {
                mergedMap.set(key, {
                  role_id: parseInt(role.id),
                  role_name: role.role_name,
                  department_id: parseInt(dept.id),
                  department_name: dept.department_name,
                  designation_id: parseInt(desg.id),
                  designation_name: desg.designation_name
                });
              }
            });
          });
        });
      }

      const mergedList = Array.from(mergedMap.values());
      setCompanyRoleAccessList(mergedList);

      // Extract unique roles
      const roleMap = new Map();
      mergedList.forEach(e => {
        if (!roleMap.has(e.role_id))
          roleMap.set(e.role_id, { id: e.role_id, role_name: e.role_name });
      });
      setAvailableRoles(Array.from(roleMap.values()));
      setAvailableDepartments([]);
      setAvailableDesignations([]);
    } catch (err) {
      console.error('Error fetching RBAC data:', err);
      setCompanyRoleAccessList([]);
      setAvailableRoles([]);
    } finally {
      setRbacLoading(false);
    }
  };

  const fetchPlantsForCompany = async (companyId) => {
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/plants-for-user`);
      const allPlants = await res.json();
      let filteredPlants = allPlants;
      if (currentUserAccess && currentUserAccess.plants) {
        const accessiblePlantIds = new Set(
          currentUserAccess.plants.filter(p => p.company_id === companyId).map(p => p.id)
        );
        const hasPlantLevelAccess = currentUserAccess.plants.some(p => p.company_id === companyId);
        if (hasPlantLevelAccess && accessiblePlantIds.size > 0)
          filteredPlants = allPlants.filter(p => accessiblePlantIds.has(p.id));
      }
      setPlantsByCompany(prev => ({ ...prev, [companyId]: filteredPlants }));
    } catch (err) {
      setPlantsByCompany(prev => ({ ...prev, [companyId]: [] }));
    }
  };

  const fetchAccessiblePages = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/companies/${formData.primary_company_id}/accessible-pages?` +
        `role_id=${formData.role_id}&department_id=${formData.department_id}&designation_id=${formData.designation_id}`
      );
      const data = await res.json();
      setAccessiblePages(data.pages || []);
    } catch (err) {
      setAccessiblePages([]);
    }
  };

  const handlePrimaryCompanyChange = (companyId) => {
    const id = companyId ? parseInt(companyId) : null;
    setFormData(prev => ({
      ...prev,
      primary_company_id: id,
      additional_companies: prev.additional_companies.filter(cId => cId !== id),
      role_id: '', department_id: '', designation_id: '',
      selected_plants: [], primary_plant_id: null
    }));
    setAccessiblePages([]);
    setCompanyRoleAccessList([]);
    setAvailableRoles([]);
    setAvailableDepartments([]);
    setAvailableDesignations([]);
  };

  const handleAdditionalCompanySelect = (companyId) => {
    const isSelected = formData.additional_companies.includes(companyId);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        additional_companies: prev.additional_companies.filter(id => id !== companyId),
        selected_plants: prev.selected_plants.filter(plantId => {
          const plant = Object.values(plantsByCompany).flat().find(p => p.id === plantId);
          return plant && plant.company_id !== companyId;
        })
      }));
    } else {
      setFormData(prev => ({ ...prev, additional_companies: [...prev.additional_companies, companyId] }));
    }
  };

  const handlePlantSelect = (plantId) => {
    const isSelected = formData.selected_plants.includes(plantId);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        selected_plants: prev.selected_plants.filter(id => id !== plantId),
        primary_plant_id: prev.primary_plant_id === plantId ? null : prev.primary_plant_id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selected_plants: [...prev.selected_plants, plantId],
        primary_plant_id: prev.selected_plants.length === 0 ? plantId : prev.primary_plant_id
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.primary_company_id) newErrors.primary_company = 'Primary company is required';
    if (!formData.role_id) newErrors.role = 'Role is required';
    if (!formData.department_id) newErrors.department = 'Department is required';
    if (!formData.designation_id) newErrors.designation = 'Designation is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    const allCompanies = [formData.primary_company_id, ...formData.additional_companies];
    const formPayload = new FormData();
    formPayload.append('full_name', formData.full_name);
    formPayload.append('email', formData.email);
    formPayload.append('phone', formData.phone);
    formPayload.append('company_ids', JSON.stringify(allCompanies));
    formPayload.append('plant_ids', JSON.stringify(formData.selected_plants));
    formPayload.append('role_id', formData.role_id);
    formPayload.append('department_id', formData.department_id);
    formPayload.append('designation_id', formData.designation_id);
    formPayload.append('primary_company_id', formData.primary_company_id);
    if (formData.primary_plant_id) formPayload.append('primary_plant_id', formData.primary_plant_id);
    try {
      const res = await fetch(`${API_BASE}/users/register`, { method: 'POST', body: formPayload });
      const data = await res.json();
      if (res.ok) {
        setCredentials(data);
        setActiveTab('credentials');
        fetchFilteredUsers();
        resetForm();
      } else {
        alert(data.detail || 'Error creating user');
      }
    } catch (err) {
      alert('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', phone: '', primary_company_id: null, additional_companies: [], selected_plants: [], role_id: '', department_id: '', designation_id: '', primary_plant_id: null });
    setPlantsByCompany({});
    setCompanyRoleAccessList([]);
    setAvailableRoles([]);
    setAvailableDepartments([]);
    setAvailableDesignations([]);
    setAccessiblePages([]);
    setErrors({});
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
      if (res.ok) { fetchFilteredUsers(); alert('User deleted successfully'); }
    } catch (err) { alert('Error deleting user'); }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Generate new password for this user?')) return;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setCredentials(data); setActiveTab('credentials'); }
    } catch (err) { alert('Error resetting password'); }
  };

  const viewUserDetails = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data);
      setActiveTab('details');
    } catch (err) { alert('Error fetching user details'); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvailablePlantsForCompanies = () => {
    const allCompanies = [formData.primary_company_id, ...formData.additional_companies].filter(Boolean);
    return allCompanies.map(companyId => ({
      companyId,
      companyName: companies.find(c => c.id === companyId)?.company_name,
      plants: plantsByCompany[companyId] || []
    }));
  };

  const getAvailableCompanies = () => {
    if (!currentUserAccess) return [];
    return currentUserAccess.companies || [];
  };

  const s1 = { width: "100%", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px", boxSizing: "border-box", color: "#333", backgroundColor: "#fff" };
  const s2 = { ...s1, cursor: "pointer" };
  const s3 = { display: "block", fontSize: "10px", fontWeight: "500", marginBottom: "3px", color: "#555" };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
              User Management - Filtered by Your Access
              {currentUserId && <span style={{ fontSize: "9px", opacity: 0.8, marginLeft: "6px" }}>(User ID: {currentUserId})</span>}
            </h2>
          </div>
          <button onClick={() => { resetForm(); setActiveTab('register'); }}
            style={{ padding: "4px 14px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
            <Plus size={12} /> Register User
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", background: "#f8f9fa", flexShrink: 0 }}>
          {[{ key: 'list', label: `User List (${users.length})`, icon: <Users size={12} /> }, { key: 'register', label: 'Register New User', icon: <Plus size={12} /> }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ flex: 1, padding: "8px 12px", fontSize: "10px", fontWeight: "500", cursor: "pointer", border: "none", background: activeTab === tab.key ? 'white' : 'transparent', color: activeTab === tab.key ? '#000' : '#666', borderBottom: activeTab === tab.key ? '2px solid #60a5fa' : 'none' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>{tab.icon}{tab.label}</div>
            </button>
          ))}
          {activeTab === 'details' && selectedUser && (
            <button onClick={() => setActiveTab('details')}
              style={{ flex: 1, padding: "8px 12px", fontSize: "10px", fontWeight: "500", cursor: "pointer", border: "none", background: 'white', color: '#000', borderBottom: '2px solid #60a5fa' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><Eye size={12} /> User Details</div>
            </button>
          )}
          {activeTab === 'credentials' && credentials && (
            <button onClick={() => setActiveTab('credentials')}
              style={{ flex: 1, padding: "8px 12px", fontSize: "10px", fontWeight: "500", cursor: "pointer", border: "none", background: 'white', color: '#000', borderBottom: '2px solid #10b981' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><Key size={12} /> Credentials</div>
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

          {/* ======= LIST ======= */}
          {activeTab === 'list' && (
            <div>
              {currentUserAccess && (
                <div style={{ marginBottom: "12px", padding: "8px 12px", background: "#dbeafe", border: "1px solid #60a5fa", borderRadius: "6px", fontSize: "10px", color: "#1e40af" }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>📊 Showing users from your accessible companies:</div>
                  <div style={{ fontSize: "9px" }}>{currentUserAccess.companies?.map(c => c.company_name).join(', ') || 'No companies accessible'}</div>
                </div>
              )}
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                  <input type="text" placeholder="Search by name, email, or user ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "6px 6px 6px 32px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px" }} />
                </div>
                <div style={{ fontSize: "10px", color: "#666", whiteSpace: "nowrap" }}>{loading ? 'Loading...' : `Total: ${filteredUsers.length}`}</div>
              </div>
              {loading ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "48px" }}>⏳</div>
                  <div style={{ fontWeight: "500" }}>Loading users...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                  <div style={{ marginBottom: "10px", fontSize: "48px" }}>👥</div>
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>No users found</div>
                  <div style={{ fontSize: "9px", color: "#999" }}>{searchTerm ? 'No users match your search criteria' : 'No users share your companies/plants'}</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                    <thead>
                      <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                        {['User Info', 'Contact', 'Access', 'Status', ''].map((h, i) => (
                          <th key={i} style={{ padding: "8px", textAlign: i === 4 ? "right" : "left", fontWeight: "600", color: "#000" }}>{h || 'Actions'}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #e9ecef" }}>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div style={{ background: "linear-gradient(135deg, #4b5563, #60a5fa)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "600" }}>
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: "500", color: "#000" }}>{user.full_name}</div>
                                <div style={{ fontSize: "9px", color: "#666" }}>ID: {user.user_id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ color: "#000" }}>{user.email}</div>
                            <div style={{ fontSize: "9px", color: "#666" }}>{user.phone}</div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Building size={10} style={{ color: "#60a5fa" }} /><span style={{ color: "#000" }}>{user.total_companies} {user.total_companies === 1 ? 'Company' : 'Companies'}</span></div>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Factory size={10} style={{ color: "#10b981" }} /><span style={{ color: "#000" }}>{user.total_plants} {user.total_plants === 1 ? 'Plant' : 'Plants'}</span></div>
                              {user.primary_company && <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>Primary: {user.primary_company}</div>}
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            {user.is_active
                              ? <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 6px", borderRadius: "12px", fontSize: "9px", fontWeight: "500", background: "#d1fae5", color: "#065f46" }}><Check size={10} />Active</span>
                              : <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", padding: "2px 6px", borderRadius: "12px", fontSize: "9px", fontWeight: "500", background: "#fee2e2", color: "#991b1b" }}><X size={10} />Inactive</span>}
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                              <button onClick={() => viewUserDetails(user.id)} style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#60a5fa" }} title="View Details"><Eye size={14} /></button>
                              <button onClick={() => handleResetPassword(user.id)} style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#f59e0b" }} title="Reset Password"><Key size={14} /></button>
                              <button onClick={() => handleDeleteUser(user.id)} style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#ef4444" }} title="Delete User"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======= REGISTER ======= */}
          {activeTab === 'register' && (
            <form onSubmit={handleSubmit}>
              {/* User Info */}
              <div style={{ marginBottom: "10px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>User Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={s3}>Full Name <span style={{ color: "#c00" }}>*</span></label>
                    <input name="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Enter full name" style={{ ...s1, borderColor: errors.full_name ? '#ef4444' : '#ddd' }} />
                    {errors.full_name && <p style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>{errors.full_name}</p>}
                  </div>
                  <div>
                    <label style={s3}>Email <span style={{ color: "#c00" }}>*</span></label>
                    <input name="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" style={{ ...s1, borderColor: errors.email ? '#ef4444' : '#ddd' }} />
                    {errors.email && <p style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>{errors.email}</p>}
                  </div>
                  <div>
                    <label style={s3}>Phone <span style={{ color: "#c00" }}>*</span></label>
                    <input name="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1234567890" style={{ ...s1, borderColor: errors.phone ? '#ef4444' : '#ddd' }} />
                    {errors.phone && <p style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Primary Company */}
              <div style={{ marginBottom: "10px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Building size={12} /> Primary Company <span style={{ color: "#c00" }}>*</span>
                  <span style={{ fontSize: "9px", color: "#10b981", fontWeight: "400" }}>(Only showing companies you have access to)</span>
                </h3>
                <select value={formData.primary_company_id || ''} onChange={(e) => handlePrimaryCompanyChange(e.target.value)} style={{ ...s2, borderColor: errors.primary_company ? '#ef4444' : '#ddd' }}>
                  <option value="">Select Primary Company</option>
                  {getAvailableCompanies().map((company) => (
                    <option key={company.id} value={company.id}>{company.company_name}</option>
                  ))}
                </select>
                {errors.primary_company && <p style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>{errors.primary_company}</p>}
              </div>

              {formData.primary_company_id && (
                <>
                  {/* Additional Companies */}
                  <div style={{ marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>
                      Additional Companies (Optional)
                      <span style={{ fontSize: "9px", color: "#10b981", fontWeight: "400", marginLeft: "6px" }}>(Only your accessible companies)</span>
                    </h3>
                    <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px", maxHeight: "120px", overflowY: "auto", background: "#fff" }}>
                      {getAvailableCompanies().filter(c => c.id !== formData.primary_company_id).length === 0 ? (
                        <div style={{ fontSize: "9px", color: "#999", textAlign: "center", padding: "8px" }}>No other accessible companies</div>
                      ) : getAvailableCompanies().filter(c => c.id !== formData.primary_company_id).map((company) => (
                        <div key={company.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                          <input type="checkbox" checked={formData.additional_companies.includes(company.id)} onChange={() => handleAdditionalCompanySelect(company.id)} style={{ cursor: "pointer" }} />
                          <span style={{ fontSize: "10px", color: "#000" }}>{company.company_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 🔥 Role / Dept / Desg — company-specific cascading */}
                  <div style={{ marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <ShieldCheck size={12} /> Role, Department & Designation <span style={{ color: "#c00" }}>*</span>
                      <span style={{ fontSize: "9px", color: "#10b981", fontWeight: "400", marginLeft: "4px" }}>(Based on configured access for selected company)</span>
                    </h3>

                    {rbacLoading ? (
                      <div style={{ padding: "12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "4px", fontSize: "10px", color: "#0369a1", display: "flex", alignItems: "center", gap: "6px" }}>
                        ⏳ Loading role access for selected company...
                      </div>
                    ) : availableRoles.length === 0 ? (
                      <div style={{ padding: "12px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "4px", fontSize: "10px", color: "#92400e", display: "flex", alignItems: "center", gap: "6px" }}>
                        <AlertCircle size={14} />
                        No role access configured for this company. Please configure role access first in RBAC section.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        {/* Role */}
                        <div>
                          <label style={s3}>Role <span style={{ color: "#c00" }}>*</span></label>
                          <select value={formData.role_id}
                            onChange={(e) => setFormData({ ...formData, role_id: e.target.value, department_id: '', designation_id: '' })}
                            style={{ ...s2, borderColor: errors.role ? '#ef4444' : '#ddd' }}>
                            <option value="">Select Role</option>
                            {availableRoles.map(role => <option key={role.id} value={role.id}>{role.role_name}</option>)}
                          </select>
                          {errors.role && <p style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>{errors.role}</p>}
                        </div>
                        {/* Department */}
                        <div>
                          <label style={s3}>Department <span style={{ color: "#c00" }}>*</span></label>
                          <select value={formData.department_id}
                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value, designation_id: '' })}
                            disabled={!formData.role_id || availableDepartments.length === 0}
                            style={{ ...s2, borderColor: errors.department ? '#ef4444' : '#ddd', opacity: (!formData.role_id || availableDepartments.length === 0) ? 0.55 : 1, cursor: (!formData.role_id || availableDepartments.length === 0) ? 'not-allowed' : 'pointer' }}>
                            <option value="">{!formData.role_id ? 'Select Role first' : 'Select Department'}</option>
                            {availableDepartments.map(dept => <option key={dept.id} value={dept.id}>{dept.department_name}</option>)}
                          </select>
                          {errors.department && <p style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>{errors.department}</p>}
                        </div>
                        {/* Designation */}
                        <div>
                          <label style={s3}>Designation <span style={{ color: "#c00" }}>*</span></label>
                          <select value={formData.designation_id}
                            onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                            disabled={!formData.department_id || availableDesignations.length === 0}
                            style={{ ...s2, borderColor: errors.designation ? '#ef4444' : '#ddd', opacity: (!formData.department_id || availableDesignations.length === 0) ? 0.55 : 1, cursor: (!formData.department_id || availableDesignations.length === 0) ? 'not-allowed' : 'pointer' }}>
                            <option value="">{!formData.department_id ? 'Select Department first' : 'Select Designation'}</option>
                            {availableDesignations.map(desg => <option key={desg.id} value={desg.id}>{desg.designation_name}</option>)}
                          </select>
                          {errors.designation && <p style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>{errors.designation}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accessible Pages */}
                  {accessiblePages.length > 0 && (
                    <div style={{ marginBottom: "10px" }}>
                      <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <ShieldCheck size={12} /> Accessible Pages ({accessiblePages.length})
                      </h3>
                      <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px", maxHeight: "120px", overflowY: "auto", background: "#f8f9fa" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
                          {accessiblePages.map(page => (
                            <div key={page.page_id} style={{ fontSize: "9px", color: "#000", padding: "4px", background: "#fff", borderRadius: "3px", border: "1px solid #e0e0e0" }}>
                              <div style={{ fontWeight: "500", marginBottom: "2px" }}>{page.page_name}</div>
                              <div style={{ fontSize: "8px", color: "#666" }}>{page.permissions.join(', ')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plants */}
                  <div style={{ marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Factory size={12} /> Select Plants (Optional)
                      <span style={{ fontSize: "9px", color: "#10b981", fontWeight: "400" }}>(Only plants you have access to)</span>
                    </h3>
                    <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px", maxHeight: "150px", overflowY: "auto", background: "#fff" }}>
                      {getAvailablePlantsForCompanies().map(({ companyId, companyName, plants }) => (
                        <div key={companyId} style={{ marginBottom: "8px" }}>
                          <div style={{ fontSize: "9px", fontWeight: "600", color: "#666", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Building size={10} /> {companyName}
                            {companyId === formData.primary_company_id && <span style={{ padding: "1px 4px", background: "#dbeafe", color: "#1e40af", fontSize: "8px", borderRadius: "6px" }}>Primary</span>}
                          </div>
                          {plants.length === 0 ? (
                            <div style={{ fontSize: "9px", color: "#999", paddingLeft: "12px" }}>No plants available or accessible</div>
                          ) : plants.map(plant => (
                            <div key={plant.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", paddingLeft: "12px" }}>
                              <input type="checkbox" checked={formData.selected_plants.includes(plant.id)} onChange={() => handlePlantSelect(plant.id)} style={{ cursor: "pointer" }} />
                              <span style={{ fontSize: "10px", color: "#000" }}>{plant.plant_name}</span>
                              {formData.primary_plant_id === plant.id && <span style={{ padding: "1px 4px", background: "#d1fae5", color: "#065f46", fontSize: "8px", borderRadius: "6px" }}>Primary</span>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="submit" disabled={loading || !formData.primary_company_id || availableRoles.length === 0}
                  style={{ padding: "4px 14px", background: (loading || !formData.primary_company_id || availableRoles.length === 0) ? "#ccc" : "rgba(75, 85, 99, 0.9)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: (loading || !formData.primary_company_id || availableRoles.length === 0) ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Save size={12} /> {loading ? 'Creating User...' : 'Register User'}
                </button>
                <button type="button" onClick={resetForm}
                  style={{ padding: "4px 14px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "#333" }}>
                  Reset
                </button>
              </div>
            </form>
          )}

          {/* ======= DETAILS ======= */}
          {activeTab === 'details' && selectedUser && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #e0e0e0", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "linear-gradient(135deg, #4b5563, #60a5fa)", color: "white", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600" }}>
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#000" }}>{selectedUser.full_name}</h2>
                    <p style={{ margin: 0, fontSize: "9px", color: "#666" }}>User ID: {selectedUser.user_id}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedUser(null); setActiveTab('list'); }} style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#666" }}><X size={16} /></button>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Contact Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div><p style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Email</p><p style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{selectedUser.email}</p></div>
                  <div><p style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Phone</p><p style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{selectedUser.phone}</p></div>
                </div>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Assigned Companies</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {selectedUser.companies.map(company => (
                    <div key={company.company_id} style={{ background: "#f8f9fa", padding: "8px", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>{company.company_name}</p>
                          <p style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>ID: {company.company_id}</p>
                        </div>
                        {company.is_primary && <span style={{ padding: "2px 6px", background: "#dbeafe", color: "#1e40af", fontSize: "9px", fontWeight: "500", borderRadius: "8px" }}>Primary</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedUser.plants.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Assigned Plants</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {selectedUser.plants.map(plant => (
                      <div key={plant.plant_id} style={{ background: "#f8f9fa", padding: "8px", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div>
                            <p style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>{plant.plant_name}</p>
                            <p style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>{plant.plant_code}</p>
                          </div>
                          {plant.is_primary && <span style={{ padding: "2px 6px", background: "#d1fae5", color: "#065f46", fontSize: "9px", fontWeight: "500", borderRadius: "8px" }}>Primary</span>}
                        </div>
                        <p style={{ fontSize: "9px", color: "#666" }}>Company: {plant.company_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "10px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "600", marginBottom: "6px", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Access Details</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedUser.accesses.map(access => (
                    <div key={access.id} style={{ background: "#f8f9fa", padding: "8px", borderRadius: "4px", border: "1px solid #e0e0e0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                        <div>
                          <p style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Company</p>
                          <p style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>{access.company.name}</p>
                          {access.is_primary_company && <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 4px", background: "#dbeafe", color: "#1e40af", fontSize: "8px", borderRadius: "6px" }}>Primary</span>}
                        </div>
                        {access.plant && (
                          <div>
                            <p style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Plant</p>
                            <p style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>{access.plant.name}</p>
                            {access.is_primary_plant && <span style={{ display: "inline-block", marginTop: "2px", padding: "1px 4px", background: "#d1fae5", color: "#065f46", fontSize: "8px", borderRadius: "6px" }}>Primary</span>}
                          </div>
                        )}
                        <div><p style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Role</p><p style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>{access.role.name}</p></div>
                        <div><p style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Department</p><p style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>{access.department.name}</p></div>
                        <div><p style={{ fontSize: "9px", color: "#666", marginBottom: "2px" }}>Designation</p><p style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>{access.designation.name}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======= CREDENTIALS ======= */}
          {activeTab === 'credentials' && credentials && (
            <div>
              <div style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", padding: "16px", borderRadius: "8px", border: "2px solid #10b981", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ background: "#10b981", padding: "6px", borderRadius: "8px" }}><CheckCircle style={{ color: "white" }} size={16} /></div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#065f46" }}>User Created Successfully!</h2>
                    <p style={{ margin: 0, fontSize: "9px", color: "#059669", marginTop: "2px" }}>Save these credentials securely</p>
                  </div>
                </div>
                <div style={{ background: "white", borderRadius: "8px", padding: "12px" }}>
                  {[{ label: 'Full Name', value: credentials.full_name, copy: false }, { label: 'Email', value: credentials.email, copy: true }, { label: 'User Login ID', value: credentials.user_login_id, copy: true }].map(({ label, value, copy }) => (
                    <div key={label} style={{ marginBottom: "8px" }}>
                      <label style={{ display: "block", fontSize: "9px", fontWeight: "500", color: "#666", marginBottom: "4px" }}>{label}</label>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f9fa", padding: "6px 8px", borderRadius: "4px" }}>
                        <span style={{ fontSize: "10px", color: "#000", fontWeight: "500" }}>{value}</span>
                        {copy && <button onClick={() => copyToClipboard(value)} style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#60a5fa" }}><Copy size={12} /></button>}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontWeight: "500", color: "#666", marginBottom: "4px" }}>Auto-Generated Password</label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fef3c7", padding: "6px 8px", borderRadius: "4px", border: "1px solid #fbbf24" }}>
                      <span style={{ fontSize: "10px", color: "#000", fontFamily: "monospace", fontWeight: "600" }}>{showPassword ? credentials.auto_generated_password : '••••••••••••'}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button onClick={() => setShowPassword(!showPassword)} style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#d97706" }}>{showPassword ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                        <button onClick={() => copyToClipboard(credentials.auto_generated_password)} style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#d97706" }}><Copy size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "12px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "8px", padding: "8px" }}>
                  <div style={{ display: "flex", alignItems: "start", gap: "6px" }}>
                    <AlertCircle style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} size={14} />
                    <div style={{ fontSize: "9px", color: "#92400e" }}>
                      <p style={{ fontWeight: "600", marginBottom: "4px" }}>Important Security Notice:</p>
                      <ul style={{ listStyle: "disc", listStylePosition: "inside", margin: 0, padding: 0 }}>
                        <li>Share these credentials securely with the user</li>
                        <li>User should change password after first login</li>
                        <li>These credentials won't be shown again</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <button onClick={() => { setCredentials(null); setActiveTab('list'); }} style={{ padding: "4px 14px", background: "rgba(75, 85, 99, 0.9)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white" }}>Back to User List</button>
                <button onClick={() => { setCredentials(null); resetForm(); setActiveTab('register'); }} style={{ padding: "4px 14px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "#333" }}>Register Another User</button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>
      </div>
    </div>
  );
};

export default UserManagementSystem;
