/**
 * WorkflowStatusBadge.js  –  ItemMasterPages/
 * ─────────────────────────────────────────────────────────────────
 * Lightweight embeddable component.
 * Drop this inside any page (e.g. ItemCodeCreationReq.js list table)
 * to show live workflow status + submit button for drafts.
 *
 * Usage:
 *   <WorkflowStatusBadge entityType="ITEM_CREATION" entityId={rec.id}
 *     userId={user.id} onSubmitted={() => reload()} />
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, CornerUpLeft, Send } from 'lucide-react';

const API_BASE = 'https://item-management-master-1.onrender.com/api';

const STATUS_META = {
  NOT_SUBMITTED: { label: 'Not Submitted', bg: '#f3f4f6', color: '#6b7280', icon: '📝' },
  DRAFT:         { label: 'Draft',          bg: '#f3f4f6', color: '#6b7280', icon: '📝' },
  PENDING:       { label: 'Pending',        bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  IN_REVIEW:     { label: 'In Review',      bg: '#dbeafe', color: '#1d4ed8', icon: '🔍' },
  APPROVED:      { label: 'Approved',       bg: '#dcfce7', color: '#14532d', icon: '✅' },
  REJECTED:      { label: 'Rejected',       bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  RETURNED:      { label: 'Returned',       bg: '#fde8d8', color: '#9a3412', icon: '↩️' },
  CANCELLED:     { label: 'Cancelled',      bg: '#f3f4f6', color: '#6b7280', icon: '🚫' },
};

export function WorkflowStatusBadge({ entityType = 'ITEM_CREATION', entityId, userId, onSubmitted }) {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  const loadStatus = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/status/${entityType}/${entityId}`);
      const data = await res.json();
      setStatus(data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStatus(); }, [entityId]);

  const submitToWorkflow = async () => {
    if (!entityId || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_code: entityType,
          entity_type:   entityType,
          entity_id:     entityId,
          submitted_by:  userId,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
      showToast('Request submitted for approval!');
      loadStatus();
      if (onSubmitted) onSubmitted();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (!entityId) return null;
  if (loading) return <span style={{ fontSize: 10, color: '#9ca3af' }}>…</span>;

  const s = status?.status || 'NOT_SUBMITTED';
  const m = STATUS_META[s] || STATUS_META.NOT_SUBMITTED;
  const canSubmit = s === 'NOT_SUBMITTED' || s === 'DRAFT' || s === 'RETURNED';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {toast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 99999, fontSize: 11, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}
      <span style={{ background: m.bg, color: m.color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {m.icon} {m.label}
      </span>
      {canSubmit && (
        <button onClick={submitToWorkflow} disabled={submitting}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 10, cursor: submitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 3, opacity: submitting ? 0.7 : 1 }}>
          <Send size={9} /> {submitting ? 'Submitting…' : 'Submit'}
        </button>
      )}
    </div>
  );
}


/**
 * WorkflowSubmitButton.js
 * Full-size submit button — use in ItemCodeCreationReq form
 * after a record is saved, to submit it to the approval workflow.
 */
export function WorkflowSubmitButton({ entityType = 'ITEM_CREATION', entityId, userId, onDone }) {
  const [status, setStatus]     = useState(null);
  const [submitting, setSub]    = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (!entityId) return;
    fetch(`${API_BASE}/workflow/status/${entityType}/${entityId}`)
      .then(r => r.json()).then(setStatus).catch(() => {});
  }, [entityId]);

  const submit = async () => {
    setSub(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_code: entityType, entity_type: entityType, entity_id: entityId, submitted_by: userId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Submission failed'); }
      showToast('✅ Submitted for approval!');
      setStatus({ status: 'PENDING' });
      if (onDone) onDone();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSub(false); }
  };

  if (!entityId) return null;

  const s = status?.status;
  const submitted = s && !['NOT_SUBMITTED', 'DRAFT', 'RETURNED', null, undefined].includes(s);
  const m = STATUS_META[s] || STATUS_META.NOT_SUBMITTED;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {toast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 99999, fontSize: 11, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}
      {submitted ? (
        <span style={{ background: m.bg, color: m.color, padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
          {m.icon} Workflow: {m.label}
        </span>
      ) : (
        <button onClick={submit} disabled={submitting}
          style={{ background: 'linear-gradient(to right, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 16px', fontSize: 11, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: submitting ? 0.7 : 1 }}>
          <Send size={12} /> {submitting ? 'Submitting…' : '🚀 Submit for Approval'}
        </button>
      )}
    </div>
  );
}

export default WorkflowStatusBadge;