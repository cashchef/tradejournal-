// src/PricingModal.jsx — TradeEdge redesign
import { useState } from "react";
import { usePaystack, PLANS } from "./usePaystack";
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
  amber:   "#f5a623",
  white:   "#f0f6ff",
};

const CheckIcon = ({color}) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color||T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

function PlanCard({ planKey, plan, current, onUpgrade, loading }) {
  const isCurrent = current === planKey;
  const isPro     = planKey === "pro";
  const accent    = isPro ? T.cyan : T.amber;

  return (
    <div style={{
      background:  T.card,
      border:      `1px solid ${isCurrent ? accent : isPro ? T.border2 : T.border}`,
      borderRadius: 14,
      padding:     28,
      position:    "relative",
      overflow:    "hidden",
      transition:  "all 0.2s",
      boxShadow:   isCurrent ? `0 0 24px ${accent}22` : isPro ? `0 0 20px ${accent}11` : "none",
    }}>
      {/* Top accent line */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${accent}88, transparent)` }}/>

      {isPro && (
        <div style={{ position:"absolute", top:16, right:16, background:T.cyan, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, letterSpacing:"0.06em" }}>
          MOST POPULAR
        </div>
      )}

      {isCurrent && (
        <div style={{ position:"absolute", top:16, right:16, background:`${accent}22`, border:`1px solid ${accent}44`, borderRadius:6, padding:"3px 10px", fontSize:10, color:accent, fontWeight:700, letterSpacing:"0.06em" }}>
          CURRENT
        </div>
      )}

      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.muted, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
        {plan.name}
      </div>

      <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:4 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:36, color:accent }}>${plan.priceUSD}</span>
        <span style={{ fontSize:13, color:T.muted }}>/month</span>
      </div>
      <div style={{ fontSize:12, color:T.muted, marginBottom:22 }}>Billed monthly · Cancel anytime</div>

      <div style={{ marginBottom:26 }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
            <div style={{ marginTop:1, flexShrink:0 }}><CheckIcon color={accent}/></div>
            <span style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => !isCurrent && onUpgrade(planKey)}
        disabled={isCurrent || loading}
        style={{
          width:"100%", padding:"13px", borderRadius:10, cursor:isCurrent?"default":"pointer",
          background: isCurrent ? "none" : accent,
          color:       isCurrent ? T.muted : "#fff",
          border:      isCurrent ? `1px solid ${T.border}` : "none",
          fontFamily: "'Inter', sans-serif", fontSize:14, fontWeight:600,
          boxShadow:  isCurrent ? "none" : `0 0 20px ${accent}44`,
          transition: "all 0.2s", opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={e=>{ if(!isCurrent) e.currentTarget.style.filter="brightness(1.1)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}
      >
        {loading ? "Processing…" : isCurrent ? "Active Plan" : `Upgrade to ${plan.name}`}
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
      position:"fixed", inset:0, background:"rgba(10,14,26,0.95)",
      backdropFilter:"blur(8px)", zIndex:200,
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"40px 20px", overflow:"auto",
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
      `}</style>

      <div style={{ width:"100%", maxWidth:820 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.cyan, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:10 }}>
            ◈ Upgrade Your Plan
          </div>
          <h2 style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:30, color:T.white, marginBottom:10, letterSpacing:"-0.01em" }}>
            Unlock Your Full Edge
          </h2>
          <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:T.muted, maxWidth:460, margin:"0 auto", lineHeight:1.6 }}>
            Serious traders track every detail. Stop leaving insights on the table.
          </p>
        </div>

        {/* Billing toggle — monthly only (extend if you support yearly) */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:28 }}>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:4, display:"flex", gap:4 }}>
            <div style={{ background:T.cyan, color:"#fff", padding:"7px 20px", borderRadius:7, fontSize:13, fontWeight:600 }}>Monthly</div>
            <div style={{ color:T.muted, padding:"7px 20px", fontSize:13 }}>Yearly <span style={{ color:T.green, fontWeight:600, fontSize:11 }}>Save 20%</span></div>
          </div>
        </div>

        {/* Free tier banner */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 22px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontSize:14, fontWeight:600, color:T.text }}>Free</span>
            <span style={{ fontSize:13, color:T.muted }}>20 trades/month · Basic journal only · No analytics</span>
          </div>
          {profile?.tier==="free"&&(
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.cyan, border:`1px solid ${T.cyan}44`, padding:"3px 10px", borderRadius:5, fontWeight:600 }}>CURRENT</span>
          )}
        </div>

        {/* Plan cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28 }}>
          {Object.entries(PLANS).map(([key, plan]) => (
            <PlanCard key={key} planKey={key} plan={plan} current={profile?.tier} onUpgrade={handleUpgrade} loading={loading}/>
          ))}
        </div>

        {/* Feature trust row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          {[
            {icon:"🔒", title:"Secure & Private", desc:"Your data is encrypted and never shared"},
            {icon:"📊", title:"Accurate Backtesting", desc:"Real market data for realistic results"},
            {icon:"⚡", title:"Built for Traders", desc:"Designed by traders, for traders"},
            {icon:"✕", title:"Cancel Anytime", desc:"No contracts. Cancel your plan anytime"},
          ].map(({icon,title,desc})=>(
            <div key={title} style={{ textAlign:"center", padding:"14px", background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:4 }}>{title}</div>
              <div style={{ fontSize:11, color:T.muted, lineHeight:1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:12, color:T.muted, marginBottom:14, fontFamily:"'JetBrains Mono',monospace" }}>
            Payments secured by Paystack · USD pricing · Instant activation
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"'Inter',sans-serif", fontSize:14, color:T.muted, fontWeight:500 }}>
            ← Back to app
          </button>
        </div>
      </div>
    </div>
  );
}
