// src/UpgradePrompt.jsx
// Drop this anywhere a Pro/Elite feature is locked

const T = {
  bg: "#04080f", surface: "#080e1a", card: "#0c1422",
  border: "#0e1f35", cyan: "#00d4ff", amber: "#ffb800",
  text: "#c8d8e8", muted: "#3a5570", dim: "#1e3248",
};

export default function UpgradePrompt({ feature, requiredTier = "pro", onUpgrade }) {
  const accent = requiredTier === "elite" ? T.amber : T.cyan;
  const tierLabel = requiredTier === "elite" ? "ELITE" : "PRO";

  return (
    <div style={{
      background: T.card, border: `1px solid ${accent}33`,
      borderRadius: 8, padding: "28px 24px", textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}44, transparent)` }}/>

      <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>

      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: T.muted, letterSpacing: "0.12em", marginBottom: 8 }}>
        {tierLabel} FEATURE
      </div>

      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 8 }}>
        {feature} requires {tierLabel}
      </div>

      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: T.dim, marginBottom: 18, lineHeight: 1.6 }}>
        Upgrade your plan to unlock this feature<br/>and all other {tierLabel.toLowerCase()} tools.
      </div>

      <button onClick={onUpgrade} style={{
        background: accent, color: T.bg, border: "none",
        borderRadius: 4, padding: "10px 24px",
        fontFamily: "'Share Tech Mono',monospace", fontSize: 12,
        fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer",
        boxShadow: `0 0 16px ${accent}44`, transition: "all 0.2s",
      }}
        onMouseEnter={e=>e.target.style.boxShadow=`0 0 28px ${accent}88`}
        onMouseLeave={e=>e.target.style.boxShadow=`0 0 16px ${accent}44`}
      >
        UPGRADE TO {tierLabel} →
      </button>
    </div>
  );
}

