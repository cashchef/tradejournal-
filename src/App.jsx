import { useState, useMemo, useEffect, useCallback } from "react";

const PAIRS     = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","BTC/USD","ETH/USD","XAU/USD","GBP/JPY"];
const SESSIONS  = ["London","New York","Asian","London/NY Overlap"];
const STRATEGIES= ["Breakout","Trend Follow","Mean Reversion","Scalp","Swing","ICT/SMC","Other"];

const empty = {
  pair:"EUR/USD", direction:"Long", entry:"", exit:"",
  lots:"", session:"London", strategy:"Trend Follow",
  notes:"", date: new Date().toISOString().slice(0,10), status:"Closed"
};

function calcPnl(t) {
  const e = parseFloat(t.entry), x = parseFloat(t.exit), l = parseFloat(t.lots);
  if (!e || !x || !l) return null;
  const crypto = t.pair.includes("BTC")||t.pair.includes("ETH");
  const jpy    = t.pair.includes("JPY");
  const pip    = jpy ? 0.01 : crypto ? 1 : 0.0001;
  const pips   = ((x - e) / pip) * (t.direction === "Long" ? 1 : -1);
  const val    = crypto ? l : l * 100000 * pip;
  return { pnl: +(pips * val).toFixed(2), pips: +pips.toFixed(1) };
}

// ── Price Ticker ──────────────────────────────────────────────
const TICKER_LABELS = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","GBP/JPY","XAU/USD","BTC/USD","ETH/USD"];

async function loadPrices() {
  const result = {};
  try {
    // Crypto — CoinGecko public API
    const cg = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
      { headers: { Accept: "application/json" } }
    );
    if (cg.ok) {
      const d = await cg.json();
      if (d.bitcoin)  result["BTC/USD"] = d.bitcoin.usd;
      if (d.ethereum) result["ETH/USD"] = d.ethereum.usd;
    }
  } catch(e) { console.warn("Crypto fetch failed", e); }

  try {
    // Forex — Frankfurter (no CORS issues, truly free)
    const fx = await fetch("https://api.frankfurter.app/latest?from=USD");
    if (fx.ok) {
      const d  = await fx.json();
      const r  = d.rates || {};
      if (r.EUR) result["EUR/USD"] = +(1 / r.EUR).toFixed(5);
      if (r.GBP) result["GBP/USD"] = +(1 / r.GBP).toFixed(5);
      if (r.JPY) result["USD/JPY"] = +r.JPY.toFixed(3);
      if (r.AUD) result["AUD/USD"] = +(1 / r.AUD).toFixed(5);
      if (r.GBP && r.JPY) result["GBP/JPY"] = +((1 / r.GBP) * r.JPY).toFixed(3);
      // XAU via separate call
      const xau = await fetch("https://api.frankfurter.app/latest?from=XAU&to=USD");
      if (xau.ok) {
        const xd = await xau.json();
        if (xd.rates?.USD) result["XAU/USD"] = +xd.rates.USD.toFixed(2);
      }
    }
  } catch(e) { console.warn("Forex fetch failed", e); }

  return result;
}

function Ticker({ dark }) {
  const [prices, setPrices]   = useState({});
  const [prev,   setPrev]     = useState({});
  const [status, setStatus]   = useState("loading"); // loading | ok | error

  const refresh = useCallback(async () => {
    setStatus("loading");
    const p = await loadPrices();
    if (Object.keys(p).length === 0) { setStatus("error"); return; }
    setPrev(prices);
    setPrices(p);
    setStatus("ok");
  }, [prices]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60000);
    return () => clearInterval(iv);
  }, []);

  const items = [...TICKER_LABELS, ...TICKER_LABELS];
  const bg    = dark ? "#060606" : "#f1f5f9";
  const border= dark ? "#1a1a1a" : "#e2e8f0";

  return (
    <div style={{ background:bg, borderBottom:`1px solid ${border}`, height:36, overflow:"hidden", display:"flex", alignItems:"center", position:"relative" }}>
      <style>{`
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .tkr { display:flex; animation:marquee 50s linear infinite; white-space:nowrap; }
        .tkr:hover { animation-play-state:paused; cursor:default; }
      `}</style>

      {status === "error" && (
        <span style={{fontSize:11,color:"#ef4444",padding:"0 12px",whiteSpace:"nowrap"}}>
          ⚠ Price feed unavailable — check connection
        </span>
      )}

      {status !== "error" && (
        <div className="tkr">
          {items.map((label, i) => {
            const price = prices[label];
            const p0    = prev[label];
            const up    = p0 && price > p0;
            const dn    = p0 && price < p0;
            const color = up ? "#22c55e" : dn ? "#ef4444" : dark ? "#888" : "#555";
            const dimColor = dark ? "#333" : "#aaa";
            return (
              <span key={i} style={{ padding:"0 16px", fontSize:12, fontFamily:"monospace", color, borderRight:`1px solid ${border}` }}>
                <span style={{ color: dark?"#444":"#94a3b8", marginRight:5 }}>{label}</span>
                {price
                  ? <>{up?"▲":dn?"▼":""} {price.toLocaleString()}</>
                  : <span style={{color:dimColor}}>···</span>
                }
              </span>
            );
          })}
        </div>
      )}

      {/* Refresh button */}
      <button onClick={refresh} title="Refresh prices" style={{ position:"absolute", right:8, background:"none", border:"none", cursor:"pointer", fontSize:14, color: dark?"#444":"#aaa", padding:4 }}>⟳</button>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [dark,     setDark]     = useState(true);
  const [trades,   setTrades]   = useState([]);
  const [form,     setForm]     = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [tab,      setTab]      = useState("journal");
  const [filter,   setFilter]   = useState("All");

  // ── theme tokens ──
  const th = {
    bg:        dark ? "#090909" : "#f8fafc",
    surface:   dark ? "#0f0f0f" : "#ffffff",
    border:    dark ? "#1f1f1f" : "#e2e8f0",
    border2:   dark ? "#2a2a2a" : "#cbd5e1",
    text:      dark ? "#e5e5e5" : "#0f172a",
    muted:     dark ? "#555"    : "#94a3b8",
    inputBg:   dark ? "#0a0a0a" : "#f1f5f9",
    overlay:   dark ? "rgba(0,0,0,0.88)" : "rgba(15,23,42,0.6)",
    modalBg:   dark ? "#0f0f0f" : "#ffffff",
  };

  const s = {
    app:       { minHeight:"100vh", background:th.bg, color:th.text, fontFamily:"system-ui,sans-serif", transition:"background 0.2s,color 0.2s" },
    header:    { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid ${th.border}`, gap:8 },
    title:     { fontSize:20, fontWeight:700, color:"#f59e0b", margin:0 },
    btnPrimary:{ background:"#f59e0b", color:"#000", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:700, cursor:"pointer", fontSize:13 },
    btnMode:   { background:"none", border:`1px solid ${th.border2}`, color:th.muted, borderRadius:8, padding:"7px 12px", cursor:"pointer", fontSize:14, lineHeight:1 },
    inner:     { padding:16 },
    card:      { background:th.surface, border:`1px solid ${th.border}`, borderRadius:12, padding:16, marginBottom:10 },
    row:       { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 },
    pairTxt:   { fontWeight:700, fontSize:15, fontFamily:"monospace", color:th.text },
    meta:      { fontSize:12, color:th.muted, marginTop:4 },
    green:     { color:"#22c55e", fontWeight:700, fontFamily:"monospace" },
    red:       { color:"#ef4444", fontWeight:700, fontFamily:"monospace" },
    badge:     (c) => ({ background:c==="Long"?"#0d2b1a":c==="Short"?"#2b0d0d":"#1a1a1a", color:c==="Long"?"#22c55e":c==="Short"?"#ef4444":"#9ca3af", border:`1px solid ${c==="Long"?"#166534":c==="Short"?"#991b1b":"#374151"}`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600 }),
    overlay:   { position:"fixed", inset:0, background:th.overlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:99, padding:16 },
    modal:     { background:th.modalBg, border:`1px solid ${th.border2}`, borderRadius:14, padding:22, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" },
    label:     { fontSize:11, color:th.muted, letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:4, marginTop:12 },
    input:     { background:th.inputBg, border:`1px solid ${th.border2}`, borderRadius:7, color:th.text, padding:"9px 11px", fontSize:13, width:"100%", outline:"none", fontFamily:"monospace" },
    grid2:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
    tabBar:    { display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${th.border}` },
    tab:       (a) => ({ background:"none", border:"none", borderBottom:a?"2px solid #f59e0b":"2px solid transparent", color:a?th.text:th.muted, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:"inherit" }),
    stat:      { background:th.surface, border:`1px solid ${th.border}`, borderRadius:10, padding:"14px 16px", textAlign:"center" },
    statVal:   { fontSize:22, fontWeight:700, fontFamily:"monospace", color:th.text },
    statLbl:   { fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:"0.06em" },
    actionBtn: { background:"none", border:`1px solid ${th.border}`, color:th.muted, borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer", fontFamily:"inherit" },
  };

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!form.entry) return;
    if (editId) setTrades(p => p.map(t => t.id === editId ? { ...form, id:editId } : t));
    else        setTrades(p => [...p, { ...form, id: Date.now() }]);
    setShowForm(false); setEditId(null); setForm(empty);
  };
  const edit = (t) => { setForm(t); setEditId(t.id); setShowForm(true); };
  const del  = (id) => setTrades(p => p.filter(t => t.id !== id));

  const visible = trades.filter(t => filter==="All" || t.status===filter);
  const closed  = useMemo(() => trades.filter(t => t.status==="Closed" && calcPnl(t)), [trades]);

  const stats = useMemo(() => {
    if (!closed.length) return null;
    const vals  = closed.map(t => calcPnl(t).pnl);
    const wins  = vals.filter(v => v > 0).length;
    const total = vals.reduce((a,b)=>a+b,0);
    return { count:closed.length, wins, losses:closed.length-wins, wr:((wins/closed.length)*100).toFixed(1), total:total.toFixed(2), avg:(total/closed.length).toFixed(2), best:Math.max(...vals).toFixed(2), worst:Math.min(...vals).toFixed(2) };
  }, [closed]);

  const byPair = useMemo(() => {
    const m = {};
    closed.forEach(t => { const r = calcPnl(t); m[t.pair] = +((m[t.pair]||0)+r.pnl).toFixed(2); });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [closed]);

  const Field = ({ label, name, type="text", options, placeholder }) => (
    <div>
      <label style={s.label}>{label}</label>
      {options
        ? <select style={s.input} value={form[name]} onChange={e=>set(name,e.target.value)}>
            {options.map(o=><option key={o}>{o}</option>)}
          </select>
        : <input style={s.input} type={type} placeholder={placeholder} value={form[name]} onChange={e=>set(name,e.target.value)} />}
    </div>
  );

  const preview = calcPnl(form);

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>📈 TradeLog</h1>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* Dark / Light toggle */}
          <button style={s.btnMode} onClick={()=>setDark(d=>!d)} title="Toggle theme">
            {dark ? "☀️" : "🌙"}
          </button>
          <button style={s.btnPrimary} onClick={()=>{setForm(empty);setEditId(null);setShowForm(true);}}>
            + New Trade
          </button>
        </div>
      </div>

      {/* Scrolling Price Ticker */}
      <Ticker dark={dark} />

      <div style={s.inner}>
        {/* Tabs */}
        <div style={{...s.tabBar, marginTop:12}}>
          {["journal","analytics"].map(t=>(
            <button key={t} style={s.tab(tab===t)} onClick={()=>setTab(t)}>
              {t==="journal"?"📋 Journal":"📊 Analytics"}
            </button>
          ))}
        </div>

        {/* ── Journal ── */}
        {tab==="journal" && (
          <>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              {["All","Open","Closed"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{...s.actionBtn, color:filter===f?th.text:th.muted, borderColor:filter===f?th.border2:th.border}}>{f}</button>
              ))}
              <span style={{marginLeft:"auto",fontSize:12,color:th.muted,alignSelf:"center"}}>{visible.length} trades</span>
            </div>

            {visible.length===0 && (
              <div style={{textAlign:"center",padding:"60px 0",color:th.muted}}>
                <div style={{fontSize:36}}>📭</div>
                <div style={{marginTop:8,fontSize:13}}>No trades yet — tap + New Trade to start</div>
              </div>
            )}

            {[...visible].reverse().map(t => {
              const r   = calcPnl(t);
              const win = r && r.pnl > 0;
              return (
                <div key={t.id} style={s.card}>
                  <div style={s.row}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={s.pairTxt}>{t.pair}</span>
                        <span style={s.badge(t.direction)}>{t.direction}</span>
                        {t.status==="Open" && <span style={s.badge("open")}>Open</span>}
                      </div>
                      <div style={s.meta}>{t.date} · {t.session} · {t.strategy}</div>
                      <div style={{...s.meta,fontFamily:"monospace",marginTop:6}}>
                        Entry {t.entry}{t.exit?` → Exit ${t.exit}`:""} · {t.lots} lot
                      </div>
                      {t.notes && <div style={{...s.meta,marginTop:4,fontStyle:"italic"}}>{t.notes}</div>}
                    </div>
                    <div style={{textAlign:"right",minWidth:72}}>
                      {r
                        ? <><div style={win?s.green:s.red}>{win?"+":""}{r.pnl}</div><div style={{fontSize:11,color:win?"#166534":"#991b1b"}}>{win?"+":""}{r.pips}p</div></>
                        : <span style={{fontSize:11,color:"#f59e0b"}}>● Live</span>
                      }
                      <div style={{display:"flex",gap:4,marginTop:8,justifyContent:"flex-end"}}>
                        <button style={s.actionBtn} onClick={()=>edit(t)}>Edit</button>
                        <button style={{...s.actionBtn,color:"#ef4444"}} onClick={()=>del(t.id)}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Analytics ── */}
        {tab==="analytics" && (
          <>
            {!stats
              ? <div style={{textAlign:"center",padding:"60px 0",color:th.muted,fontSize:13}}>Add closed trades to see analytics</div>
              : <>
                  <div style={{...s.grid2, marginBottom:10}}>
                    <div style={s.stat}><div style={s.statVal}>{stats.count}</div><div style={s.statLbl}>Trades</div></div>
                    <div style={s.stat}><div style={{...s.statVal,color:parseFloat(stats.wr)>=50?"#22c55e":"#ef4444"}}>{stats.wr}%</div><div style={s.statLbl}>Win Rate</div></div>
                    <div style={s.stat}><div style={{...s.statVal,color:parseFloat(stats.total)>=0?"#22c55e":"#ef4444"}}>${stats.total}</div><div style={s.statLbl}>Total P&L</div></div>
                    <div style={s.stat}><div style={{...s.statVal,color:parseFloat(stats.avg)>=0?"#22c55e":"#ef4444"}}>${stats.avg}</div><div style={s.statLbl}>Avg P&L</div></div>
                    <div style={s.stat}><div style={{...s.statVal,color:"#22c55e"}}>${stats.best}</div><div style={s.statLbl}>Best</div></div>
                    <div style={s.stat}><div style={{...s.statVal,color:"#ef4444"}}>${stats.worst}</div><div style={s.statLbl}>Worst</div></div>
                  </div>
                  <div style={s.card}>
                    <div style={{fontSize:11,color:th.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}}>P&L by Pair</div>
                    {byPair.map(([pair,val]) => {
                      const max = Math.max(...byPair.map(e=>Math.abs(e[1])));
                      return (
                        <div key={pair} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                          <span style={{fontFamily:"monospace",fontSize:12,width:80,color:th.muted}}>{pair}</span>
                          <div style={{flex:1,height:7,background:dark?"#1a1a1a":"#e2e8f0",borderRadius:4}}>
                            <div style={{height:"100%",width:`${(Math.abs(val)/max)*100}%`,background:val>=0?"#22c55e":"#ef4444",borderRadius:4}}/>
                          </div>
                          <span style={{fontFamily:"monospace",fontSize:12,color:val>=0?"#22c55e":"#ef4444",width:65,textAlign:"right"}}>{val>=0?"+":""}{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
            }
          </>
        )}
      </div>

      {/* ── Modal ── */}
      {showForm && (
        <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div style={s.modal}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <strong style={{color:th.text}}>{editId?"Edit Trade":"New Trade"}</strong>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",color:th.muted,cursor:"pointer",fontSize:18}}>✕</button>
            </div>

            <div style={s.grid2}>
              <Field label="Date"        name="date"      type="date" />
              <Field label="Status"      name="status"    options={["Open","Closed"]} />
              <Field label="Pair"        name="pair"      options={PAIRS} />
              <Field label="Direction"   name="direction" options={["Long","Short"]} />
              <Field label="Entry Price" name="entry"     type="number" placeholder="1.0820" />
              <Field label="Exit Price"  name="exit"      type="number" placeholder="1.0890" />
              <Field label="Lot Size"    name="lots"      type="number" placeholder="0.1" />
              <Field label="Session"     name="session"   options={SESSIONS} />
            </div>
            <Field label="Strategy" name="strategy" options={STRATEGIES} />
            <div>
              <label style={s.label}>Notes</label>
              <textarea style={{...s.input,height:64,resize:"vertical"}} placeholder="Rationale, observations..." value={form.notes} onChange={e=>set("notes",e.target.value)} />
            </div>

            {preview && (
              <div style={{background:preview.pnl>=0?"#0d2b1a":"#2b0d0d",border:`1px solid ${preview.pnl>=0?"#166534":"#991b1b"}`,borderRadius:8,padding:"10px 14px",marginTop:14,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:"#888"}}>Estimated P&L</span>
                <span style={{fontFamily:"monospace",fontWeight:700,color:preview.pnl>=0?"#22c55e":"#ef4444"}}>{preview.pnl>=0?"+":""}{preview.pnl} ({preview.pips>=0?"+":""}{preview.pips} pips)</span>
              </div>
            )}

            <div style={{display:"flex",gap:8,marginTop:18}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,background:"none",border:`1px solid ${th.border2}`,color:th.muted,borderRadius:8,padding:10,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancel</button>
              <button onClick={save} style={{...s.btnPrimary,flex:2,borderRadius:8,padding:10}}>{editId?"Update":"Add Trade"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
