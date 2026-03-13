/**
 * ItemCodeCreationReq.js
 * ─────────────────────────────────────────────────────────────────
 * Page: Item Code Creation Request  (itemmaster folder)
 * ─────────────────────────────────────────────────────────────────
 * Features
 *  • RBAC: loads companies & plants from user's access
 *  • Full CRUD (Create / Read / Update / Soft-delete / Hard-delete)
 *  • Photo upload  → stores URL only (no binary in DB)
 *  • LOV modals with search + pagination (same style as existing pages)
 *  • Matches existing UI style exactly (gradient headers, 11px font …)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, X, Upload, Plus, Edit2, Trash2, Eye,
  RefreshCw, FileSpreadsheet, Save, ChevronDown,
  AlertCircle, CheckCircle, ZoomIn
} from 'lucide-react';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

// ─── helpers ──────────────────────────────────────────────────────────────
const getSession = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    return d?.user || null;
  } catch { return null; }
};

// Extract user's primary department name from session
const getUserDepartment = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const user = d?.user;
    if (!user) return '';
    const primaryAccess = user.accesses?.find(a => a.is_primary_company) || user.accesses?.[0];
    return primaryAccess?.department?.name || primaryAccess?.department?.department_name || '';
  } catch { return ''; }
};

// Extract user's primary company from session
const getPrimaryCompany = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const user = d?.user;
    if (!user) return null;
    const primaryAccess = user.accesses?.find(a => a.is_primary_company) || user.accesses?.[0];
    if (!primaryAccess) return null;
    return {
      company_id:   primaryAccess.company?.id   || primaryAccess.company_id,
      company_name: primaryAccess.company?.company_name || primaryAccess.company_name || '',
      company_code: primaryAccess.company?.company_code || primaryAccess.company_code || '',
    };
  } catch { return null; }
};

// ─── LOV Modal (reused pattern from existing pages) ───────────────────────
const LOVModal = ({ title, items, onSelect, onClose, loading = false }) => {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const PER_PAGE = 6;

  const filtered = items.filter(i =>
    (i.code + ' ' + i.name).toLowerCase().includes(search.toLowerCase())
  );
  const total   = Math.ceil(filtered.length / PER_PAGE);
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 500, maxWidth: '92vw', height: 320, background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
          <span>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
        </div>
        {/* search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#000' }}>Search</span>
          <input autoFocus value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#333' }} />
        </div>
        {/* table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>Loading…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Code</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#000' }}>Name</th>
              </tr></thead>
              <tbody>
                {visible.length ? visible.map((item, i) => (
                  <tr key={item.code} onClick={() => onSelect(item)}
                    style={{ cursor: 'pointer', background: i % 2 ? '#f9fafb' : '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#f9fafb' : '#fff'}>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.code}</td>
                    <td style={{ padding: '6px 10px', fontSize: 10, color: '#333' }}>{item.name}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={2} style={{ padding: 30, textAlign: 'center', fontSize: 10, color: '#999' }}>No results</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {/* pagination */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '4px 12px', fontSize: 10, background: page === 1 ? '#e5e7eb' : '#3b82f6', color: page === 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
          <span style={{ fontSize: 10, color: '#000' }}>Page {page} of {total || 1}</span>
          <button onClick={() => setPage(p => Math.min(total || 1, p + 1))} disabled={page >= total}
            style={{ padding: '4px 12px', fontSize: 10, background: page >= total ? '#e5e7eb' : '#3b82f6', color: page >= total ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: page >= total ? 'not-allowed' : 'pointer' }}>Next</button>
        </div>
        <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8 }} />
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = type === 'success' ? '#10b981' : '#ef4444';
  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, background: bg, color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}>
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const ItemCodeCreationReq = () => {
  const user = getSession();

  // ── view state ────────────────────────────────────────────────────────────
  const [view, setView] = useState('list');   // 'list' | 'form'
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);

  // ── list state ────────────────────────────────────────────────────────────
  const [records, setRecords]   = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');

  // ── form state ────────────────────────────────────────────────────────────
  const userDepartment = getUserDepartment();

  const emptyForm = {
    item_name: '', item_description: '', item_short_name: '',
    item_type: '', department: userDepartment, required_date: '', business_reason: '',
    company_id: null, company_label: '',
    plant_id: null,   plant_label: '',
    ref_image_url: '', vendor_quot_url: '', sample_photo_url: '', product_link: ''
  };
  const [form, setForm]         = useState({ ...emptyForm });
  const [saving, setSaving]     = useState(false);

  // ── companies/plants from user access ────────────────────────────────────
  const [companyOptions, setCompanyOptions] = useState([]);   // [{id, company_name, company_code, plants:[…]}]
  const [plantOptions, setPlantOptions]     = useState([]);   // plants of selected company
  const [optionsLoading, setOptionsLoading] = useState(false);

  // ── dept-access grants (from UserDeptDataAccess) ──────────────────────────
  const [deptAccessData, setDeptAccessData] = useState([]);
  const [deptOptions, setDeptOptions]       = useState([]);
  const [deptAccessLoading, setDeptAccessLoading] = useState(true);
  const hasDeptAccess = deptAccessData.length > 0;
  const primaryCompany = getPrimaryCompany();

  // ── LOV modals ────────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null);   // 'company' | 'plant' | 'itemType' | 'department'

  // ── image zoom modal ──────────────────────────────────────────────────────
  const [zoomModal, setZoomModal] = useState(null);   // { url, label } | null
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const openZoom = (url, label) => { setZoomModal({ url, label }); setImageZoom(1); setImagePosition({ x: 0, y: 0 }); };
  const closeZoom = () => { setZoomModal(null); setImageZoom(1); setImagePosition({ x: 0, y: 0 }); };
  const handleZoomDelta = (delta) => setImageZoom(prev => Math.max(1, Math.min(5, prev + delta)));
  const handleZoomMouseDown = (e) => { if (imageZoom > 1) { e.preventDefault(); setIsDraggingImg(true); setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y }); } };
  const handleZoomMouseMove = (e) => { if (isDraggingImg && imageZoom > 1) { e.preventDefault(); setImagePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); } };
  const handleZoomMouseUp = () => setIsDraggingImg(false);

  // static LOVs (can be replaced with API calls later)
  const itemTypeList = [
    { code: 'RM',  name: 'Raw Material' },
    { code: 'FG',  name: 'Finished Goods' },
    { code: 'SFG', name: 'Semi-Finished Goods' },
    { code: 'PKG', name: 'Packaging Material' },
    { code: 'CON', name: 'Consumable' },
    { code: 'CAP', name: 'Capital Goods' },
    { code: 'SVC', name: 'Service' },
    { code: 'TRD', name: 'Trading Goods' },
  ];

  const deptList = [
    { code: 'PRD', name: 'Production' },
    { code: 'PUR', name: 'Purchase' },
    { code: 'SLS', name: 'Sales' },
    { code: 'FIN', name: 'Finance' },
    { code: 'STR', name: 'Stores / Warehouse' },
    { code: 'QC',  name: 'Quality Control' },
    { code: 'MNT', name: 'Maintenance' },
    { code: 'HR',  name: 'Human Resources' },
    { code: 'IT',  name: 'Information Technology' },
    { code: 'ADM', name: 'Administration' },
  ];

  // ── load list ────────────────────────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    setListLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/item-creation-req/?limit=200`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); }
    setListLoading(false);
  }, []);

  // ── load company+plant options for the logged-in user ────────────────────
  const loadCompanyOptions = useCallback(async () => {
    if (!user?.id) return;
    setOptionsLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/item-creation-req/user/${user.id}/companies-plants`);
      const data = await res.json();
      setCompanyOptions(Array.isArray(data) ? data : []);
    } catch { setCompanyOptions([]); }
    setOptionsLoading(false);
  }, [user?.id]);

  // ── load dept-access grants ──────────────────────────────────────────────
  const loadDeptAccess = useCallback(async () => {
    if (!user?.id) { setDeptAccessLoading(false); return; }
    setDeptAccessLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/item-creation-req/user/${user.id}/dept-access`);
      const data = await res.json();
      setDeptAccessData(Array.isArray(data) ? data : []);
    } catch { setDeptAccessData([]); }
    setDeptAccessLoading(false);
  }, [user?.id]);

  useEffect(() => { loadRecords(); loadCompanyOptions(); loadDeptAccess(); }, [loadRecords, loadCompanyOptions, loadDeptAccess]);

  // Auto-pre-fill company when no dept access (companyOptions has only primary company)
  useEffect(() => {
    if (deptAccessLoading || optionsLoading || hasDeptAccess) return;
    if (companyOptions.length === 0) return;
    const co = companyOptions[0];
    setForm(f => {
      if (f.company_id) return f;  // already set (edit mode)
      const newForm = { ...f, company_id: co.id, company_label: co.company_name };
      if (!f.plant_id && co.plants?.length === 1) {
        newForm.plant_id    = co.plants[0].id;
        newForm.plant_label = co.plants[0].plant_name;
      }
      return newForm;
    });
    setPlantOptions(co.plants || []);
  }, [deptAccessLoading, optionsLoading, hasDeptAccess, companyOptions]);

  // ── when company changes → update plant list ──────────────────────────────
  useEffect(() => {
    if (form.company_id) {
      const co = companyOptions.find(c => c.id === form.company_id);
      setPlantOptions(co ? co.plants : []);
    } else {
      setPlantOptions([]);
    }
  }, [form.company_id, companyOptions]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const openCreate = () => { setForm({ ...emptyForm }); setEditId(null); setView('form'); };

  const openEdit = (rec) => {
    setForm({
      item_name:         rec.item_name || '',
      item_description:  rec.item_description || '',
      item_short_name:   rec.item_short_name || '',
      item_type:         rec.item_type || '',
      department:        rec.department || '',
      required_date:     rec.required_date || '',
      business_reason:   rec.business_reason || '',
      company_id:        rec.company_id || null,
      company_label:     rec.company?.company_name || '',
      plant_id:          rec.plant_id || null,
      plant_label:       rec.plant?.plant_name || '',
      ref_image_url:     rec.optional_documents?.reference_image_url || '',
      vendor_quot_url:   rec.optional_documents?.vendor_quotation_url || '',
      sample_photo_url:  rec.optional_documents?.sample_photo_url || '',
      product_link:      rec.optional_documents?.product_link || '',
    });
    setEditId(rec.id);
    setView('form');
  };

  // ── save (create / update) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.company_id)          { showToast('Company is required', 'error'); return; }
    if (!form.item_name.trim())    { showToast('Item Name is required', 'error'); return; }
    if (!form.item_short_name.trim()) { showToast('Item Short Name is required', 'error'); return; }
    if (!form.item_type)           { showToast('Item Type is required', 'error'); return; }
    if (!form.department)          { showToast('Department is required', 'error'); return; }
    if (!form.required_date)       { showToast('Required Date is required', 'error'); return; }
    if (!form.item_description.trim()) { showToast('Item Description is required', 'error'); return; }
    if (!form.business_reason.trim())  { showToast('Business Reason is required', 'error'); return; }

    setSaving(true);
    try {
      const body = {
        item_name:        form.item_name.trim(),
        item_description: form.item_description || null,
        item_short_name:  form.item_short_name  || null,
        item_type:        form.item_type        || null,
        department:       form.department       || null,
        required_date:    form.required_date    || null,
        business_reason:  form.business_reason  || null,
        company_id:       form.company_id       || null,
        plant_id:         form.plant_id         || null,
        created_by:       user?.id              || null,
        optional_documents: {
          reference_image_url:  form.ref_image_url    || null,
          vendor_quotation_url: form.vendor_quot_url  || null,
          sample_photo_url:     form.sample_photo_url || null,
          product_link:         form.product_link     || null,
        }
      };

      const url    = editId ? `${API_BASE}/item-creation-req/${editId}` : `${API_BASE}/item-creation-req/`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }

      showToast(editId ? 'Request updated!' : 'Request created!');
      setView('list');
      loadRecords();
    } catch (e) {
      showToast(e.message, 'error');
    }
    setSaving(false);
  };

  // ── soft delete ───────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this request?')) return;
    try {
      await fetch(`${API_BASE}/item-creation-req/${id}`, { method: 'DELETE' });
      showToast('Request deactivated');
      loadRecords();
    } catch { showToast('Delete failed', 'error'); }
  };

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = records.filter(r =>
    !searchTerm ||
    [r.item_name, r.item_type, r.department, r.company?.company_name, r.plant?.plant_name]
      .some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER – LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderList = () => (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Item Code Creation Request 📋</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button title="Refresh" onClick={loadRecords} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}><RefreshCw size={13} /></button>
          <button title="Export" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}><FileSpreadsheet size={13} /></button>
          <button onClick={openCreate} style={{ padding: '2px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> New Request
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search item name, type, department, company…"
            style={{ width: '100%', padding: '5px 28px 5px 8px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, outline: 'none', color: '#374151' }} />
          {searchTerm
            ? <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} color="#9ca3af" /></button>
            : <Search size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          }
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {listLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>⏳</div>
            <div style={{ fontSize: 11, color: '#666' }}>Loading requests…</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'Item Name', 'Short Name', 'Item Type', 'Department', 'Company', 'Plant', 'Req. Date', 'Ref. Image', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, color: '#374151', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 11 }}>No records found.</td></tr>
              ) : filtered.map((rec, idx) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', fontWeight: 500, color: '#111827' }}>{rec.item_name}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', color: '#374151' }}>{rec.item_short_name || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.item_type || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.department || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.company?.company_name || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>{rec.plant?.plant_name || '—'}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{rec.required_date || '—'}</td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #f3f4f6' }}>
                    {rec.optional_documents?.reference_image_url ? (
                      <div style={{ position: 'relative', width: 36, height: 36 }}>
                        <img
                          src={rec.optional_documents.reference_image_url}
                          alt="Ref"
                          onError={e => { e.target.style.display = 'none'; }}
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 3, border: '1px solid #d1d5db', display: 'block', cursor: 'pointer' }}
                          onClick={() => openZoom(rec.optional_documents.reference_image_url, rec.item_name)}
                        />
                        <button onClick={() => openZoom(rec.optional_documents.reference_image_url, rec.item_name)}
                          style={{ position: 'absolute', bottom: 1, right: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <ZoomIn size={9} />
                        </button>
                      </div>
                    ) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f3f4f6' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: rec.is_active ? '#d1fae5' : '#fee2e2', color: rec.is_active ? '#065f46' : '#991b1b' }}>
                      {rec.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Edit" onClick={() => openEdit(rec)}
                        style={{ padding: '3px 6px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Edit2 size={11} />
                      </button>
                      <button title="Deactivate" onClick={() => handleDelete(rec.id)}
                        style={{ padding: '3px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER – FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════

  // ── title-case formatter: single spaces, each word capitalised ──────────
  const toTitleInput = (val) => {
    // Replace multiple spaces with single space, then capitalise each word
    return val
      .replace(/ {2,}/g, ' ')
      .replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase());
  };

  // ── small field helpers ────────────────────────────────────────────────
  const inp  = (label, key, opts = {}) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 11, color: '#000', minWidth: 130 }}>{label}{opts.required && <span style={{ color: '#dc2626' }}> *</span>}</label>
      <input
        type={opts.type || 'text'}
        value={form[key]}
        onChange={e => {
          const val = opts.type === 'date' ? e.target.value : toTitleInput(e.target.value);
          setForm(f => ({ ...f, [key]: val }));
        }}
        placeholder={opts.placeholder || ''}
        style={{ flex: 1, padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000' }}
      />
    </div>
  );

  const textarea = (label, key) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <label style={{ fontSize: 11, color: '#000', minWidth: 130, paddingTop: 4 }}>{label}</label>
      <textarea
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: toTitleInput(e.target.value) }))}
        rows={3}
        style={{ flex: 1, padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000', resize: 'vertical' }}
      />
    </div>
  );

  const lovField = (label, displayKey, modalKey, required = false) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 11, color: '#000', minWidth: 130 }}>{label}{required && <span style={{ color: '#dc2626' }}> *</span>}</label>
      <div style={{ position: 'relative', flex: 1 }}>
        <input readOnly value={form[displayKey]} placeholder={`Select ${label}`}
          onClick={() => setModal(modalKey)}
          style={{ width: '100%', padding: '4px 45px 4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, cursor: 'pointer', color: '#000' }} />
        {form[displayKey] && (
          <button onClick={() => {
            const clearMap = {
              company_label: { company_id: null, company_label: '' },
              plant_label:   { plant_id: null,   plant_label: '' },
              item_type:     { item_type: '' },
              department:    { department: '' },
            };
            setForm(f => ({ ...f, ...(clearMap[displayKey] || { [displayKey]: '' }) }));
          }}
            style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={12} color="#ef4444" />
          </button>
        )}
        <button onClick={() => setModal(modalKey)}
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Search size={13} color="#999" />
        </button>
      </div>
    </div>
  );

  // ── image upload helper ──────────────────────────────────────────────────
  const handleImageUpload = (fieldKey, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setForm(f => ({ ...f, [fieldKey]: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const imageUploadField = (label, urlKey) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: '#000', fontWeight: 500 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* thumbnail — fixed space reserved always, shows image or empty box */}
        <div style={{ width: 44, height: 44, flexShrink: 0, border: '1px solid #d1d5db', borderRadius: 4, background: '#f9fafb', overflow: 'hidden', position: 'relative', cursor: form[urlKey] ? 'pointer' : 'default' }}
          onClick={() => { if (form[urlKey]) openZoom(form[urlKey], label); }}>
          {form[urlKey] ? (
            <>
              <img src={form[urlKey]} alt={label}
                onError={e => { e.target.style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button onClick={e => { e.stopPropagation(); openZoom(form[urlKey], label); }}
                style={{ position: 'absolute', bottom: 1, right: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <ZoomIn size={9} />
              </button>
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} color="#d1d5db" />
            </div>
          )}
        </div>
        {/* url input */}
        <input
          value={form[urlKey]}
          onChange={e => setForm(f => ({ ...f, [urlKey]: e.target.value }))}
          placeholder="https://… or upload a file"
          style={{ flex: 1, padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000' }}
        />
        {/* upload button */}
        <label style={{ cursor: 'pointer', padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: 3, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}>
          <Upload size={11} /> Upload
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { e.stopPropagation(); if (e.target.files[0]) handleImageUpload(urlKey, e.target.files[0]); }} />
        </label>
        {/* remove button — only when image present */}
        {form[urlKey] && (
          <button onClick={() => setForm(f => ({ ...f, [urlKey]: '' }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, flexShrink: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );

  // ── zoom image modal ──────────────────────────────────────────────────────
  const renderZoomModal = () => {
    if (!zoomModal) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99998 }}
        onClick={closeZoom}>
        <div style={{ width: 700, maxWidth: '90vw', height: 550, maxHeight: '85vh', background: '#fff', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}>
          {/* header */}
          <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, flexShrink: 0 }}>
            <span>{zoomModal.label} — Zoom: {imageZoom.toFixed(1)}x</span>
            <button onClick={closeZoom} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
          </div>
          {/* controls */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f9fafb', flexShrink: 0 }}>
            <button onClick={() => handleZoomDelta(-0.5)} disabled={imageZoom <= 1}
              style={{ padding: '4px 12px', fontSize: 10, background: imageZoom <= 1 ? '#e5e7eb' : '#3b82f6', color: imageZoom <= 1 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: imageZoom <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              Zoom Out (-)
            </button>
            <button onClick={() => { setImageZoom(1); setImagePosition({ x: 0, y: 0 }); }}
              style={{ padding: '4px 12px', fontSize: 10, background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
              Reset (1x)
            </button>
            <button onClick={() => handleZoomDelta(0.5)} disabled={imageZoom >= 5}
              style={{ padding: '4px 12px', fontSize: 10, background: imageZoom >= 5 ? '#e5e7eb' : '#3b82f6', color: imageZoom >= 5 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 4, cursor: imageZoom >= 5 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              Zoom In (+)
            </button>
            <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>💡 Scroll to zoom, drag to pan</span>
          </div>
          {/* image area */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1f2937', position: 'relative', cursor: imageZoom > 1 ? (isDraggingImg ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
            onMouseDown={handleZoomMouseDown}
            onMouseMove={handleZoomMouseMove}
            onMouseUp={handleZoomMouseUp}
            onMouseLeave={handleZoomMouseUp}
            onWheel={e => { e.preventDefault(); handleZoomDelta(e.deltaY > 0 ? -0.25 : 0.25); }}>
            <img src={zoomModal.url} alt={zoomModal.label}
              style={{ transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`, transition: isDraggingImg ? 'none' : 'transform 0.15s ease-out', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', willChange: 'transform' }}
              draggable={false} />
          </div>
          <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
          {editId ? '✏️ Edit Item Code Creation Request' : '➕ New Item Code Creation Request'}
        </h2>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={15} /></button>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>

        {/* ── Section 1: Company / Plant (FIRST) ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 10 }}>
            🏢 Company & Plant (Based on Your Access)
          </div>
          {optionsLoading ? (
            <div style={{ fontSize: 11, color: '#6b7280', padding: 8 }}>Loading your company access…</div>
          ) : companyOptions.length === 0 ? (
            <div style={{ fontSize: 11, color: '#dc2626', padding: 8 }}>⚠️ No company access found. Contact administrator.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
              {/* Company — readonly if no dept access (auto-filled), LOV if has access */}
              {hasDeptAccess ? lovField('Company', 'company_label', 'company', true) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: '#000', minWidth: 130 }}>Company <span style={{ color: '#dc2626' }}>*</span></label>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      readOnly
                      value={form.company_label}
                      placeholder="Loading company…"
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000', background: form.company_label ? '#f0fdf4' : '#f9fafb', cursor: 'default' }}
                    />
                    {form.company_label && (
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#16a34a', fontWeight: 600 }}>AUTO</span>
                    )}
                  </div>
                </div>
              )}
              {/* Plant – disabled until company is selected */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 11, color: form.company_id ? '#000' : '#9ca3af', minWidth: 130 }}>Plant <span style={{ color: '#6b7280', fontSize: 10 }}>(Optional)</span></label>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input readOnly value={form.plant_label} placeholder={form.company_id ? 'Select Plant' : 'Select Company first'}
                    onClick={() => { if (form.company_id) setModal('plant'); }}
                    style={{ width: '100%', padding: '4px 45px 4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, cursor: form.company_id ? 'pointer' : 'not-allowed', color: form.company_id ? '#000' : '#9ca3af', background: form.company_id ? '#fff' : '#f3f4f6' }} />
                  {form.plant_label && form.company_id && (
                    <button onClick={() => setForm(f => ({ ...f, plant_id: null, plant_label: '' }))}
                      style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <X size={12} color='#ef4444' />
                    </button>
                  )}
                  <Search size={13} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: form.company_id ? '#999' : '#d1d5db' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Basic Info ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 10 }}>
            📝 Basic Item Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
            {inp('Item Name', 'item_name', { required: true })}
            {inp('Item Short Name', 'item_short_name', { required: true })}
            {lovField('Item Type', 'item_type', 'itemType', true)}
            {/* Department — LOV if hasDeptAccess, else auto-filled readonly */}
            {hasDeptAccess ? lovField('Department', 'department', 'department', true) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 11, color: '#000', minWidth: 130 }}>Department <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input readOnly value={form.department} placeholder="Department (auto from profile)"
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', fontSize: 11, borderRadius: 2, color: '#000', background: form.department ? '#f0fdf4' : '#f9fafb', cursor: 'default' }} />
                  {form.department && <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#16a34a', fontWeight: 600 }}>AUTO</span>}
                </div>
              </div>
            )}
            {inp('Required Date', 'required_date', { type: 'date', required: true })}
          </div>
          <div style={{ marginTop: 8 }}>
            {textarea('Item Description *', 'item_description')}
          </div>
          <div style={{ marginTop: 8 }}>
            {textarea('Business Reason *', 'business_reason')}
          </div>
        </div>

        {/* ── Section 3: Optional Documents / Images ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: 4, marginBottom: 10 }}>
            📎 Optional Documents & Images (URL or Upload – only URL stored in DB)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
            {imageUploadField('Reference Image', 'ref_image_url')}
            {imageUploadField('Sample Photo', 'sample_photo_url')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginTop: 8 }}>
            {inp('Vendor Quotation URL', 'vendor_quot_url', { placeholder: 'https://…' })}
            {inp('Product Link', 'product_link',            { placeholder: 'https://…' })}
          </div>
        </div>

      </div>

      {/* Actions */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0, background: '#f9fafb' }}>
        <button onClick={() => setView('list')}
          style={{ padding: '5px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '5px 20px', background: saving ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={13} />
          {saving ? 'Saving…' : editId ? 'Update Request' : 'Save Request'}
        </button>
      </div>

      {/* Footer */}
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 8, flexShrink: 0 }} />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  MODALS
  // ══════════════════════════════════════════════════════════════════════════
  const renderModal = () => {
    if (!modal) return null;

    if (modal === 'company') {
      // Only reached when hasDeptAccess — show granted companies
      const source = deptAccessData.map(c => ({ ...c, id: c.company_id }));
      const items  = source.map(c => ({ code: c.company_code || String(c.company_id), name: c.company_name }));
      return (
        <LOVModal title="SELECT COMPANY" items={items}
          onSelect={item => {
            const co = source.find(c => c.company_name === item.name);
            setForm(f => ({ ...f, company_id: co?.id || null, company_label: item.name, plant_id: null, plant_label: '', department: '', department_id: null }));
            setModal(null);
          }}
          onClose={() => setModal(null)} />
      );
    }

    if (modal === 'plant') {
      if (!form.company_id) {
        showToast('Please select a Company first', 'error');
        setModal(null);
        return null;
      }
      const items = plantOptions.map(p => ({ code: p.plant_code || String(p.id), name: p.plant_name }));
      return (
        <LOVModal title="SELECT PLANT" items={items}
          onSelect={item => {
            const pl = plantOptions.find(p => p.plant_name === item.name || p.plant_code === item.code);
            setForm(f => ({ ...f, plant_id: pl?.id || null, plant_label: item.name }));
            setModal(null);
          }}
          onClose={() => setModal(null)} />
      );
    }

    if (modal === 'itemType') {
      return (
        <LOVModal title="SELECT ITEM TYPE" items={itemTypeList}
          onSelect={item => { setForm(f => ({ ...f, item_type: item.name })); setModal(null); }}
          onClose={() => setModal(null)} />
      );
    }

    if (modal === 'department') {
      const deptsForModal = hasDeptAccess
        ? deptOptions.map(d => ({ code: String(d.id), name: d.department_name }))
        : deptList;
      return (
        <LOVModal title="SELECT DEPARTMENT" items={deptsForModal}
          onSelect={item => {
            const deptId = hasDeptAccess ? (deptOptions.find(d => d.department_name === item.name)?.id || null) : null;
            setForm(f => ({ ...f, department: item.name, department_id: deptId }));
            setModal(null);
          }}
          onClose={() => setModal(null)} />
      );
    }

    return null;
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  ROOT RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {view === 'list' ? renderList() : renderForm()}
      {renderModal()}
      {renderZoomModal()}
    </div>
  );
};

export default ItemCodeCreationReq;
