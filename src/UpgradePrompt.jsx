// src/UpgradePrompt.jsx — TradeEdge redesign
const T = {
  card:    "#111827",
  border:  "#1e2d45",
  cyan:    "#3b9eff",
  cyanGlow:"#3b9eff33",
  amber:   "#f5a623",
  amberDim:"#2a1a00",
  text:    "#d1e0f0",
  muted:   "#4a6280",
  white:   "#f0f6ff",
};

export default function UpgradePrompt({ feature, requiredTier = "pro", onUpgrade }) {
  const accent    = requiredTier === "elite" ? T.amber : T.cyan;
  const tierLabel = requiredTier === "elite" ? "Elite" : "Pro";

  return (
    <div style={{
      background:   T.card,
      border:       `1px solid ${accent}33`,
      borderRadius: 14,
      padding:      "40px 32px",
      textAlign:    "center",
      position:     "relative",
      overflow:     "hidden",
      maxWidth:     440,
      margin:       "0 auto",
    }}>
      {/* Top glow line */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${accent}88, transparent)` }}/>

      {/* Lock icon */}
      <div style={{
        width:56, height:56, borderRadius:14,
        background:`${accent}15`, border:`1px solid ${accent}33`,
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        marginBottom:18,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:accent, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>
        {tierLabel} Feature
      </div>

      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:18, color:T.white, marginBottom:8 }}>
        {feature}
      </div>

      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:T.muted, marginBottom:24, lineHeight:1.6 }}>
        Upgrade to {tierLabel} to unlock this feature and all other {tierLabel.toLowerCase()} tools.
      </div>

      <button
        onClick={onUpgrade}
        style={{
          background: accent, color:"#fff", border:"none",
          borderRadius:10, padding:"12px 28px",
          fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600,
          cursor:"pointer", boxShadow:`0 0 20px ${accent}44`,
          transition:"all 0.2s",
        }}
        onMouseEnter={e=>{ e.currentTarget.style.filter="brightness(1.1)"; e.currentTarget.style.transform="translateY(-1px)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.filter="none"; e.currentTarget.style.transform="none"; }}
      >
        Upgrade to {tierLabel} →
      </button>
    </div>
  );
}
