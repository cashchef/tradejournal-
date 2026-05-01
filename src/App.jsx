import { useState, useMemo, useEffect } from "react";

// ── Constants ──────────────────────────────────────────────────
const PAIRS      = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","BTC/USD","ETH/USD","XAU/USD","GBP/JPY","USD/CAD","NZD/USD"];
const SESSIONS   = ["London","New York","Asian","London/NY Overlap"];
const STRATEGIES = ["Breakout","Trend Follow","Mean Reversion","Scalp","Swing","ICT/SMC","Other"];
const TABS       = [
  { id:"journal",    icon:"📋", label:"Journal"    },
  { id:"analytics",  icon:"📊", label:"Analytics"  },
  { id:"calculator", icon:"⚖️", label:"Calculator" },
  { id:"calendar",   icon:"📅", label:"Calendar"   },
];

const TV_SYMBOLS = {
  "EUR/USD":"FX:EURUSD","GBP/USD":"FX:GBPUSD","USD/JPY":"FX:USDJPY",
  "AUD/USD":"FX:AUDUSD","GBP/JPY":"FX:GBPJPY","USD/CAD":"FX:USDCAD",
  "NZD/USD":"FX:NZDUSD","XAU/USD":"TVC:GOLD",
  "BTC/USD":"BINANCE:BTCUSDT","ETH/USD":"BINANCE:ETHUSDT",
};
const TICKER_PAIRS = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","GBP/JPY","XAU/USD","BTC/USD","ETH/USD"];
const tvURL = (pair) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(TV_SYMBOLS[pair]||"FX:EURUSD")}`;

const empty = {
  pair:"EUR/USD", direction:"Long", entry:"", exit:"",
  lots:"0.01", session:"London", strategy:"Trend Follow",
  notes:"", date: new Date().toISOString().slice(0,10), status:"Closed"
};

// ── Helpers ────────────────────────────────────────────────────
function calcPnl(t) {
  const e=parseFloat(t.entry), x=parseFloat(t.exit), l=parseFloat(t.lots);
  if (!e||!x||!l) return null;
  const crypto=t.pair.includes("BTC")||t.pair.includes("ETH");
  const jpy=t.pair.includes("JPY");
  const pip=jpy?0.01:crypto?1:0.0001;
  const pips=((x-e)/pip)*(t.direction==="Long"?1:-1);
  const val=crypto?l:l*100000*pip;
  return { pnl:+(pips*val).toFixed(2), pips:+pips.toFixed(1) };
}

function pipValue(pair,lots) {
  const l=parseFloat(lots)||0;
  if (!l) return 0;
  const jpy=pair.includes("JPY"), crypto=pair.includes("BTC")||pair.includes("ETH");
  if (crypto) return l;
  return jpy?l*100000*0.01:l*100000*0.0001;
}

function exportCSV(trades) {
  const hdr=["Date","Pair","Direction","Entry","Exit","Lots","Session","Strategy","P&L","Pips","Status","Notes"];
  const rows=trades.map(t=>{ const r=calcPnl(t); return [t.date,t.pair,t.direction,t.entry,t.exit,t.lots,t.session,t.strategy,r?r.pnl:"",r?r.pips:"",t.status,`"${t.notes}"`]; });
  const csv=[hdr,...rows].map(r=>r.join(",")).join("\n");
  const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download="tradelog.csv"; a.click();
}

// ── Global styles injected once ────────────────────────────────
const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { -webkit-tap-highlight-color: transparent; }
  body { overscroll-behavior: none; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
  select option { background: #1a1a1a; color: #e5e5e5; }

  @keyframes mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .tkr { display:flex; animation:mq 55s linear infinite; white-space:nowrap; align-items:center; }
  .tkr:hover { animation-play-state:paused; }

  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 0.2s ease; }

  @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .slide-up { animation: slideUp 0.25s ease; }

  .press:active { transform: scale(0.97); }
  .hover-card:hover { filter: brightness(1.05); }
`;

// ── Theme ──────────────────────────────────────────────────────
const mkTh = (dark) => ({
  bg:       dark?"#080808":"#f0f4f8",
  surface:  dark?"#111":"#fff",
  surface2: dark?"#161616":"#f8fafc",
  border:   dark?"#1e1e1e":"#e2e8f0",
  border2:  dark?"#2a2a2a":"#cbd5e1",
  text:     dark?"#f0f0f0":"#0f172a",
  text2:    dark?"#aaa":"#475569",
  muted:    dark?"#555":"#94a3b8",
  inputBg:  dark?"#0d0d0d":"#f1f5f9",
  overlay:  dark?"rgba(0,0,0,0.92)":"rgba(15,23,42,0.6)",
  accent:   "#f59e0b",
  green:    "#22c55e",
  red:      "#ef4444",
});

// ── Small reusable components ──────────────────────────────────
const Badge = ({ children, color="gray" }) => {
  const map = {
    green:  { bg:"#0d2b1a", text:"#22c55e", border:"#166534" },
    red:    { bg:"#2b0d0d", text:"#ef4444", border:"#991b1b" },
    amber:  { bg:"#2b1a00", text:"#f59e0b", border:"#92400e" },
    blue:   { bg:"#0d1a2b", text:"#60a5fa", border:"#1e40af" },
    gray:   { bg:"#1a1a1a", text:"#9ca3af", border:"#374151" },
    purple: { bg:"#1a0d2b", text:"#a78bfa", border:"#5b21b6" },
  };
  const c = map[color]||map.gray;
  return (
    <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700, display:"inline-block", letterSpacing:"0.03em" }}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, sub, color, th }) => (
  <div className="fade-in hover-card" style={{ background:th.surface, border:`1px solid ${th.border}`, borderRadius:14, padding:"16px 14px", textAlign:"center", transition:"filter 0.15s" }}>
    <div style={{ fontSize:22, fontWeight:800, fontFamily:"'SF Mono',monospace", color: color||th.text, lineHeight:1.1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:th.muted, marginTop:3 }}>{sub}</div>}
    <div style={{ fontSize:10, color:th.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginTop:5, fontWeight:600 }}>{label}</div>
  </div>
);

// ── Chart Modal ────────────────────────────────────────────────
function ChartModal({ pair, onClose, dark }) {
  const sym = TV_SYMBOLS[pair]||"FX:EURUSD";
  const src = `https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(sym)}&interval=H1&theme=${dark?"dark":"light"}&style=1&timezone=Etc%2FUTC&hideideas=1`;
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",zIndex:300,display:"flex",flexDirection:"column" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #1f1f1f",background:dark?"#0a0a0a":"#fff",gap:10 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:18 }}>📊</span>
          <span style={{ fontWeight:800,fontFamily:"monospace",color:"#f59e0b",fontSize:16 }}>{pair}</span>
          <Badge color="amber">H1</Badge>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <a href={tvURL(pair)} target="_blank" rel="noopener noreferrer"
            style={{ background:"#166534",color:"#22c55e",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:4 }}>
            🌐 TradingView
          </a>
          <button onClick={onClose} style={{ background:"#1a1a1a",border:"1px solid #333",color:"#aaa",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:600 }}>
            ✕ Close
          </button>
        </div>
      </div>
      <iframe src={src} style={{ flex:1,border:"none",width:"100%",height:"100%" }} allowFullScreen title="Chart" />
    </div>
  );
}

// ── Ticker ─────────────────────────────────────────────────────
function Ticker({ dark, th }) {
  const [prices,setPrices] = useState({});
  const [prev,setPrev]     = useState({});
  const [err,setErr]       = useState(false);

  const load = async () => {
    setErr(false); const next={};
    try {
      const r1=await fetch("https://open.er-api.com/v6/latest/USD");
      if (r1.ok) {
        const d=await r1.json(), r=d.rates||{};
        if (r.EUR) next["EUR/USD"]=+(1/r.EUR).toFixed(5);
        if (r.GBP) next["GBP/USD"]=+(1/r.GBP).toFixed(5);
        if (r.JPY) next["USD/JPY"]=+r.JPY.toFixed(3);
        if (r.AUD) next["AUD/USD"]=+(1/r.AUD).toFixed(5);
        if (r.GBP&&r.JPY) next["GBP/JPY"]=+((1/r.GBP)*r.JPY).toFixed(3);
      }
    } catch(e){}
    try {
      const r2=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,gold&vs_currencies=usd");
      if (r2.ok) {
        const d=await r2.json();
        if (d.bitcoin)  next["BTC/USD"]=d.bitcoin.usd;
        if (d.ethereum) next["ETH/USD"]=d.ethereum.usd;
        if (d.gold)     next["XAU/USD"]=d.gold.usd;
      }
    } catch(e){}
    if (!Object.keys(next).length) { setErr(true); return; }
    setPrev(prices); setPrices(next);
  };

  useEffect(()=>{ load(); const iv=setInterval(load,60000); return ()=>clearInterval(iv); },[]);

  const items=[...TICKER_PAIRS,...TICKER_PAIRS];
  return (
    <div style={{ background:th.surface2, borderBottom:`1px solid ${th.border}`, height:48, overflow:"hidden", display:"flex", alignItems:"center", position:"relative" }}>
      {err
        ? <span style={{ fontSize:11,color:"#f59e0b",padding:"0 16px",opacity:0.8 }}>⚠ Price feed unavailable — tap ⟳ to retry</span>
        : <div className="tkr">{items.map((label,i)=>{
            const price=prices[label],p0=prev[label];
            const up=p0&&price>p0, dn=p0&&price<p0;
            const isJPY=label.includes("JPY"), isBig=label.includes("BTC")||label.includes("ETH")||label.includes("XAU");
            const dp=isBig?2:isJPY?3:5;
            const diff=(p0&&price)?+(price-p0).toFixed(dp):null;
            const pct=(p0&&price)?+((price-p0)/p0*100).toFixed(2):null;
            const priceCol=up?"#22c55e":dn?"#ef4444":th.text2;
            return (
              <span key={i} style={{ padding:"0 16px", display:"inline-flex", alignItems:"center", gap:7, borderRight:`1px solid ${th.border}`, height:48 }}>
                <span style={{ fontSize:10, color:th.muted, fontFamily:"monospace", fontWeight:600, letterSpacing:"0.04em" }}>{label}</span>
                {price
                  ? <span style={{ fontSize:12, fontFamily:"monospace", fontWeight:700, color:priceCol }}>{price.toLocaleString()}</span>
                  : <span style={{ fontSize:12, color:th.muted }}>···</span>
                }
                {diff!==null&&diff!==0&&(
                  <span style={{ fontSize:10, fontFamily:"monospace", fontWeight:700, background:up?"#0d2b1a":"#2b0d0d", color:up?"#22c55e":"#ef4444", border:`1px solid ${up?"#166534":"#991b1b"}`, borderRadius:5, padding:"2px 7px", display:"inline-flex", alignItems:"center", gap:2 }}>
                    {up?"▲":"▼"} {diff>0?"+":""}{diff} <span style={{opacity:0.65}}>({pct>0?"+":""}{pct}%)</span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
      }
      <button onClick={load} title="Refresh prices" style={{ position:"absolute",right:8,background:th.surface,border:`1px solid ${th.border}`,borderRadius:6,cursor:"pointer",fontSize:13,color:th.muted,padding:"4px 8px",transition:"all 0.15s" }}>⟳</button>
    </div>
  );
}

// ── Equity Curve ───────────────────────────────────────────────
function EquityCurve({ trades, th, dark }) {
  const points = useMemo(()=>{
    const sorted=[...trades].filter(t=>t.status==="Closed"&&calcPnl(t)).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let cum=0; return sorted.map(t=>{ cum+=calcPnl(t).pnl; return { date:t.date, val:+cum.toFixed(2) }; });
  },[trades]);

  if (points.length<2) return <div style={{ textAlign:"center",padding:"24px 0",color:th.muted,fontSize:13 }}>Need at least 2 closed trades to show equity curve</div>;

  const vals=points.map(p=>p.val), min=Math.min(...vals,0), max=Math.max(...vals,0), range=max-min||1;
  const W=320, H=110, pad=12;
  const sx=i=>pad+(i/(points.length-1))*(W-2*pad);
  const sy=v=>H-pad-((v-min)/range)*(H-2*pad);
  const polyline=points.map((p,i)=>`${sx(i)},${sy(p.val)}`).join(" ");
  const last=points[points.length-1].val, col=last>=0?"#22c55e":"#ef4444";

  return (
    <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:14,padding:16,marginBottom:12 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
        <span style={{ fontWeight:700,fontSize:13,color:th.text }}>📈 Equity Curve</span>
        <span style={{ fontFamily:"monospace",fontWeight:800,color:col,fontSize:15 }}>{last>=0?"+":""}{last}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",height:H }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={col} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <line x1={pad} y1={sy(0)} x2={W-pad} y2={sy(0)} stroke={dark?"#2a2a2a":"#e2e8f0"} strokeWidth="1" strokeDasharray="4"/>
        <polygon points={`${sx(0)},${sy(0)} ${polyline} ${sx(points.length-1)},${sy(0)}`} fill="url(#eq)"/>
        <polyline points={polyline} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={sx(points.length-1)} cy={sy(last)} r="5" fill={col} stroke={dark?"#111":"#fff"} strokeWidth="2"/>
      </svg>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:th.muted,marginTop:6,fontFamily:"monospace" }}>
        <span>{points[0].date}</span><span>{points[points.length-1].date}</span>
      </div>
    </div>
  );
}

// ── Bar Row ────────────────────────────────────────────────────
function BarRow({ label, val, max, th, dark, onChart }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
      <span style={{ fontFamily:"monospace",fontSize:11,width:95,color:th.text2,flexShrink:0,fontWeight:600 }}>{label}</span>
      <div style={{ flex:1,height:8,background:dark?"#1a1a1a":"#e2e8f0",borderRadius:6,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${(Math.abs(val)/max)*100}%`,background:val>=0?"#22c55e":"#ef4444",borderRadius:6,transition:"width 0.4s ease" }}/>
      </div>
      <span style={{ fontFamily:"monospace",fontSize:12,color:val>=0?"#22c55e":"#ef4444",width:68,textAlign:"right",flexShrink:0,fontWeight:700 }}>{val>=0?"+":""}{val}</span>
      {onChart&&<button onClick={onChart} style={{ background:"none",border:`1px solid #2a2a2a`,color:"#f59e0b",borderRadius:5,padding:"2px 7px",fontSize:10,cursor:"pointer",flexShrink:0 }}>📊</button>}
    </div>
  );
}

// ── Risk Calculator ────────────────────────────────────────────
function Calculator({ dark, th }) {
  const [balance,setBalance]=useState("10000");
  const [risk,setRisk]=useState("1");
  const [pair,setPair]=useState("EUR/USD");
  const [sl,setSl]=useState("20");

  const riskAmt=(parseFloat(balance)||0)*((parseFloat(risk)||0)/100);
  const slPips=parseFloat(sl)||0;
  const pv=pipValue(pair,1);
  const sugLots=pv&&slPips?+(riskAmt/(slPips*pv)).toFixed(2):0;
  const inp2={ background:th.inputBg,border:`1px solid ${th.border2}`,borderRadius:10,color:th.text,padding:"12px 14px",fontSize:14,width:"100%",outline:"none",fontFamily:"monospace" };
  const lbl2={ fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6,marginTop:16,fontWeight:600 };

  return (
    <div className="fade-in">
      <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:16,padding:20,marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
          <span style={{ fontSize:20 }}>⚖️</span>
          <span style={{ fontWeight:800,fontSize:16,color:th.text }}>Risk Calculator</span>
        </div>
        <p style={{ fontSize:12,color:th.muted,marginBottom:16 }}>Calculate safe lot size based on your risk tolerance</p>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <div><label style={lbl2}>Balance ($)</label><input style={inp2} type="number" value={balance} onChange={e=>setBalance(e.target.value)} placeholder="10000"/></div>
          <div><label style={lbl2}>Risk (%)</label><input style={inp2} type="number" value={risk} onChange={e=>setRisk(e.target.value)} placeholder="1"/></div>
          <div>
            <label style={lbl2}>Pair</label>
            <select style={inp2} value={pair} onChange={e=>setPair(e.target.value)}>
              {PAIRS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label style={lbl2}>Stop Loss (pips)</label><input style={inp2} type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder="20"/></div>
        </div>

        <div style={{ marginTop:20,background:dark?"#0d2b1a":"#f0fdf4",border:"1px solid #166534",borderRadius:14,padding:18,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center" }}>
          {[
            { label:"Max Risk $",    val:`$${riskAmt.toFixed(2)}`,                              col:"#22c55e" },
            { label:"Suggested Lots",val:sugLots||"—",                                          col:"#f59e0b" },
            { label:"Risk in $",     val:pv?(pv*sugLots*slPips).toFixed(2):"—",                col:"#60a5fa" },
          ].map(({label,val,col})=>(
            <div key={label}>
              <div style={{ fontSize:20,fontWeight:800,color:col,fontFamily:"monospace" }}>{val}</div>
              <div style={{ fontSize:10,color:th.muted,marginTop:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:16,padding:20 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:14,color:th.text }}>📐 Pip Value Reference (0.01 lot)</div>
        {PAIRS.map((p,i)=>(
          <div key={p} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<PAIRS.length-1?`1px solid ${th.border}`:"none",fontSize:13 }}>
            <span style={{ fontFamily:"monospace",color:th.text2,fontWeight:600 }}>{p}</span>
            <span style={{ fontFamily:"monospace",color:th.text,fontWeight:700 }}>${pipValue(p,0.01).toFixed(4)}<span style={{color:th.muted,fontWeight:400}}>/pip</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────────
function CalendarTab({ dark, th={} }) {
  const muted=th.muted||(dark?"#555":"#94a3b8"), border=th.border||(dark?"#1e1e1e":"#e2e8f0");
  return (
    <div className="fade-in">
      <div style={{ background:th.surface,border:`1px solid ${border}`,borderRadius:16,padding:16,marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
          <span style={{ fontSize:20 }}>📅</span>
          <span style={{ fontWeight:800,fontSize:16,color:th.text }}>Economic Calendar</span>
        </div>
        <p style={{ fontSize:12,color:muted }}>Forex Factory live events. If the embed is blocked by your browser, use the button below.</p>
      </div>
      <div style={{ borderRadius:14,overflow:"hidden",border:`1px solid ${border}`,marginBottom:14 }}>
        <iframe src="https://www.forexfactory.com/calendar#week" style={{ width:"100%",height:"600px",border:"none" }} title="Forex Factory Calendar"/>
      </div>
      <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer"
        style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#f59e0b",color:"#000",borderRadius:12,padding:"14px",fontWeight:800,fontSize:14,textDecoration:"none" }}>
        🌐 Open Forex Factory in new tab
      </a>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [dark,setDark]         = useState(true);
  const [trades,setTrades]     = useState([]);
  const [form,setForm]         = useState({...empty});
  const [showForm,setShowForm] = useState(false);
  const [editId,setEditId]     = useState(null);
  const [tab,setTab]           = useState("journal");
  const [filter,setFilter]     = useState("All");
  const [chart,setChart]       = useState(null);
  const [dailyLimit,setDailyLimit] = useState(3);
  const [showSettings,setShowSettings] = useState(false);

  const th = mkTh(dark);

  // Persist
  useEffect(()=>{ try { const s=localStorage.getItem("tl_trades"); if(s) setTrades(JSON.parse(s)); } catch(e){} },[]);
  useEffect(()=>{ localStorage.setItem("tl_trades",JSON.stringify(trades)); },[trades]);

  const inp = { background:th.inputBg,border:`1px solid ${th.border2}`,borderRadius:10,color:th.text,padding:"12px 14px",fontSize:14,width:"100%",outline:"none",fontFamily:"monospace",transition:"border-color 0.15s" };
  const lbl = { fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6,marginTop:14,fontWeight:600 };

  const setF=      (k,v)=>setForm(p=>({...p,[k]:v}));
  const openNew=   ()=>{ setForm({...empty,date:new Date().toISOString().slice(0,10)}); setEditId(null); setShowForm(true); };
  const openEdit=  (t)=>{ setForm({...t}); setEditId(t.id); setShowForm(true); };
  const closeForm= ()=>{ setShowForm(false); setEditId(null); };

  const today=new Date().toISOString().slice(0,10);
  const todayCount=trades.filter(t=>t.date===today).length;
  const limitReached=todayCount>=dailyLimit;

  const save=()=>{
    if (!form.pair||!form.entry) { alert("Pair and Entry Price are required."); return; }
    if (!editId&&limitReached) { alert(`Daily limit of ${dailyLimit} trades reached. Stay disciplined! 🛑`); return; }
    const nt={...form,id:editId??Date.now()};
    setTrades(prev=>editId?prev.map(t=>t.id===editId?nt:t):[...prev,nt]);
    closeForm();
  };

  const del=(id)=>{ if(confirm("Delete this trade?")) setTrades(p=>p.filter(t=>t.id!==id)); };

  const visible=trades.filter(t=>filter==="All"||t.status===filter);
  const closed=useMemo(()=>trades.filter(t=>t.status==="Closed"&&calcPnl(t)),[trades]);

  const stats=useMemo(()=>{
    if (!closed.length) return null;
    const vals=closed.map(t=>calcPnl(t).pnl);
    const wins=vals.filter(v=>v>0).length;
    const total=vals.reduce((a,b)=>a+b,0);
    let peak=0,maxDD=0,cum=0;
    [...closed].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(t=>{ cum+=calcPnl(t).pnl; if(cum>peak)peak=cum; if(peak-cum>maxDD)maxDD=peak-cum; });
    const bySession={}, byStrat={};
    closed.forEach(t=>{ const r=calcPnl(t); bySession[t.session]=+((bySession[t.session]||0)+r.pnl).toFixed(2); byStrat[t.strategy]=+((byStrat[t.strategy]||0)+r.pnl).toFixed(2); });
    const bestSession=Object.entries(bySession).sort((a,b)=>b[1]-a[1])[0];
    const sorted=[...closed].sort((a,b)=>new Date(b.date)-new Date(a.date));
    let streak=0,streakType="";
    for (const t of sorted) { const p=calcPnl(t).pnl; if(streak===0){streakType=p>0?"W":"L";streak=1;}else if((streakType==="W"&&p>0)||(streakType==="L"&&p<0))streak++;else break; }
    return { count:closed.length, wins, losses:closed.length-wins, wr:((wins/closed.length)*100).toFixed(1), total:total.toFixed(2), avg:(total/closed.length).toFixed(2), best:Math.max(...vals).toFixed(2), worst:Math.min(...vals).toFixed(2), maxDD:maxDD.toFixed(2), bestSession, streak, streakType };
  },[closed]);

  const byPair=useMemo(()=>{ const m={}; closed.forEach(t=>{const r=calcPnl(t);m[t.pair]=+((m[t.pair]||0)+r.pnl).toFixed(2);}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); },[closed]);
  const bySession=useMemo(()=>{ const m={}; closed.forEach(t=>{const r=calcPnl(t);m[t.session]=+((m[t.session]||0)+r.pnl).toFixed(2);}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); },[closed]);
  const byStrategy=useMemo(()=>{ const m={}; closed.forEach(t=>{const r=calcPnl(t);m[t.strategy]=+((m[t.strategy]||0)+r.pnl).toFixed(2);}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); },[closed]);
  const preview=calcPnl(form);

  const Field=({label,name,type="text",options,placeholder})=>(
    <div>
      <label style={lbl}>{label}</label>
      {options
        ?<select style={inp} value={form[name]} onChange={e=>setF(name,e.target.value)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>
        :<input style={inp} type={type} step="any" placeholder={placeholder} value={form[name]} onChange={e=>setF(name,e.target.value)}/>
      }
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:th.bg, color:th.text, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize:14, paddingBottom:80 }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Header ── */}
      <div style={{ position:"sticky",top:0,zIndex:50,background:th.bg,borderBottom:`1px solid ${th.border}`,backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",gap:10 }}>
          {/* Logo */}
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:34,height:34,background:"linear-gradient(135deg,#f59e0b,#d97706)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 2px 8px rgba(245,158,11,0.3)" }}>📈</div>
            <div>
              <div style={{ fontWeight:800,fontSize:16,letterSpacing:"-0.02em",color:th.text }}>TradeLog</div>
              <div style={{ fontSize:10,color:th.muted,fontWeight:600,letterSpacing:"0.06em" }}>FOREX · CRYPTO</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            {/* Daily counter */}
            <div style={{ background:limitReached?"#2b0d0d":dark?"#0d2b1a":"#f0fdf4", border:`1px solid ${limitReached?"#991b1b":"#166534"}`, borderRadius:8, padding:"5px 10px", textAlign:"center" }}>
              <div style={{ fontSize:13,fontWeight:800,color:limitReached?"#ef4444":"#22c55e",fontFamily:"monospace" }}>{todayCount}/{dailyLimit}</div>
              <div style={{ fontSize:9,color:th.muted,textTransform:"uppercase",letterSpacing:"0.05em" }}>Today</div>
            </div>
            <button onClick={()=>setDark(d=>!d)} className="press" style={{ background:th.surface,border:`1px solid ${th.border2}`,color:th.muted,borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,transition:"all 0.15s" }}>{dark?"☀️":"🌙"}</button>
            <button onClick={()=>setShowSettings(s=>!s)} className="press" style={{ background:th.surface,border:`1px solid ${th.border2}`,color:th.muted,borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16 }}>⚙️</button>
            <a href="https://www.tradingview.com/chart/" target="_blank" rel="noopener noreferrer" className="press"
              style={{ background:"#166534",color:"#22c55e",borderRadius:10,padding:"8px 12px",fontWeight:700,fontSize:12,textDecoration:"none",display:"flex",alignItems:"center",gap:4 }}>
              📊 TV
            </a>
            <button onClick={openNew} className="press"
              style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#000",border:"none",borderRadius:10,padding:"9px 16px",fontWeight:800,cursor:"pointer",fontSize:13,boxShadow:"0 2px 10px rgba(245,158,11,0.3)",transition:"all 0.15s" }}>
              + Trade
            </button>
          </div>
        </div>

        {/* Settings dropdown */}
        {showSettings && (
          <div className="fade-in" style={{ padding:"12px 16px",borderTop:`1px solid ${th.border}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontSize:12,color:th.muted,fontWeight:600 }}>Daily trade limit:</span>
              <input type="number" min="1" max="20" value={dailyLimit} onChange={e=>setDailyLimit(+e.target.value)} style={{ ...inp,width:60,padding:"6px 10px",fontSize:13 }}/>
            </div>
            <button onClick={()=>exportCSV(trades)} className="press" style={{ background:th.surface,border:`1px solid ${th.border2}`,color:th.text2,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700 }}>⬇ Export CSV</button>
            <button onClick={()=>{ if(confirm("Clear ALL trades? This cannot be undone.")) setTrades([]); }} style={{ background:"#2b0d0d",border:"1px solid #991b1b",color:"#ef4444",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700 }}>🗑 Clear All</button>
          </div>
        )}

        {/* Ticker */}
        <Ticker dark={dark} th={th}/>
      </div>

      {/* ── Content ── */}
      <div style={{ padding:"16px 14px",maxWidth:680,margin:"0 auto" }}>

        {/* ── JOURNAL ── */}
        {tab==="journal" && (
          <div className="fade-in">
            {/* Filter pills */}
            <div style={{ display:"flex",gap:8,marginBottom:16,alignItems:"center" }}>
              {["All","Open","Closed"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} className="press"
                  style={{ background:filter===f?"#f59e0b":th.surface, color:filter===f?"#000":th.muted, border:`1px solid ${filter===f?"#f59e0b":th.border}`, borderRadius:20, padding:"6px 16px", fontSize:12, cursor:"pointer", fontWeight:700, transition:"all 0.15s" }}>
                  {f} {f==="All"?trades.length:trades.filter(t=>t.status===f).length}
                </button>
              ))}
            </div>

            {visible.length===0 ? (
              <div style={{ textAlign:"center",padding:"80px 0",color:th.muted }}>
                <div style={{ fontSize:48,marginBottom:12 }}>📭</div>
                <div style={{ fontSize:16,fontWeight:700,color:th.text2,marginBottom:6 }}>No trades yet</div>
                <div style={{ fontSize:13,marginBottom:20 }}>Tap + Trade to log your first trade</div>
                <button onClick={openNew} style={{ background:"#f59e0b",color:"#000",border:"none",borderRadius:12,padding:"12px 24px",fontWeight:800,cursor:"pointer",fontSize:14 }}>+ Log First Trade</button>
              </div>
            ) : (
              [...visible].reverse().map(t=>{
                const r=calcPnl(t), win=r&&r.pnl>0;
                return (
                  <div key={t.id} className="hover-card slide-up" style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:16,padding:16,marginBottom:10,transition:"filter 0.15s" }}>
                    {/* Top row */}
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8 }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8 }}>
                          <span style={{ fontWeight:800,fontSize:16,fontFamily:"monospace",color:th.text }}>{t.pair}</span>
                          <Badge color={t.direction==="Long"?"green":"red"}>{t.direction}</Badge>
                          {t.status==="Open" && <Badge color="amber">● Live</Badge>}
                        </div>
                        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                          <span style={{ fontSize:11,color:th.muted,background:th.surface2,border:`1px solid ${th.border}`,borderRadius:5,padding:"2px 7px",fontWeight:600 }}>📅 {t.date}</span>
                          <span style={{ fontSize:11,color:th.muted,background:th.surface2,border:`1px solid ${th.border}`,borderRadius:5,padding:"2px 7px",fontWeight:600 }}>🕐 {t.session}</span>
                          <span style={{ fontSize:11,color:th.muted,background:th.surface2,border:`1px solid ${th.border}`,borderRadius:5,padding:"2px 7px",fontWeight:600 }}>⚡ {t.strategy}</span>
                        </div>
                      </div>
                      {/* P&L */}
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        {r ? (
                          <div style={{ background:win?"#0d2b1a":"#2b0d0d",border:`1px solid ${win?"#166534":"#991b1b"}`,borderRadius:10,padding:"8px 12px",minWidth:80 }}>
                            <div style={{ color:win?"#22c55e":"#ef4444",fontWeight:800,fontFamily:"monospace",fontSize:16 }}>{win?"+":""}{r.pnl}</div>
                            <div style={{ fontSize:10,color:win?"#166534":"#991b1b",fontWeight:600 }}>{win?"+":""}{r.pips} pips</div>
                          </div>
                        ) : (
                          <div style={{ background:"#2b1a00",border:"1px solid #92400e",borderRadius:10,padding:"8px 12px" }}>
                            <div style={{ color:"#f59e0b",fontWeight:800,fontSize:13 }}>● Open</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Entry/Exit row */}
                    <div style={{ marginTop:10,padding:"8px 12px",background:th.surface2,border:`1px solid ${th.border}`,borderRadius:10,fontFamily:"monospace",fontSize:12,color:th.text2 }}>
                      <span style={{ color:th.muted }}>Entry </span>{t.entry}
                      {t.exit && <><span style={{ color:th.muted }}> → Exit </span>{t.exit}</>}
                      <span style={{ color:th.muted }}> · {t.lots} lot</span>
                    </div>

                    {t.notes && (
                      <div style={{ marginTop:8,padding:"8px 12px",background:th.surface2,border:`1px solid ${th.border}`,borderRadius:10,fontSize:12,color:th.muted,fontStyle:"italic" }}>
                        💬 {t.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap" }}>
                      <button onClick={()=>setChart(t.pair)} className="press" style={{ flex:1,background:th.surface2,border:`1px solid ${th.border2}`,color:"#f59e0b",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer",fontWeight:700 }}>📊 Chart</button>
                      <a href={tvURL(t.pair)} target="_blank" rel="noopener noreferrer" style={{ flex:1,background:"#0d2b1a",border:"1px solid #166534",color:"#22c55e",borderRadius:8,padding:"8px",fontSize:12,fontWeight:700,textDecoration:"none",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>🌐 TV</a>
                      <button onClick={()=>openEdit(t)} className="press" style={{ flex:1,background:th.surface2,border:`1px solid ${th.border2}`,color:th.text2,borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer",fontWeight:700 }}>✏️ Edit</button>
                      <button onClick={()=>del(t.id)} className="press" style={{ background:"#2b0d0d",border:"1px solid #991b1b",color:"#ef4444",borderRadius:8,padding:"8px 12px",fontSize:12,cursor:"pointer",fontWeight:700 }}>🗑</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab==="analytics" && (
          <div className="fade-in">
            {!stats ? (
              <div style={{ textAlign:"center",padding:"80px 0",color:th.muted }}>
                <div style={{ fontSize:48,marginBottom:12 }}>📊</div>
                <div style={{ fontSize:16,fontWeight:700,color:th.text2,marginBottom:6 }}>No data yet</div>
                <div style={{ fontSize:13 }}>Add closed trades to see your analytics</div>
              </div>
            ) : (
              <>
                {/* Streak */}
                <div style={{ background:stats.streakType==="W"?"#0d2b1a":"#2b0d0d",border:`1px solid ${stats.streakType==="W"?"#166534":"#991b1b"}`,borderRadius:14,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:11,color:th.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em" }}>Current Streak</div>
                    <div style={{ fontSize:22,fontWeight:800,color:stats.streakType==="W"?"#22c55e":"#ef4444",fontFamily:"monospace",marginTop:2 }}>
                      {stats.streakType==="W"?"🔥":"❄️"} {stats.streak} {stats.streakType==="W"?"Win":"Loss"}{stats.streak>1?"s":""}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11,color:th.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em" }}>Win / Loss</div>
                    <div style={{ fontSize:20,fontWeight:800,fontFamily:"monospace",marginTop:2 }}>
                      <span style={{color:"#22c55e"}}>{stats.wins}W</span>
                      <span style={{color:th.muted}}> · </span>
                      <span style={{color:"#ef4444"}}>{stats.losses}L</span>
                    </div>
                  </div>
                </div>

                {/* Stat grid */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                  <StatCard th={th} label="Win Rate"   value={`${stats.wr}%`}      color={parseFloat(stats.wr)>=50?"#22c55e":"#ef4444"} sub={`${stats.wins}W · ${stats.losses}L`}/>
                  <StatCard th={th} label="Total P&L"  value={`$${stats.total}`}    color={parseFloat(stats.total)>=0?"#22c55e":"#ef4444"}/>
                  <StatCard th={th} label="Avg P&L"    value={`$${stats.avg}`}      color={parseFloat(stats.avg)>=0?"#22c55e":"#ef4444"}/>
                  <StatCard th={th} label="Trades"     value={stats.count}/>
                  <StatCard th={th} label="Best Trade" value={`$${stats.best}`}     color="#22c55e"/>
                  <StatCard th={th} label="Worst Trade"value={`$${stats.worst}`}    color="#ef4444"/>
                  <StatCard th={th} label="Max Drawdown" value={`$${stats.maxDD}`} color="#ef4444"/>
                  <StatCard th={th} label="Best Session" value={stats.bestSession?stats.bestSession[0]:"—"} color="#f59e0b" sub={stats.bestSession?`+$${stats.bestSession[1]}`:null}/>
                </div>

                <EquityCurve trades={trades} th={th} dark={dark}/>

                {[
                  { title:"P&L by Pair",     data:byPair,    showChart:true },
                  { title:"P&L by Session",  data:bySession,  showChart:false },
                  { title:"P&L by Strategy", data:byStrategy, showChart:false },
                ].map(({title,data,showChart})=>(
                  <div key={title} style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:14,padding:16,marginBottom:12 }}>
                    <div style={{ fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14,fontWeight:700 }}>{title}</div>
                    {data.map(([label,val])=>(
                      <BarRow key={label} label={label} val={val} max={Math.max(...data.map(e=>Math.abs(e[1])))} th={th} dark={dark} onChart={showChart?()=>setChart(label):null}/>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab==="calculator" && <Calculator dark={dark} th={th}/>}
        {tab==="calendar"   && <CalendarTab dark={dark} th={th}/>}
      </div>

      {/* ── Bottom Nav ── */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:th.surface,borderTop:`1px solid ${th.border}`,display:"flex",backdropFilter:"blur(12px)" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="press"
            style={{ flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 4px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all 0.15s" }}>
            <span style={{ fontSize:18,filter:tab===t.id?"none":"grayscale(1) opacity(0.5)" }}>{t.icon}</span>
            <span style={{ fontSize:10,fontWeight:700,color:tab===t.id?"#f59e0b":th.muted,letterSpacing:"0.04em",textTransform:"uppercase" }}>{t.label}</span>
            {tab===t.id && <div style={{ width:20,height:2,background:"#f59e0b",borderRadius:2,marginTop:1 }}/>}
          </button>
        ))}
      </div>

      {/* ── Trade Modal ── */}
      {showForm && (
        <div style={{ position:"fixed",inset:0,background:th.overlay,display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100 }}
          onClick={e=>e.target===e.currentTarget&&closeForm()}>
          <div className="slide-up" style={{ background:th.surface,border:`1px solid ${th.border2}`,borderRadius:"20px 20px 0 0",padding:"20px 18px 32px",width:"100%",maxWidth:540,maxHeight:"92vh",overflowY:"auto" }}>
            {/* Handle */}
            <div style={{ width:36,height:4,background:th.border2,borderRadius:2,margin:"0 auto 18px" }}/>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
              <div>
                <div style={{ fontWeight:800,color:th.text,fontSize:18 }}>{editId?"Edit Trade":"New Trade"}</div>
                <div style={{ fontSize:12,color:th.muted,marginTop:2 }}>Fill in the details below</div>
              </div>
              <button onClick={closeForm} style={{ background:th.surface2,border:`1px solid ${th.border}`,color:th.muted,borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:14,fontWeight:700 }}>✕</button>
            </div>

            {/* Direction toggle */}
            <label style={lbl}>Direction</label>
            <div style={{ display:"flex",gap:8,marginBottom:4 }}>
              {["Long","Short"].map(d=>(
                <button key={d} onClick={()=>setF("direction",d)} className="press"
                  style={{ flex:1,padding:"12px",borderRadius:10,border:`1px solid ${form.direction===d?(d==="Long"?"#166534":"#991b1b"):th.border}`,background:form.direction===d?(d==="Long"?"#0d2b1a":"#2b0d0d"):th.surface2,color:form.direction===d?(d==="Long"?"#22c55e":"#ef4444"):th.muted,fontWeight:800,cursor:"pointer",fontSize:14,transition:"all 0.15s" }}>
                  {d==="Long"?"▲ Long":"▼ Short"}
                </button>
              ))}
            </div>

            {/* Status toggle */}
            <label style={lbl}>Status</label>
            <div style={{ display:"flex",gap:8,marginBottom:4 }}>
              {["Open","Closed"].map(s=>(
                <button key={s} onClick={()=>setF("status",s)} className="press"
                  style={{ flex:1,padding:"10px",borderRadius:10,border:`1px solid ${form.status===s?"#f59e0b":th.border}`,background:form.status===s?"#2b1a00":th.surface2,color:form.status===s?"#f59e0b":th.muted,fontWeight:700,cursor:"pointer",fontSize:13,transition:"all 0.15s" }}>
                  {s==="Open"?"● Open":"✓ Closed"}
                </button>
              ))}
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <Field label="Date"        name="date"    type="date"/>
              <Field label="Pair"        name="pair"    options={PAIRS}/>
              <Field label="Entry Price" name="entry"   type="number" placeholder="e.g. 1.0820"/>
              <Field label="Exit Price"  name="exit"    type="number" placeholder="e.g. 1.0890"/>
              <Field label="Lot Size"    name="lots"    type="number" placeholder="e.g. 0.01"/>
              <Field label="Session"     name="session" options={SESSIONS}/>
            </div>
            <Field label="Strategy" name="strategy" options={STRATEGIES}/>
            <div>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp,height:72,resize:"vertical" }} placeholder="Trade rationale, what you observed..." value={form.notes} onChange={e=>setF("notes",e.target.value)}/>
            </div>

            {preview && (
              <div className="fade-in" style={{ background:preview.pnl>=0?"#0d2b1a":"#2b0d0d",border:`1px solid ${preview.pnl>=0?"#166534":"#991b1b"}`,borderRadius:12,padding:"14px 16px",marginTop:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600 }}>Estimated P&L</div>
                  <div style={{ fontFamily:"monospace",fontWeight:800,color:preview.pnl>=0?"#22c55e":"#ef4444",fontSize:20,marginTop:2 }}>{preview.pnl>=0?"+":""}{preview.pnl}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600 }}>Pips</div>
                  <div style={{ fontFamily:"monospace",fontWeight:800,color:preview.pnl>=0?"#22c55e":"#ef4444",fontSize:18,marginTop:2 }}>{preview.pips>=0?"+":""}{preview.pips}</div>
                </div>
              </div>
            )}

            <div style={{ display:"flex",gap:10,marginTop:20 }}>
              <button onClick={closeForm} className="press" style={{ flex:1,background:th.surface2,border:`1px solid ${th.border2}`,color:th.muted,borderRadius:12,padding:14,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700 }}>Cancel</button>
              <button onClick={save} className="press" style={{ flex:2,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#000",border:"none",borderRadius:12,padding:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:15,boxShadow:"0 4px 14px rgba(245,158,11,0.35)" }}>
                {editId?"Update Trade":"Add Trade ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {chart && <ChartModal pair={chart} dark={dark} onClose={()=>setChart(null)}/>}
    </div>
  );
}
