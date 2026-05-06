// src/PricingModal.jsx
import { useState } from "react";
import { usePaystack, PLANS } from "./usePaystack";
import { useAuth } from "./AuthContext";

const T = {
  bg: "#04080f", surface: "#080e1a", card: "#0c1422",
  border: "#0e1f35", border2: "#1a3050",
  text: "#c8d8e8", muted: "#3a5570", dim: "#1e3248",
  cyan: "#00d4ff", green: "#00ff88", red: "#ff3355",
  amber: "#ffb800", white: "#e8f4ff",
};

function PlanCard({ planKey, plan, current, onUpgrade, loading }) {
  const isCurrentPlan = current === planKey;
  const accent = planKey === "pro" ? T.cyan : T.amber;

  return (
    <div style={{
      background: T.card, border: `1px solid ${isCurrentPlan ? accent : T.border}`,
      borderRadius: 8, padding: 26, position: "relative", overflow: "hidden",
      boxShadow: isCurrentPlan ? `0 0 20px ${accent}22` : "none",
      transition: "all 0.2s",
    }}>
      {isCurrentPlan && (
        <div style={{ position: "absolute", top: 12, right: 12, background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: 3, padding: "3px 10px", fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: accent, letterSpacing: "0.1em" }}>
          CURRENT PLAN
        </div>
      )}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}44, transparent)` }}/>

      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.muted, letterSpacing: "0.12em", marginBottom: 8 }}>{plan.name.toUpperCase()}</div>

      {/* USD Price — prominent */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontWeight: 700, fontSize: 32, color: accent }}>${plan.priceUSD}</span>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: T.muted }}>/month</span>
      </div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.dim, marginBottom: 20 }}>Billed monthly · Cancel anytime</div>

      <div style={{ marginBottom: 24 }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 9 }}>
            <span style={{ color: T.green, fontSize: 13, marginTop: 1 }}>✓</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: T.text, lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => !isCurrentPlan && onUpgrade(planKey)}
        disabled={isCurrentPlan || loading}
        style={{
          width: "100%", padding: "13px", borderRadius: 5, cursor: isCurrentPlan ? "default" : "pointer",
          background: isCurrentPlan ? "none" : accent,
          color: isCurrentPlan ? T.muted : T.bg,
          border: isCurrentPlan ? `1px solid ${T.border}` : "none",
          fontFamily: "'Share Tech Mono',monospace", fontSize: 13,
          fontWeight: 700, letterSpacing: "0.08em",
          boxShadow: isCurrentPlan ? "none" : `0 0 16px ${accent}44`,
          transition: "all 0.2s", opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "PROCESSING..." : isCurrentPlan ? "ACTIVE" : `UPGRADE TO ${plan.name.toUpperCase()}`}
      </button>
    </div>
  );
}

export default function PricingModal({ onClose }) {
  const { profile } = useAuth();
  const { initPayment } = usePaystack();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (planKey) => {
    setLoading(true);
    try { await initPayment(planKey); }
    catch (e) { console.error("Payment error:", e); }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(4,8,15,0.96)",
      backdropFilter: "blur(4px)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, overflow: "auto",
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@700&display=swap');`}</style>

      <div style={{ width: "100%", maxWidth: 740 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.muted, letterSpacing: "0.15em", marginBottom: 10 }}>◈ UPGRADE YOUR PLAN</div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 28, color: T.white, marginBottom: 8 }}>Unlock Your Full Edge</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: T.dim }}>
            Serious traders track every detail. Stop leaving insights on the table.
          </div>
        </div>

        {/* Free tier bar */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "14px 20px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: T.text }}>FREE</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: T.dim }}>20 trades/month · Basic journal only · No analytics</span>
          </div>
          {profile?.tier === "free" && (
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: T.cyan, border: `1px solid ${T.cyan}44`, padding: "3px 10px", borderRadius: 3 }}>CURRENT</span>
          )}
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
          {Object.entries(PLANS).map(([key, plan]) => (
            <PlanCard key={key} planKey={key} plan={plan} current={profile?.tier} onUpgrade={handleUpgrade} loading={loading}/>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.dim, marginBottom: 12 }}>
            Payments secured by Paystack · USD pricing · Instant activation
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color: T.muted, letterSpacing: "0.06em" }}>
            ← BACK TO APP
          </button>
        </div>
      </div>
    </div>
  );
}
