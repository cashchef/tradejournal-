// src/AuthScreen.jsx
import { useState } from "react";
import { useAuth } from "./AuthContext";

const T = {
  bg: "#04080f", surface: "#080e1a",
  border: "#0e1f35", border2: "#1a3050",
  text: "#c8d8e8", muted: "#3a5570", dim: "#1e3248",
  cyan: "#00d4ff", red: "#ff3355", white: "#e8f4ff",
};

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      backgroundImage: `linear-gradient(${T.border}44 1px, transparent 1px), linear-gradient(90deg, ${T.border}44 1px, transparent 1px)`,
      backgroundSize: "40px 40px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .auth-input {
          background: #04080f; border: 1px solid #1a3050; border-radius: 6px;
          color: #e8f4ff; padding: 14px 16px; font-size: 15px; width: 100%;
          outline: none; font-family: 'Share Tech Mono', monospace;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input:focus { border-color: #00d4ff; box-shadow: 0 0 0 2px #00d4ff18; }
        .auth-input::placeholder { color: #3a5570; font-size: 14px; }
        .auth-btn-primary {
          width: 100%; background: #00d4ff; color: #04080f; border: none;
          border-radius: 6px; padding: 15px; font-family: 'Share Tech Mono', monospace;
          font-size: 15px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 0 16px #00d4ff44;
        }
        .auth-btn-primary:hover { box-shadow: 0 0 28px #00d4ff88; transform: translateY(-1px); }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .auth-btn-google {
          width: 100%; background: #080e1a; color: #c8d8e8;
          border: 1px solid #1a3050; border-radius: 6px; padding: 14px 16px;
          font-family: 'Share Tech Mono', monospace; font-size: 14px;
          cursor: pointer; transition: all 0.2s; letter-spacing: 0.06em;
          display: flex; align-items: center; justify-content: center; gap: 12px;
        }
        .auth-btn-google:hover { border-color: #00d4ff; color: #00d4ff; background: #003d4d22; }
        .auth-label {
          font-family: 'Share Tech Mono', monospace; font-size: 12px; color: #3a5570;
          letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 7px;
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, background: T.cyan, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: `0 0 28px ${T.cyan}66`, marginBottom: 14 }}>◈</div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 30, color: T.white, letterSpacing: "0.1em" }}>TRADELOG</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: T.muted, letterSpacing: "0.2em", marginTop: 4 }}>TERMINAL v2</div>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 32, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.cyan}55, transparent)` }}/>

          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: T.muted, letterSpacing: "0.1em", marginBottom: 24 }}>
            {mode === "login" ? "◈ SIGN IN TO YOUR ACCOUNT" : "◈ CREATE NEW ACCOUNT"}
          </div>

          {/* Google */}
          <button className="auth-btn-google" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon/>
            <span>CONTINUE WITH GOOGLE</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: T.dim }}>OR</span>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
          </div>

          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label className="auth-label">Display Name</label>
              <input className="auth-input" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="auth-label">Email</label>
            <input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="trader@example.com" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label className="auth-label">Password</label>
            <input className="auth-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>

          {error && (
            <div style={{ background: "#2d001088", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "12px 14px", marginBottom: 16, fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: T.red, lineHeight: 1.6 }}>
              ⚠ {error}
            </div>
          )}

          <button className="auth-btn-primary" onClick={handle} disabled={loading}>
            {loading ? "···" : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={()=>{ setMode(m=>m==="login"?"register":"login"); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: T.muted, letterSpacing: "0.06em" }}>
              {mode === "login" ? "No account? Create one →" : "← Back to sign in"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: T.dim, letterSpacing: "0.1em" }}>
          TRACK · ANALYZE · IMPROVE
        </div>
      </div>
    </div>
  );
}
