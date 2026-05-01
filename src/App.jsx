import { useState, useMemo, useEffect } from "react";

// ── Constants ─────────────────────────────────────────────────
const PAIRS      = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","BTC/USD","ETH/USD","XAU/USD","GBP/JPY","USD/CAD","NZD/USD"];
const SESSIONS   = ["London","New York","Asian","London/NY Overlap"];
const STRATEGIES = ["Breakout","Trend Follow","Mean Reversion","Scalp","Swing","ICT/SMC","Other"];
const TABS       = ["journal","analytics","calculator","calendar"];

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

// ── Helpers ───────────────────────────────────────────────────
function calcPnl(t) {
  const e = parseFloat(t.entry), x = parseFloat(t.exit), l = parseFloat(t.lots);
  if (!e || !x || !l) return null;
  const crypto = t.pair.includes("BTC")||t.pair.includes("ETH");
  const jpy    = t.pair.includes("JPY");
  const pip    = jpy ? 0.01 : crypto ? 1 : 0.0001;
  const pips   = ((x-e)/pip)*(t.direction==="Long"?1:-1);
  const val    = crypto ? l : l*100000*pip;
  return { pnl:+(pips*val).toFixed(2), pips:+pips.toFixed(1) };
}

function pipValue(pair, lots) {
  const l = parseFloat(lots)||0;
  if (!l) return 0;
  const jpy    = pair.includes("JPY");
  const crypto = pair.includes("BTC")||pair.includes("ETH");
  if (crypto) return l;
  return jpy ? l*100000*0.01 : l*100000*0.0001;
}

function exportCSV(trades) {
  const hdr = ["Date","Pair","Direction","Entry","Exit","Lots","Session","Strategy","P&L","Pips","Status","Notes"];
  const rows = trades.map(t => {
    const r = calcPnl(t);
    return [t.date,t.pair,t.direction,t.entry,t.exit,t.lots,t.session,t.strategy,r?r.pnl:"",r?r.pips:"",t.status,`"${t.notes}"`];
  });
  const csv = [hdr,...rows].map(r=>r.join(",")).join("\n");
  const a   = document.createElement("a");
  a.href    = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
  a.download= "tradelog.csv";
  a.click();
}

// ── Subcomponents ─────────────────────────────────────────────

function ChartModal({ pair, onClose, dark }) {
  const sym = TV_SYMBOLS[pair]||"FX:EURUSD";
  const src = `https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(sym)}&interval=H1&theme=${dark?"dark":"light"}&style=1&timezone=Etc%2FUTC&hideideas=1`;
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:200,display:"flex",flexDirection:"column" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #2a2a2a",background:dark?"#0f0f0f":"#fff" }}>
        <span style={{ fontWeight:700,fontFamily:"monospace",color:"#f59e0b",fontSize:15 }}>📊 {pair}</span>
        <div style={{ display:"flex",gap:8 }}>
          <a href={tvURL(pair)} target="_blank" rel="noopener noreferrer" style={{ background:"#166534",color:"#22c55e",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:700,textDecoration:"none" }}>🌐 Open TradingView</a>
          <button onClick={onClose} style={{ background:"none",border:"1px solid #444",color:"#aaa",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:13 }}>✕ Close</button>
        </div>
      </div>
      <iframe src={src} style={{ flex:1,border:"none",width:"100%",height:"100%" }} allowFullScreen title="Chart" />
    </div>
  );
}

function Ticker({ dark }) {
  const [prices,setPrices] = useState({});
  const [prev,setPrev]     = useState({});
  const [err,setErr]       = useState(false);

  const load = async () => {
    setErr(false);
    const next = {};
    try {
      const r1 = await fetch("https://open.er-api.com/v6/latest/USD");
      if (r1.ok) {
        const d = await r1.json(), r = d.rates||{};
        if (r.EUR) next["EUR/USD"] = +(1/r.EUR).toFixed(5);
        if (r.GBP) next["GBP/USD"] = +(1/r.GBP).toFixed(5);
        if (r.JPY) next["USD/JPY"] = +r.JPY.toFixed(3);
        if (r.AUD) next["AUD/USD"] = +(1/r.AUD).toFixed(5);
        if (r.GBP&&r.JPY) next["GBP/JPY"] = +((1/r.GBP)*r.JPY).toFixed(3);
      }
    } catch(e){}
    try {
      const r2 = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,gold&vs_currencies=usd");
      if (r2.ok) {
        const d = await r2.json();
        if (d.bitcoin)  next["BTC/USD"] = d.bitcoin.usd;
        if (d.ethereum) next["ETH/USD"] = d.ethereum.usd;
        if (d.gold)     next["XAU/USD"] = d.gold.usd;
      }
    } catch(e){}
    if (!Object.keys(next).length) { setErr(true); return; }
    setPrev(prices); setPrices(next);
  };

  useEffect(() => { load(); const iv=setInterval(load,60000); return ()=>clearInterval(iv); }, []);

  const bg=dark?"#060606":"#f0f4f8", border=dark?"#1a1a1a":"#e2e8f0";
  const items=[...TICKER_PAIRS,...TICKER_PAIRS];
  return (
    <div style={{ background:bg,borderBottom:`1px solid ${border}`,height:46,overflow:"hidden",display:"flex",alignItems:"center",position:"relative" }}>
      <style>{`@keyframes mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}.tkr{display:flex;animation:mq 55s linear infinite;white-space:nowrap;align-items:center}.tkr:hover{animation-play-state:paused}`}</style>
      {err
        ? <span style={{ fontSize:11,color:"#f59e0b",padding:"0 14px" }}>⚠ Price feed unavailable — tap ⟳</span>
        : <div className="tkr">{items.map((label,i)=>{
            const price=prices[label], p0=prev[label];
            const up=p0&&price>p0, dn=p0&&price<p0;
            const isJPY=label.includes("JPY");
            const isBig=label.includes("BTC")||label.includes("ETH")||label.includes("XAU");
            const dp=isBig?2:isJPY?3:5;
            const diff=(p0&&price) ? +(price-p0).toFixed(dp) : null;
            const pct=(p0&&price) ? +((price-p0)/p0*100).toFixed(2) : null;
            const priceCol=up?"#22c55e":dn?"#ef4444":dark?"#ccc":"#333";
            return (
              <span key={i} style={{ padding:"0 14px",display:"inline-flex",alignItems:"center",gap:6,borderRight:`1px solid ${border}`,height:46 }}>
                <span style={{ fontSize:11,color:dark?"#555":"#94a3b8",fontFamily:"monospace" }}>{label}</span>
                {price
                  ? <span style={{ fontSize:12,fontFamily:"monospace",fontWeight:600,color:priceCol }}>{price.toLocaleString()}</span>
                  : <span style={{ fontSize:12,color:dark?"#222":"#ccc" }}>···</span>
                }
                {diff!==null && diff!==0 && (
                  <span style={{
                    fontSize:10,fontFamily:"monospace",fontWeight:700,
                    background:up?"#0d2b1a":"#2b0d0d",
                    color:up?"#22c55e":"#ef4444",
                    border:`1px solid ${up?"#166534":"#991b1b"}`,
                    borderRadius:4,padding:"2px 6px",
                    display:"inline-flex",alignItems:"center",gap:2
                  }}>
                    {up?"▲":"▼"} {diff>0?"+":""}{diff} <span style={{opacity:0.7}}>({pct>0?"+":""}{pct}%)</span>
                  </span>
                )}
              </span>
            );
          })}</div>
      }
      <button onClick={load} title="Refresh" style={{ position:"absolute",right:6,background:"none",border:"none",cursor:"pointer",fontSize:15,color:dark?"#555":"#aaa",padding:4 }}>⟳</button>
    </div>
  );
}

// ── Risk Calculator Tab ───────────────────────────────────────
function Calculator({ dark, th }) {
  const [balance,  setBalance]  = useState("10000");
  const [risk,     setRisk]     = useState("1");
  const [pair,     setPair]     = useState("EUR/USD");
  const [sl,       setSl]       = useState("20");
  const [entry,    setEntry]    = useState("");

  const riskAmt  = (parseFloat(balance)||0) * ((parseFloat(risk)||0)/100);
  const slPips   = parseFloat(sl)||0;
  const pv       = pipValue(pair, 1);
  const sugLots  = pv && slPips ? +(riskAmt / (slPips * pv)).toFixed(2) : 0;
  const inp2 = { background:th.inputBg,border:`1px solid ${th.border2}`,borderRadius:7,color:th.text,padding:"9px 11px",fontSize:14,width:"100%",outline:"none",fontFamily:"monospace",boxSizing:"border-box" };
  const lbl2 = { fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4,marginTop:14 };

  return (
    <div>
      <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:20,marginBottom:12 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:4,color:th.text }}>⚖️ Risk Calculator</div>
        <div style={{ fontSize:12,color:th.muted,marginBottom:16 }}>Calculate safe lot size based on your risk tolerance</div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={lbl2}>Account Balance ($)</label><input style={inp2} type="number" value={balance} onChange={e=>setBalance(e.target.value)} placeholder="10000" /></div>
          <div><label style={lbl2}>Risk per Trade (%)</label><input style={inp2} type="number" value={risk} onChange={e=>setRisk(e.target.value)} placeholder="1" /></div>
          <div>
            <label style={lbl2}>Pair</label>
            <select style={inp2} value={pair} onChange={e=>setPair(e.target.value)}>
              {PAIRS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label style={lbl2}>Stop Loss (pips)</label><input style={inp2} type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder="20" /></div>
        </div>

        <div style={{ marginTop:20,background:dark?"#0d2b1a":"#f0fdf4",border:"1px solid #166534",borderRadius:10,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center" }}>
          <div><div style={{ fontSize:20,fontWeight:700,color:"#22c55e",fontFamily:"monospace" }}>${riskAmt.toFixed(2)}</div><div style={{ fontSize:11,color:th.muted,marginTop:2 }}>Max Risk $</div></div>
          <div><div style={{ fontSize:20,fontWeight:700,color:"#f59e0b",fontFamily:"monospace" }}>{sugLots}</div><div style={{ fontSize:11,color:th.muted,marginTop:2 }}>Suggested Lots</div></div>
          <div><div style={{ fontSize:20,fontWeight:700,color:"#60a5fa",fontFamily:"monospace" }}>{pv?(pv*sugLots*slPips).toFixed(2):"—"}</div><div style={{ fontSize:11,color:th.muted,marginTop:2 }}>Risk in $</div></div>
        </div>
      </div>

      {/* Pip Value table */}
      <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:20 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:12,color:th.text }}>📐 Pip Value Reference (0.01 lot)</div>
        {PAIRS.map(p=>{
          const pv01 = pipValue(p, 0.01);
          return (
            <div key={p} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${th.border}`,fontSize:13 }}>
              <span style={{ fontFamily:"monospace",color:th.muted }}>{p}</span>
              <span style={{ fontFamily:"monospace",color:th.text }}>${pv01.toFixed(4)}/pip</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Economic Calendar Tab ─────────────────────────────────────
function CalendarTab({ dark }) {
  const muted  = dark ? "#666" : "#94a3b8";
  const border = dark ? "#1f1f1f" : "#e2e8f0";
  return (
    <div>
      <div style={{ fontSize:12, color:muted, marginBottom:10 }}>
        Live Forex Factory economic calendar — high/medium/low impact events updated in real time.
      </div>
      <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${border}`, marginBottom:12 }}>
        <iframe
          src="https://www.forexfactory.com/calendar#week"
          style={{ width:"100%", height:"640px", border:"none" }}
          title="Forex Factory Calendar"
        />
      </div>
      <div style={{ textAlign:"center" }}>
        <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#f59e0b", color:"#000", borderRadius:8, padding:"10px 18px", fontWeight:700, fontSize:13, textDecoration:"none" }}>
          🌐 Open Forex Factory
        </a>
        <div style={{ fontSize:11, color:muted, marginTop:8 }}>
          If the calendar doesn't load above, tap the button to open it directly.
        </div>
      </div>
    </div>
  );
}

// ── Equity Curve ──────────────────────────────────────────────
function EquityCurve({ trades, dark, th }) {
  const points = useMemo(() => {
    const sorted = [...trades].filter(t=>t.status==="Closed"&&calcPnl(t)).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let cum = 0;
    return sorted.map(t=>{ cum+=calcPnl(t).pnl; return { date:t.date, val:+cum.toFixed(2) }; });
  }, [trades]);

  if (points.length < 2) return (
    <div style={{ textAlign:"center",padding:"30px 0",color:th.muted,fontSize:13 }}>Need at least 2 closed trades to show equity curve</div>
  );

  const vals = points.map(p=>p.val);
  const min  = Math.min(...vals, 0);
  const max  = Math.max(...vals, 0);
  const range= max-min || 1;
  const W=300, H=120, pad=10;
  const sx = (i) => pad + (i/(points.length-1))*(W-2*pad);
  const sy = (v) => H-pad - ((v-min)/range)*(H-2*pad);
  const polyline = points.map((p,i)=>`${sx(i)},${sy(p.val)}`).join(" ");
  const last = points[points.length-1].val;
  const col  = last>=0 ? "#22c55e" : "#ef4444";

  return (
    <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:16,marginBottom:12 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
        <span style={{ fontWeight:700,fontSize:13,color:th.text }}>📈 Equity Curve</span>
        <span style={{ fontFamily:"monospace",fontWeight:700,color:col,fontSize:14 }}>{last>=0?"+":""}{last}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",height:H }}>
        {/* Zero line */}
        <line x1={pad} y1={sy(0)} x2={W-pad} y2={sy(0)} stroke={dark?"#2a2a2a":"#e2e8f0"} strokeWidth="1" strokeDasharray="4" />
        {/* Fill */}
        <polygon points={`${sx(0)},${sy(0)} ${polyline} ${sx(points.length-1)},${sy(0)}`} fill={col} fillOpacity="0.1" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
        {/* Last dot */}
        <circle cx={sx(points.length-1)} cy={sy(last)} r="4" fill={col} />
      </svg>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:th.muted,marginTop:4 }}>
        <span>{points[0].date}</span>
        <span>{points[points.length-1].date}</span>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [dark,     setDark]     = useState(true);
  const [trades,   setTrades]   = useState([]);
  const [form,     setForm]     = useState({...empty});
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [tab,      setTab]      = useState("journal");
  const [filter,   setFilter]   = useState("All");
  const [chart,    setChart]    = useState(null);
  const [dailyLimit, setDailyLimit] = useState(3);

  // Persist trades to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tradelog_trades");
    if (saved) try { setTrades(JSON.parse(saved)); } catch(e){}
  }, []);
  useEffect(() => {
    localStorage.setItem("tradelog_trades", JSON.stringify(trades));
  }, [trades]);

  // Theme
  const th = {
    bg:      dark?"#090909":"#f8fafc",
    surface: dark?"#111111":"#ffffff",
    border:  dark?"#1f1f1f":"#e2e8f0",
    border2: dark?"#2a2a2a":"#cbd5e1",
    text:    dark?"#e5e5e5":"#0f172a",
    muted:   dark?"#666":"#94a3b8",
    inputBg: dark?"#0a0a0a":"#f1f5f9",
    overlay: dark?"rgba(0,0,0,0.9)":"rgba(15,23,42,0.55)",
  };

  const inp = { background:th.inputBg,border:`1px solid ${th.border2}`,borderRadius:7,color:th.text,padding:"9px 11px",fontSize:13,width:"100%",outline:"none",fontFamily:"monospace",boxSizing:"border-box" };
  const lbl = { fontSize:11,color:th.muted,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:4,marginTop:12 };

  const setF     = (k,v) => setForm(p=>({...p,[k]:v}));
  const openNew  = () => { setForm({...empty,date:new Date().toISOString().slice(0,10)}); setEditId(null); setShowForm(true); };
  const openEdit = (t) => { setForm({...t}); setEditId(t.id); setShowForm(true); };
  const closeForm= () => { setShowForm(false); setEditId(null); };

  const todayTrades = trades.filter(t => t.date === new Date().toISOString().slice(0,10));
  const limitReached = todayTrades.length >= dailyLimit;

  const save = () => {
    if (!form.pair || !form.entry) { alert("Pair and Entry Price are required."); return; }
    if (!editId && limitReached) { alert(`Daily trade limit of ${dailyLimit} reached. Stay disciplined! 🛑`); return; }
    const newTrade = { ...form, id: editId ?? Date.now() };
    setTrades(prev => editId ? prev.map(t=>t.id===editId?newTrade:t) : [...prev,newTrade]);
    closeForm();
  };

  const del = (id) => { if (confirm("Delete this trade?")) setTrades(p=>p.filter(t=>t.id!==id)); };

  const visible = trades.filter(t=>filter==="All"||t.status===filter);
  const closed  = useMemo(()=>trades.filter(t=>t.status==="Closed"&&calcPnl(t)),[trades]);

  const stats = useMemo(()=>{
    if (!closed.length) return null;
    const vals  = closed.map(t=>calcPnl(t).pnl);
    const wins  = vals.filter(v=>v>0).length;
    const total = vals.reduce((a,b)=>a+b,0);

    // Max drawdown
    let peak=0,maxDD=0,cum=0;
    closed.sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(t=>{
      cum+=calcPnl(t).pnl;
      if (cum>peak) peak=cum;
      if (peak-cum>maxDD) maxDD=peak-cum;
    });

    // By session
    const bySession={};
    closed.forEach(t=>{ const r=calcPnl(t); bySession[t.session]=+((bySession[t.session]||0)+r.pnl).toFixed(2); });
    const bestSession=Object.entries(bySession).sort((a,b)=>b[1]-a[1])[0];

    // By strategy
    const byStrat={};
    closed.forEach(t=>{ const r=calcPnl(t); byStrat[t.strategy]=+((byStrat[t.strategy]||0)+r.pnl).toFixed(2); });
    const bestStrat=Object.entries(byStrat).sort((a,b)=>b[1]-a[1])[0];

    // Streak
    const sorted=[...closed].sort((a,b)=>new Date(b.date)-new Date(a.date));
    let streak=0,streakType="";
    for (const t of sorted) {
      const p=calcPnl(t).pnl;
      if (streak===0) { streakType=p>0?"W":"L"; streak=1; }
      else if ((streakType==="W"&&p>0)||(streakType==="L"&&p<0)) streak++;
      else break;
    }

    return {
      count:closed.length, wins, losses:closed.length-wins,
      wr:((wins/closed.length)*100).toFixed(1),
      total:total.toFixed(2), avg:(total/closed.length).toFixed(2),
      best:Math.max(...vals).toFixed(2), worst:Math.min(...vals).toFixed(2),
      maxDD:maxDD.toFixed(2), bestSession, bestStrat,
      streak, streakType,
    };
  },[closed]);

  const byPair = useMemo(()=>{
    const m={};
    closed.forEach(t=>{ const r=calcPnl(t); m[t.pair]=+((m[t.pair]||0)+r.pnl).toFixed(2); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[closed]);

  const bySession = useMemo(()=>{
    const m={};
    closed.forEach(t=>{ const r=calcPnl(t); m[t.session]=+((m[t.session]||0)+r.pnl).toFixed(2); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[closed]);

  const byStrategy = useMemo(()=>{
    const m={};
    closed.forEach(t=>{ const r=calcPnl(t); m[t.strategy]=+((m[t.strategy]||0)+r.pnl).toFixed(2); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[closed]);

  const preview  = calcPnl(form);

  const badge=(c)=>({
    background:c==="Long"?"#0d2b1a":c==="Short"?"#2b0d0d":"#1c1c1c",
    color:c==="Long"?"#22c55e":c==="Short"?"#ef4444":"#9ca3af",
    border:`1px solid ${c==="Long"?"#166534":c==="Short"?"#991b1b":"#374151"}`,
    borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600,display:"inline-block"
  });

  const BarRow=({label,val,max,onChart})=>(
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
      <span style={{ fontFamily:"monospace",fontSize:12,width:90,color:th.muted,flexShrink:0 }}>{label}</span>
      <div style={{ flex:1,height:7,background:dark?"#1a1a1a":"#e2e8f0",borderRadius:4 }}>
        <div style={{ height:"100%",width:`${(Math.abs(val)/max)*100}%`,background:val>=0?"#22c55e":"#ef4444",borderRadius:4 }}/>
      </div>
      <span style={{ fontFamily:"monospace",fontSize:12,color:val>=0?"#22c55e":"#ef4444",width:65,textAlign:"right",flexShrink:0 }}>{val>=0?"+":""}{val}</span>
      {onChart && <button onClick={onChart} style={{ background:"none",border:`1px solid ${th.border2}`,color:"#f59e0b",borderRadius:5,padding:"2px 7px",fontSize:10,cursor:"pointer" }}>📊</button>}
    </div>
  );

  const Field=({label,name,type="text",options,placeholder})=>(
    <div>
      <label style={lbl}>{label}</label>
      {options
        ?<select style={inp} value={form[name]} onChange={e=>setF(name,e.target.value)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>
        :<input style={inp} type={type} step="any" placeholder={placeholder} value={form[name]} onChange={e=>setF(name,e.target.value)}/>}
    </div>
  );

  const tabLabels={"journal":"📋 Journal","analytics":"📊 Analytics","calculator":"⚖️ Calculator","calendar":"📅 Calendar"};

  return (
    <div style={{ minHeight:"100vh",background:th.bg,color:th.text,fontFamily:"system-ui,sans-serif",transition:"background 0.2s,color 0.2s" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${th.border}`,gap:8,flexWrap:"wrap" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <h1 style={{ fontSize:20,fontWeight:700,color:"#f59e0b",margin:0 }}>📈 TradeLog</h1>
          {/* Daily limit indicator */}
          <span style={{ fontSize:11,color:limitReached?"#ef4444":"#22c55e",fontFamily:"monospace",background:dark?"#1a1a1a":"#f1f5f9",border:`1px solid ${th.border}`,borderRadius:5,padding:"2px 8px" }}>
            {todayTrades.length}/{dailyLimit} today
          </span>
        </div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
          <button onClick={()=>setDark(d=>!d)} style={{ background:"none",border:`1px solid ${th.border2}`,color:th.muted,borderRadius:8,padding:"7px 11px",cursor:"pointer",fontSize:15 }}>{dark?"☀️":"🌙"}</button>
          <button onClick={()=>exportCSV(trades)} style={{ background:"none",border:`1px solid ${th.border2}`,color:th.muted,borderRadius:8,padding:"7px 11px",cursor:"pointer",fontSize:12,fontWeight:600 }}>⬇ CSV</button>
          <a href="https://www.tradingview.com/chart/" target="_blank" rel="noopener noreferrer" style={{ background:"none",border:"1px solid #166534",color:"#22c55e",borderRadius:8,padding:"7px 12px",fontWeight:700,fontSize:12,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4 }}>📊 TradingView</a>
          <button onClick={openNew} style={{ background:"#f59e0b",color:"#000",border:"none",borderRadius:8,padding:"9px 14px",fontWeight:700,cursor:"pointer",fontSize:13 }}>+ New Trade</button>
        </div>
      </div>

      {/* ── Ticker ── */}
      <Ticker dark={dark} />

      <div style={{ padding:16 }}>
        {/* ── Tabs ── */}
        <div style={{ display:"flex",gap:0,borderBottom:`1px solid ${th.border}`,marginBottom:20,marginTop:8,overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ background:"none",border:"none",borderBottom:tab===t?"2px solid #f59e0b":"2px solid transparent",color:tab===t?th.text:th.muted,padding:"8px 14px",cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap" }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* ── JOURNAL ── */}
        {tab==="journal" && (
          <>
            <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
              {["All","Open","Closed"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{ background:"none",border:`1px solid ${filter===f?th.border2:th.border}`,color:filter===f?th.text:th.muted,borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>{f}</button>
              ))}
              <div style={{ marginLeft:"auto",display:"flex",gap:8,alignItems:"center" }}>
                <span style={{ fontSize:11,color:th.muted }}>Daily limit:</span>
                <input type="number" min="1" max="20" value={dailyLimit} onChange={e=>setDailyLimit(+e.target.value)} style={{ ...inp,width:50,padding:"4px 8px",fontSize:12 }} />
                <span style={{ fontSize:12,color:th.muted }}>{visible.length} trades</span>
              </div>
            </div>

            {visible.length===0 && (
              <div style={{ textAlign:"center",padding:"70px 0",color:th.muted }}>
                <div style={{ fontSize:40 }}>📭</div>
                <div style={{ marginTop:10,fontSize:13 }}>No trades yet — tap + New Trade to start</div>
              </div>
            )}

            {[...visible].reverse().map(t=>{
              const r=calcPnl(t), win=r&&r.pnl>0;
              return (
                <div key={t.id} style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:16,marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8 }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700,fontSize:15,fontFamily:"monospace" }}>{t.pair}</span>
                        <span style={badge(t.direction)}>{t.direction}</span>
                        {t.status==="Open"&&<span style={badge("open")}>Open</span>}
                        <button onClick={()=>setChart(t.pair)} style={{ background:"none",border:`1px solid ${th.border2}`,color:"#f59e0b",borderRadius:5,padding:"2px 8px",fontSize:11,cursor:"pointer",fontWeight:600 }}>📊 Chart</button>
                        <a href={tvURL(t.pair)} target="_blank" rel="noopener noreferrer" style={{ background:"#1a2a1a",border:"1px solid #166534",color:"#22c55e",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:600,textDecoration:"none" }}>🌐 TV</a>
                      </div>
                      <div style={{ fontSize:12,color:th.muted,marginTop:4 }}>{t.date} · {t.session} · {t.strategy}</div>
                      <div style={{ fontSize:12,color:th.muted,fontFamily:"monospace",marginTop:5 }}>Entry {t.entry}{t.exit?` → Exit ${t.exit}`:""} · {t.lots} lot</div>
                      {t.notes&&<div style={{ fontSize:12,color:th.muted,marginTop:4,fontStyle:"italic" }}>{t.notes}</div>}
                    </div>
                    <div style={{ textAlign:"right",minWidth:72,flexShrink:0 }}>
                      {r?<><div style={{ color:win?"#22c55e":"#ef4444",fontWeight:700,fontFamily:"monospace" }}>{win?"+":""}{r.pnl}</div><div style={{ fontSize:11,color:win?"#166534":"#991b1b" }}>{win?"+":""}{r.pips}p</div></>:<span style={{ fontSize:11,color:"#f59e0b" }}>● Live</span>}
                      <div style={{ display:"flex",gap:4,marginTop:8,justifyContent:"flex-end" }}>
                        <button onClick={()=>openEdit(t)} style={{ background:"none",border:`1px solid ${th.border}`,color:th.muted,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer" }}>Edit</button>
                        <button onClick={()=>del(t.id)}   style={{ background:"none",border:`1px solid ${th.border}`,color:"#ef4444",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer" }}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── ANALYTICS ── */}
        {tab==="analytics" && (
          <>
            {!stats
              ? <div style={{ textAlign:"center",padding:"70px 0",color:th.muted,fontSize:13 }}>Add closed trades to see analytics</div>
              : <>
                  {/* Streak banner */}
                  <div style={{ background:stats.streakType==="W"?"#0d2b1a":"#2b0d0d",border:`1px solid ${stats.streakType==="W"?"#166534":"#991b1b"}`,borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:13,color:th.muted }}>Current Streak</span>
                    <span style={{ fontFamily:"monospace",fontWeight:700,fontSize:18,color:stats.streakType==="W"?"#22c55e":"#ef4444" }}>
                      {stats.streakType==="W"?"🔥":"❄️"} {stats.streak} {stats.streakType==="W"?"Win":"Loss"}{stats.streak>1?"s":""}
                    </span>
                  </div>

                  {/* Stat grid */}
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
                    {[
                      {label:"Trades",   val:stats.count,               col:th.text},
                      {label:"Win Rate", val:`${stats.wr}%`,            col:parseFloat(stats.wr)>=50?"#22c55e":"#ef4444", sub:`${stats.wins}W · ${stats.losses}L`},
                      {label:"Total P&L",val:`$${stats.total}`,         col:parseFloat(stats.total)>=0?"#22c55e":"#ef4444"},
                      {label:"Avg P&L",  val:`$${stats.avg}`,           col:parseFloat(stats.avg)>=0?"#22c55e":"#ef4444"},
                      {label:"Best",     val:`$${stats.best}`,          col:"#22c55e"},
                      {label:"Worst",    val:`$${stats.worst}`,         col:"#ef4444"},
                      {label:"Max Drawdown", val:`$${stats.maxDD}`,     col:"#ef4444"},
                      {label:"Best Session", val:stats.bestSession?`${stats.bestSession[0]} +$${stats.bestSession[1]}`:"—", col:"#f59e0b"},
                    ].map(({label,val,col,sub})=>(
                      <div key={label} style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:10,padding:"14px 16px",textAlign:"center" }}>
                        <div style={{ fontSize:18,fontWeight:700,fontFamily:"monospace",color:col }}>{val}</div>
                        {sub&&<div style={{ fontSize:11,color:th.muted }}>{sub}</div>}
                        <div style={{ fontSize:10,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Equity Curve */}
                  <EquityCurve trades={trades} dark={dark} th={th} />

                  {/* P&L by Pair */}
                  <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:16,marginBottom:12 }}>
                    <div style={{ fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14 }}>P&L by Pair</div>
                    {byPair.map(([pair,val])=><BarRow key={pair} label={pair} val={val} max={Math.max(...byPair.map(e=>Math.abs(e[1])))} onChart={()=>setChart(pair)} />)}
                  </div>

                  {/* P&L by Session */}
                  <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:16,marginBottom:12 }}>
                    <div style={{ fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14 }}>P&L by Session</div>
                    {bySession.map(([s,val])=><BarRow key={s} label={s} val={val} max={Math.max(...bySession.map(e=>Math.abs(e[1])))} />)}
                  </div>

                  {/* P&L by Strategy */}
                  <div style={{ background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:16 }}>
                    <div style={{ fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14 }}>P&L by Strategy</div>
                    {byStrategy.map(([s,val])=><BarRow key={s} label={s} val={val} max={Math.max(...byStrategy.map(e=>Math.abs(e[1])))} />)}
                  </div>
                </>
            }
          </>
        )}

        {/* ── CALCULATOR ── */}
        {tab==="calculator" && <Calculator dark={dark} th={th} />}

        {/* ── CALENDAR ── */}
        {tab==="calendar" && <CalendarTab dark={dark} />}

      </div>

      {/* ── Trade Modal ── */}
      {showForm && (
        <div style={{ position:"fixed",inset:0,background:th.overlay,display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16 }}
          onClick={e=>e.target===e.currentTarget&&closeForm()}>
          <div style={{ background:th.surface,border:`1px solid ${th.border2}`,borderRadius:14,padding:22,width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <strong style={{ color:th.text,fontSize:15 }}>{editId?"Edit Trade":"New Trade"}</strong>
              <button onClick={closeForm} style={{ background:"none",border:"none",color:th.muted,cursor:"pointer",fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <Field label="Date"        name="date"      type="date"/>
              <Field label="Status"      name="status"    options={["Open","Closed"]}/>
              <Field label="Pair"        name="pair"      options={PAIRS}/>
              <Field label="Direction"   name="direction" options={["Long","Short"]}/>
              <Field label="Entry Price" name="entry"     type="number" placeholder="e.g. 1.0820"/>
              <Field label="Exit Price"  name="exit"      type="number" placeholder="e.g. 1.0890"/>
              <Field label="Lot Size"    name="lots"      type="number" placeholder="e.g. 0.01"/>
              <Field label="Session"     name="session"   options={SESSIONS}/>
            </div>
            <Field label="Strategy" name="strategy" options={STRATEGIES}/>
            <div>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp,height:60,resize:"vertical" }} placeholder="Trade rationale, observations..." value={form.notes} onChange={e=>setF("notes",e.target.value)}/>
            </div>
            {preview&&(
              <div style={{ background:preview.pnl>=0?"#0d2b1a":"#2b0d0d",border:`1px solid ${preview.pnl>=0?"#166534":"#991b1b"}`,borderRadius:8,padding:"10px 14px",marginTop:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:12,color:"#888" }}>Estimated P&L</span>
                <span style={{ fontFamily:"monospace",fontWeight:700,color:preview.pnl>=0?"#22c55e":"#ef4444" }}>{preview.pnl>=0?"+":""}{preview.pnl} ({preview.pips>=0?"+":""}{preview.pips} pips)</span>
              </div>
            )}
            <div style={{ display:"flex",gap:8,marginTop:20 }}>
              <button onClick={closeForm} style={{ flex:1,background:"none",border:`1px solid ${th.border2}`,color:th.muted,borderRadius:8,padding:11,cursor:"pointer",fontFamily:"inherit",fontSize:13 }}>Cancel</button>
              <button onClick={save} style={{ flex:2,background:"#f59e0b",color:"#000",border:"none",borderRadius:8,padding:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13 }}>{editId?"Update Trade":"Add Trade"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chart Modal ── */}
      {chart&&<ChartModal pair={chart} dark={dark} onClose={()=>setChart(null)}/>}
    </div>
  );
}
