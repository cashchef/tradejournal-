// src/AuthScreen.jsx — TradeEdge redesign
import { useState } from "react";
import { useAuth } from "./AuthContext";

const T = {
  bg:      "#0a0e1a",
  surface: "#0d1220",
  card:    "#111827",
  border:  "#1e2d45",
  border2: "#263650",
  text:    "#d1e0f0",
  muted:   "#4a6280",
  dim:     "#1e2d45",
  cyan:    "#3b9eff",
  cyanGlow:"#3b9eff33",
  green:   "#22d47a",
  red:     "#f0455a",
  white:   "#f0f6ff",
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{flexShrink:0}}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function AuthScreen() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) { setError("Display name required."); setLoading(false); return; }
        await registerWithEmail(email, password, name);
      }
    } catch (e) {
      const msgs = {
        "auth/user-not-found":       "No account with that email.",
        "auth/wrong-password":       "Incorrect password.",
        "auth/invalid-credential":   "Invalid email or password.",
        "auth/email-already-in-use": "Email already registered.",
        "auth/weak-password":        "Password must be 6+ characters.",
        "auth/invalid-email":        "Invalid email address.",
      };
      setError(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try { await loginWithGoogle(); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }

        /* Background grid */
        .auth-bg::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(${T.border}55 1px, transparent 1px),
            linear-gradient(90deg, ${T.border}55 1px, transparent 1px);
          background-size: 44px 44px;
          pointer-events: none;
        }
        .auth-bg::after {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, ${T.cyan}0c 0%, transparent 70%);
          top: -120px; left: 50%; transform: translateX(-50%);
          pointer-events: none;
        }

        .auth-input {
          background: ${T.surface}; border: 1px solid ${T.border};
          border-radius: 10px; color: ${T.white};
          padding: 12px 16px; font-size: 14px; width: 100%;
          outline: none; font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input:focus {
          border-color: ${T.cyan};
          box-shadow: 0 0 0 3px ${T.cyanGlow};
        }
        .auth-input::placeholder { color: ${T.muted}; }

        .auth-btn-primary {
          width: 100%; background: ${T.cyan}; color: #fff; border: none;
          border-radius: 10px; padding: 13px; font-family: 'Inter', sans-serif;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 0 20px ${T.cyanGlow};
        }
        .auth-btn-primary:hover {
          filter: brightness(1.1);
          box-shadow: 0 0 30px ${T.cyan}55;
          transform: translateY(-1px);
        }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .auth-btn-google {
          width: 100%; background: ${T.surface};
          color: ${T.text}; border: 1px solid ${T.border};
          border-radius: 10px; padding: 12px 16px;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .auth-btn-google:hover {
          border-color: ${T.cyan};
          color: ${T.white};
          background: ${T.cyanGlow};
        }

        .auth-label {
          font-family: 'Inter', sans-serif; font-size: 12px; color: ${T.muted};
          font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
          display: block; margin-bottom: 6px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-card { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      <div className="auth-bg" style={{position:"absolute",inset:0,pointerEvents:"none"}}/>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }} className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            background: `linear-gradient(135deg, ${T.cyan}, #1a6fd4)`,
            borderRadius: 14, display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: `0 0 28px ${T.cyanGlow}`,
            marginBottom: 14,
          }}>◈</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 26, color: T.white, letterSpacing: "-0.01em" }}>
            TradeEdge
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.muted, letterSpacing: "0.15em", marginTop: 4 }}>
            TERMINAL
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: 32, position: "relative", overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}>
          {/* Top accent line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.cyan}66, transparent)` }}/>

          <div style={{ fontSize: 13, color: T.muted, fontWeight: 500, marginBottom: 22 }}>
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </div>

          {/* Google */}
          <button className="auth-btn-google" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon/>
            <span>Continue with Google</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.muted }}>or</span>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
          </div>

          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label className="auth-label">Display Name</label>
              <input className="auth-input" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="auth-label">Email</label>
            <input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="trader@example.com" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="auth-label">Password</label>
            <input className="auth-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>

          {error && (
            <div style={{
              background: "#2d0a1288", border: `1px solid ${T.red}44`,
              borderRadius: 8, padding: "11px 14px", marginBottom: 16,
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.red, lineHeight: 1.5,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span>⚠</span> <span>{error}</span>
            </div>
          )}

          <button className="auth-btn-primary" onClick={handle} disabled={loading}>
            {loading ? "···" : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button
              onClick={()=>{ setMode(m=>m==="login"?"register":"login"); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted, fontWeight: 500 }}
            >
              {mode === "login" ? "Don't have an account? Sign up →" : "← Back to sign in"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.dim, letterSpacing: "0.1em" }}>
          TRACK · ANALYZE · IMPROVE
        </div>
      </div>
    </div>
  );
}
