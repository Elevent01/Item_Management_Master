/**
 * WorkflowAdmin.js  –  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────
 * Admin configures Workflow Templates → Steps → Approvers
 * Full CRUD for all three levels in one page.
 * Matches existing ItemMaster UI style exactly.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { adminworkflowlinks } from '../config/adminworkflowlinks.js';
import { getAccessiblePages } from '../utils/rbacCache';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  Save, X, RefreshCw, CheckCircle, AlertCircle,
  Settings, List, UserCheck, ArrowRight
} from 'lucide-react';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

const getSession = () => {
  try { const d = JSON.parse(sessionStorage.getItem('userData') || '{}'); return d?.user || null; }
  catch { return null; }
};

const APPROVAL_TYPES = ['ANY', 'ALL'];

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  const bg = toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#d97706';
  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: bg, color: '#fff', padding: '10px 20px', borderRadius: 6, zIndex: 99999, fontSize: 12, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>
      {toast.type === 'success' ? <CheckCircle size={13} style={{ marginRight: 6 }} /> : <AlertCircle size={13} style={{ marginRight: 6 }} />}
      {toast.msg}
    </div>
  );
};

export default function WorkflowAdmin() {

  const [templates, setTemplates]   = useState([]);
  const [roles, setRoles]           = useState([]);
  const [departments, setDepts]     = useState([]);
  const [designations, setDesgs]    = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [expanded, setExpanded]     = useState({});    // template id → bool
  const [toast, setToast]           = useState(null);
  const [loading, setLoading]       = useState(false);

  // ── Session (same pattern as UserDeptAccessPage) ───────────────────────────
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sessionReady, setSessionReady]   = useState(false);

  // page selection
  const [selectedPage, setSelectedPage] = useState(null);  // { name, path } from adminworkflowlinks
  const [accessiblePaths, setAccessiblePaths] = useState(null);  // null = loading, Set = ready

  // modals
  const [tmplModal, setTmplModal]   = useState(null);  // null | 'create' | {id, ...}
  const [stepModal, setStepModal]   = useState(null);  // null | {template_id} | {step}
  const [aprModal, setAprModal]     = useState(null);  // null | {step_id}

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Read session once on mount ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('userData');
      if (storedData) {
        const userData = JSON.parse(storedData);
        if (userData?.user?.id) setCurrentUserId(userData.user.id);
      }
    } catch (e) { console.error('Session error:', e); }
    setSessionReady(true);
  }, []);

  // ── Load data (only after session is ready) ────────────────────────────────
  const loadAll = useCallback(async (userId) => {
    setLoading(true);
    try {
      const compUrl = userId
        ? `${API_BASE}/user-dept-access/companies?current_user_id=${userId}`
        : `${API_BASE}/user-dept-access/companies`;

      const [tRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/workflow/templates/`),
        fetch(compUrl),
      ]);
      const [tData, cData] = await Promise.all([tRes.json(), cRes.json()]);
      setTemplates(Array.isArray(tData) ? tData : []);

      // cData = [{ id, company_name, company_code, user_count }]
      const compList = Array.isArray(cData) ? cData : [];
      setCompanies(compList);

      // Load roles/depts/desgs from user's companies via rbac-options
      if (compList.length > 0) {
        const rbacResults = await Promise.all(
          compList.map(c => fetch(`${API_BASE}/companies/${c.id}/rbac-options`).then(r => r.json()).catch(() => null))
        );
        const rolesMap = {}, deptsMap = {}, desgsMap = {};
        rbacResults.forEach(res => {
          if (!res) return;
          (res.roles        || []).forEach(r => { rolesMap[r.id] = r; });
          (res.departments  || []).forEach(d => { deptsMap[d.id] = d; });
          (res.designations || []).forEach(d => { desgsMap[d.id] = d; });
        });
        setRoles(Object.values(rolesMap));
        setDepts(Object.values(deptsMap));
        setDesgs(Object.values(desgsMap));
      }
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, []);

  // Wait for sessionReady before firing loadAll — same guard as UserDeptAccessPage
  useEffect(() => {
    if (!sessionReady) return;
    reloadAll();
  }, [sessionReady, currentUserId, loadAll]);

  // ── Load user's accessible pages from RBAC ─────────────────────────────
  useEffect(() => {
    getAccessiblePages()
      .then(pages => {
        const paths = new Set(pages.map(p => p.page_url?.split('/').pop()).filter(Boolean));
        setAccessiblePaths(paths);
      })
      .catch(() => setAccessiblePaths(new Set()));
  }, []);

  // ── Template CRUD ──────────────────────────────────────────────────────────
  const saveTemplate = async (data) => {
    const isEdit = !!data.id;
    const url    = isEdit ? `${API_BASE}/workflow/templates/${data.id}` : `${API_BASE}/workflow/templates/`;
    const method = isEdit ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
    return res.json();
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Deactivate this template?')) return;
    await fetch(`${API_BASE}/workflow/templates/${id}`, { method: 'DELETE' });
    showToast('Template deactivated');
    reloadAll();
  };

  // ── Step CRUD ──────────────────────────────────────────────────────────────
  const saveStep = async (data) => {
    const isEdit = !!data.id;
    const url    = isEdit ? `${API_BASE}/workflow/steps/${data.id}` : `${API_BASE}/workflow/templates/${data.template_id}/steps/`;
    const method = isEdit ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
    return res.json();
  };

  const deleteStep = async (id) => {
    if (!window.confirm('Delete this step?')) return;
    await fetch(`${API_BASE}/workflow/steps/${id}`, { method: 'DELETE' });
    showToast('Step deleted');
    reloadAll();
  };

  // ── Approver CRUD ──────────────────────────────────────────────────────────
  const saveApprover = async (data) => {
    const res = await fetch(`${API_BASE}/workflow/steps/${data.step_id}/approvers/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
    return res.json();
  };

  const deleteApprover = async (id) => {
    if (!window.confirm('Remove this approver?')) return;
    await fetch(`${API_BASE}/workflow/approvers/${id}`, { method: 'DELETE' });
    showToast('Approver removed');
    reloadAll();
  };

  // ─── Accessible pages for current user (filtered via rbacCache) ──────────
  const accessiblePages = React.useMemo(() => {
    // Still loading — return empty so page doesn't flash
    if (accessiblePaths === null) return [];
    // If no access data at all (e.g. super-admin fallback) — show all
    if (accessiblePaths.size === 0) return adminworkflowlinks;
    return adminworkflowlinks.filter(pg => accessiblePaths.has(pg.path));
  }, [accessiblePaths]);

  // ─── Header ─────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div>
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>⚙️ Workflow Setup — Templates, Steps & Approvers</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={reloadAll} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} /> Refresh
          </button>
          {selectedPage && (
            <button onClick={() => setTmplModal('create')} style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={11} /> New Template
            </button>
          )}
        </div>
      </div>
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 4 }} />

      {/* ── Page selector bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>📄 Select Page:</span>
        <select
          value={selectedPage?.path || ''}
          onChange={e => {
            const pg = adminworkflowlinks.find(p => p.path === e.target.value) || null;
            setSelectedPage(pg);
          }}
          style={{ flex: 1, maxWidth: 320, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, color: '#111', background: '#fff' }}
        >
          <option value="">— Select a page first —</option>
          {accessiblePages.map(pg => {
            const hasTmpl = templates.some(t => t.entity_page === pg.path || t.code.includes(pg.path.toUpperCase().replace(/-/g,'_')));
            return (
              <option key={pg.path} value={pg.path}>
                {pg.name}{hasTmpl ? ' ✓' : ''}
              </option>
            );
          })}
        </select>
        {selectedPage && (
          <span style={{ fontSize: 10, color: '#6b7280' }}>{selectedPage.description}</span>
        )}
      </div>
    </div>
  );

  // ─── Template list ───────────────────────────────────────────────────────
  const renderTemplates = () => {
    if (!selectedPage) {
      return (
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👆</div>
          Select a page above to view and manage its workflow templates
        </div>
      );
    }
    const pageSlug = selectedPage.path.toUpperCase().replace(/-/g, '_');
    const filtered = templates.filter(t =>
      t.entity_page === selectedPage.path ||
      t.code.includes(pageSlug) ||
      t.name.toLowerCase().includes(selectedPage.name.toLowerCase())
    );
    return (
    <div style={{ padding: 16 }}>
      {/* Page info bar */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8' }}>
          📄 {selectedPage.name} — Workflow Templates
        </span>
        <span style={{ fontSize: 10, color: '#6b7280' }}>{filtered.length} template{filtered.length !== 1 ? 's' : ''} configured</span>
      </div>
      {filtered.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚙️</div>
          <p style={{ margin: '0 0 12px' }}>No workflow templates configured for <b>"{selectedPage.name}"</b> yet.</p>
          <button onClick={() => setTmplModal('create')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Plus size={11} /> Create Template for this Page
          </button>
        </div>
      )}
      {filtered.map(tmpl => (
        <div key={tmpl.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
          {/* Template row */}
          <div
            style={{ background: tmpl.is_active ? '#f0f9ff' : '#f9fafb', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => setExpanded(e => ({ ...e, [tmpl.id]: !e[tmpl.id] }))}
          >
            {expanded[tmpl.id] ? <ChevronDown size={14} color="#3b82f6" /> : <ChevronRight size={14} color="#3b82f6" />}
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', flex: 1 }}>
              {tmpl.name}
              <span style={{ marginLeft: 8, fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 10 }}>{tmpl.code}</span>
              {!tmpl.is_active && <span style={{ marginLeft: 6, fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 10 }}>INACTIVE</span>}
            </span>
            <span style={{ fontSize: 10, color: '#6b7280' }}>{tmpl.steps?.length || 0} steps</span>
            <button onClick={e => { e.stopPropagation(); setTmplModal(tmpl); }} style={btnStyle('#3b82f6')}><Edit2 size={10} /></button>
            <button onClick={e => { e.stopPropagation(); deleteTemplate(tmpl.id); }} style={btnStyle('#ef4444')}><Trash2 size={10} /></button>
          </div>

          {/* Steps (expanded) */}
          {expanded[tmpl.id] && (
            <div style={{ padding: '8px 16px 12px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Steps</span>
                <button onClick={() => setStepModal({ template_id: tmpl.id })} style={{ ...btnStyle('#16a34a'), fontSize: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Plus size={10} /> Add Step
                </button>
              </div>

              {(tmpl.steps || []).length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: 11 }}>No steps yet.</p>
              )}

              {(tmpl.steps || []).sort((a, b) => a.step_order - b.step_order).map((step, idx) => (
                <div key={step.id} style={{ border: '1px solid #f3f4f6', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
                  {/* Step row */}
                  <div style={{ background: '#f8fafc', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 22, height: 22, background: '#3b82f6', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step.step_order}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f', flex: 1 }}>{step.step_name}</span>
                    <span style={{ fontSize: 10, background: step.approval_type === 'ALL' ? '#fef3c7' : '#dcfce7', color: step.approval_type === 'ALL' ? '#92400e' : '#14532d', padding: '1px 6px', borderRadius: 10 }}>
                      {step.approval_type === 'ALL' ? 'All must approve' : 'Any one approver'}
                    </span>
                    {step.sla_hours > 0 && <span style={{ fontSize: 10, color: '#6b7280' }}>{step.sla_hours}h SLA</span>}
                    <button onClick={() => setStepModal(step)} style={btnStyle('#3b82f6')}><Edit2 size={10} /></button>
                    <button onClick={() => deleteStep(step.id)} style={btnStyle('#ef4444')}><Trash2 size={10} /></button>
                  </div>

                  {/* Approvers */}
                  <div style={{ padding: '6px 10px', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>👥 Approvers</span>
                      <button onClick={() => setAprModal({ step_id: step.id })} style={{ ...btnStyle('#7c3aed'), fontSize: 9, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Plus size={9} /> Add
                      </button>
                    </div>
                    {(step.approvers || []).length === 0 && <p style={{ fontSize: 10, color: '#d1d5db' }}>No approvers assigned.</p>}
                    {(step.approvers || []).filter(a => a.is_active).map(apr => (
                      <div key={apr.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <UserCheck size={11} color="#7c3aed" />
                        <span style={{ fontSize: 10, color: '#374151', flex: 1 }}>
                          {apr.role?.role_name || '—'} · {apr.department?.department_name || 'Any Dept'} · {apr.designation?.designation_name || 'Any Desg'}
                        </span>
                        <button onClick={() => deleteApprover(apr.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>

                  {/* Condition badge */}
                  {step.condition_field && (
                    <div style={{ padding: '3px 10px', background: '#fffbeb', fontSize: 10, color: '#92400e' }}>
                      ⚡ Condition: <b>{step.condition_field}</b> {step.condition_op || '='} <b>{step.condition_value}</b>
                    </div>
                  )}

                  {/* Arrow to next */}
                  {idx < (tmpl.steps || []).length - 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0', background: '#f8fafc' }}>
                      <ArrowRight size={12} color="#9ca3af" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
    );
  };

  // Bound reload — child components call this without needing currentUserId
  const reloadAll = useCallback(() => loadAll(currentUserId), [loadAll, currentUserId]);

  // ─── MODALS ──────────────────────────────────────────────────────────────
  const renderTemplateModal = () => {
    if (!tmplModal) return null;
    return <TemplateModal tmplModal={tmplModal} companies={companies} saveTemplate={saveTemplate} showToast={showToast} setTmplModal={setTmplModal} loadAll={reloadAll} selectedPage={selectedPage} />;
  };

  const renderStepModal = () => {
    if (!stepModal) return null;
    return <StepModal stepModal={stepModal} saveStep={saveStep} showToast={showToast} setStepModal={setStepModal} loadAll={reloadAll} />;
  };

  const renderApproverModal = () => {
    if (!aprModal) return null;
    return <ApproverModal aprModal={aprModal} roles={roles} departments={departments} designations={designations} companies={companies} saveApprover={saveApprover} showToast={showToast} setAprModal={setAprModal} loadAll={reloadAll} />;
  };

  // ── Access guard ─────────────────────────────────────────────────────────
  if (accessiblePaths === null) {
    return (
      <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, background: '#f8fafc', minHeight: '100vh' }}>
        {renderHeader()}
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Checking access…
        </div>
      </div>
    );
  }

  if (accessiblePages.length === 0) {
    return (
      <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, background: '#f8fafc', minHeight: '100vh' }}>
        {renderHeader()}
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
          <p style={{ fontSize: 12 }}>You do not have access to any workflow pages.</p>
          <p style={{ fontSize: 10 }}>Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, background: '#f8fafc', minHeight: '100vh' }}>
      <Toast toast={toast} />
      {renderHeader()}
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</div> : renderTemplates()}
      {renderTemplateModal()}
      {renderStepModal()}
      {renderApproverModal()}
    </div>
  );
}

// ─── Modal Sub-Components (hooks must be at top-level of a component) ─────────

function TemplateModal({ tmplModal, companies, saveTemplate, showToast, setTmplModal, loadAll, selectedPage }) {
  const isEdit = typeof tmplModal === 'object' && tmplModal.id;

  // Auto-generate name and code from selectedPage when creating new
  const autoName = (!isEdit && selectedPage)
    ? selectedPage.name + ' Workflow'
    : (tmplModal?.name || '');
  const autoSlug = autoName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'TEMPLATE';
  const autoUid  = React.useMemo(() => Math.random().toString(36).substring(2, 6).toUpperCase(), []);
  const autoCode = (!isEdit && selectedPage) ? `WRKFLW-${autoSlug}-${autoUid}` : (tmplModal?.code || '');

  const [form, setForm] = React.useState({
    code:        autoCode,
    name:        autoName,
    description: tmplModal?.description || (selectedPage ? `Workflow for ${selectedPage.name}` : ''),
    company_id:  tmplModal?.company_id  || '',
    entity_page: selectedPage?.path     || tmplModal?.entity_page || '',
  });
  const onSave = async () => {
    try {
      const data = { ...form, company_id: form.company_id || null, entity_page: form.entity_page || null };
      if (isEdit) data.id = tmplModal.id;
      await saveTemplate(data);
      showToast(isEdit ? 'Template updated' : 'Template created');
      setTmplModal(null);
      reloadAll();
    } catch (e) { showToast(e.message, 'error'); }
  };
  return <Modal title={isEdit ? 'Edit Template' : 'New Workflow Template'} onClose={() => setTmplModal(null)}>
    {!isEdit && selectedPage && (
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '6px 10px', marginBottom: 10, fontSize: 10, color: '#1d4ed8' }}>
        📄 Page: <b>{selectedPage.name}</b> — Name and code are auto-filled. You can edit them if needed.
      </div>
    )}
    <Field label="Name *">
      <input value={form.name} onChange={e => {
        const raw = e.target.value;
        // No double spaces; capitalize first letter of each word
        const name = raw
          .replace(/  +/g, ' ')           // max one space
          .replace(/(^|\s)(\S)/g, (_, sp, ch) => sp + ch.toUpperCase()); // capitalize after space + first char
        const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'TEMPLATE';
        const uid  = Math.random().toString(36).substring(2, 6).toUpperCase();
        const autoCode = `WRKFLW-${slug}-${uid}`;
        setForm(f => ({ ...f, name, code: autoCode }));
      }} style={inp()} />
    </Field>
    <Field label="Code *" hint="auto-generated from name">
      <input value={form.code} readOnly
        style={{ ...inp(true), background: '#f0fdf4', color: '#166534', fontWeight: 600, fontFamily: 'monospace', cursor: 'default' }} />
    </Field>
    <Field label="Description">
      <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inp(), resize: 'vertical' }} />
    </Field>
    <Field label="Company (optional)">
      <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} style={inp()}>
        <option value="">— Global (all companies) —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
      </select>
    </Field>
    <ModalFooter onCancel={() => setTmplModal(null)} onSave={onSave} />
  </Modal>;
}

function StepModal({ stepModal, saveStep, showToast, setStepModal, loadAll }) {
  const isEdit = !!stepModal.step_order;
  const [form, setForm] = React.useState({
    template_id:      stepModal.template_id || '',
    step_order:       stepModal.step_order  || '',
    step_name:        stepModal.step_name   || '',
    step_description: stepModal.step_description || '',
    approval_type:    stepModal.approval_type    || 'ANY',
    sla_hours:        stepModal.sla_hours        || 0,
    condition_field:  stepModal.condition_field  || '',
    condition_value:  stepModal.condition_value  || '',
    condition_op:     stepModal.condition_op     || 'eq',
  });
  const onSave = async () => {
    try {
      const data = { ...form, step_order: parseInt(form.step_order), sla_hours: parseInt(form.sla_hours) || 0 };
      if (isEdit) data.id = stepModal.id;
      else data.template_id = stepModal.template_id;
      await saveStep(data);
      showToast(isEdit ? 'Step updated' : 'Step added');
      setStepModal(null);
      reloadAll();
    } catch (e) { showToast(e.message, 'error'); }
  };
  return <Modal title={isEdit ? 'Edit Step' : 'Add Step'} onClose={() => setStepModal(null)}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Field label="Step Order *">
        <input type="number" value={form.step_order} onChange={e => setForm(f => ({ ...f, step_order: e.target.value }))} style={inp()} />
      </Field>
      <Field label="Approval Type">
        <select value={form.approval_type} onChange={e => setForm(f => ({ ...f, approval_type: e.target.value }))} style={inp()}>
          <option value="ANY">ANY (any one approver)</option>
          <option value="ALL">ALL (everyone must approve)</option>
        </select>
      </Field>
    </div>
    <Field label="Step Name *">
      <input value={form.step_name} onChange={e => setForm(f => ({ ...f, step_name: e.target.value }))} style={inp()} />
    </Field>
    <Field label="Description">
      <textarea value={form.step_description} onChange={e => setForm(f => ({ ...f, step_description: e.target.value }))} rows={2} style={{ ...inp(), resize: 'vertical' }} />
    </Field>
    <Field label="SLA Hours (0 = no limit)">
      <input type="number" value={form.sla_hours} onChange={e => setForm(f => ({ ...f, sla_hours: e.target.value }))} style={inp()} />
    </Field>
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: 8, marginTop: 4 }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>⚡ Conditional Skip (optional)</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 6 }}>
        <Field label="Field name"><input placeholder="e.g. item_type" value={form.condition_field} onChange={e => setForm(f => ({ ...f, condition_field: e.target.value }))} style={inp()} /></Field>
        <Field label="Op"><select value={form.condition_op} onChange={e => setForm(f => ({ ...f, condition_op: e.target.value }))} style={inp()}>
          <option value="eq">=</option><option value="neq">≠</option><option value="gt">&gt;</option><option value="lt">&lt;</option>
        </select></Field>
        <Field label="Value"><input placeholder="e.g. Capital" value={form.condition_value} onChange={e => setForm(f => ({ ...f, condition_value: e.target.value }))} style={inp()} /></Field>
      </div>
    </div>
    <ModalFooter onCancel={() => setStepModal(null)} onSave={onSave} />
  </Modal>;
}

function ApproverModal({ aprModal, roles, departments, designations, companies, saveApprover, showToast, setAprModal, loadAll }) {
  const [form, setForm] = React.useState({ role_id: '', department_id: '', designation_id: '', company_id: '' });
  const onSave = async () => {
    try {
      await saveApprover({ step_id: aprModal.step_id, role_id: form.role_id || null, department_id: form.department_id || null, designation_id: form.designation_id || null, company_id: form.company_id || null });
      showToast('Approver added');
      setAprModal(null);
      reloadAll();
    } catch (e) { showToast(e.message, 'error'); }
  };
  return <Modal title="Add Step Approver" onClose={() => setAprModal(null)}>
    <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>Leave blank = wildcard (matches any). Fill only what you want to restrict.</p>
    <Field label="Role">
      <select value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} style={inp()}>
        <option value="">— Any Role —</option>
        {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
      </select>
    </Field>
    <Field label="Department">
      <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={inp()}>
        <option value="">— Any Department —</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
      </select>
    </Field>
    <Field label="Designation">
      <select value={form.designation_id} onChange={e => setForm(f => ({ ...f, designation_id: e.target.value }))} style={inp()}>
        <option value="">— Any Designation —</option>
        {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
      </select>
    </Field>
    <Field label="Company (optional)">
      <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} style={inp()}>
        <option value="">— Any Company —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
      </select>
    </Field>
    <ModalFooter onCancel={() => setAprModal(null)} onSave={onSave} saveLabel="Add Approver" />
  </Modal>;
}

// ─── Tiny shared components ──────────────────────────────────────────────────
const inp = (disabled = false) => ({ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 3, fontSize: 11, color: '#111', background: disabled ? '#f3f4f6' : '#fff', boxSizing: 'border-box' });
const btnStyle = (bg) => ({ background: bg, border: 'none', color: '#fff', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', fontSize: 10 });

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 8 }}>
    <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>{label}{hint && <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 4 }}>{hint}</span>}</label>
    {children}
  </div>
);

const Modal = ({ title, children, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
    <div style={{ background: '#fff', borderRadius: 8, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,.2)' }}>
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={14} /></button>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  </div>
);

const ModalFooter = ({ onCancel, onSave, saveLabel = 'Save' }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
    <button onClick={onCancel} style={{ padding: '5px 14px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
    <button onClick={onSave} style={{ padding: '5px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Save size={11} />{saveLabel}</button>
  </div>
);
