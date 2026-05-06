// src/App.jsx — TradeEdge UI Rebuild
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useFeatureGate } from "./usePaystack";
import { fetchTrades, addTrade, updateTrade, deleteTrade } from "./tradesService";
import AuthScreen from "./AuthScreen";
import PricingModal from "./PricingModal";
import UpgradePrompt from "./UpgradePrompt";

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const PAIRS      = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","BTC/USD","ETH/USD","XAU/USD","GBP/JPY","USD/CAD","NZD/USD"];
const SESSIONS   = ["London","New York","Asian","London/NY Overlap"];
const STRATEGIES = ["Breakout","Trend Follow","Mean Reversion","Scalp","Swing","ICT/SMC","Other"];
const SETUPS     = ["FVG","Order Block","BOS/CHoCH","Liquidity Sweep","VWAP Reclaim","Supply/Demand","EMA Cross","None"];
const MOODS      = ["😤 Revenge","😟 Fearful","😐 Neutral","🙂 Focused","🔥 In the Zone"];
const TABS       = ["dashboard","journal","analytics","calculator","calendar"];
const TV_SYMBOLS = {
  "EUR/USD":"FX:EURUSD","GBP/USD":"FX:GBPUSD","USD/JPY":"FX:USDJPY",
  "AUD/USD":"FX:AUDUSD","GBP/JPY":"FX:GBPJPY","USD/CAD":"FX:USDCAD",
  "NZD/USD":"FX:NZDUSD","XAU/USD":"TVC:GOLD",
  "BTC/USD":"BINANCE:BTCUSDT","ETH/USD":"BINANCE:ETHUSDT",
};
const TICKER_PAIRS = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","GBP/JPY","XAU/USD","BTC/USD","ETH/USD"];

const emptyForm = {
  pair:"EUR/USD", direction:"Long", entry:"", exit:"",
  lots:"0.01", session:"London", strategy:"Trend Follow",
  setup:"None", mood:"😐 Neutral", notes:"", replay:"",
  date: new Date().toISOString().slice(0,10), status:"Closed",
  screenshot: null,
};

/* ══════════════════════════════════════════════
   THEME — TradeEdge palette
══════════════════════════════════════════════ */
const T = {
  bg:       "#0a0e1a",
  surface:  "#0d1220",
  card:     "#111827",
  cardHov:  "#141d2e",
  border:   "#1e2d45",
  border2:  "#263650",
  text:     "#d1e0f0",
  muted:    "#4a6280",
  dim:      "#1e2d45",
  cyan:     "#3b9eff",
  cyanGlow: "#3b9eff33",
  green:    "#22d47a",
  greenDim: "#0a2e1c",
  red:      "#f0455a",
  redDim:   "#2d0a12",
  amber:    "#f5a623",
  amberDim: "#2a1a00",
  white:    "#f0f6ff",
  sidebar:  "#0b0f1c",
};

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function calcPnl(t) {
  const e=parseFloat(t.entry),x=parseFloat(t.exit),l=parseFloat(t.lots);
  if(!e||!x||!l) return null;
  const crypto=t.pair.includes("BTC")||t.pair.includes("ETH");
  const jpy=t.pair.includes("JPY");
  const pip=jpy?0.01:crypto?1:0.0001;
  const pips=((x-e)/pip)*(t.direction==="Long"?1:-1);
  const val=crypto?l:l*100000*pip;
  return {pnl:+(pips*val).toFixed(2),pips:+pips.toFixed(1)};
}

function pipValue(pair,lots) {
  const l=parseFloat(lots)||0; if(!l) return 0;
  const jpy=pair.includes("JPY"),crypto=pair.includes("BTC")||pair.includes("ETH");
  if(crypto) return l;
  return jpy?l*100000*0.01:l*100000*0.0001;
}

function exportCSV(trades) {
  const hdr=["Date","Pair","Direction","Entry","Exit","Lots","Session","Strategy","Setup","Mood","P&L","Pips","Status","Notes","Replay"];
  const rows=trades.map(t=>{
    const r=calcPnl(t);
    return[t.date,t.pair,t.direction,t.entry,t.exit,t.lots,t.session,t.strategy,t.setup||"",t.mood||"",r?r.pnl:"",r?r.pips:"",t.status,`"${t.notes}"`,`"${t.replay||""}"`];
  });
  const csv=[hdr,...rows].map(r=>r.join(",")).join("\n");
  const a=document.createElement("a");
  a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
  a.download="tradelog.csv"; a.click();
}

function getDaysInMonth(year,month){return new Date(year,month+1,0).getDate();}

/* ══════════════════════════════════════════════
   GLOBAL STYLES
══════════════════════════════════════════════ */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%}
    body{background:${T.bg};color:${T.text};font-family:'Inter',sans-serif;font-size:14px;line-height:1.5}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:${T.bg}}
    ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:3px}
    ::-webkit-scrollbar-thumb:hover{background:${T.cyan}}

    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

    .fade-up{animation:fadeUp 0.3s ease forwards}

    /* Sidebar nav items */
    .nav-item{
      display:flex;align-items:center;gap:10px;padding:9px 16px;
      border-radius:8px;cursor:pointer;color:${T.muted};
      font-size:13px;font-weight:500;transition:all 0.18s;
      border:1px solid transparent;margin-bottom:2px;
      background:none;width:100%;text-align:left;
    }
    .nav-item:hover{color:${T.text};background:${T.card}}
    .nav-item.active{color:${T.cyan};background:linear-gradient(135deg,${T.cyanGlow},transparent);border-color:${T.border}}

    /* Stat cards */
    .stat-card{
      background:${T.card};border:1px solid ${T.border};border-radius:12px;
      padding:18px 20px;transition:border-color 0.2s,box-shadow 0.2s;position:relative;overflow:hidden;
    }
    .stat-card:hover{border-color:${T.border2}}

    /* Buttons */
    .btn-primary{
      background:${T.cyan};color:#fff;border:none;
      font-family:'Inter',sans-serif;font-size:13px;font-weight:600;
      padding:9px 18px;border-radius:8px;cursor:pointer;
      transition:all 0.18s;box-shadow:0 0 20px ${T.cyanGlow};display:inline-flex;align-items:center;gap:6px;
    }
    .btn-primary:hover{filter:brightness(1.12);box-shadow:0 0 28px ${T.cyan}55;transform:translateY(-1px)}
    .btn-ghost{
      background:none;border:1px solid ${T.border};color:${T.muted};
      font-family:'Inter',sans-serif;font-size:13px;font-weight:500;
      padding:8px 14px;border-radius:8px;cursor:pointer;transition:all 0.18s;
    }
    .btn-ghost:hover{border-color:${T.cyan};color:${T.cyan};background:${T.cyanGlow}}
    .btn-danger{
      background:none;border:1px solid ${T.redDim};color:${T.red}77;
      font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;transition:all 0.18s;
    }
    .btn-danger:hover{border-color:${T.red};color:${T.red};background:${T.redDim}}

    /* Form inputs */
    .form-input{
      background:${T.surface};border:1px solid ${T.border};border-radius:8px;
      color:${T.text};padding:9px 12px;font-size:13px;width:100%;
      outline:none;font-family:'Inter',sans-serif;transition:border-color 0.2s,box-shadow 0.2s;
    }
    .form-input:focus{border-color:${T.cyan};box-shadow:0 0 0 3px ${T.cyanGlow}}
    .form-input::placeholder{color:${T.muted}}
    .form-label{
      font-size:11px;color:${T.muted};font-weight:600;letter-spacing:0.05em;
      text-transform:uppercase;display:block;margin-bottom:5px;margin-top:14px;
    }

    /* Table rows */
    .trade-row{border-bottom:1px solid ${T.border};transition:background 0.15s;animation:fadeUp 0.2s ease}
    .trade-row:hover{background:${T.cardHov}}

    /* Ticker */
    .ticker-wrap{display:flex;animation:marquee 55s linear infinite;white-space:nowrap}
    .ticker-wrap:hover{animation-play-state:paused}

    /* Direction buttons */
    .dir-btn{
      flex:1;padding:10px;border-radius:8px;cursor:pointer;
      font-family:'Inter',sans-serif;font-size:13px;font-weight:600;
      border:1px solid;transition:all 0.15s;
    }

    /* Overlay */
    .overlay-bg{
      position:fixed;inset:0;background:rgba(10,14,26,0.92);backdrop-filter:blur(6px);
      z-index:100;display:flex;align-items:flex-start;justify-content:center;
      padding:24px 16px;overflow-y:auto;
    }

    select option{background:${T.card}}

    /* Badge */
    .tier-badge{
      font-size:10px;font-weight:700;letter-spacing:0.08em;
      padding:3px 8px;border-radius:5px;text-transform:uppercase;
    }

    /* Section label */
    .section-label{
      font-size:11px;color:${T.muted};font-weight:600;text-transform:uppercase;
      letter-spacing:0.08em;margin-bottom:12px;display:block;
    }
  `}</style>
);

/* ══════════════════════════════════════════════
   ICONS (inline SVG)
══════════════════════════════════════════════ */
const Icon = ({name, size=16, color="currentColor"}) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    journal:   <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    analytics: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    calculator:<><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    upload:    <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
    trending:  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    award:     <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
    zap:       <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:     <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    chevronDown:<><polyline points="6 9 12 15 18 9"/></>,
    chevronUp:  <><polyline points="18 15 12 9 6 15"/></>,
    tv:        <><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></>,
    download:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    lock:      <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

/* ══════════════════════════════════════════════
   TICKER BAR
══════════════════════════════════════════════ */
function Ticker() {
  const [prices,setPrices]=useState({});
  const [prev,setPrev]=useState({});
  const [err,setErr]=useState(false);
  const load=async()=>{
    setErr(false); const next={};
    try{const r=await fetch("https://open.er-api.com/v6/latest/USD");if(r.ok){const d=await r.json(),rt=d.rates||{};if(rt.EUR)next["EUR/USD"]=+(1/rt.EUR).toFixed(5);if(rt.GBP)next["GBP/USD"]=+(1/rt.GBP).toFixed(5);if(rt.JPY)next["USD/JPY"]=+rt.JPY.toFixed(3);if(rt.AUD)next["AUD/USD"]=+(1/rt.AUD).toFixed(5);if(rt.GBP&&rt.JPY)next["GBP/JPY"]=+((1/rt.GBP)*rt.JPY).toFixed(3);}}catch(e){}
    try{const r2=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,gold&vs_currencies=usd");if(r2.ok){const d=await r2.json();if(d.bitcoin)next["BTC/USD"]=d.bitcoin.usd;if(d.ethereum)next["ETH/USD"]=d.ethereum.usd;if(d.gold)next["XAU/USD"]=d.gold.usd;}}catch(e){}
    if(!Object.keys(next).length){setErr(true);return;}
    setPrev(prices);setPrices(next);
  };
  useEffect(()=>{load();const iv=setInterval(load,60000);return()=>clearInterval(iv);},[]);
  const items=[...TICKER_PAIRS,...TICKER_PAIRS];
  return(
    <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,height:36,overflow:"hidden",display:"flex",alignItems:"center",position:"relative",flexShrink:0}}>
      {err
        ?<span style={{fontSize:11,color:T.amber,padding:"0 14px",fontFamily:"'JetBrains Mono',monospace"}}>⚠ FEED UNAVAILABLE</span>
        :<div className="ticker-wrap">{items.map((lbl,i)=>{
          const price=prices[lbl],p0=prev[lbl];
          const up=p0&&price>p0,dn=p0&&price<p0;
          const col=up?T.green:dn?T.red:T.muted;
          return(
            <span key={i} style={{padding:"0 22px",fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.text,borderRight:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:T.muted,fontSize:10,fontWeight:600}}>{lbl}</span>
              {price
                ?<span style={{color:col,fontWeight:600}}>{up?"▲":dn?"▼":""} {price.toLocaleString()}</span>
                :<span style={{color:T.border2,animation:"pulse 1.5s infinite"}}>···</span>
              }
            </span>
          );
        })}</div>
      }
      <button onClick={load} style={{position:"absolute",right:10,background:T.card,border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.muted,fontSize:12,padding:"3px 8px",transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color=T.cyan} onMouseLeave={e=>e.currentTarget.style.color=T.muted}>↻</button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CHART MODAL
══════════════════════════════════════════════ */
function ChartModal({pair,onClose}){
  const sym=TV_SYMBOLS[pair]||"FX:EURUSD";
  const src=`https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(sym)}&interval=H1&theme=dark&style=1&timezone=Etc%2FUTC&hideideas=1`;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,14,26,0.97)",zIndex:200,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:`1px solid ${T.border}`,background:T.surface}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:T.cyan,boxShadow:`0 0 8px ${T.cyan}`}}/>
          <span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace",color:T.white,fontSize:14}}>{pair}</span>
          <span style={{fontSize:12,color:T.muted}}>1H Chart</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(TV_SYMBOLS[pair]||"FX:EURUSD")}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{textDecoration:"none",fontSize:12}}>↗ TradingView</a>
          <button onClick={onClose} className="btn-ghost">✕ Close</button>
        </div>
      </div>
      <iframe src={src} style={{flex:1,border:"none",width:"100%",height:"100%"}} allowFullScreen title="Chart"/>
    </div>
  );
}

/* ══════════════════════════════════════════════
   EQUITY CURVE
══════════════════════════════════════════════ */
function EquityCurve({trades}){
  const points=useMemo(()=>{
    const sorted=[...trades].filter(t=>t.status==="Closed"&&calcPnl(t)).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let cum=0;
    return sorted.map(t=>{cum+=calcPnl(t).pnl;return{date:t.date,val:+cum.toFixed(2)};});
  },[trades]);
  if(points.length<2) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:140,color:T.muted}}>
      <Icon name="trending" size={28} color={T.border2}/>
      <span style={{marginTop:10,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>Need 2+ closed trades</span>
    </div>
  );
  const vals=points.map(p=>p.val);
  const min=Math.min(...vals,0),max=Math.max(...vals,0),range=max-min||1;
  const W=500,H=120,pad=16;
  const sx=i=>pad+(i/(points.length-1))*(W-2*pad);
  const sy=v=>H-pad-((v-min)/range)*(H-2*pad);
  const polyline=points.map((p,i)=>`${sx(i)},${sy(p.val)}`).join(" ");
  const last=points[points.length-1].val,col=last>=0?T.green:T.red;
  const pct=points.length>1?((last/Math.abs(points[0].val||1))*100).toFixed(1):"0";
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
        <div>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Equity Curve</div>
          <div style={{fontSize:24,fontWeight:700,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{last>=0?"+":""}{last}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:col,fontWeight:600}}>{last>=0?"▲":"▼"} {Math.abs(pct)}%</div>
          <div style={{fontSize:11,color:T.muted,marginTop:2}}>{points[0].date} → {points[points.length-1].date}</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H}}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={col} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <line x1={pad} y1={sy(0)} x2={W-pad} y2={sy(0)} stroke={T.border2} strokeWidth="1" strokeDasharray="4,4"/>
        <polygon points={`${sx(0)},${sy(0)} ${polyline} ${sx(points.length-1)},${sy(0)}`} fill="url(#eqGrad)"/>
        <polyline points={polyline} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round"/>
        <circle cx={sx(points.length-1)} cy={sy(last)} r="4" fill={col} style={{filter:`drop-shadow(0 0 5px ${col})`}}/>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MONTHLY HEATMAP
══════════════════════════════════════════════ */
function MonthlyHeatmap({trades}){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const days=getDaysInMonth(year,month);
  const firstDay=new Date(year,month,1).getDay();
  const dailyPnl=useMemo(()=>{
    const map={};
    trades.filter(t=>t.status==="Closed"&&calcPnl(t)).forEach(t=>{
      const[y,m,d]=t.date.split("-");
      if(parseInt(y)===year&&parseInt(m)-1===month){const k=parseInt(d);map[k]=+((map[k]||0)+calcPnl(t).pnl).toFixed(2);}
    });
    return map;
  },[trades,year,month]);
  const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const maxAbs=Math.max(...Object.values(dailyPnl).map(Math.abs),1);
  const cellColor=pnl=>{if(!pnl)return T.surface;const i=Math.min(Math.abs(pnl)/maxAbs,1);return pnl>0?`rgba(34,212,122,${0.08+i*0.45})`:`rgba(240,69,90,${0.08+i*0.45})`;};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span className="section-label" style={{marginBottom:0}}>P&L Heatmap</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} className="btn-ghost" style={{padding:"4px 10px",fontSize:12}}>‹</button>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.cyan,minWidth:72,textAlign:"center",fontWeight:600}}>{monthNames[month]} {year}</span>
          <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} className="btn-ghost" style={{padding:"4px 10px",fontSize:12}}>›</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:9,color:T.muted,fontFamily:"'JetBrains Mono',monospace",paddingBottom:4,fontWeight:600}}>{d}</div>)}
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:days}).map((_,i)=>{
          const day=i+1,pnl=dailyPnl[day];
          return(
            <div key={day} title={pnl?`${day}: ${pnl>=0?"+":""}${pnl}`:String(day)} style={{background:cellColor(pnl),border:`1px solid ${pnl?(pnl>0?T.green+"22":T.red+"22"):T.border}`,borderRadius:5,aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
              <span style={{fontSize:9,color:pnl?T.text:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{day}</span>
              {pnl&&<span style={{fontSize:7,color:pnl>0?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{pnl>0?"+":""}{pnl}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   DASHBOARD TAB
══════════════════════════════════════════════ */
function DashboardTab({trades, onChart, onAddTrade}){
  const closed = useMemo(()=>trades.filter(t=>t.status==="Closed"&&calcPnl(t)),[trades]);
  const stats = useMemo(()=>{
    if(!closed.length) return null;
    const vals=closed.map(t=>calcPnl(t).pnl);
    const wins=vals.filter(v=>v>0).length;
    const total=vals.reduce((a,b)=>a+b,0);
    const avgWin=vals.filter(v=>v>0).reduce((a,b)=>a+b,0)/Math.max(wins,1);
    const avgLoss=vals.filter(v=>v<0).reduce((a,b)=>a+b,0)/Math.max(closed.length-wins,1);
    return{
      count:closed.length, wins, losses:closed.length-wins,
      wr:((wins/closed.length)*100).toFixed(1),
      total:total.toFixed(2),
      pf:avgLoss!==0?(Math.abs(avgWin)/Math.abs(avgLoss)).toFixed(2):"—",
    };
  },[closed]);

  const recent=[...trades].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);

  const StatCard=({label,value,sub,color,icon})=>(
    <div className="stat-card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <span style={{fontSize:12,color:T.muted,fontWeight:500}}>{label}</span>
        <div style={{width:34,height:34,borderRadius:8,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name={icon} size={16} color={color}/>
        </div>
      </div>
      <div style={{fontSize:26,fontWeight:700,color:color||T.white,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-0.02em"}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:T.muted,marginTop:4}}>{sub}</div>}
    </div>
  );

  const totalPnl = parseFloat(stats?.total||0);
  const winRate  = parseFloat(stats?.wr||0);

  return(
    <div className="fade-up">
      {/* Top stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard label="Total P&L" value={`${totalPnl>=0?"+":""}$${Math.abs(totalPnl).toFixed(2)}`} color={totalPnl>=0?T.green:T.red} icon="trending" sub={stats?`${closed.length} closed trades`:"No closed trades"}/>
        <StatCard label="Win Rate" value={stats?`${stats.wr}%`:"—"} color={winRate>=50?T.green:T.amber} icon="award" sub={stats?`${stats.wins}W / ${stats.losses}L`:""}/>
        <StatCard label="Total Trades" value={trades.length} color={T.cyan} icon="journal" sub={`${trades.filter(t=>t.status==="Open").length} open`}/>
        <StatCard label="Profit Factor" value={stats?.pf||"—"} color={T.amber} icon="zap" sub="Avg win / avg loss"/>
      </div>

      {/* Main content grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:14,marginBottom:14}}>
        {/* Equity curve card */}
        <div className="stat-card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <span className="section-label" style={{marginBottom:0}}>Equity Curve</span>
            <span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>All Time</span>
          </div>
          <EquityCurve trades={trades}/>
        </div>

        {/* Win/Loss donut */}
        <div className="stat-card">
          <span className="section-label">Trades by Outcome</span>
          {stats?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,paddingTop:8}}>
              <div style={{position:"relative",width:140,height:140}}>
                <svg viewBox="0 0 140 140" width="140" height="140">
                  <circle cx="70" cy="70" r="54" fill="none" stroke={T.border} strokeWidth="18"/>
                  {stats.count>0&&(
                    <>
                      <circle cx="70" cy="70" r="54" fill="none" stroke={T.green} strokeWidth="18"
                        strokeDasharray={`${(stats.wins/stats.count)*339.3} 339.3`}
                        strokeDashoffset="0" strokeLinecap="round"
                        transform="rotate(-90 70 70)"
                      />
                      <circle cx="70" cy="70" r="54" fill="none" stroke={T.red} strokeWidth="18"
                        strokeDasharray={`${(stats.losses/stats.count)*339.3} 339.3`}
                        strokeDashoffset={`${-(stats.wins/stats.count)*339.3}`}
                        strokeLinecap="round"
                        transform="rotate(-90 70 70)"
                      />
                    </>
                  )}
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:T.white}}>{stats.count}</div>
                  <div style={{fontSize:10,color:T.muted,fontWeight:600}}>TOTAL</div>
                </div>
              </div>
              <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
                {[{label:"Win",count:stats.wins,color:T.green},{label:"Loss",count:stats.losses,color:T.red},{label:"Break Even",count:stats.count-stats.wins-stats.losses,color:T.muted}].map(row=>(
                  <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:row.color}}/>
                      <span style={{fontSize:13,color:T.text}}>{row.label}</span>
                    </div>
                    <div style={{display:"flex",gap:12}}>
                      <span style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:T.muted}}>{row.count}</span>
                      <span style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:row.color,minWidth:44,textAlign:"right"}}>{stats.count?((row.count/stats.count)*100).toFixed(1):0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:200,color:T.muted}}>
              <Icon name="award" size={28} color={T.border2}/>
              <span style={{marginTop:10,fontSize:12}}>No closed trades yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent trades */}
      <div className="stat-card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span className="section-label" style={{marginBottom:0}}>Recent Trades</span>
          <button className="btn-ghost" style={{fontSize:12,padding:"5px 12px"}}>View All</button>
        </div>
        {recent.length===0?(
          <div style={{textAlign:"center",padding:"30px 0",color:T.muted,fontSize:13}}>No trades yet — add your first trade to get started</div>
        ):(
          <>
            <div style={{display:"grid",gridTemplateColumns:"100px 100px 70px 90px 90px 70px 90px auto",padding:"8px 14px",borderBottom:`1px solid ${T.border}`,marginBottom:4}}>
              {["Date","Pair","Dir","Entry","Exit","Lots","P&L","Result"].map((h,i)=>(
                <span key={i} style={{fontSize:11,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</span>
              ))}
            </div>
            {recent.map(t=>{
              const r=calcPnl(t);
              return(
                <div key={t.id} className="trade-row" style={{display:"grid",gridTemplateColumns:"100px 100px 70px 90px 90px 70px 90px auto",padding:"10px 14px",alignItems:"center"}}>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.muted}}>{t.date}</span>
                  <span style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:T.text,fontWeight:600}}>{t.pair}</span>
                  <span style={{fontSize:12}}>
                    <span style={{background:t.direction==="Long"?T.greenDim:T.redDim,color:t.direction==="Long"?T.green:T.red,padding:"2px 8px",borderRadius:5,fontSize:11,fontWeight:600}}>{t.direction==="Long"?"Buy":"Sell"}</span>
                  </span>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{t.entry}</span>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{t.exit||"—"}</span>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.muted}}>{t.lots}</span>
                  <span style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:!r?T.muted:r.pnl>=0?T.green:T.red}}>
                    {!r?"Open":`${r.pnl>=0?"+":""}$${r.pnl}`}
                  </span>
                  <span style={{fontSize:11}}>
                    {r&&<span style={{background:r.pnl>=0?T.greenDim:T.redDim,color:r.pnl>=0?T.green:T.red,padding:"2px 8px",borderRadius:5,fontWeight:600}}>{r.pnl>=0?"Win":"Loss"}</span>}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ANALYTICS TAB
══════════════════════════════════════════════ */
function Analytics({trades,setChart,onUpgrade}){
  const can=useFeatureGate();
  if(!can("analytics")) return <UpgradePrompt feature="Analytics Dashboard" onUpgrade={onUpgrade}/>;

  const closed=useMemo(()=>trades.filter(t=>t.status==="Closed"&&calcPnl(t)),[trades]);
  const stats=useMemo(()=>{
    if(!closed.length) return null;
    const vals=closed.map(t=>calcPnl(t).pnl);
    const wins=vals.filter(v=>v>0).length;
    const total=vals.reduce((a,b)=>a+b,0);
    let peak=0,maxDD=0,cum=0;
    [...closed].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(t=>{cum+=calcPnl(t).pnl;if(cum>peak)peak=cum;if(peak-cum>maxDD)maxDD=peak-cum;});
    const sorted=[...closed].sort((a,b)=>new Date(b.date)-new Date(a.date));
    let streak=0,streakType="";
    for(const t of sorted){const p=calcPnl(t).pnl;if(streak===0){streakType=p>0?"W":"L";streak=1;}else if((streakType==="W"&&p>0)||(streakType==="L"&&p<0))streak++;else break;}
    const avgWin=vals.filter(v=>v>0).reduce((a,b)=>a+b,0)/Math.max(wins,1);
    const avgLoss=vals.filter(v=>v<0).reduce((a,b)=>a+b,0)/Math.max(closed.length-wins,1);
    const byMood={};
    closed.forEach(t=>{const r=calcPnl(t);const m=t.mood||"Unknown";if(!byMood[m])byMood[m]={pnl:0,count:0};byMood[m].pnl+=r.pnl;byMood[m].count++;});
    return{count:closed.length,wins,losses:closed.length-wins,wr:((wins/closed.length)*100).toFixed(1),total:total.toFixed(2),avg:(total/closed.length).toFixed(2),best:Math.max(...vals).toFixed(2),worst:Math.min(...vals).toFixed(2),maxDD:maxDD.toFixed(2),rr:avgLoss!==0?Math.abs(avgWin/avgLoss).toFixed(2):"—",streak,streakType,byMood};
  },[closed]);

  const agg=(field)=>{const m={};closed.forEach(t=>{const r=calcPnl(t);const k=t[field]||"None";m[k]=+((m[k]||0)+r.pnl).toFixed(2);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);};
  const byPair=useMemo(()=>agg("pair"),[closed]);
  const bySession=useMemo(()=>agg("session"),[closed]);
  const byStrategy=useMemo(()=>agg("strategy"),[closed]);
  const bySetup=useMemo(()=>agg("setup"),[closed]);

  if(!stats) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 0",color:T.muted}}>
      <Icon name="analytics" size={36} color={T.border2}/>
      <div style={{marginTop:14,fontSize:13,fontFamily:"'JetBrains Mono',monospace"}}>No closed trades yet</div>
    </div>
  );

  const SC=({label,value,sub,color})=>(
    <div className="stat-card">
      <div style={{fontSize:11,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:color||T.cyan}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:T.muted,marginTop:4}}>{sub}</div>}
    </div>
  );

  const allVals=[...byPair,...bySession,...byStrategy,...bySetup].map(([,v])=>Math.abs(v));
  const maxV=Math.max(...allVals,1);

  const BarRow=({label,val,onChart})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
      <span style={{fontSize:12,color:T.muted,width:100,flexShrink:0,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{label}</span>
      <div style={{flex:1,height:6,background:T.surface,borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${(Math.abs(val)/maxV)*100}%`,background:val>=0?T.green:T.red,borderRadius:4,transition:"width 0.5s"}}/>
      </div>
      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:val>=0?T.green:T.red,width:60,textAlign:"right",flexShrink:0,fontWeight:600}}>{val>=0?"+":""}${val}</span>
      {onChart&&<button onClick={onChart} className="btn-ghost" style={{padding:"2px 8px",fontSize:10}}>↗</button>}
    </div>
  );

  return(
    <div className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
        <SC label="Win Rate" value={`${stats.wr}%`} sub={`${stats.wins}W / ${stats.losses}L`} color={parseFloat(stats.wr)>=50?T.green:T.red}/>
        <SC label="Net P&L" value={`${stats.total>=0?"+":""}$${stats.total}`} sub={`Avg: $${stats.avg}/trade`} color={parseFloat(stats.total)>=0?T.green:T.red}/>
        <SC label="Risk : Reward" value={stats.rr} sub="Avg R:R ratio" color={T.amber}/>
        <SC label="Max Drawdown" value={`-$${stats.maxDD}`} color={T.red}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
        <SC label="Best Trade" value={`+$${stats.best}`} color={T.green}/>
        <SC label="Worst Trade" value={`$${stats.worst}`} color={T.red}/>
        <SC label="Total Trades" value={stats.count} color={T.cyan}/>
        <SC label="Streak" value={`${stats.streak}${stats.streakType}`} color={stats.streakType==="W"?T.green:T.red}/>
      </div>
      <div className="stat-card" style={{marginBottom:14}}><EquityCurve trades={trades}/></div>
      <div className="stat-card" style={{marginBottom:14}}><MonthlyHeatmap trades={trades}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div className="stat-card"><span className="section-label">P&L by Pair</span>{byPair.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val} onChart={()=>setChart(lbl)}/>)}</div>
        <div className="stat-card"><span className="section-label">P&L by Session</span>{bySession.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val}/>)}</div>
        <div className="stat-card"><span className="section-label">P&L by Strategy</span>{byStrategy.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val}/>)}</div>
        <div className="stat-card"><span className="section-label">P&L by Setup</span>{bySetup.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val}/>)}</div>
      </div>
      {Object.keys(stats.byMood).length>0&&(
        <div className="stat-card">
          <span className="section-label">🧠 P&L by Mental State</span>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
            {Object.entries(stats.byMood).sort((a,b)=>b[1].pnl-a[1].pnl).map(([mood,d])=>(
              <div key={mood} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:4}}>{mood.split(" ")[0]}</div>
                <div style={{fontSize:11,color:T.muted,fontWeight:500,marginBottom:6}}>{mood.split(" ").slice(1).join(" ")}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:d.pnl>=0?T.green:T.red,fontSize:14}}>{d.pnl>=0?"+":""}${d.pnl.toFixed(2)}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>{d.count} trades</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   CALCULATOR TAB
══════════════════════════════════════════════ */
function Calculator(){
  const [balance,setBalance]=useState("10000");
  const [risk,setRisk]=useState("1");
  const [pair,setPair]=useState("EUR/USD");
  const [sl,setSl]=useState("20");
  const riskAmt=(parseFloat(balance)||0)*((parseFloat(risk)||0)/100);
  const slPips=parseFloat(sl)||0;
  const pv=pipValue(pair,1);
  const sugLots=pv&&slPips?+(riskAmt/(slPips*pv)).toFixed(2):0;
  const Row=({label,value,color})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:`1px solid ${T.border}`}}>
      <span style={{fontSize:13,color:T.muted,fontWeight:500}}>{label}</span>
      <span style={{fontSize:18,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:color||T.cyan}}>{value}</span>
    </div>
  );
  return(
    <div className="fade-up" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div className="stat-card">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
          <Icon name="calculator" size={16} color={T.cyan}/>
          <span className="section-label" style={{marginBottom:0}}>Position Sizer</span>
        </div>
        <label className="form-label">Account Balance ($)</label>
        <input className="form-input" type="number" value={balance} onChange={e=>setBalance(e.target.value)}/>
        <label className="form-label">Risk per Trade (%)</label>
        <input className="form-input" type="number" value={risk} onChange={e=>setRisk(e.target.value)}/>
        <label className="form-label">Pair</label>
        <select className="form-input" value={pair} onChange={e=>setPair(e.target.value)}>{PAIRS.map(p=><option key={p}>{p}</option>)}</select>
        <label className="form-label">Stop Loss (pips)</label>
        <input className="form-input" type="number" value={sl} onChange={e=>setSl(e.target.value)}/>
        <div style={{marginTop:20,padding:16,background:T.surface,borderRadius:10,border:`1px solid ${T.border}`}}>
          <Row label="Max Risk $" value={`$${riskAmt.toFixed(2)}`} color={T.amber}/>
          <Row label="Suggested Lots" value={sugLots} color={T.cyan}/>
          <Row label="Actual Risk $" value={`$${(pv*sugLots*slPips).toFixed(2)}`} color={T.green}/>
        </div>
      </div>
      <div className="stat-card">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
          <Icon name="analytics" size={16} color={T.amber}/>
          <span className="section-label" style={{marginBottom:0}}>Pip Value (0.01 lot)</span>
        </div>
        {PAIRS.map(p=>(
          <div key={p} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:T.muted}}>{p}</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:T.cyan,fontWeight:600}}>${pipValue(p,0.01).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TRADE FORM MODAL
══════════════════════════════════════════════ */
function TradeForm({form,setF,onSave,onClose,isEdit,preview,limitReached,dailyLimit,isPro}){
  const fileRef=useRef();
  const handleFile=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>setF("screenshot",ev.target.result);
    reader.readAsDataURL(file);
  };
  return(
    <div className="overlay-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,width:"100%",maxWidth:640,animation:"fadeUp 0.25s ease",boxShadow:"0 24px 60px rgba(0,0,0,0.6)"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:T.cyan,boxShadow:`0 0 8px ${T.cyan}`}}/>
            <span style={{fontWeight:700,fontSize:15,color:T.white}}>{isEdit?"Edit Trade":"Log New Trade"}</span>
            {!isEdit&&limitReached&&<span style={{fontSize:11,color:T.amber,background:T.amberDim,padding:"2px 8px",borderRadius:5}}>⚠ Daily limit ({dailyLimit}) reached</span>}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{padding:"5px 10px"}}>✕</button>
        </div>
        <div style={{padding:22}}>
          {/* Direction */}
          <label className="form-label">Direction</label>
          <div style={{display:"flex",gap:8,marginBottom:4}}>
            {["Long","Short"].map(d=>(
              <button key={d} className="dir-btn" onClick={()=>setF("direction",d)} style={{
                background:form.direction===d?(d==="Long"?T.greenDim:T.redDim):T.surface,
                color:form.direction===d?(d==="Long"?T.green:T.red):T.muted,
                borderColor:form.direction===d?(d==="Long"?T.green+"55":T.red+"55"):T.border,
              }}>
                {d==="Long"?"▲ Long":"▼ Short"}
              </button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label className="form-label">Pair</label><select className="form-input" value={form.pair} onChange={e=>setF("pair",e.target.value)}>{PAIRS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e=>setF("date",e.target.value)}/></div>
            <div><label className="form-label">Entry Price</label><input className="form-input" type="number" step="any" value={form.entry} onChange={e=>setF("entry",e.target.value)} placeholder="0.00000"/></div>
            <div><label className="form-label">Exit Price</label><input className="form-input" type="number" step="any" value={form.exit} onChange={e=>setF("exit",e.target.value)} placeholder="0.00000" disabled={form.status==="Open"}/></div>
            <div><label className="form-label">Lot Size</label><input className="form-input" type="number" step="0.01" value={form.lots} onChange={e=>setF("lots",e.target.value)} placeholder="0.01"/></div>
            <div><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e=>setF("status",e.target.value)}><option>Open</option><option>Closed</option></select></div>
            <div><label className="form-label">Session</label><select className="form-input" value={form.session} onChange={e=>setF("session",e.target.value)}>{SESSIONS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="form-label">Strategy</label><select className="form-input" value={form.strategy} onChange={e=>setF("strategy",e.target.value)}>{STRATEGIES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="form-label">Setup / Confluence</label><select className="form-input" value={form.setup||"None"} onChange={e=>setF("setup",e.target.value)}>{SETUPS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="form-label">Mental State</label><select className="form-input" value={form.mood||"😐 Neutral"} onChange={e=>setF("mood",e.target.value)}>{MOODS.map(m=><option key={m}>{m}</option>)}</select></div>
          </div>
          <label className="form-label">Trade Notes</label>
          <textarea className="form-input" value={form.notes} onChange={e=>setF("notes",e.target.value)} placeholder="Entry reason, market context..." rows={2} style={{resize:"vertical"}}/>
          <label className="form-label">What I'd Do Differently</label>
          <textarea className="form-input" value={form.replay||""} onChange={e=>setF("replay",e.target.value)} placeholder="Hindsight analysis, lessons learned..." rows={2} style={{resize:"vertical"}}/>

          {/* Screenshot — Pro only */}
          <label className="form-label">Chart Screenshot {!isPro&&<span style={{color:T.amber,fontSize:9,marginLeft:4,padding:"1px 5px",background:T.amberDim,borderRadius:3}}>PRO</span>}</label>
          {isPro?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button className="btn-ghost" onClick={()=>fileRef.current.click()} style={{fontSize:12}}>📎 Attach</button>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
              {form.screenshot&&<><span style={{fontSize:12,color:T.green}}>✓ Attached</span><button className="btn-ghost" onClick={()=>setF("screenshot",null)} style={{fontSize:11,padding:"3px 8px"}}>✕</button></>}
            </div>
          ):(
            <div style={{padding:"10px 14px",background:T.amberDim,border:`1px solid ${T.amber}22`,borderRadius:8,fontSize:12,color:T.amber}}>
              Upgrade to Pro to attach chart screenshots
            </div>
          )}
          {form.screenshot&&isPro&&<img src={form.screenshot} alt="chart" style={{marginTop:10,width:"100%",maxHeight:160,objectFit:"cover",borderRadius:8,border:`1px solid ${T.border}`}}/>}

          {/* P&L preview */}
          {preview&&form.status==="Closed"&&(
            <div style={{marginTop:16,padding:"12px 16px",background:preview.pnl>=0?T.greenDim:T.redDim,border:`1px solid ${preview.pnl>=0?T.green+"33":T.red+"33"}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:T.muted,fontWeight:600}}>P&L PREVIEW</span>
              <div style={{display:"flex",gap:20}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:preview.pnl>=0?T.green:T.red,fontSize:17}}>{preview.pnl>=0?"+":""}${preview.pnl}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.muted,fontSize:13}}>{preview.pips>=0?"+":""}{preview.pips} pips</span>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={onSave}>
              <Icon name={isEdit?"edit":"plus"} size={14} color="#fff"/>
              {isEdit?"Update Trade":"Log Trade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   JOURNAL TAB
══════════════════════════════════════════════ */
function JournalTab({trades,onEdit,onDelete,onChart,filter,setFilter,dailyLimit,setDailyLimit,onUpgrade,isPro,onAddTrade}){
  const [expandId,setExpandId]=useState(null);
  const [search,setSearch]=useState("");
  const visible=trades.filter(t=>{
    if(filter!=="All"&&t.status!==filter) return false;
    if(search&&!t.pair.toLowerCase().includes(search.toLowerCase())&&!t.strategy?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const today=new Date().toISOString().slice(0,10);
  const todayTrades=trades.filter(t=>t.date===today);
  const todayPnl=todayTrades.filter(t=>t.status==="Closed"&&calcPnl(t)).reduce((a,t)=>a+calcPnl(t).pnl,0);

  return(
    <div className="fade-up">
      {/* Top bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:20,fontWeight:700,color:T.white}}>Trade Journal</h2>
        <button className="btn-primary" onClick={onAddTrade}>
          <Icon name="plus" size={14} color="#fff"/>
          Add Trade
        </button>
      </div>

      {/* Quick stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <div className="stat-card" style={{padding:"14px 16px"}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:6}}>TODAY'S TRADES</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:T.cyan}}>{todayTrades.length}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:4}}>of {dailyLimit} limit</div>
          <div style={{marginTop:8,height:4,background:T.surface,borderRadius:3}}>
            <div style={{height:"100%",width:`${Math.min((todayTrades.length/dailyLimit)*100,100)}%`,background:todayTrades.length>=dailyLimit?T.red:T.cyan,borderRadius:3,transition:"width 0.4s"}}/>
          </div>
        </div>
        <div className="stat-card" style={{padding:"14px 16px"}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:6}}>TODAY'S P&L</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:todayPnl>=0?T.green:T.red}}>{todayPnl>=0?"+":""}${todayPnl.toFixed(2)}</div>
        </div>
        <div className="stat-card" style={{padding:"14px 16px"}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:6}}>TOTAL TRADES</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{trades.length}</div>
          {!isPro&&<div style={{fontSize:11,color:T.amber,marginTop:4}}>{20-trades.length} free slots left</div>}
        </div>
        <div className="stat-card" style={{padding:"14px 16px"}}>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:8}}>DAILY LIMIT</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="btn-ghost" style={{padding:"3px 10px",fontSize:13}} onClick={()=>setDailyLimit(l=>Math.max(1,l-1))}>−</button>
            <span style={{fontSize:20,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:T.amber}}>{dailyLimit}</span>
            <button className="btn-ghost" style={{padding:"3px 10px",fontSize:13}} onClick={()=>setDailyLimit(l=>l+1)}>+</button>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
        <div style={{display:"flex",gap:4}}>
          {["All","Open","Closed"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?T.cyan+"18":"none",border:`1px solid ${filter===f?T.cyan:T.border}`,color:filter===f?T.cyan:T.muted,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500,transition:"all 0.15s"}}>
              {f} {f!=="All"&&<span style={{opacity:0.7}}>({trades.filter(t=>t.status===f).length})</span>}
            </button>
          ))}
        </div>
        <input
          placeholder="Search pair or strategy..."
          value={search} onChange={e=>setSearch(e.target.value)}
          className="form-input" style={{maxWidth:240,marginLeft:"auto"}}
        />
      </div>

      {/* Trade table */}
      {visible.length===0?(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 0",color:T.muted,background:T.card,borderRadius:12,border:`1px solid ${T.border}`}}>
          <Icon name="journal" size={36} color={T.border2}/>
          <div style={{marginTop:14,fontSize:13}}>No trades found</div>
        </div>
      ):(
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"95px 90px 70px 90px 90px 65px 90px 85px 85px 50px",padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.surface}}>
            {["Date","Pair","Dir","Entry","Exit","Lots","Session","Setup","P&L",""].map((h,i)=>(
              <span key={i} style={{fontSize:11,color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</span>
            ))}
          </div>
          {[...visible].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>{
            const r=calcPnl(t),isExp=expandId===t.id;
            return(
              <div key={t.id} className="trade-row">
                <div style={{display:"grid",gridTemplateColumns:"95px 90px 70px 90px 90px 65px 90px 85px 85px 50px",padding:"11px 16px",alignItems:"center",cursor:"pointer"}} onClick={()=>setExpandId(isExp?null:t.id)}>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.muted}}>{t.date}</span>
                  <span style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",color:T.text,fontWeight:600}}>{t.pair}</span>
                  <span>
                    <span style={{fontSize:11,background:t.direction==="Long"?T.greenDim:T.redDim,color:t.direction==="Long"?T.green:T.red,padding:"2px 8px",borderRadius:5,fontWeight:600}}>{t.direction==="Long"?"Buy":"Sell"}</span>
                  </span>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{t.entry}</span>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{t.exit||"—"}</span>
                  <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.muted}}>{t.lots}</span>
                  <span style={{fontSize:11,color:T.muted}}>{t.session}</span>
                  <span style={{fontSize:11,color:T.muted}}>{t.setup||"—"}</span>
                  <span style={{fontSize:13,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:!r?T.muted:r.pnl>=0?T.green:T.red}}>
                    {!r?<span style={{fontSize:11,color:T.border2}}>OPEN</span>:`${r.pnl>=0?"+":""}$${r.pnl}`}
                  </span>
                  <span style={{fontSize:12,color:T.muted,textAlign:"center"}}>{isExp?"▲":"▼"}</span>
                </div>
                {isExp&&(
                  <div style={{padding:"14px 16px",borderTop:`1px solid ${T.border}`,background:T.surface,animation:"fadeUp 0.15s ease"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                      <div>
                        <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>NOTES</div>
                        <div style={{fontSize:13,color:T.text,lineHeight:1.6}}>{t.notes||<span style={{color:T.muted}}>—</span>}</div>
                      </div>
                      <div>
                        <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>WHAT I'D DO DIFFERENTLY</div>
                        <div style={{fontSize:13,color:T.text,lineHeight:1.6}}>{t.replay||<span style={{color:T.muted}}>—</span>}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontSize:12,background:T.card,border:`1px solid ${T.border}`,borderRadius:6,padding:"3px 10px",color:T.muted}}>{t.strategy}</span>
                      {t.mood&&<span style={{fontSize:13}}>{t.mood}</span>}
                      {r&&<span style={{fontSize:12,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{r.pips>=0?"+":""}{r.pips} pips</span>}
                      <div style={{flex:1}}/>
                      {t.screenshot&&isPro&&<button className="btn-ghost" onClick={()=>window.open(t.screenshot)} style={{fontSize:12,padding:"4px 10px"}}>📷 Chart</button>}
                      <button className="btn-ghost" onClick={()=>onChart(t.pair)} style={{fontSize:12,padding:"4px 10px"}}>
                        <Icon name="tv" size={12} color={T.cyan}/> TV
                      </button>
                      <button className="btn-ghost" onClick={()=>onEdit(t)} style={{fontSize:12,padding:"4px 10px"}}>
                        <Icon name="edit" size={12} color={T.text}/> Edit
                      </button>
                      <button className="btn-danger" onClick={()=>onDelete(t.id)}>
                        <Icon name="trash" size={11} color={T.red}/> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════ */
export default function App() {
  const { user, profile, loading, logout, isPro, isFree } = useAuth();
  const can = useFeatureGate();

  const [trades,       setTrades]      = useState([]);
  const [tradesLoading,setTLoding]     = useState(false);
  const [form,         setForm]        = useState({...emptyForm});
  const [showForm,     setShowForm]    = useState(false);
  const [editId,       setEditId]      = useState(null);
  const [tab,          setTab]         = useState("dashboard");
  const [filter,       setFilter]      = useState("All");
  const [chart,        setChart]       = useState(null);
  const [dailyLimit,   setDailyLimit]  = useState(3);
  const [showPricing,  setShowPricing] = useState(false);

  useEffect(()=>{
    if(!user){setTrades([]);return;}
    setTLoding(true);
    fetchTrades(user.uid)
      .then(setTrades)
      .catch(console.error)
      .finally(()=>setTLoding(false));
  },[user]);

  if(loading) return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        <div style={{width:40,height:40,border:`2px solid ${T.border}`,borderTop:`2px solid ${T.cyan}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.muted,fontSize:12,letterSpacing:"0.1em"}}>Loading...</span>
      </div>
    </div>
  );

  if(!user) return <AuthScreen/>;

  const setF      = (k,v) => setForm(p=>({...p,[k]:v}));
  const openNew   = () => { setForm({...emptyForm,date:new Date().toISOString().slice(0,10)}); setEditId(null); setShowForm(true); };
  const openEdit  = (t) => { setForm({...t}); setEditId(t.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const today        = new Date().toISOString().slice(0,10);
  const todayTrades  = trades.filter(t=>t.date===today);
  const limitReached = todayTrades.length >= dailyLimit;
  const preview      = calcPnl(form);
  const freeLimitHit = isFree && trades.length >= 20;

  const save = async () => {
    if(!form.pair||!form.entry){alert("Pair and Entry Price required.");return;}
    if(!editId&&limitReached){alert(`Daily limit of ${dailyLimit} reached. Stay disciplined. 🛑`);return;}
    if(!editId&&freeLimitHit){setShowPricing(true);return;}
    if(!isPro){delete form.screenshot;}
    const newTrade={...form};
    if(editId){
      await updateTrade(user.uid,editId,newTrade);
      setTrades(prev=>prev.map(t=>t.id===editId?{...newTrade,id:editId}:t));
    } else {
      const id=await addTrade(user.uid,newTrade);
      setTrades(prev=>[{...newTrade,id},...prev]);
    }
    closeForm();
  };

  const del = async (id) => {
    if(!confirm("Delete this trade?")) return;
    await deleteTrade(user.uid,id);
    setTrades(p=>p.filter(t=>t.id!==id));
  };

  const csvExport = () => {
    if(!can("csv_export")){setShowPricing(true);return;}
    exportCSV(trades);
  };

  const tierColor = {free:T.muted, pro:T.cyan, elite:T.amber}[profile?.tier||"free"];
  const tierLabel = {free:"Free", pro:"Pro", elite:"Elite"}[profile?.tier||"free"];
  const displayName = profile?.displayName||user.email?.split("@")[0]||"Trader";

  const navItems = [
    {id:"dashboard", icon:"dashboard",  label:"Dashboard"},
    {id:"journal",   icon:"journal",    label:"Journal"},
    {id:"analytics", icon:"analytics",  label:"Analytics", pro:!isPro},
    {id:"calculator",icon:"calculator", label:"Calculator"},
    {id:"calendar",  icon:"calendar",   label:"Calendar"},
  ];

  return(
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text}}>
      <GlobalStyle/>
      {chart&&<ChartModal pair={chart} onClose={()=>setChart(null)}/>}
      {showForm&&<TradeForm form={form} setF={setF} onSave={save} onClose={closeForm} isEdit={!!editId} preview={preview} limitReached={limitReached} dailyLimit={dailyLimit} isPro={isPro}/>}
      {showPricing&&<PricingModal onClose={()=>setShowPricing(false)}/>}

      {/* ── SIDEBAR ── */}
      <aside style={{width:220,flexShrink:0,background:T.sidebar,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflow:"hidden"}}>
        {/* Logo */}
        <div style={{padding:"20px 18px 16px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:`linear-gradient(135deg,${T.cyan},#1a6fd4)`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:`0 0 18px ${T.cyanGlow}`}}>◈</div>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:T.white,letterSpacing:"0.02em"}}>TradeEdge</div>
              <div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em"}}>TERMINAL</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"12px 10px",overflowY:"auto"}}>
          <div style={{fontSize:10,color:T.muted,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",padding:"0 8px",marginBottom:8}}>Main Menu</div>
          {navItems.map(item=>(
            <button key={item.id} className={`nav-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
              <Icon name={item.icon} size={16} color={tab===item.id?T.cyan:T.muted}/>
              <span>{item.label}</span>
              {item.pro&&<span style={{marginLeft:"auto",fontSize:9,color:T.amber,background:T.amberDim,padding:"1px 5px",borderRadius:4,fontWeight:700}}>PRO</span>}
            </button>
          ))}
        </nav>

        {/* User panel */}
        <div style={{padding:"12px 10px",borderTop:`1px solid ${T.border}`}}>
          {isFree&&(
            <button onClick={()=>setShowPricing(true)} style={{width:"100%",background:`linear-gradient(135deg,${T.cyan}22,${T.cyan}11)`,border:`1px solid ${T.cyan}44`,borderRadius:8,padding:"10px 12px",cursor:"pointer",marginBottom:10,color:T.cyan,fontSize:12,fontWeight:600,textAlign:"left",transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.background=`linear-gradient(135deg,${T.cyan}33,${T.cyan}18)`}
              onMouseLeave={e=>e.currentTarget.style.background=`linear-gradient(135deg,${T.cyan}22,${T.cyan}11)`}
            >
              ↑ Upgrade to Pro
            </button>
          )}
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:T.card,border:`1px solid ${T.border}`}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${T.cyan}44,${T.border2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:T.white,flexShrink:0}}>
              {displayName[0].toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</div>
              <div style={{fontSize:10,color:tierColor,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{tierLabel}</div>
            </div>
            <button onClick={logout} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:4,borderRadius:5,transition:"color 0.2s"}} title="Sign out"
              onMouseEnter={e=>e.currentTarget.style.color=T.red}
              onMouseLeave={e=>e.currentTarget.style.color=T.muted}
            >
              <Icon name="logout" size={15}/>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Top bar */}
        <header style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"sticky",top:0,zIndex:40}}>
          <div>
            <h1 style={{fontSize:17,fontWeight:700,color:T.white,textTransform:"capitalize"}}>{tab === "dashboard" ? "Dashboard" : tab}</h1>
            <div style={{fontSize:11,color:T.muted,marginTop:1}}>
              {new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isFree&&trades.length>=15&&(
              <span style={{fontSize:11,color:T.amber,background:T.amberDim,padding:"4px 10px",borderRadius:6,fontWeight:600}}>⚠ {20-trades.length} trade slots left</span>
            )}
            <button className="btn-ghost" onClick={csvExport} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
              <Icon name="download" size={13} color={T.muted}/> Export CSV
            </button>
            <button className="btn-primary" onClick={openNew} style={{display:"flex",alignItems:"center",gap:6}}>
              <Icon name="plus" size={14} color="#fff"/>
              Log Trade
            </button>
          </div>
        </header>

        {/* Ticker */}
        <Ticker/>

        {/* Page content */}
        <main style={{flex:1,padding:"22px 24px",overflowY:"auto"}}>
          {tab==="dashboard"&&(
            <DashboardTab trades={trades} onChart={setChart} onAddTrade={openNew}/>
          )}
          {tab==="journal"&&(
            <JournalTab trades={trades} onEdit={openEdit} onDelete={del} onChart={setChart} filter={filter} setFilter={setFilter} dailyLimit={dailyLimit} setDailyLimit={setDailyLimit} onUpgrade={()=>setShowPricing(true)} isPro={isPro} onAddTrade={openNew}/>
          )}
          {tab==="analytics"&&(
            <Analytics trades={trades} setChart={setChart} onUpgrade={()=>setShowPricing(true)}/>
          )}
          {tab==="calculator"&&(
            <Calculator/>
          )}
          {tab==="calendar"&&(
            <div className="fade-up">
              <div className="stat-card">
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <Icon name="calendar" size={16} color={T.cyan}/>
                  <span className="section-label" style={{marginBottom:0}}>Live Economic Calendar</span>
                </div>
                <div style={{borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`}}>
                  <iframe src={`https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=25,32,6,37,72,22,17,39,14,10,35&calType=week&timeZone=Africa/Nairobi&lang=1&theme=dark&fontSize=13`} style={{width:"100%",height:580,border:"none"}} title="Economic Calendar"/>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{padding:"12px 24px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surface,flexShrink:0}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.muted}}>TradeEdge Terminal — Nairobi, EAT</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.muted}}>{new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
