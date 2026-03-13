/**
 * WorkflowDashboard.js  –  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────
 * Management overview — all instances, stats, filter by status/type.
 * Shows total counts, per-step bottlenecks, recent activity.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Eye, BarChart2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

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

export default function WorkflowDashboard() {
  const [templates, setTemplates] = useState([]);
  const [inboxData, setInboxData] = useState([]);    // for bottleneck analysis
  const [selected, setSelected]   = useState(null);
  const [timeline, setTimeline]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [activeTab, setActiveTab] = useState('overview');  // 'overview' | 'templates'

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes] = await Promise.all([
        fetch(`${API_BASE}/workflow/templates/`),
      ]);
      const tData = await tRes.json();
      setTemplates(Array.isArray(tData) ? tData : []);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadTimeline = async (entityType, entityId) => {
    try {
      const res = await fetch(`${API_BASE}/workflow/timeline/${entityType}/${entityId}`);
      const data = await res.json();
      setTimeline(data);
      setSelected({ entityType, entityId });
    } catch { showToast('Could not load timeline', 'error'); }
  };

  const renderHeader = () => (
    <div>
      <div style={{ background: 'linear-gradient(to right, #374151, #60a5fa)', color: '#fff', padding: '8px 12px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>📊 Workflow Dashboard</span>
        <button onClick={loadData} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </div>
      <div style={{ background: 'linear-gradient(to right, #60a5fa, #374151)', height: 4 }} />
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#fff' }}>
        {[['overview', '📊 Overview'], ['templates', '⚙️ Templates']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === key ? '#3b82f6' : '#6b7280', borderBottom: activeTab === key ? '2px solid #3b82f6' : '2px solid transparent', marginBottom: -2 }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderOverview = () => (
    <div style={{ padding: 16 }}>
      {/* Template stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {templates.map(tmpl => (
          <div key={tmpl.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', margin: 0 }}>{tmpl.name}</p>
                <p style={{ fontSize: 10, color: '#6b7280', margin: '2px 0 0' }}>{tmpl.code}</p>
              </div>
              <span style={{ background: tmpl.is_active ? '#dcfce7' : '#fee2e2', color: tmpl.is_active ? '#14532d' : '#991b1b', fontSize: 9, padding: '2px 6px', borderRadius: 8 }}>
                {tmpl.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(tmpl.steps || []).sort((a, b) => a.step_order - b.step_order).map(step => (
                <div key={step.id} style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '3px 8px', fontSize: 9, color: '#1d4ed8' }}>
                  {step.step_order}. {step.step_name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* How-to guide */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 10 }}>🚀 How to Use This Workflow System</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { step: '1', title: 'Create Template', desc: 'Go to Workflow Setup. Create a template like "ITEM_CREATION" with steps and approvers.' },
            { step: '2', title: 'Submit Request', desc: 'When saving an Item Creation Request, click "Submit for Approval". Workflow starts.' },
            { step: '3', title: 'Approver Inbox', desc: 'Approver opens Approval Inbox. They see their pending items and can Approve/Reject/Return.' },
            { step: '4', title: 'Track Status', desc: 'Submitter opens My Requests to see real-time step-by-step progress of their request.' },
          ].map(card => (
            <div key={card.step} style={{ display: 'flex', gap: 10, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #fde68a' }}>
              <div style={{ width: 24, height: 24, background: '#f97316', color: '#fff', borderRadius: '50%', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.step}</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: '0 0 3px' }}>{card.title}</p>
                <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API quick reference – entity types pulled from loaded templates */}
      <div style={{ marginTop: 16, background: '#1e293b', borderRadius: 8, padding: 16 }}>
        <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>API Quick Reference (entity types from DB)</p>
        {/* Static endpoints */}
        {[
          ['POST', '/api/workflow/templates/',            'Create template'],
          ['POST', '/api/workflow/submit/',               'Submit request to workflow'],
          ['POST', '/api/workflow/action/{instance_id}', 'Approve / Reject / Return'],
          ['GET',  '/api/workflow/inbox/{user_id}',       'Approver inbox'],
          ['GET',  '/api/workflow/my-requests/{user_id}', 'Submitter requests'],
        ].map(([method, path, desc]) => (
          <div key={path} style={{ display: 'flex', gap: 10, marginBottom: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: method === 'GET' ? '#1d4ed8' : '#16a34a', color: '#fff', minWidth: 34, textAlign: 'center' }}>{method}</span>
            <span style={{ fontSize: 10, color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{path}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>{desc}</span>
          </div>
        ))}
        {/* Dynamic endpoints — one row per template code from DB */}
        {templates.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px solid #334155', paddingTop: 8 }}>
            <p style={{ color: '#64748b', fontSize: 9, margin: '0 0 6px', textTransform: 'uppercase' }}>Per-entity endpoints (from your templates)</p>
            {templates.filter(t => t.is_active).map(t => (
              <React.Fragment key={t.code}>
                {[
                  ['GET', `/api/workflow/timeline/${t.code}/{id}`, `Timeline for ${t.name}`],
                  ['GET', `/api/workflow/status/${t.code}/{id}`,   `Status check for ${t.name}`],
                ].map(([method, path, desc]) => (
                  <div key={path} style={{ display: 'flex', gap: 10, marginBottom: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: '#1d4ed8', color: '#fff', minWidth: 34, textAlign: 'center' }}>{method}</span>
                    <span style={{ fontSize: 10, color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{path}</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>{desc}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div style={{ padding: 16 }}>
      {templates.map(tmpl => (
        <div key={tmpl.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', flex: 1 }}>{tmpl.name} <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 400 }}>({tmpl.code})</span></span>
            <span style={{ fontSize: 10, color: '#6b7280' }}>Company: {tmpl.company?.company_name || 'Global'}</span>
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {(tmpl.steps || []).sort((a, b) => a.step_order - b.step_order).map((step, idx, arr) => (
                <React.Fragment key={step.id}>
                  <div style={{ background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 10px', minWidth: 120 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#1d4ed8' }}>Step {step.step_order}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: '#1e3a5f' }}>{step.step_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 9, color: '#6b7280' }}>{step.approval_type} · {step.approvers?.length || 0} approver(s)</p>
                    {step.approvers?.map(a => (
                      <p key={a.id} style={{ margin: '1px 0 0', fontSize: 9, color: '#4b5563' }}>
                        • {a.role?.role_name || 'Any'} / {a.department?.department_name || 'Any Dept'}
                      </p>
                    ))}
                  </div>
                  {idx < arr.length - 1 && <span style={{ fontSize: 16, color: '#9ca3af' }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ))}
      {templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 12 }}>
          No templates configured yet. Go to Workflow Setup to create one.
        </div>
      )}
    </div>
  );

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, background: '#f8fafc', minHeight: '100vh' }}>
      <Toast toast={toast} />
      {renderHeader()}
      {loading ? <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Loading…</div> : (
        activeTab === 'overview' ? renderOverview() : renderTemplatesTab()
      )}
    </div>
  );
}