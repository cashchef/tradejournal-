// src/AuthScreen.jsx
import { useState } from "react";
import { useAuth } from "./AuthContext";

const T = {
  bg: "#04080f", surface: "#080e1a", card: "#0c1422",
  border: "#0e1f35", border2: "#1a3050",
  text: "#c8d8e8", muted: "#3a5570", dim: "#1e3248",
  cyan: "#00d4ff", green: "#00ff88", red: "#ff3355",
  amber: "#ffb800", white: "#e8f4ff",
};

export default function AuthScreen() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [mode,     setMode]     = useState("login"); // "login" | "register"
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
        "auth/user-not-found":   "No account with that email.",
        "auth/wrong-password":   "Incorrect password.",
        "auth/email-already-in-use": "Email already registered.",
        "auth/weak-password":    "Password must be 6+ characters.",
        "auth/invalid-email":    "Invalid email address.",
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
      minHeight: "100vh", background: T.bg, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      backgroundImage: `linear-gradient(${T.border}33 1px, transparent 1px), linear-gradient(90deg, ${T.border}33 1px, transparent 1px)`,
      backgroundSize: "40px 40px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .auth-input {
          background: #04080f; border: 1px solid #0e1f35;
          border-radius: 4px; color: #c8d8e8; padding: 11px 14px;
          font-size: 13px; width: 100%; outline: none;
          font-family: 'Share Tech Mono', monospace;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input:focus { border-color: #00d4ff; box-shadow: 0 0 0 2px #00d4ff18; }
        .auth-input::placeholder { color: #3a5570; }
        .auth-btn-primary {
          width: 100%; background: #00d4ff; color: #04080f;
          border: none; border-radius: 4px; padding: 12px;
          font-family: 'Share Tech Mono', monospace; font-size: 13px;
          font-weight: 700; letter-spacing: 0.1em; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 0 16px #00d4ff44;
        }
        .auth-btn-primary:hover { box-shadow: 0 0 28px #00d4ff88; transform: translateY(-1px); }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .auth-btn-google {
          width: 100%; background: none; color: #c8d8e8;
          border: 1px solid #1a3050; border-radius: 4px; padding: 11px;
          font-family: 'Share Tech Mono', monospace; font-size: 12px;
          cursor: pointer; transition: all 0.2s; letter-spacing: 0.06em;
        }
        .auth-btn-google:hover { border-color: #00d4ff; color: #00d4ff; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, background: T.cyan, borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: `0 0 24px ${T.cyan}66`, marginBottom: 12,
          }}>◈</div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 22, color: T.white, letterSpacing: "0.1em" }}>TRADELOG</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: T.muted, letterSpacing: "0.2em", marginTop: 2 }}>TERMINAL v2</div>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 28, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.cyan}44, transparent)` }}/>

          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.muted, letterSpacing: "0.12em", marginBottom: 20 }}>
            {mode === "login" ? "◈ SIGN IN TO YOUR ACCOUNT" : "◈ CREATE NEW ACCOUNT"}
          </div>

          {/* Google */}
          <button className="auth-btn-google" onClick={handleGoogle} disabled={loading}>
            <span style={{ marginRight: 8 }}>G</span> CONTINUE WITH GOOGLE
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: T.dim }}>OR</span>
            <div style={{ flex: 1, height: 1, background: T.border }}/>
          </div>

          {/* Name (register only) */}
          {mode === "register" && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: T.muted, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>DISPLAY NAME</label>
              <input className="auth-input" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: T.muted, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>EMAIL</label>
            <input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="trader@example.com" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: T.muted, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>PASSWORD</label>
            <input className="auth-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>

          {error && (
            <div style={{ background: "#2d001088", border: `1px solid ${T.red}44`, borderRadius: 4, padding: "8px 12px", marginBottom: 14, fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.red }}>
              ⚠ {error}
            </div>
          )}

          <button className="auth-btn-primary" onClick={handle} disabled={loading}>
            {loading ? "..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={()=>{ setMode(m=>m==="login"?"register":"login"); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.muted, letterSpacing: "0.06em" }}>
              {mode === "login" ? "No account? Create one →" : "← Back to sign in"}
            </button>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ textAlign: "center", marginTop: 20, fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: T.dim, letterSpacing: "0.1em" }}>
          TRACK · ANALYZE · IMPROVE
        </div>
      </div>
    </div>
  );
}

