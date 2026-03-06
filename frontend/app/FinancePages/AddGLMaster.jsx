import React, { useState, useEffect, useCallback } from 'react';
import {
  Building, Factory, DollarSign, Search, Eye, CheckCircle, XCircle,
  AlertCircle, Loader, Grid, List, Plus, Save, Info, Globe, Upload, ChevronRight
} from 'lucide-react';
import ExcelImportPopup from '../pages/ExcelImportPopup';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLOR      = '#7c3aed';
const COLOR_MED  = '#a78bfa';
const COLOR_SOFT = '#ede9fe';

const s1 = { width: '100%', padding: '6px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box', color: '#000', outline: 'none' };
const s2 = { ...s1, cursor: 'pointer' };
const s3 = { display: 'block', fontSize: '9px', fontWeight: '700', marginBottom: '4px', color: '#374151' };
const reqStar = <span style={{ color: '#dc2626' }}> *</span>;

// ─── Safely ensure array ──────────────────────────────────────────────────────
const toArr = (v) => (Array.isArray(v) ? v : []);

export default function AddGLMaster() {
  const [loading,      setLoading]      = useState(false);
  const [message,      setMessage]      = useState(null);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [backendError, setBackendError] = useState(false);

  // ── Master data ──────────────────────────────────────────────────────────
  const [companiesWithPlants, setCompaniesWithPlants] = useState([]);
  const [glTypes,             setGLTypes]             = useState([]);
  const [glSubTypes,          setGLSubTypes]          = useState([]);
  const [glCategories,        setGLCategories]        = useState([]);
  const [glSubCategories,     setGLSubCategories]     = useState([]);
  const [glHeads,             setGLHeads]             = useState([]);
  const [existingGLAccounts,  setExistingGLAccounts]  = useState([]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedCompany,    setSelectedCompany]    = useState('');
  const [selectedPlant,      setSelectedPlant]      = useState('');
  const [isCompanyWide,      setIsCompanyWide]      = useState(true);
  const [glCode,             setGLCode]             = useState('');
  const [glName,             setGLName]             = useState('');
  const [selectedGLType,     setSelectedGLType]     = useState('');
  const [selectedGLSubType,  setSelectedGLSubType]  = useState('');
  const [selectedGLCategory, setSelectedGLCategory] = useState('');
  const [selectedGLSubCat,   setSelectedGLSubCat]   = useState('');
  const [selectedGLHead,     setSelectedGLHead]     = useState('');
  const [isPostable,         setIsPostable]         = useState(true);
  const [currencyCode,       setCurrencyCode]       = useState('');
  const [remarks,            setRemarks]            = useState('');

  // ── View state ────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState('create');
  const [viewMode,        setViewMode]        = useState('grid');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');

  // ── Import state ──────────────────────────────────────────────────────────
  const [showImportPopup,    setShowImportPopup]    = useState(false);
  const [showImportSelector, setShowImportSelector] = useState(false);
  // Import hierarchy pre-select
  const [impCompanyId,    setImpCompanyId]    = useState('');
  const [impTypeId,       setImpTypeId]       = useState('');
  const [impSubTypeId,    setImpSubTypeId]    = useState('');
  const [impCategoryId,   setImpCategoryId]   = useState('');
  const [impSubCatId,     setImpSubCatId]     = useState('');
  const [impHeadId,       setImpHeadId]       = useState('');

  // ── Fetch all master data ─────────────────────────────────────────────────
  const safeFetch = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return toArr(d);
  };

  const fetchGLTypes        = async () => { try { setGLTypes(       await safeFetch(`${API_BASE}/gl-types?is_active=true`));        } catch { setGLTypes([]);        } };
  const fetchGLSubTypes     = async () => { try { setGLSubTypes(    await safeFetch(`${API_BASE}/gl-sub-types`));                    } catch { setGLSubTypes([]);     } };
  const fetchGLCategories   = async () => { try { setGLCategories(  await safeFetch(`${API_BASE}/gl-categories?is_active=true`));    } catch { setGLCategories([]);   } };
  const fetchGLSubCategories= async () => { try { setGLSubCategories(await safeFetch(`${API_BASE}/gl-sub-categories`));              } catch { setGLSubCategories([]); } };
  const fetchGLHeads        = async () => { try { setGLHeads(       await safeFetch(`${API_BASE}/gl-heads?is_active=true`));         } catch { setGLHeads([]);        } };

  const fetchUserCompaniesWithPlants = async (userId) => {
    setBackendError(false);
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/user/${userId}/companies-with-plants`, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setCompaniesWithPlants(toArr(d.companies));
    } catch (err) {
      setBackendError(true);
      setMessage({ type: 'error', text: err.name === 'AbortError' ? 'Request timeout.' : 'Cannot connect to backend. Please ensure the server is running.' });
    }
  };

  const fetchGLAccounts = useCallback(async () => {
    if (!currentUser?.id) return;
    setBackendError(false);
    try {
      let url = `${API_BASE}/gl-accounts/by-user/${currentUser.id}`;
      if (filterCompanyId) url += `?company_id=${filterCompanyId}`;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setExistingGLAccounts(toArr(d.gl_accounts));
    } catch (err) {
      setBackendError(true);
      setMessage({ type: 'error', text: err.name === 'AbortError' ? 'Request timeout.' : 'Cannot connect to backend. Please ensure the server is running.' });
    }
  }, [currentUser, filterCompanyId]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('userData');
    if (raw) { try { setCurrentUser(JSON.parse(raw).user); } catch { setMessage({ type: 'error', text: 'Failed to load user data' }); } }
    else { setMessage({ type: 'error', text: 'No user session found. Please login again.' }); }
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserCompaniesWithPlants(currentUser.id);
      fetchGLTypes(); fetchGLSubTypes(); fetchGLCategories(); fetchGLSubCategories(); fetchGLHeads();
    }
  }, [currentUser]);

  useEffect(() => { if (currentUser?.id) fetchGLAccounts(); }, [filterCompanyId, currentUser]);

  // ── Cascade resets ────────────────────────────────────────────────────────
  useEffect(() => { setSelectedGLSubType(''); setSelectedGLCategory(''); setSelectedGLSubCat(''); setSelectedGLHead(''); }, [selectedGLType]);
  useEffect(() => { setSelectedGLCategory(''); setSelectedGLSubCat(''); setSelectedGLHead(''); }, [selectedGLSubType]);
  useEffect(() => { setSelectedGLSubCat(''); setSelectedGLHead(''); }, [selectedGLCategory]);
  useEffect(() => { setSelectedGLHead(''); }, [selectedGLSubCat]);

  // ── Filtered cascading lists ──────────────────────────────────────────────
  const filteredSubTypes = selectedGLType
    ? glSubTypes.filter(s => String(s.gl_type_id) === String(selectedGLType))
    : [];

  const filteredCategories = selectedGLType
    ? glCategories.filter(c => {
        if (String(c.gl_type_id) !== String(selectedGLType)) return false;
        if (selectedGLSubType && c.gl_sub_type_id && String(c.gl_sub_type_id) !== String(selectedGLSubType)) return false;
        return true;
      })
    : [];

  const filteredSubCategories = selectedGLCategory
    ? glSubCategories.filter(sc => String(sc.gl_category_id) === String(selectedGLCategory))
    : [];

  const filteredHeads = selectedGLSubCat
    ? glHeads.filter(h => String(h.gl_sub_category_id) === String(selectedGLSubCat))
    : [];

  const filteredGLAccounts = existingGLAccounts.filter(gl =>
    gl.gl_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gl.gl_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availablePlants = selectedCompany
    ? (companiesWithPlants.find(c => c.company_id === parseInt(selectedCompany))?.plants || [])
    : [];

  const selectedCompanyName = companiesWithPlants.find(c => c.company_id === parseInt(selectedCompany))?.company_name || '';
  const selectedPlantName   = availablePlants.find(p => p.plant_id === parseInt(selectedPlant))?.plant_name || '';

  // ── Create GL Account ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!selectedCompany)                           { setMessage({ type: 'error', text: 'Please select a Company.' }); return; }
    if (!isCompanyWide && !selectedPlant)           { setMessage({ type: 'error', text: 'Please select a Plant or choose Company-wide.' }); return; }
    if (!glCode.trim())                             { setMessage({ type: 'error', text: 'GL Code is required.' }); return; }
    if (!glName.trim())                             { setMessage({ type: 'error', text: 'GL Name is required.' }); return; }
    if (!selectedGLType)                            { setMessage({ type: 'error', text: 'Please select GL Type.' }); return; }
    if (filteredSubTypes.length > 0 && !selectedGLSubType)   { setMessage({ type: 'error', text: 'Please select GL Sub-Type.' }); return; }
    if (filteredCategories.length > 0 && !selectedGLCategory){ setMessage({ type: 'error', text: 'Please select GL Category.' }); return; }
    if (filteredSubCategories.length > 0 && !selectedGLSubCat){ setMessage({ type: 'error', text: 'Please select GL Sub-Category.' }); return; }
    if (filteredHeads.length > 0 && !selectedGLHead)          { setMessage({ type: 'error', text: 'Please select GL Head.' }); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append('gl_code',    glCode.trim().toUpperCase());
    fd.append('gl_name',    glName.trim());
    fd.append('company_id', selectedCompany);
    fd.append('gl_type_id', selectedGLType);
    fd.append('user_id',    currentUser.id);
    if (!isCompanyWide && selectedPlant)  fd.append('plant_id',         selectedPlant);
    if (selectedGLSubType)                fd.append('gl_sub_type_id',   selectedGLSubType);
    if (selectedGLCategory)               fd.append('gl_category_id',   selectedGLCategory);
    if (selectedGLSubCat)                 fd.append('gl_sub_category_id', selectedGLSubCat);
    if (selectedGLHead)                   fd.append('gl_head_id',       selectedGLHead);
    fd.append('is_postable', isPostable);
    if (currencyCode.trim()) fd.append('currency_code', currencyCode.trim().toUpperCase());
    if (remarks.trim())      fd.append('remarks',       remarks.trim());

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const res  = await fetch(`${API_BASE}/gl-accounts`, { method: 'POST', body: fd, signal: controller.signal });
      clearTimeout(tid);
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ GL Account "${data.gl_code}" — ${data.gl_name} created! (${data.scope})` });
        setGLCode(''); setGLName(''); setSelectedGLType(''); setSelectedGLSubType('');
        setSelectedGLCategory(''); setSelectedGLSubCat(''); setSelectedGLHead('');
        setIsPostable(true); setCurrencyCode(''); setRemarks('');
        setSelectedCompany(''); setSelectedPlant(''); setIsCompanyWide(true);
        fetchGLAccounts();
      } else {
        const errText = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        setMessage({ type: 'error', text: errText || 'Failed to create GL Account.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.name === 'AbortError' ? 'Request timed out.' : 'Cannot connect to backend.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGLCode(''); setGLName(''); setSelectedGLType(''); setSelectedGLSubType('');
    setSelectedGLCategory(''); setSelectedGLSubCat(''); setSelectedGLHead('');
    setIsPostable(true); setCurrencyCode(''); setRemarks('');
    setSelectedCompany(''); setSelectedPlant(''); setIsCompanyWide(true);
    setMessage(null);
  };

  // ── Import computed values ────────────────────────────────────────────────
  const impCompany  = companiesWithPlants.find(c => String(c.company_id) === String(impCompanyId));
  const impType     = glTypes.find(t => String(t.id) === String(impTypeId));
  const impSubType  = glSubTypes.find(s => String(s.id) === String(impSubTypeId));
  const impCat      = glCategories.find(c => String(c.id) === String(impCategoryId));
  const impSubCat   = glSubCategories.find(sc => String(sc.id) === String(impSubCatId));
  const impHead     = glHeads.find(h => String(h.id) === String(impHeadId));

  // Cascaded import filter lists
  const impFilteredSubTypes   = impTypeId     ? glSubTypes.filter(s => String(s.gl_type_id) === String(impTypeId)) : [];
  const impFilteredCats       = impTypeId     ? glCategories.filter(c => String(c.gl_type_id) === String(impTypeId)) : [];
  const impFilteredSubCats    = impCategoryId ? glSubCategories.filter(sc => String(sc.gl_category_id) === String(impCategoryId)) : [];
  const impFilteredHeads      = impSubCatId   ? glHeads.filter(h => String(h.gl_sub_category_id) === String(impSubCatId))
                              : impCategoryId ? glHeads.filter(h => String(h.gl_category_id) === String(impCategoryId))
                              : [];

  // Extra form data sent with every imported row
  const importExtraData = {
    ...(impCompanyId  ? { company_id:          impCompanyId  } : {}),
    ...(impTypeId     ? { gl_type_id:           impTypeId     } : {}),
    ...(impSubTypeId  ? { gl_sub_type_id:       impSubTypeId  } : {}),
    ...(impCategoryId ? { gl_category_id:       impCategoryId } : {}),
    ...(impSubCatId   ? { gl_sub_category_id:   impSubCatId   } : {}),
    ...(impHeadId     ? { gl_head_id:           impHeadId     } : {}),
    user_id: currentUser?.id || '',
  };

  // Template dropdown fields — only expose un-pre-selected ones
  const importTemplateDropdowns = [
    ...(!impTypeId     ? [{ key: 'gl_type_id',         label: 'GL Type',         options: glTypes.map(t => ({ label: t.type_name,              value: t.id })) }] : []),
    ...(!impSubTypeId  ? [{ key: 'gl_sub_type_id',     label: 'GL Sub-Type',     options: (impTypeId ? impFilteredSubTypes : glSubTypes).map(s => ({ label: s.sub_type_name, value: s.id })) }] : []),
    ...(!impCategoryId ? [{ key: 'gl_category_id',     label: 'GL Category',     options: (impTypeId ? impFilteredCats : glCategories).map(c => ({ label: c.category_name, value: c.id })) }] : []),
    ...(!impSubCatId   ? [{ key: 'gl_sub_category_id', label: 'GL Sub-Category', options: (impCategoryId ? impFilteredSubCats : glSubCategories).map(sc => ({ label: sc.sub_category_name, value: sc.id })) }] : []),
    ...(!impHeadId     ? [{ key: 'gl_head_id',         label: 'GL Head',         options: (impSubCatId ? impFilteredHeads : glHeads).map(h => ({ label: h.gl_head_name, value: h.id })) }] : []),
    ...(!impCompanyId  ? [{ key: 'company_id',         label: 'Company',         options: companiesWithPlants.map(c => ({ label: c.company_name, value: c.company_id })) }] : []),
  ];

  const importLookupFields = [
    ...(!impTypeId     ? [{ key: 'gl_type_id',         label: 'GL Type',         data: glTypes,          matchKey: 'type_name',          valueKey: 'id', caseSensitive: false }] : []),
    ...(!impSubTypeId  ? [{ key: 'gl_sub_type_id',     label: 'GL Sub-Type',     data: glSubTypes,       matchKey: 'sub_type_name',      valueKey: 'id', caseSensitive: false }] : []),
    ...(!impCategoryId ? [{ key: 'gl_category_id',     label: 'GL Category',     data: glCategories,     matchKey: 'category_name',      valueKey: 'id', caseSensitive: false }] : []),
    ...(!impSubCatId   ? [{ key: 'gl_sub_category_id', label: 'GL Sub-Category', data: glSubCategories,  matchKey: 'sub_category_name',  valueKey: 'id', caseSensitive: false }] : []),
    ...(!impHeadId     ? [{ key: 'gl_head_id',         label: 'GL Head',         data: glHeads,          matchKey: 'gl_head_name',       valueKey: 'id', caseSensitive: false }] : []),
    ...(!impCompanyId  ? [{ key: 'company_id',         label: 'Company',         data: companiesWithPlants, matchKey: 'company_name',    valueKey: 'company_id', caseSensitive: false }] : []),
  ];

  // ── Pill button helper ───────────────────────────────────────────────────
  const pillBtn = (selected, color = COLOR) => ({
    padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
    border: selected ? `2px solid ${color}` : '1px solid #d1d5db',
    background: selected ? color : 'white',
    color: selected ? 'white' : '#374151',
    fontSize: '10px', fontWeight: '600',
  });

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={48} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: COLOR }} />
          <p style={{ fontSize: '14px', color: '#666' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (backendError && companiesWithPlants.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <AlertCircle size={56} style={{ margin: '0 auto 16px', color: '#dc2626' }} />
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>Backend Connection Error</h2>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>Unable to connect to the backend server. Make sure the server is running.</p>
          <button onClick={() => { setBackendError(false); if (currentUser?.id) { fetchUserCompaniesWithPlants(currentUser.id); fetchGLTypes(); fetchGLSubTypes(); fetchGLCategories(); fetchGLSubCategories(); fetchGLHeads(); } }}
            style={{ padding: '8px 20px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: 'white' }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ── Helpers for "step done" checks ────────────────────────────────────────
  const step1Done = !!selectedCompany && (isCompanyWide || !!selectedPlant);
  const step2Done = step1Done && !!glCode.trim() && !!glName.trim();
  const step3Done = step2Done && !!selectedGLType;
  const step4Done = step3Done && (filteredSubTypes.length === 0 || !!selectedGLSubType);
  const step5Done = step4Done && (filteredCategories.length === 0 || !!selectedGLCategory);
  const step6Done = step5Done && (filteredSubCategories.length === 0 || !!selectedGLSubCat);
  const canSubmit = step6Done && (filteredHeads.length === 0 || !!selectedGLHead);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '95%', maxWidth: '1200px', height: '90%', maxHeight: '760px', background: 'white', borderRadius: '10px', boxShadow: `0 6px 32px rgba(124,58,237,0.14)`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 14px', height: '34px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={14} />
            <span style={{ fontWeight: '700', fontSize: '12px' }}>💰 GL Master Management</span>
          </div>
          <button
            onClick={() => { setImpCompanyId(''); setImpTypeId(''); setImpSubTypeId(''); setImpCategoryId(''); setImpSubCatId(''); setImpHeadId(''); setShowImportSelector(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', color: 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Upload size={10} /> Import Excel
          </button>
        </div>

        {/* ── Message ─────────────────────────────────────────────────────── */}
        {message && (
          <div style={{ margin: '6px 12px 0', padding: '5px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, background: message.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
            {message.type === 'success' ? <CheckCircle size={12} color="#16a34a" /> : <AlertCircle size={12} color="#dc2626" />}
            <span style={{ fontSize: '10px', color: '#111', fontWeight: '500', flex: 1 }}>{message.text}</span>
            <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={12} color="#9ca3af" /></button>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#f9fafb', flexShrink: 0 }}>
          {[
            { key: 'create', label: '+ Create GL Account' },
            { key: 'view',   label: `👁 View GL Accounts (${existingGLAccounts.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '7px 12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
              border: 'none', background: activeTab === t.key ? 'white' : 'transparent',
              color: activeTab === t.key ? COLOR : '#374151',
              borderBottom: activeTab === t.key ? `2px solid ${COLOR}` : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>

          {/* ════════ CREATE TAB ════════════════════════════════════════════ */}
          {activeTab === 'create' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
              <div>

                {/* STEP 1 — Company + Scope */}
                <div style={{ background: 'white', border: `1px solid ${step1Done ? '#bbf7d0' : COLOR_SOFT}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: step1Done ? '#16a34a' : COLOR, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', flexShrink: 0 }}>
                      {step1Done ? <CheckCircle size={11} /> : '1'}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#111' }}>Company & Scope{reqStar}</span>
                  </div>

                  {/* Company radio list */}
                  <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px', background: '#fafafa', padding: '6px', marginBottom: '8px' }}>
                    {companiesWithPlants.length === 0
                      ? <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>No companies available</p>
                      : companiesWithPlants.map(c => (
                        <label key={c.company_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 6px', cursor: 'pointer', borderRadius: '3px', marginBottom: '2px', background: String(selectedCompany) === String(c.company_id) ? '#f3e8ff' : 'transparent', border: String(selectedCompany) === String(c.company_id) ? `1px solid ${COLOR}` : '1px solid transparent' }}>
                          <input type="radio" checked={String(selectedCompany) === String(c.company_id)} onChange={() => { setSelectedCompany(String(c.company_id)); setSelectedPlant(''); }} style={{ cursor: 'pointer' }} />
                          <span style={{ fontSize: '9px', color: '#111', fontWeight: '500' }}>{c.company_name} <span style={{ color: '#9ca3af' }}>({c.company_code})</span></span>
                        </label>
                      ))}
                  </div>

                  {/* Scope toggle */}
                  {selectedCompany && (
                    <>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        {[
                          { val: true,  icon: <Globe size={10} />,   label: 'Company-wide',  sub: 'All plants' },
                          { val: false, icon: <Factory size={10} />, label: 'Plant-specific', sub: 'One plant only' },
                        ].map(opt => (
                          <label key={String(opt.val)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', border: isCompanyWide === opt.val ? `2px solid ${COLOR}` : '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', background: isCompanyWide === opt.val ? COLOR_SOFT : 'white' }}>
                            <input type="radio" checked={isCompanyWide === opt.val} onChange={() => { setIsCompanyWide(opt.val); setSelectedPlant(''); }} style={{ cursor: 'pointer' }} />
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: '700', color: '#111', display: 'flex', alignItems: 'center', gap: '3px' }}>{opt.icon}{opt.label}</div>
                              <div style={{ fontSize: '8px', color: '#9ca3af' }}>{opt.sub}</div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {!isCompanyWide && (
                        <div>
                          <label style={s3}>Select Plant{reqStar}</label>
                          <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)} style={s2}>
                            <option value="">— Select Plant —</option>
                            {availablePlants.map(p => <option key={p.plant_id} value={p.plant_id}>{p.plant_name} ({p.plant_code})</option>)}
                          </select>
                        </div>
                      )}

                      <div style={{ marginTop: '6px', padding: '5px 8px', background: isCompanyWide ? '#dbeafe' : '#fef3c7', borderRadius: '4px', fontSize: '9px', color: '#111', fontWeight: '500' }}>
                        <strong>Scope:</strong> {isCompanyWide ? `All plants in ${selectedCompanyName}` : (selectedPlant ? `Plant: ${selectedPlantName}` : 'Select a plant')}
                      </div>
                    </>
                  )}
                </div>

                {/* STEP 2 — GL Code + Name */}
                <div style={{ background: step1Done ? 'white' : '#fafafa', border: `1px solid ${step2Done ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', padding: '12px', marginBottom: '10px', opacity: step1Done ? 1 : 0.5, pointerEvents: step1Done ? 'auto' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: step2Done ? '#16a34a' : step1Done ? COLOR : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', flexShrink: 0 }}>
                      {step2Done ? <CheckCircle size={11} /> : '2'}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: step1Done ? '#111' : '#9ca3af' }}>GL Code & Name{reqStar}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={s3}>GL Code{reqStar}</label>
                      <input value={glCode} onChange={e => setGLCode(e.target.value.toUpperCase())} placeholder="e.g. 1001, 2001" style={s1} />
                      <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#9ca3af' }}>Auto UPPERCASE</p>
                    </div>
                    <div>
                      <label style={s3}>GL Name{reqStar}</label>
                      <input value={glName} onChange={e => setGLName(e.target.value)} placeholder="e.g. Cash in Hand" style={s1} />
                    </div>
                  </div>
                </div>

                {/* Currency + Postable + Remarks */}
                <div style={{ background: step3Done ? 'white' : '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', opacity: step3Done ? 1 : 0.5, pointerEvents: step3Done ? 'auto' : 'none' }}>
                  <p style={{ fontSize: '9px', fontWeight: '700', color: '#374151', margin: '0 0 8px' }}>Additional Details</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={s3}>Currency Code</label>
                      <input value={currencyCode} onChange={e => setCurrencyCode(e.target.value.toUpperCase())} placeholder="INR, USD, EUR" maxLength={10} style={s1} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '16px' }}>
                      <input type="checkbox" id="postable" checked={isPostable} onChange={e => setIsPostable(e.target.checked)} style={{ cursor: 'pointer' }} />
                      <label htmlFor="postable" style={{ fontSize: '9px', fontWeight: '700', color: '#374151', cursor: 'pointer' }}>Is Postable</label>
                    </div>
                  </div>
                  <div>
                    <label style={s3}>Remarks</label>
                    <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Brief remarks…" style={{ ...s1, minHeight: '48px', resize: 'vertical' }} />
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <DollarSign size={13} color={COLOR} />
                  <span style={{ fontWeight: '800', fontSize: '12px', color: COLOR }}>GL Hierarchy</span>
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>— All levels required when available</span>
                </div>

                {/* STEP 3 — GL Type */}
                <div style={{ border: `1px solid ${step3Done ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', padding: '10px', marginBottom: '8px', background: step2Done ? 'white' : '#fafafa', opacity: step2Done ? 1 : 0.5, pointerEvents: step2Done ? 'auto' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: step3Done ? '#16a34a' : step2Done ? COLOR : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800', flexShrink: 0 }}>
                      {step3Done ? <CheckCircle size={10} /> : '3'}
                    </div>
                    <label style={{ ...s3, margin: 0 }}>GL Type{reqStar}</label>
                  </div>
                  <select value={selectedGLType} onChange={e => setSelectedGLType(e.target.value)} style={s2}>
                    <option value="">— Select GL Type —</option>
                    {glTypes.map(t => <option key={t.id} value={t.id}>{t.type_name} ({t.type_code})</option>)}
                  </select>
                </div>

                {/* STEP 4 — GL Sub-Type (required when options exist) */}
                <div style={{ border: `1px solid ${step4Done ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', padding: '10px', marginBottom: '8px', background: step3Done ? 'white' : '#fafafa', opacity: step3Done ? 1 : 0.5, pointerEvents: step3Done ? 'auto' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: step4Done ? '#16a34a' : step3Done ? COLOR : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800', flexShrink: 0 }}>
                      {step4Done ? <CheckCircle size={10} /> : '4'}
                    </div>
                    <label style={{ ...s3, margin: 0 }}>
                      GL Sub-Type
                      {step3Done && filteredSubTypes.length > 0 && reqStar}
                      {step3Done && <span style={{ fontSize: '8px', fontWeight: '400', color: '#9ca3af', marginLeft: '4px' }}>— {filteredSubTypes.length} available</span>}
                    </label>
                  </div>
                  {filteredSubTypes.length === 0
                    ? <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>{step3Done ? 'No Sub-Types for this GL Type — skip to next step' : 'Select GL Type first'}</p>
                    : <select value={selectedGLSubType} onChange={e => setSelectedGLSubType(e.target.value)} style={s2}>
                        <option value="">— Select GL Sub-Type —</option>
                        {filteredSubTypes.map(s => <option key={s.id} value={s.id}>{s.sub_type_name}</option>)}
                      </select>
                  }
                </div>

                {/* STEP 5 — GL Category */}
                <div style={{ border: `1px solid ${step5Done ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', padding: '10px', marginBottom: '8px', background: step4Done ? 'white' : '#fafafa', opacity: step4Done ? 1 : 0.5, pointerEvents: step4Done ? 'auto' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: step5Done ? '#16a34a' : step4Done ? '#d97706' : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800', flexShrink: 0 }}>
                      {step5Done ? <CheckCircle size={10} /> : '5'}
                    </div>
                    <label style={{ ...s3, margin: 0 }}>
                      GL Category
                      {step4Done && filteredCategories.length > 0 && reqStar}
                      {step4Done && <span style={{ fontSize: '8px', fontWeight: '400', color: '#9ca3af', marginLeft: '4px' }}>— {filteredCategories.length} available</span>}
                    </label>
                  </div>
                  {filteredCategories.length === 0
                    ? <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>{step4Done ? 'No Categories — add from GL Category page first' : 'Complete above steps first'}</p>
                    : <select value={selectedGLCategory} onChange={e => setSelectedGLCategory(e.target.value)} style={{ ...s2, borderColor: '#d97706' }}>
                        <option value="">— Select GL Category —</option>
                        {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.category_name} ({c.category_code})</option>)}
                      </select>
                  }
                </div>

                {/* STEP 6 — GL Sub-Category */}
                <div style={{ border: `1px solid ${step6Done ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', padding: '10px', marginBottom: '8px', background: step5Done ? '#fdf4ff' : '#fafafa', opacity: step5Done ? 1 : 0.5, pointerEvents: step5Done ? 'auto' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: step6Done ? '#16a34a' : step5Done ? '#9333ea' : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800', flexShrink: 0 }}>
                      {step6Done ? <CheckCircle size={10} /> : '6'}
                    </div>
                    <label style={{ ...s3, margin: 0 }}>
                      GL Sub-Category
                      {step5Done && filteredSubCategories.length > 0 && reqStar}
                      {step5Done && <span style={{ fontSize: '8px', fontWeight: '400', color: '#9ca3af', marginLeft: '4px' }}>— {filteredSubCategories.length} available</span>}
                    </label>
                  </div>
                  {filteredSubCategories.length === 0
                    ? <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>{step5Done ? 'No Sub-Categories — add from GL Category page' : 'Select GL Category first'}</p>
                    : <select value={selectedGLSubCat} onChange={e => setSelectedGLSubCat(e.target.value)} style={{ ...s2, borderColor: '#9333ea' }}>
                        <option value="">— Select GL Sub-Category —</option>
                        {filteredSubCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.sub_category_name} ({sc.sub_category_code})</option>)}
                      </select>
                  }
                </div>

                {/* STEP 7 — GL Head */}
                <div style={{ border: `1px solid ${canSubmit && selectedGLHead ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', padding: '10px', marginBottom: '12px', background: step6Done ? '#f0fdfa' : '#fafafa', opacity: step6Done ? 1 : 0.5, pointerEvents: step6Done ? 'auto' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: selectedGLHead ? '#16a34a' : step6Done ? '#0f766e' : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800', flexShrink: 0 }}>
                      {selectedGLHead ? <CheckCircle size={10} /> : '7'}
                    </div>
                    <label style={{ ...s3, color: '#0f766e', margin: 0 }}>
                      🔖 GL Head — Posting Reference
                      {step6Done && filteredHeads.length > 0 && reqStar}
                      {step6Done && <span style={{ fontSize: '8px', fontWeight: '400', color: '#14b8a6', marginLeft: '4px' }}>— {filteredHeads.length} available</span>}
                    </label>
                  </div>
                  {filteredHeads.length === 0
                    ? <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>{step6Done ? 'No GL Heads for this Sub-Category — create from GL Head Management' : 'Complete Sub-Category first'}</p>
                    : <select value={selectedGLHead} onChange={e => setSelectedGLHead(e.target.value)} style={{ ...s2, borderColor: selectedGLHead ? '#14b8a6' : '#0f766e' }}>
                        <option value="">— Select GL Head —</option>
                        {filteredHeads.map(h => <option key={h.id} value={h.id}>{h.gl_head_name} ({h.gl_head_code})</option>)}
                      </select>
                  }
                  {selectedGLHead && (
                    <div style={{ marginTop: '6px', padding: '4px 8px', background: '#ccfbf1', borderRadius: '4px', fontSize: '8px', color: '#0f766e', fontWeight: '600' }}>
                      ✓ {glHeads.find(h => String(h.id) === String(selectedGLHead))?.gl_head_name}
                    </div>
                  )}
                </div>

                {/* Code hierarchy breadcrumb */}
                {selectedGLType && (
                  <div style={{ background: COLOR_SOFT, border: `1px solid ${COLOR_MED}`, borderRadius: '6px', padding: '8px 10px', marginBottom: '12px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '8px', fontWeight: '700', color: COLOR }}>📐 Hierarchy Preview</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      {glTypes.find(t => String(t.id) === String(selectedGLType)) && <span style={{ padding: '2px 6px', background: COLOR, color: 'white', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{glTypes.find(t => String(t.id) === String(selectedGLType))?.type_code}</span>}
                      {selectedGLSubType  && <><ChevronRight size={9} color="#9ca3af" /><span style={{ padding: '2px 6px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{glSubTypes.find(s => String(s.id) === String(selectedGLSubType))?.sub_type_code}</span></>}
                      {selectedGLCategory && <><ChevronRight size={9} color="#9ca3af" /><span style={{ padding: '2px 6px', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{glCategories.find(c => String(c.id) === String(selectedGLCategory))?.category_code}</span></>}
                      {selectedGLSubCat   && <><ChevronRight size={9} color="#9ca3af" /><span style={{ padding: '2px 6px', background: '#fdf4ff', color: '#9333ea', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{glSubCategories.find(sc => String(sc.id) === String(selectedGLSubCat))?.sub_category_code}</span></>}
                      {selectedGLHead     && <><ChevronRight size={9} color="#9ca3af" /><span style={{ padding: '2px 6px', background: '#ccfbf1', color: '#0f766e', borderRadius: '4px', fontSize: '8px', fontFamily: 'monospace', fontWeight: '800' }}>{glHeads.find(h => String(h.id) === String(selectedGLHead))?.gl_head_code}</span></>}
                    </div>
                  </div>
                )}

                {/* Submit buttons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={handleReset} style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
                    Reset
                  </button>
                  <button onClick={handleCreate} disabled={loading || !canSubmit}
                    style={{ padding: '6px 18px', background: (loading || !canSubmit) ? '#d1d5db' : `linear-gradient(135deg,${COLOR},${COLOR_MED})`, border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {loading ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Save size={11} /> Create GL Account</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════ VIEW TAB ══════════════════════════════════════════════ */}
          {activeTab === 'view' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '150px', maxWidth: '240px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input placeholder="Search GL accounts…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...s1, paddingLeft: '26px' }} />
                </div>
                <select value={filterCompanyId} onChange={e => setFilterCompanyId(e.target.value)} style={{ ...s2, maxWidth: '200px' }}>
                  <option value="">All Companies</option>
                  {companiesWithPlants.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                  {[{ m: 'grid', I: Grid }, { m: 'list', I: List }].map(({ m, I }) => (
                    <button key={m} onClick={() => setViewMode(m)} style={{ padding: '5px 8px', background: viewMode === m ? COLOR : 'white', border: '1px solid #e0e0e0', borderRadius: '4px', cursor: 'pointer', color: viewMode === m ? 'white' : '#374151' }}>
                      <I size={11} />
                    </button>
                  ))}
                </div>
              </div>

              {filteredGLAccounts.length === 0
                ? <div style={{ padding: '50px', textAlign: 'center', color: '#9ca3af' }}>
                    <DollarSign size={40} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                    <p style={{ fontSize: '11px' }}>No GL Accounts found</p>
                  </div>
                : <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(280px,1fr))' : '1fr', gap: '8px' }}>
                    {filteredGLAccounts.map(gl => (
                      <div key={gl.id} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px', cursor: 'default', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 12px rgba(124,58,237,0.15)`; e.currentTarget.style.borderColor = COLOR; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e0e0e0'; }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', color: '#111' }}>{gl.gl_name}</h4>
                            <p style={{ margin: 0, fontSize: '9px', color: '#9ca3af', fontFamily: 'monospace' }}>{gl.gl_code}</p>
                          </div>
                          <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '8px', fontWeight: '600', background: gl.is_active ? '#dcfce7' : '#fee2e2', color: gl.is_active ? '#16a34a' : '#dc2626' }}>
                            {gl.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', fontSize: '8px' }}>
                          <span style={{ padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '10px', fontWeight: '600' }}>🏢 {gl.company.name}</span>
                          {gl.plant ? <span style={{ padding: '2px 6px', background: '#fef3c7', color: '#b45309', borderRadius: '10px', fontWeight: '600' }}>🏭 {gl.plant.name}</span>
                                    : <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#16a34a', borderRadius: '10px', fontWeight: '600' }}>🌍 All Plants</span>}
                          <span style={{ padding: '2px 6px', background: COLOR_SOFT, color: COLOR, borderRadius: '10px', fontWeight: '600' }}>📊 {gl.gl_type.type_name}</span>
                          {gl.gl_category && <span style={{ padding: '2px 6px', background: '#fff7ed', color: '#d97706', borderRadius: '10px', fontWeight: '600' }}>🏷️ {gl.gl_category.category_name}</span>}
                          {gl.gl_head     && <span style={{ padding: '2px 6px', background: '#ccfbf1', color: '#0f766e', borderRadius: '10px', fontWeight: '600' }}>🔖 {gl.gl_head.gl_head_name}</span>}
                          <span style={{ padding: '2px 6px', background: gl.is_postable ? '#dcfce7' : '#fee2e2', color: gl.is_postable ? '#16a34a' : '#dc2626', borderRadius: '10px', fontWeight: '600' }}>
                            {gl.is_postable ? '✅ Postable' : '🚫 Non-Postable'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>

        {/* ── Footer bar ──────────────────────────────────────────────────── */}
        <div style={{ height: '14px', background: `linear-gradient(135deg,${COLOR_MED},${COLOR})`, flexShrink: 0 }} />
      </div>

      {/* ══════════════ IMPORT SELECTOR MODAL ══════════════════════════════ */}
      {showImportSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', width: '620px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '10px 14px', background: `linear-gradient(135deg,${COLOR},${COLOR_MED})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>📥 Import GL Accounts — Pre-select Hierarchy</span>
              <button onClick={() => setShowImportSelector(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XCircle size={16} /></button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>

              {/* Company */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>Company <span style={{ color: '#dc2626' }}>*</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                {companiesWithPlants.map(c => (
                  <button key={c.company_id} onClick={() => setImpCompanyId(p => p === String(c.company_id) ? '' : String(c.company_id))} style={pillBtn(impCompanyId === String(c.company_id))}>
                    {c.company_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({c.company_code})</span>
                  </button>
                ))}
              </div>

              {/* GL Type */}
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>GL Type <span style={{ color: '#9ca3af', fontWeight: '400' }}>(optional pre-select)</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                {glTypes.map(t => (
                  <button key={t.id} onClick={() => { setImpTypeId(p => p === String(t.id) ? '' : String(t.id)); setImpSubTypeId(''); setImpCategoryId(''); setImpSubCatId(''); setImpHeadId(''); }} style={pillBtn(impTypeId === String(t.id))}>
                    {t.type_name} <span style={{ fontSize: '8px', opacity: 0.75 }}>({t.type_code})</span>
                  </button>
                ))}
              </div>

              {/* GL Sub-Type */}
              {impTypeId && impFilteredSubTypes.length > 0 && (
                <>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>GL Sub-Type</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                    {impFilteredSubTypes.map(s => (
                      <button key={s.id} onClick={() => setImpSubTypeId(p => p === String(s.id) ? '' : String(s.id))} style={pillBtn(impSubTypeId === String(s.id), '#16a34a')}>
                        {s.sub_type_name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* GL Category */}
              {impTypeId && impFilteredCats.length > 0 && (
                <>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>GL Category</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                    {impFilteredCats.map(c => (
                      <button key={c.id} onClick={() => { setImpCategoryId(p => p === String(c.id) ? '' : String(c.id)); setImpSubCatId(''); setImpHeadId(''); }} style={pillBtn(impCategoryId === String(c.id), '#d97706')}>
                        {c.category_name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* GL Sub-Category */}
              {impCategoryId && impFilteredSubCats.length > 0 && (
                <>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>GL Sub-Category</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                    {impFilteredSubCats.map(sc => (
                      <button key={sc.id} onClick={() => { setImpSubCatId(p => p === String(sc.id) ? '' : String(sc.id)); setImpHeadId(''); }} style={pillBtn(impSubCatId === String(sc.id), '#9333ea')}>
                        {sc.sub_category_name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* GL Head */}
              {impFilteredHeads.length > 0 && (
                <>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#374151', margin: '0 0 6px' }}>GL Head</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                    {impFilteredHeads.map(h => (
                      <button key={h.id} onClick={() => setImpHeadId(p => p === String(h.id) ? '' : String(h.id))} style={pillBtn(impHeadId === String(h.id), '#0f766e')}>
                        {h.gl_head_name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Summary */}
              <div style={{ padding: '8px 10px', background: COLOR_SOFT, border: `1px solid ${COLOR_MED}`, borderRadius: '5px', fontSize: '9px', color: COLOR, marginBottom: '14px' }}>
                {impCompany  ? <span>✓ <strong>{impCompany.company_name}</strong> </span>  : <span style={{ color: '#dc2626' }}>⚠ No Company selected · </span>}
                {impType     ? <span>→ <strong>{impType.type_name}</strong> </span>          : <span style={{ color: '#9ca3af' }}>No GL Type · </span>}
                {impCat      ? <span>→ <strong>{impCat.category_name}</strong> </span>       : <span style={{ color: '#9ca3af' }}>No Category · </span>}
                {impSubCat   ? <span>→ <strong>{impSubCat.sub_category_name}</strong> </span>: <span style={{ color: '#9ca3af' }}>No Sub-Category · </span>}
                {impHead     ? <span>→ <strong>{impHead.gl_head_name}</strong></span>        : <span style={{ color: '#9ca3af' }}>No GL Head</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setShowImportSelector(false)} style={{ padding: '5px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>Cancel</button>
                <button
                  disabled={!impCompanyId}
                  onClick={() => { setShowImportSelector(false); setShowImportPopup(true); }}
                  style={{ padding: '5px 16px', background: impCompanyId ? `linear-gradient(135deg,${COLOR},${COLOR_MED})` : '#d1d5db', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: impCompanyId ? 'pointer' : 'not-allowed', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Upload size={10} /> Continue to Import →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ EXCEL IMPORT POPUP ═════════════════════════════════ */}
      <ExcelImportPopup
        isOpen={showImportPopup}
        onClose={() => { setShowImportPopup(false); }}
        onSuccess={(results) => {
          const cnt = results.filter(r => r.status === 'success').length;
          if (cnt > 0) { setMessage({ type: 'success', text: `✅ ${cnt} GL Account(s) imported!` }); fetchGLAccounts(); }
        }}
        title={impHead    ? `Import GL Accounts — ${impHead.gl_head_name}`
             : impSubCat  ? `Import GL Accounts — ${impSubCat.sub_category_name}`
             : impCat     ? `Import GL Accounts — ${impCat.category_name}`
             : impType    ? `Import GL Accounts — ${impType.type_name}`
             : 'Import GL Accounts from Excel'}
        accentColor={COLOR}
        apiEndpoint={`${API_BASE}/gl-accounts`}
        apiMethod="POST"
        fields={[
          { key: 'gl_code',       label: 'GL Code',       required: true  },
          { key: 'gl_name',       label: 'GL Name',       required: true  },
          { key: 'currency_code', label: 'Currency Code', required: false },
          { key: 'remarks',       label: 'Remarks',       required: false },
        ]}
        templateDropdownFields={importTemplateDropdowns}
        lookupFields={importLookupFields}
        extraFormData={importExtraData}
        importNote={`Company: ${impCompany?.company_name || 'must be in sheet'}. GL hierarchy fields auto-resolve by name. GL Code must be unique per company.`}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
