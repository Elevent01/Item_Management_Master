import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api";

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117",
  surface: "#1a1d27",
  card: "#21253a",
  border: "#2e3349",
  accent: "#4f8ef7",
  accentSoft: "#1e2d4a",
  green: "#34d399",
  greenSoft: "#0d2e22",
  red: "#f87171",
  redSoft: "#2e1515",
  muted: "#6b7280",
  text: "#e2e8f0",
  textDim: "#94a3b8",
};

// ── Tiny utility components ───────────────────────────────────────────────────
const Badge = ({ children, color = C.accent, bg = C.accentSoft }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 10px", borderRadius: 99,
    fontSize: 11, fontWeight: 600,
    color, background: bg, border: `1px solid ${color}22`,
  }}>{children}</span>
);

const Tag = ({ children, onRemove }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 8,
    fontSize: 12, fontWeight: 500,
    color: C.green, background: C.greenSoft, border: `1px solid ${C.green}33`,
    margin: "3px",
  }}>
    {children}
    {onRemove && (
      <button onClick={onRemove} style={{
        background: "none", border: "none", cursor: "pointer",
        color: C.green, fontSize: 14, lineHeight: 1, padding: 0,
        display: "flex", alignItems: "center",
      }}>×</button>
    )}
  </span>
);

const Spinner = () => (
  <div style={{
    width: 20, height: 20, borderRadius: "50%",
    border: `2px solid ${C.border}`,
    borderTopColor: C.accent,
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  }} />
);

const Avatar = ({ name }) => {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const hue = (name?.charCodeAt(0) || 0) * 37 % 360;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: `hsl(${hue}, 55%, 35%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 700, color: "#fff",
      flexShrink: 0,
    }}>{initials}</div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserDeptAccessPage() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [allDepts, setAllDepts] = useState([]);
  const [grantedDeptIds, setGrantedDeptIds] = useState([]);  // local edit state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Load companies on mount
  useEffect(() => {
    setLoadingCompanies(true);
    fetch(`${API}/user-dept-access/companies`)
      .then(r => r.json())
      .then(setCompanies)
      .catch(() => showToast("Companies load failed", false))
      .finally(() => setLoadingCompanies(false));
  }, []);

  // Load users when company selected
  useEffect(() => {
    if (!selectedCompany) { setUsers([]); return; }
    setLoadingUsers(true);
    setSelectedUser(null);
    setUserDetail(null);
    fetch(`${API}/user-dept-access/companies/${selectedCompany.id}/users`)
      .then(r => r.json())
      .then(setUsers)
      .catch(() => showToast("Users load failed", false))
      .finally(() => setLoadingUsers(false));
  }, [selectedCompany]);

  // Load user detail + all depts when user selected
  useEffect(() => {
    if (!selectedUser || !selectedCompany) return;
    setLoadingDetail(true);

    Promise.all([
      fetch(`${API}/user-dept-access/user/${selectedUser.id}/detail`).then(r => r.json()),
      fetch(`${API}/user-dept-access/companies/${selectedCompany.id}/all-departments`).then(r => r.json()),
    ])
      .then(([detail, depts]) => {
        setUserDetail(detail);
        setAllDepts(depts);
        // Find granted depts for this company
        const companyAccess = detail.dept_access_by_company?.find(
          d => d.company_id === selectedCompany.id
        );
        setGrantedDeptIds(
          companyAccess?.granted_departments?.map(d => d.department_id) || []
        );
      })
      .catch(() => showToast("Detail load failed", false))
      .finally(() => setLoadingDetail(false));
  }, [selectedUser, selectedCompany]);

  const toggleDept = (deptId) => {
    setGrantedDeptIds(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSave = async () => {
    if (!selectedUser || !selectedCompany) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/user-dept-access/bulk-set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          company_id: selectedCompany.id,
          department_ids: grantedDeptIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Save failed");
      }
      showToast("Department access saved successfully ✓");
      // Refresh user list to update granted_dept_count badge
      const updatedUsers = await fetch(
        `${API}/user-dept-access/companies/${selectedCompany.id}/users`
      ).then(r => r.json());
      setUsers(updatedUsers);
      const updatedUser = updatedUsers.find(u => u.id === selectedUser.id);
      if (updatedUser) setSelectedUser(updatedUser);
    } catch (e) {
      showToast(e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const grantedDepts = allDepts.filter(d => grantedDeptIds.includes(d.id));
  const availableDepts = allDepts.filter(d => !grantedDeptIds.includes(d.id));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: C.bg, minHeight: "100vh",
      color: C.text, padding: "24px",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        button:hover { opacity: 0.88; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: toast.ok ? C.greenSoft : C.redSoft,
          color: toast.ok ? C.green : C.red,
          border: `1px solid ${toast.ok ? C.green : C.red}44`,
          fontSize: 13, fontWeight: 500,
          animation: "fadeIn 0.2s ease",
          boxShadow: "0 8px 32px #0008",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700,
          color: C.text, letterSpacing: -0.5,
        }}>
          👥 User Department Data Access
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
          Control which departments' data each user can see — globally across all pages.
        </p>
      </div>

      {/* 3-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 280px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Col 1: Companies ────────────────────────────────────────────── */}
        <div style={{
          background: C.surface, borderRadius: 14,
          border: `1px solid ${C.border}`, overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
            fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: 0.5,
            textTransform: "uppercase",
          }}>
            Companies
          </div>
          <div style={{ maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
            {loadingCompanies ? (
              <div style={{ padding: 24, textAlign: "center" }}><Spinner /></div>
            ) : companies.length === 0 ? (
              <div style={{ padding: 20, color: C.muted, fontSize: 13, textAlign: "center" }}>No companies found</div>
            ) : companies.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCompany(c)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "12px 16px", background: "none",
                  border: "none", borderBottom: `1px solid ${C.border}22`,
                  cursor: "pointer", textAlign: "left",
                  color: selectedCompany?.id === c.id ? C.accent : C.text,
                  background: selectedCompany?.id === c.id ? C.accentSoft : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.company_name}</div>
                  {c.company_code && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{c.company_code}</div>
                  )}
                </div>
                <Badge color={C.accent} bg={C.accentSoft}>{c.user_count}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* ── Col 2: Users ────────────────────────────────────────────────── */}
        <div style={{
          background: C.surface, borderRadius: 14,
          border: `1px solid ${C.border}`, overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
            fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: 0.5,
            textTransform: "uppercase",
          }}>
            {selectedCompany ? `Users — ${selectedCompany.company_name}` : "Select a Company"}
          </div>
          <div style={{ maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
            {!selectedCompany ? (
              <div style={{ padding: 20, color: C.muted, fontSize: 13, textAlign: "center" }}>
                ← Select a company first
              </div>
            ) : loadingUsers ? (
              <div style={{ padding: 24, textAlign: "center" }}><Spinner /></div>
            ) : users.length === 0 ? (
              <div style={{ padding: 20, color: C.muted, fontSize: 13, textAlign: "center" }}>
                No users in this company
              </div>
            ) : users.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "12px 16px", background: "none",
                  border: "none", borderBottom: `1px solid ${C.border}22`,
                  cursor: "pointer", textAlign: "left",
                  color: selectedUser?.id === u.id ? C.accent : C.text,
                  background: selectedUser?.id === u.id ? C.accentSoft : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <Avatar name={u.full_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {u.role_name || "—"} · {u.dept_name || "—"}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {u.granted_dept_count > 0
                    ? <Badge color={C.green} bg={C.greenSoft}>{u.granted_dept_count} depts</Badge>
                    : <Badge color={C.red} bg={C.redSoft}>No access</Badge>
                  }
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Col 3: Dept Access Editor ────────────────────────────────────── */}
        <div style={{
          background: C.surface, borderRadius: 14,
          border: `1px solid ${C.border}`, overflow: "hidden",
          animation: "fadeIn 0.2s ease",
        }}>
          {!selectedUser ? (
            <div style={{
              padding: 48, textAlign: "center", color: C.muted,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
              <div style={{ fontSize: 40 }}>🏢</div>
              <div style={{ fontSize: 14 }}>Select a company and user to manage department access</div>
            </div>
          ) : loadingDetail ? (
            <div style={{ padding: 48, textAlign: "center" }}><Spinner /></div>
          ) : (
            <>
              {/* User info header */}
              <div style={{
                padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <Avatar name={userDetail?.full_name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{userDetail?.full_name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                    {userDetail?.email}
                    {userDetail?.phone && ` · ${userDetail.phone}`}
                  </div>
                </div>
                <Badge color={userDetail?.is_active ? C.green : C.red}
                       bg={userDetail?.is_active ? C.greenSoft : C.redSoft}>
                  {userDetail?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Company access summary */}
              {userDetail?.company_accesses?.length > 0 && (
                <div style={{
                  padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
                  background: C.card,
                }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                    Company Accesses
                  </div>
                  {userDetail.company_accesses.map(ca => (
                    <div key={ca.company_id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 0", fontSize: 12, color: C.textDim,
                    }}>
                      <span style={{ color: C.accent, fontWeight: 600 }}>🏢 {ca.company_name}</span>
                      <span>·</span>
                      <span>{ca.role?.name || "—"}</span>
                      <span>·</span>
                      <span>{ca.department?.name || "—"}</span>
                      <span>·</span>
                      <span>{ca.designation?.name || "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dept access editor */}
              <div style={{ padding: 20 }}>
                <div style={{
                  fontSize: 12, color: C.muted, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                }}>
                  Department Data Access
                  <span style={{ marginLeft: 8, color: C.textDim, fontWeight: 400, fontSize: 11, textTransform: "none" }}>
                    for {selectedCompany?.company_name}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>
                  User will only see data from departments selected below. No selection = no data visible.
                </p>

                {/* Currently granted tags */}
                <div style={{
                  minHeight: 48, padding: "10px 12px",
                  background: C.card, borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  marginBottom: 16,
                }}>
                  {grantedDepts.length === 0 ? (
                    <span style={{ fontSize: 12, color: C.muted }}>No departments selected — user will see no data</span>
                  ) : (
                    grantedDepts.map(d => (
                      <Tag key={d.id} onRemove={() => toggleDept(d.id)}>
                        {d.department_name}
                      </Tag>
                    ))
                  )}
                </div>

                {/* Available to add */}
                <div style={{
                  fontSize: 11, color: C.muted, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
                }}>
                  All Departments — click to grant
                </div>
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24,
                }}>
                  {allDepts.map(d => {
                    const granted = grantedDeptIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => toggleDept(d.id)}
                        style={{
                          padding: "5px 14px", borderRadius: 8,
                          fontSize: 12, fontWeight: 500, cursor: "pointer",
                          border: `1px solid ${granted ? C.green : C.border}`,
                          background: granted ? C.greenSoft : C.card,
                          color: granted ? C.green : C.textDim,
                          transition: "all 0.15s",
                        }}
                      >
                        {granted ? "✓ " : ""}{d.department_name}
                      </button>
                    );
                  })}
                  {allDepts.length === 0 && (
                    <span style={{ fontSize: 12, color: C.muted }}>No departments found in system</span>
                  )}
                </div>

                {/* Save button */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: "10px 28px", borderRadius: 10,
                      background: C.accent, color: "#fff",
                      border: "none", cursor: saving ? "not-allowed" : "pointer",
                      fontSize: 13, fontWeight: 600,
                      opacity: saving ? 0.7 : 1,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    {saving ? <><Spinner /> Saving…</> : "Save Access"}
                  </button>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    {grantedDeptIds.length} department{grantedDeptIds.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}