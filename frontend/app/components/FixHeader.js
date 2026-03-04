// app/components/FixHeader.jsx 
"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Settings as SettingsIcon, Star, HelpCircle, Lock, LockOpen, Upload, LogOut } from "lucide-react";
import { usePanelWidth } from "../context/PanelWidthContext";

export default function Header() {
  const { toggleLeftPanel, isLeftPanelOpen, addTab, setShowAddCompany } = usePanelWidth();
  const [logoUrl, setLogoUrl] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  // Load logo from localStorage on mount (client-side only)
  useEffect(() => {
    const savedLogo = localStorage.getItem('headerLogo');
    if (savedLogo) {
      setLogoUrl(savedLogo);
    }
  }, []);

  // Load and log user menu data
  useEffect(() => {
    const storedUser = sessionStorage.getItem('userData');
    if (!storedUser) return;

    try {
      const parsed = JSON.parse(storedUser);
      const user = parsed?.user;

      const primaryAccess =
        user?.accesses?.find(a => a.is_primary_company) ||
        user?.accesses?.[0];

      console.log('📋 User Role:', primaryAccess?.role?.name);
      console.log('📋 User Department:', primaryAccess?.department?.name);
      console.log('📋 User Designation:', primaryAccess?.designation?.name);
    } catch (e) {}
  }, []);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target.result);
        localStorage.setItem('headerLogo', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔥 SETTINGS NAVIGATION FUNCTION
  const handleSettingsClick = () => {
    if (!isLeftPanelOpen) return;
    
    setShowAddCompany(false);
    addTab("/settings", "Settings");
    router.push("/settings");
  };

  // LOGOUT FUNCTION
  const handleLogout = () => {
    if (!isLeftPanelOpen) return;
    
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      console.log('🔒 Logging out...');
      
      sessionStorage.clear();
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userData');
      
      window.location.href = '/';
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "43px",
        background: "linear-gradient(to right, #1a1a1a 0%, #2a2a2a 15%, #3a3a3a 30%, #4a5a6a 50%, #5a7a9a 70%, #6a9aba 85%, #87CEEB 100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        zIndex: 200,
        pointerEvents: isLeftPanelOpen ? "auto" : "none",
        opacity: isLeftPanelOpen ? 1 : 0.5,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Lock Overlay for Header */}
      {!isLeftPanelOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(1px)",
            zIndex: 100,
            pointerEvents: "none",
          }}
        />
      )}

      {/* LEFT SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative", zIndex: 101 }}>
        {/* Logo Upload Area */}
        <div 
          onClick={handleLogoClick}
          style={{ 
            height: "32px",
            minWidth: "120px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
            background: logoUrl ? "transparent" : "rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            border: logoUrl ? "none" : "2px dashed rgba(255, 255, 255, 0.3)",
            padding: "0 12px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!logoUrl && isLeftPanelOpen) {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            if (!logoUrl && isLeftPanelOpen) {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }
          }}
        >
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{
                maxHeight: "30px",
                maxWidth: "120px",
                objectFit: "contain",
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
              }}
            />
          ) : (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "12px",
              fontWeight: "500"
            }}>
              <Upload size={14} />
              <span>Upload Logo</span>
            </div>
          )}
        </div>
        
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* MENU BUTTON */}
        <button
          onClick={toggleLeftPanel}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: isLeftPanelOpen 
              ? "rgba(255, 255, 255, 0.2)" 
              : "rgba(255, 215, 0, 0.35)",
            border: isLeftPanelOpen 
              ? "1px solid rgba(255, 255, 255, 0.4)" 
              : "2px solid #FFD700",
            borderRadius: "6px",
            color: "white",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: isLeftPanelOpen 
              ? "0 2px 4px rgba(0,0,0,0.2)" 
              : "0 4px 12px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
            position: "relative",
            zIndex: 300,
            animation: !isLeftPanelOpen ? "pulse 2s infinite" : "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isLeftPanelOpen 
              ? "rgba(255, 255, 255, 0.3)" 
              : "rgba(255, 215, 0, 0.45)";
            e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
            e.currentTarget.style.boxShadow = isLeftPanelOpen 
              ? "0 3px 6px rgba(0,0,0,0.25)" 
              : "0 6px 16px rgba(255, 215, 0, 0.6), 0 0 25px rgba(255, 215, 0, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isLeftPanelOpen 
              ? "rgba(255, 255, 255, 0.2)" 
              : "rgba(255, 215, 0, 0.35)";
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = isLeftPanelOpen 
              ? "0 2px 4px rgba(0,0,0,0.2)" 
              : "0 4px 12px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3)";
          }}
        >
          {isLeftPanelOpen ? (
            <>
              <LockOpen size={14} strokeWidth={2.5} />
              <span>Menu</span>
            </>
          ) : (
            <>
              <Lock size={14} strokeWidth={2.5} />
              <span>Unlock</span>
            </>
          )}
        </button>
      </div>

      {/* CENTER SECTION - Search */}
      <div
        style={{
          flex: 1,
          maxWidth: "500px",
          margin: "0 24px",
          position: "relative",
          zIndex: 101,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
          }}
        >
          <input
            type="text"
            placeholder="Menu Search"
            disabled={!isLeftPanelOpen}
            style={{
              width: "100%",
              padding: "5px 32px 5px 12px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(255, 255, 255, 0.92)",
              fontSize: "12px",
              outline: "none",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              height: "30px",
              cursor: isLeftPanelOpen ? "text" : "not-allowed",
            }}
            onFocus={(e) => {
              if (isLeftPanelOpen) {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.92)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#888",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          >
            🔍
          </div>
        </div>
        
        {/* Spider SVG */}
        <div
          style={{
            position: "absolute",
            left: "-155px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            width: "35px",
            height: "30px",
            zIndex: 10,
          }}
        >
          <svg
            width="35"
            height="30"
            viewBox="0 0 35 30"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: "visible" }}
          >
            <g>
              <animateTransform
                attributeName="transform"
                additive="sum"
                type="translate"
                values="0 0; 0 -1; 0 0"
                dur="3s"
                repeatCount="indefinite"
              />
              
              <ellipse cx="17.5" cy="15" rx="5" ry="6" fill="#FFB3D9" stroke="#FF69B4" strokeWidth="0.5" opacity="0.95">
                <animate attributeName="opacity" values="0.95;1;0.95" dur="2s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="17.5" cy="10" rx="3" ry="4" fill="#FFC0E0" stroke="#FF69B4" strokeWidth="0.5" opacity="0.95">
                <animate attributeName="opacity" values="0.95;1;0.95" dur="2s" repeatCount="indefinite" />
              </ellipse>
              
              <g stroke="#FF85C1" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.9">
                <path d="M 20 13 Q 24 10, 27 8">
                  <animate attributeName="d" values="M 20 13 Q 24 10, 27 8; M 20 13 Q 25 9, 28 7; M 20 13 Q 24 10, 27 8" dur="2.5s" repeatCount="indefinite" />
                </path>
                <path d="M 20.5 15 Q 24 14, 27 13">
                  <animate attributeName="d" values="M 20.5 15 Q 24 14, 27 13; M 20.5 15 Q 25 13.5, 28 12.5; M 20.5 15 Q 24 14, 27 13" dur="2.8s" repeatCount="indefinite" />
                </path>
                <path d="M 21 18 Q 25 18, 28 19">
                  <animate attributeName="d" values="M 21 18 Q 25 18, 28 19; M 21 18 Q 26 18.5, 29 19.5; M 21 18 Q 25 18, 28 19" dur="3s" repeatCount="indefinite" />
                </path>
                <path d="M 20.5 20 Q 24 21, 27 23">
                  <animate attributeName="d" values="M 20.5 20 Q 24 21, 27 23; M 20.5 20 Q 25 21.5, 28 24; M 20.5 20 Q 24 21, 27 23" dur="2.7s" repeatCount="indefinite" />
                </path>
                <path d="M 15 13 Q 11 10, 8 8">
                  <animate attributeName="d" values="M 15 13 Q 11 10, 8 8; M 15 13 Q 10 9, 7 7; M 15 13 Q 11 10, 8 8" dur="2.6s" repeatCount="indefinite" />
                </path>
                <path d="M 14.5 15 Q 11 14, 8 13">
                  <animate attributeName="d" values="M 14.5 15 Q 11 14, 8 13; M 14.5 15 Q 10 13.5, 7 12.5; M 14.5 15 Q 11 14, 8 13" dur="2.9s" repeatCount="indefinite" />
                </path>
                <path d="M 14 18 Q 10 18, 7 19">
                  <animate attributeName="d" values="M 14 18 Q 10 18, 7 19; M 14 18 Q 9 18.5, 6 19.5; M 14 18 Q 10 18, 7 19" dur="3.1s" repeatCount="indefinite" />
                </path>
                <path d="M 14.5 20 Q 11 21, 8 23">
                  <animate attributeName="d" values="M 14.5 20 Q 11 21, 8 23; M 14.5 20 Q 10 21.5, 7 24; M 14.5 20 Q 11 21, 8 23" dur="2.8s" repeatCount="indefinite" />
                </path>
              </g>
              
              <circle cx="16.5" cy="9" r="0.8" fill="#FF1493" opacity="0.9">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="18.5" cy="9" r="0.8" fill="#FF1493" opacity="0.9">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="1.5s" repeatCount="indefinite" />
              </circle>
              
              <circle cx="16.5" cy="9" r="1.5" fill="#FF69B4" opacity="0.3">
                <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="18.5" cy="9" r="1.5" fill="#FF69B4" opacity="0.3">
                <animate attributeName="r" values="1.5;2;1.5" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="1.5s" repeatCount="indefinite" />
              </circle>
              
              <g stroke="#FF69B4" strokeWidth="0.3" opacity="0.6">
                <line x1="15.5" y1="14" x2="14" y2="13.5" />
                <line x1="19.5" y1="14" x2="21" y2="13.5" />
                <line x1="15.5" y1="16.5" x2="14" y2="17" />
                <line x1="19.5" y1="16.5" x2="21" y2="17" />
              </g>
              
              <g fill="#FF1493" opacity="0.4">
                <circle cx="16.5" cy="14" r="0.6" />
                <circle cx="18.5" cy="15" r="0.6" />
                <circle cx="17.5" cy="17" r="0.6" />
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative", zIndex: 101 }}>
        {/* Notification */}
        <div
          style={{
            position: "relative",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(135, 206, 250, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            border: "1px solid rgba(135, 206, 250, 0.25)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
          onMouseEnter={(e) => {
            if (isLeftPanelOpen) {
              e.currentTarget.style.background = "rgba(135, 206, 250, 0.25)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 3px 8px rgba(135, 206, 250, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(135, 206, 250, 0.15)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
          }}
        >
          <Bell size={16} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
          <span
            style={{
              position: "absolute",
              top: "0px",
              right: "0px",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)",
              color: "white",
              fontSize: "9px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(0,0,0,0.3)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            20
          </span>
        </div>

        {/* 🔥 Settings Icon - With Navigation */}
        <div
          onClick={handleSettingsClick}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: pathname === "/settings" ? "rgba(147, 112, 219, 0.3)" : "rgba(147, 112, 219, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            border: "1px solid rgba(147, 112, 219, 0.25)",
            boxShadow: pathname === "/settings" ? "0 3px 8px rgba(147, 112, 219, 0.4)" : "0 2px 4px rgba(0,0,0,0.2)",
          }}
          onMouseEnter={(e) => {
            if (isLeftPanelOpen) {
              e.currentTarget.style.background = "rgba(147, 112, 219, 0.25)";
              e.currentTarget.style.transform = "rotate(45deg) scale(1.1)";
              e.currentTarget.style.boxShadow = "0 3px 8px rgba(147, 112, 219, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (isLeftPanelOpen) {
              e.currentTarget.style.background = pathname === "/settings" ? "rgba(147, 112, 219, 0.3)" : "rgba(147, 112, 219, 0.15)";
              e.currentTarget.style.transform = "rotate(0deg) scale(1)";
              e.currentTarget.style.boxShadow = pathname === "/settings" ? "0 3px 8px rgba(147, 112, 219, 0.4)" : "0 2px 4px rgba(0,0,0,0.2)";
            }
          }}
        >
          <SettingsIcon size={16} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
        </div>

        {/* Star Icon */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255, 215, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
          onMouseEnter={(e) => {
            if (isLeftPanelOpen) {
              e.currentTarget.style.background = "rgba(255, 215, 0, 0.3)";
              e.currentTarget.style.transform = "scale(1.15) rotate(10deg)";
              e.currentTarget.style.boxShadow = "0 3px 8px rgba(255, 215, 0, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 215, 0, 0.15)";
            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
          }}
        >
          <Star size={16} color="#FFD700" fill="#FFD700" strokeWidth={1.5} />
        </div>

        {/* Help Icon */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(144, 238, 144, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            border: "1px solid rgba(144, 238, 144, 0.25)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
          onMouseEnter={(e) => {
            if (isLeftPanelOpen) {
              e.currentTarget.style.background = "rgba(144, 238, 144, 0.25)";
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 3px 8px rgba(144, 238, 144, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(144, 238, 144, 0.15)";
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
          }}
        >
          <HelpCircle size={16} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          disabled={!isLeftPanelOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            background: "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "6px",
            color: "white",
            fontSize: "13px",
            fontWeight: "700",
            cursor: isLeftPanelOpen ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(255, 0, 0, 0.4)",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            opacity: isLeftPanelOpen ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (isLeftPanelOpen) {
              e.currentTarget.style.background = "linear-gradient(135deg, #ff5555 0%, #dd0000 100%)";
              e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 0, 0, 0.6)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)";
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(255, 0, 0, 0.4)";
          }}
        >
          <LogOut size={14} strokeWidth={2.5} />
          <span>LOGOUT</span>
        </button>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3);
          }
          50% {
            box-shadow: 0 6px 20px rgba(255, 215, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.5);
          }
        }
      `}</style>
    </div>
  );
}