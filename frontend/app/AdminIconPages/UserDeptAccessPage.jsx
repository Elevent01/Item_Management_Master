import { useState, useEffect } from "react";

const API = "http://localhost:8000/api";

const C = {
  bg: "#0f1117", surface: "#1a1d27", card: "#21253a", border: "#2e3349",
  accent: "#4f8ef7", accentSoft: "#1e2d4a",
  green: "#34d399", greenSoft: "#0d2e22",
  red: "#f87171", redSoft: "#2e1515",
  yellow: "#fbbf24", yellowSoft: "#2d2007",
  muted: "#6b7280", text: "#e2e8f0", textDim: "#94a3b8",
};

// ── Utility components ────────────────────────────────────────────────────────
const Badge = ({ children, color = C.accent, bg = C.accentSoft }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
    color, background: bg, border: `1px solid ${color}22`,
  }}>{children}</span>
);

const Tag = ({ children, onRemove }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    color: C.green, background: C.greenSoft, border: `1px solid ${C.green}33`, margin: "3px",
  }}>
    {children}
    {onRemove && (
      <button onClick={onRemove} style={{
        background: "none", border: "none", cursor: "pointer",
        color: C.green, fontSize: 14, lineHeight: 1, padding: 0, display: "flex", alignItems: "center",
      }}>×</button>
    )}
  </span>
);

const Spinner = () => (
  <div style={{
    width: 20, height: 20, borderRadius: "50%",
    border: `2px solid ${C.border}`, borderTopColor: C.accent,
    animation: "spin 0.7s linear infinite", display: "inline-block",
  }} />
);

const Avatar = ({ name, size = 36 }) => {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const hue = (name?.charCodeAt(0) || 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue}, 55%, 35%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>{initials}</div>
  );
};

const ErrBox = ({ msg }) => (
  <div style={{
    margin: 16, padding: "10px 14px", borderRadius: 8,
    background: C.redSoft, color: C.red,
    border: `1px solid ${C.red}44`, fontSize: 12,
  }}>⚠ {msg}</div>
);

const ColHeader = ({ title }) => (
  <div style={{
    padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
    fontSize: 11, fontWeight: 700, color: C.muted,
    letterSpacing: 1, textTransform: "uppercase",
  }}>{title}</div>
);

const EmptyState = ({ icon, msg }) => (
  <div style={{ padding: 28, textAlign: "center", color: C.muted, fontSize: 13 }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    {msg}
  </div>
);

async function safeFetch(url) {
  try {
    const r = await fetch(url);
    const json = await r.json();
    if (!r.ok) return { data: null, error: json?.detail || `HTTP ${r.status}` };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserDeptAccessPage() {

  // ── Col 1 state
  const [companies, setCompanies] = useState([]);
  const [companiesErr, setCompaniesErr] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);       // Col1 selection

  // ── Current logged-in admin
  const [currentUserId, setCurrentUserId] = useState(null);

  // Read from sessionStorage on mount
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('userData');
      if (storedData) {
        const userData = JSON.parse(storedData);
        if (userData?.user?.id) {
          setCurrentUserId(userData.user.id);
        }
      }
    } catch (e) {
      console.error('Error reading session:', e);
    }
  }, []);

  // ── Col 2 state
  const [users, setUsers] = useState([]);
  const [usersErr, setUsersErr] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);             // Col2 selection

  // ── Col 3 — Step A: user's companies
  const [userDetail, setUserDetail] = useState(null);                 // basic info
  const [userCompanies, setUserCompanies] = useState([]);             // companies user has access to
  const [userCompaniesErr, setUserCompaniesErr] = useState(null);
  const [loadingUserCompanies, setLoadingUserCompanies] = useState(false);

  // ── Col 3 — Step B: department picker for selected user-company
  const [activeCompany, setActiveCompany] = useState(null);           // which company chosen in step B
  const [depts, setDepts] = useState([]);                             // depts for this user+company
  const [deptsErr, setDeptsErr] = useState(null);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [grantedDeptIds, setGrantedDeptIds] = useState([]);          // local edit state

  // ── Save state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── 1. Load companies when currentUserId is ready ─────────────────────────
  useEffect(() => {
    setLoadingCompanies(true);
    const url = currentUserId
      ? `${API}/user-dept-access/companies?current_user_id=${currentUserId}`
      : `${API}/user-dept-access/companies`;
    safeFetch(url).then(({ data, error }) => {
      setCompaniesErr(error);
      setCompanies(Array.isArray(data) ? data : []);
      setLoadingCompanies(false);
    });
  }, [currentUserId]);

  // ── 2. Load users when Col1 company selected ──────────────────────────────
  useEffect(() => {
    if (!selectedCompany) { setUsers([]); return; }
    setLoadingUsers(true);
    setUsersErr(null);
    setSelectedUser(null);
    setUserDetail(null);
    setUserCompanies([]);
    setActiveCompany(null);
    setDepts([]);
    setGrantedDeptIds([]);
    safeFetch(`${API}/user-dept-access/companies/${selectedCompany.id}/users`).then(({ data, error }) => {
      setUsersErr(error);
      setUsers(Array.isArray(data) ? data : []);
      setLoadingUsers(false);
    });
  }, [selectedCompany]);

  // ── 3. Load user detail + user's companies when user selected ─────────────
  useEffect(() => {
    if (!selectedUser) return;
    setLoadingUserCompanies(true);
    setUserCompaniesErr(null);
    setActiveCompany(null);
    setDepts([]);
    setGrantedDeptIds([]);

    Promise.all([
      safeFetch(`${API}/user-dept-access/user/${selectedUser.id}/detail`),
      safeFetch(`${API}/user-dept-access/user/${selectedUser.id}/companies${currentUserId ? `?current_user_id=${currentUserId}` : ''}`),
    ]).then(([{ data: detail, error: e1 }, { data: comps, error: e2 }]) => {
      if (detail) setUserDetail(detail);
      setUserCompaniesErr(e1 || e2 || null);
      setUserCompanies(Array.isArray(comps) ? comps : []);
      setLoadingUserCompanies(false);
    });
  }, [selectedUser]);

  // ── 4. Load depts when user-company selected in Step B ───────────────────
  useEffect(() => {
    if (!selectedUser || !activeCompany) return;
    setLoadingDepts(true);
    setDeptsErr(null);
    safeFetch(
      `${API}/user-dept-access/user/${selectedUser.id}/company/${activeCompany.company_id}/departments`
    ).then(({ data, error }) => {
      if (error) {
        setDeptsErr(error);
        setDepts([]);
        setGrantedDeptIds([]);
      } else {
        setDepts(data?.departments || []);
        setGrantedDeptIds(data?.granted_dept_ids || []);
      }
      setLoadingDepts(false);
    });
  }, [selectedUser, activeCompany]);

  const toggleDept = (id) => {
    setGrantedDeptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!selectedUser || !activeCompany) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/user-dept-access/bulk-set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          company_id: activeCompany.company_id,
          department_ids: grantedDeptIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "Save failed");
      showToast("Department access saved ✓");

      // Refresh userCompanies to update granted counts
      const { data: comps } = await safeFetch(`${API}/user-dept-access/user/${selectedUser.id}/companies${currentUserId ? `?current_user_id=${currentUserId}` : ''}`);
      if (comps) setUserCompanies(comps);

      // Refresh user list badge
      const { data: updatedUsers } = await safeFetch(
        `${API}/user-dept-access/companies/${selectedCompany.id}/users`
      );
      if (updatedUsers) {
        setUsers(updatedUsers);
        const uu = updatedUsers.find(u => u.id === selectedUser.id);
        if (uu) setSelectedUser(uu);
      }
    } catch (e) {
      showToast(e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const grantedDepts = depts.filter(d => grantedDeptIds.includes(d.id));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: C.bg, minHeight: "100vh", color: C.text, padding: "24px",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        button { transition: all 0.15s; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: toast.ok ? C.greenSoft : C.redSoft,
          color: toast.ok ? C.green : C.red,
          border: `1px solid ${toast.ok ? C.green : C.red}44`,
          fontSize: 13, fontWeight: 500, animation: "fadeIn 0.2s ease",
          boxShadow: "0 8px 32px #0008",
        }}>{toast.msg}</div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
          👥 User Department Data Access
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
          Control which departments' data each user can see — globally across all pages.
        </p>
      </div>

      {/* 3-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 260px 1fr", gap: 14, alignItems: "start" }}>

        {/* ── COL 1: Companies ──────────────────────────────────────────── */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <ColHeader title="Companies" />
          <div style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            {loadingCompanies ? (
              <div style={{ padding: 24, textAlign: "center" }}><Spinner /></div>
            ) : companiesErr ? (
              <ErrBox msg={companiesErr} />
            ) : companies.length === 0 ? (
              <EmptyState icon="🏢" msg="No companies found" />
            ) : companies.map(c => (
              <button key={c.id} onClick={() => setSelectedCompany(c)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "12px 14px",
                border: "none", borderBottom: `1px solid ${C.border}22`,
                cursor: "pointer", textAlign: "left",
                color: selectedCompany?.id === c.id ? C.accent : C.text,
                background: selectedCompany?.id === c.id ? C.accentSoft : "transparent",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.company_name}</div>
                  {c.company_code && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{c.company_code}</div>}
                </div>
                <Badge>{c.user_count}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* ── COL 2: Users in selected company ─────────────────────────── */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <ColHeader title={selectedCompany ? `Users — ${selectedCompany.company_name}` : "Select a Company"} />
          <div style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            {!selectedCompany ? (
              <EmptyState icon="←" msg="Select a company first" />
            ) : loadingUsers ? (
              <div style={{ padding: 24, textAlign: "center" }}><Spinner /></div>
            ) : usersErr ? (
              <ErrBox msg={usersErr} />
            ) : users.length === 0 ? (
              <EmptyState icon="👤" msg="No users in this company" />
            ) : users.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u)} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                width: "100%", padding: "12px 14px",
                border: "none", borderBottom: `1px solid ${C.border}22`,
                cursor: "pointer", textAlign: "left",
                color: selectedUser?.id === u.id ? C.accent : C.text,
                background: selectedUser?.id === u.id ? C.accentSoft : "transparent",
              }}>
                <Avatar name={u.full_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.full_name}
                    {u.is_primary_company && (
                      <span style={{ marginLeft: 6, fontSize: 9, color: C.yellow, background: C.yellowSoft, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {u.role_name || "—"} · {u.dept_name || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{u.desg_name || ""}</div>
                </div>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  {u.granted_dept_count > 0
                    ? <Badge color={C.green} bg={C.greenSoft}>{u.granted_dept_count} depts</Badge>
                    : <Badge color={C.red} bg={C.redSoft}>No access</Badge>
                  }
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── COL 3: User detail → companies → dept picker ─────────────── */}
        <div style={{
          background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
          overflow: "hidden", animation: "fadeIn 0.2s ease",
        }}>
          {!selectedUser ? (
            <EmptyState icon="👆" msg="Select a company and user to manage department data access" />
          ) : loadingUserCompanies ? (
            <div style={{ padding: 48, textAlign: "center" }}><Spinner /></div>
          ) : (
            <>
              {/* ── User info header ────────────────────────────────────── */}
              <div style={{
                padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <Avatar name={userDetail?.full_name} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{userDetail?.full_name || selectedUser.full_name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {userDetail?.email || selectedUser.email}
                    {(userDetail?.phone || selectedUser.phone) && ` · ${userDetail?.phone || selectedUser.phone}`}
                  </div>
                </div>
                <Badge
                  color={(userDetail?.is_active ?? selectedUser.is_active) ? C.green : C.red}
                  bg={(userDetail?.is_active ?? selectedUser.is_active) ? C.greenSoft : C.redSoft}
                >
                  {(userDetail?.is_active ?? selectedUser.is_active) ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* ── Step A: User's companies (click to open dept picker) ── */}
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.muted,
                  textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
                }}>
                  Companies this user has access to
                  <span style={{ marginLeft: 8, color: C.textDim, fontWeight: 400, textTransform: "none", fontSize: 10 }}>
                    — click a company to set department data access
                  </span>
                </div>

                {userCompaniesErr ? (
                  <ErrBox msg={userCompaniesErr} />
                ) : userCompanies.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted }}>No companies found for this user</div>
                ) : userCompanies.map(uc => {
                  const isActive = activeCompany?.company_id === uc.company_id;
                  return (
                    <button
                      key={uc.company_id}
                      onClick={() => setActiveCompany(uc)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", padding: "10px 12px", marginBottom: 6,
                        borderRadius: 10, cursor: "pointer", textAlign: "left",
                        border: `1.5px solid ${isActive ? C.accent : C.border}`,
                        background: isActive ? C.accentSoft : C.card,
                        color: isActive ? C.accent : C.text,
                      }}
                    >
                      {/* Company icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isActive ? C.accent + "33" : C.border + "44",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                      }}>🏢</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{uc.company_name}</span>
                          {uc.is_primary_company && (
                            <span style={{ fontSize: 9, color: C.yellow, background: C.yellowSoft, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                              PRIMARY
                            </span>
                          )}
                          {isActive && (
                            <span style={{ fontSize: 9, color: C.accent, background: C.accentSoft, padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>
                              SELECTED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                          Role: <b style={{ color: isActive ? C.accent : C.text }}>{uc.role_name || "—"}</b>
                          {" · "}Dept: <b style={{ color: isActive ? C.accent : C.text }}>{uc.department_name || "—"}</b>
                          {" · "}Desg: <b style={{ color: isActive ? C.accent : C.text }}>{uc.designation_name || "—"}</b>
                        </div>
                      </div>

                      {/* Dept access badge */}
                      <div style={{ flexShrink: 0 }}>
                        {uc.granted_dept_count > 0
                          ? <Badge color={C.green} bg={C.greenSoft}>{uc.granted_dept_count} depts</Badge>
                          : <Badge color={C.red} bg={C.redSoft}>No access</Badge>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Step B: Dept picker for active company ──────────────── */}
              {!activeCompany ? (
                <div style={{ padding: "24px 18px", color: C.muted, fontSize: 13, textAlign: "center" }}>
                  ↑ Select a company above to manage its department data access
                </div>
              ) : loadingDepts ? (
                <div style={{ padding: 32, textAlign: "center" }}><Spinner /></div>
              ) : deptsErr ? (
                <ErrBox msg={deptsErr} />
              ) : (
                <div style={{ padding: "16px 18px" }}>
                  {/* Section label */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                    Department Data Access
                    <span style={{ marginLeft: 8, color: C.accent, fontWeight: 400, textTransform: "none", fontSize: 11 }}>
                      for {activeCompany.company_name}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>
                    Select which departments' data this user can see in <b style={{ color: C.text }}>{activeCompany.company_name}</b>.
                    No selection = no data visible. Page access is not affected.
                  </p>

                  {/* Currently granted tags */}
                  <div style={{
                    minHeight: 44, padding: "8px 10px", marginBottom: 14,
                    background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
                  }}>
                    {grantedDepts.length === 0 ? (
                      <span style={{ fontSize: 12, color: C.muted }}>No departments selected — user will see no data</span>
                    ) : grantedDepts.map(d => (
                      <Tag key={d.id} onRemove={() => toggleDept(d.id)}>{d.department_name}</Tag>
                    ))}
                  </div>

                  {/* Dept toggle buttons */}
                  {depts.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
                      No departments registered for this user in this company
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                        Departments registered for this user · click to grant / revoke
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                        {depts.map(d => {
                          const granted = grantedDeptIds.includes(d.id);
                          return (
                            <button key={d.id} onClick={() => toggleDept(d.id)} style={{
                              padding: "5px 14px", borderRadius: 8,
                              fontSize: 12, fontWeight: 500, cursor: "pointer",
                              border: `1px solid ${granted ? C.green : C.border}`,
                              background: granted ? C.greenSoft : C.card,
                              color: granted ? C.green : C.textDim,
                            }}>
                              {granted ? "✓ " : ""}{d.department_name}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Save */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "10px 28px", borderRadius: 10,
                        background: C.accent, color: "#fff",
                        border: "none", cursor: saving ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                    >
                      {saving ? <><Spinner /> Saving…</> : "Save Access"}
                    </button>
                    <span style={{ fontSize: 12, color: C.muted }}>
                      {grantedDeptIds.length} dept{grantedDeptIds.length !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
