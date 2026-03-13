/**
 * WorkflowMyRequests.js  –  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────
 * Submitter's dashboard — see all your submitted requests + live status.
 * Click any row to see the full step-by-step timeline.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Eye, XCircle, CheckCircle, Clock, AlertCircle, CornerUpLeft } from 'lucide-react';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

const getSession = () => {
  try { const d = JSON.parse(sessionStorage.getItem('userData') || '{}'); return d?.user || null; }
  catch { return null; }
};

const STATUS_META = {
  DRAFT:      { label: 'Draft',      bg: '#f3f4f6', color: '#6b7280', icon: '📝' },
  PENDING:    { label: 'Pending',    bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  IN_REVIEW:  { label: 'In Review',  bg: '#dbeafe', color: '#1d4ed8', icon: '🔍' },
  APPROVED:   { label: 'Approved',   bg: '#dcfce7', color: '#14532d', icon: '✅' },
  REJECTED:   { label: 'Rejected',   bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  RETURNED:   { label: 'Returned',   bg: '#fde8d8', color: '#9a3412', icon: '↩️' },
  CANCELLED:  { label: 'Cancelled',  bg: '#f3f4f6', color: '#6b7280', icon: '🚫' },
};

const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '10px 20px', borderRadius: 6, zIndex: 99999, fontSize: 12, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>
      {toast.msg}
    </div>
  );
};

export default function WorkflowMyRequests() {
  const user = getSession();
  const userId = user?.id;

  const [requests, setRequests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [statusFilter, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const [entityFilter, setEntityFilter] = useState('');

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [tmplRes] = await Promise.all([fetch(`${API_BASE}/workflow/templates/?is_active=true`)]);
      const tmplData = await tmplRes.json();
      const tmplList = Array.isArray(tmplData) ? tmplData : [];
      setTemplates(tmplList);

      // Fetch requests for each active template (or filtered one)
      const targets = entityFilter ? [entityFilter] : tmplList.map(t => t.code);
      const allReqs = [];
      for (const code of targets) {
        let url = `${API_BASE}/workflow/my-requests/${userId}?entity_type=${code}&limit=100`;
        if (statusFilter) url += `&status=${statusFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) allReqs.push(...data);
      }
      allReqs.sort((a, b) => new Date(b.submitted_at||0) - new Date(a.submitted_at||0));
      setRequests(allReqs);
    } catch { showToast('Failed to load requests', 'error'); }
    finally { setLoading(false); }
  }, [userId, statusFilter, entityFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const loadTimeline = async (row) => {
    setSelected(row);
    try {
      const res = await fetch(`${API_BASE}/workflow/timeline/${row.entity_type}/${row.entity_id}`);
      const data = await res.json();
      setTimeline(data);
    } catch { setTimeline(null); }
  };

  const cancelRequest = async (row) => {
    if (!window.confirm('Cancel this request?')) return;
    try {
      const res = await fetch(`${API_BASE}/workflow/action/${row.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: 'CANCEL', performed_by: userId, comments: 'Cancelled by submitter' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      showToast('Request cancelled');
      loadRequests();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const renderHeader = () => (
    <div>
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>📋 My Requests — Track Status</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}>
            <option value="">All Status</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}>
            <option value="">All Types</option>
            {templates.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
          <button onClick={loadRequests} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 4 }} />
    </div>
  );

  // Summary cards
  const renderStats = () => {
    const counts = {};
    requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const cards = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED'];
    return (
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px 0' }}>
        {cards.map(s => {
          const m = STATUS_META[s];
          return (
            <div key={s} onClick={() => setStatus(statusFilter === s ? '' : s)}
              style={{ flex: 1, border: `1px solid ${statusFilter === s ? m.color : '#e5e7eb'}`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', background: statusFilter === s ? m.bg : '#fff', transition: 'all .15s' }}>
              <p style={{ fontSize: 18, margin: 0 }}>{m.icon}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: m.color, margin: '2px 0' }}>{counts[s] || 0}</p>
              <p style={{ fontSize: 9, color: '#6b7280', margin: 0 }}>{m.label}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTable = () => (
    <div style={{ padding: 16 }}>
      {loading && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 30 }}>Loading…</div>}
      {!loading && requests.length === 0 && (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <p style={{ color: '#9ca3af', fontSize: 12 }}>No requests found.</p>
        </div>
      )}
      {requests.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              {['#', 'Type', 'Entity ID', 'Status', 'Submitted', 'Completed', 'Actions'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((r, idx) => {
              const m = STATUS_META[r.status] || STATUS_META.DRAFT;
              return (
                <tr key={r.instance_id} style={{ borderBottom: '1px solid #f3f4f6', background: selected?.instance_id === r.instance_id ? '#eff6ff' : 'transparent' }}>
                  <td style={{ padding: '6px 8px', color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#374151' }}>{r.entity_type}</td>
                  <td style={{ padding: '6px 8px', color: '#374151' }}>#{r.entity_id}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ ...m, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{m.icon} {m.label}</span>
                  </td>
                  <td style={{ padding: '6px 8px', color: '#6b7280' }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '6px 8px', color: '#6b7280' }}>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => loadTimeline(r)}
                        style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 3, padding: '3px 7px', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Eye size={10} /> Track
                      </button>
                      {['PENDING', 'IN_REVIEW', 'DRAFT'].includes(r.status) && (
                        <button onClick={() => cancelRequest(r)}
                          style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: 3, padding: '3px 7px', cursor: 'pointer', fontSize: 10 }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderTimeline = () => {
    if (!selected) return null;
    return (
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 400, background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,.15)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Timeline — {selected.entity_type} #{selected.entity_id}</span>
          <button onClick={() => { setSelected(null); setTimeline(null); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {!timeline && <p style={{ color: '#9ca3af', fontSize: 11 }}>Loading timeline…</p>}
          {timeline && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: 10, background: '#f8fafc', borderRadius: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f' }}>Overall:</span>
                {(() => { const m = STATUS_META[timeline.overall_status] || {}; return <span style={{ background: m.bg, color: m.color, padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{m.icon} {m.label}</span>; })()}
              </div>

              {/* Steps timeline */}
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#e5e7eb' }} />

                {timeline.steps?.map(step => {
                  const m = STATUS_META[step.status] || STATUS_META.PENDING;
                  const dotColor = step.status === 'APPROVED' ? '#16a34a' : step.status === 'REJECTED' ? '#dc2626' : step.status === 'RETURNED' ? '#f97316' : step.is_skipped ? '#d1d5db' : '#3b82f6';
                  return (
                    <div key={step.step_order} style={{ position: 'relative', marginBottom: 16 }}>
                      {/* Dot */}
                      <div style={{ position: 'absolute', left: -19, top: 2, width: 16, height: 16, borderRadius: '50%', background: dotColor, border: '2px solid #fff', boxShadow: '0 0 0 2px ' + dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: '#fff', fontWeight: 800 }}>{step.step_order}</span>
                      </div>

                      <div style={{ background: step.is_skipped ? '#f9fafb' : '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, opacity: step.is_skipped ? 0.5 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f' }}>{step.step_name}</span>
                          <span style={{ background: m.bg, color: m.color, padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600 }}>{m.icon} {m.label}</span>
                        </div>
                        {step.is_skipped && <p style={{ fontSize: 9, color: '#9ca3af', margin: 0 }}>⚡ Skipped (condition not met)</p>}
                        {step.assigned_role && <p style={{ fontSize: 10, color: '#6b7280', margin: '2px 0' }}>👥 {step.assigned_role} · {step.assigned_dept || 'Any Dept'} · {step.assigned_desg || 'Any Desg'}</p>}
                        {step.started_at && <p style={{ fontSize: 9, color: '#9ca3af', margin: '2px 0' }}>Started: {new Date(step.started_at).toLocaleString()}</p>}
                        {step.completed_at && <p style={{ fontSize: 9, color: '#9ca3af', margin: '2px 0' }}>Completed: {new Date(step.completed_at).toLocaleString()}</p>}
                        {step.due_at && <p style={{ fontSize: 9, color: '#dc2626', margin: '2px 0' }}>⏰ Due: {new Date(step.due_at).toLocaleString()}</p>}

                        {step.actions?.length > 0 && (
                          <div style={{ marginTop: 6, borderTop: '1px solid #f3f4f6', paddingTop: 6 }}>
                            {step.actions.map(a => (
                              <div key={a.id} style={{ fontSize: 10, color: '#374151', marginBottom: 3 }}>
                                <span style={{ fontWeight: 600 }}>{a.performer?.full_name || `User #${a.performed_by}`}</span>: {a.action_type}
                                {a.comments && <span style={{ color: '#6b7280' }}> — "{a.comments}"</span>}
                                <span style={{ color: '#9ca3af', marginLeft: 4 }}>{new Date(a.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, background: '#f8fafc', minHeight: '100vh' }}>
      <Toast toast={toast} />
      {renderHeader()}
      {renderStats()}
      {renderTable()}
      {renderTimeline()}
    </div>
  );
}