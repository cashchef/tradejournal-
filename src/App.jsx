import { useState, useMemo, useEffect, useRef } from "react";

const PAIRS      = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","BTC/USD","ETH/USD","XAU/USD","GBP/JPY","USD/CAD","NZD/USD"];
const SESSIONS   = ["London","New York","Asian","London/NY Overlap"];
const STRATEGIES = ["Breakout","Trend Follow","Mean Reversion","Scalp","Swing","ICT/SMC","Other"];

// TradingView symbol mapping
const TV_SYMBOLS = {
  "EUR/USD":"FX:EURUSD","GBP/USD":"FX:GBPUSD","USD/JPY":"FX:USDJPY",
  "AUD/USD":"FX:AUDUSD","GBP/JPY":"FX:GBPJPY","USD/CAD":"FX:USDCAD",
  "NZD/USD":"FX:NZDUSD","XAU/USD":"TVC:GOLD",
  "BTC/USD":"BINANCE:BTCUSDT","ETH/USD":"BINANCE:ETHUSDT",
};

const TICKER_PAIRS = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","GBP/JPY","XAU/USD","BTC/USD","ETH/USD"];

const tvURL = (pair) => {
  const sym = TV_SYMBOLS[pair] || "FX:EURUSD";
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
};

const empty = {
  pair:"EUR/USD", direction:"Long", entry:"", exit:"",
  lots:"0.01", session:"London", strategy:"Trend Follow",
  notes:"", date: new Date().toISOString().slice(0,10), status:"Closed"
};

function calcPnl(t) {
  const e = parseFloat(t.entry), x = parseFloat(t.exit), l = parseFloat(t.lots);
  if (!e || !x || !l) return null;
  const crypto = t.pair.includes("BTC") || t.pair.includes("ETH");
  const jpy    = t.pair.includes("JPY");
  const pip    = jpy ? 0.01 : crypto ? 1 : 0.0001;
  const pips   = ((x - e) / pip) * (t.direction === "Long" ? 1 : -1);
  const val    = crypto ? l : l * 100000 * pip;
  return { pnl: +(pips * val).toFixed(2), pips: +pips.toFixed(1) };
}

// ── TradingView Chart Modal ───────────────────────────────────
function ChartModal({ pair, onClose, dark }) {
  const symbol = TV_SYMBOLS[pair] || "FX:EURUSD";
  const theme  = dark ? "dark" : "light";
  const src    = `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(symbol)}&interval=H1&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=${dark?"1a1a1a":"f1f5f9"}&theme=${theme}&style=1&timezone=Etc%2FUTC&studies=[]&hideideas=1&isdialog=1`;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:200, display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid #2a2a2a", background: dark?"#0f0f0f":"#fff" }}>
        <span style={{ fontWeight:700, fontFamily:"monospace", color: dark?"#f59e0b":"#f59e0b", fontSize:15 }}>📊 {pair} — TradingView</span>
        <button onClick={onClose} style={{ background:"none", border:"1px solid #444", color:"#aaa", borderRadius:6, padding:"4px 12px", cursor:"pointer", fontSize:13 }}>✕ Close</button>
      </div>
      <iframe
        src={src}
        style={{ flex:1, border:"none", width:"100%", height:"100%" }}
        allowFullScreen
        title="TradingView Chart"
      />
    </div>
  );
}

// ── Price Ticker ──────────────────────────────────────────────
function Ticker({ dark }) {
  const [prices, setPrices] = useState({});
  const [prev,   setPrev]   = useState({});
  const [err,    setErr]    = useState(false);

  const fetch_ = async () => {
    setErr(false);
    const next = {};
    try {
      // Try multiple free CORS-friendly sources
      // 1. ExchangeRate-API (free tier, no key needed for basic)
      const r1 = await fetch("https://open.er-api.com/v6/latest/USD");
      if (r1.ok) {
        const d = await r1.json();
        const r = d.rates || {};
        if (r.EUR) next["EUR/USD"] = +(1/r.EUR).toFixed(5);
        if (r.GBP) next["GBP/USD"] = +(1/r.GBP).toFixed(5);
        if (r.JPY) next["USD/JPY"] = +r.JPY.toFixed(3);
        if (r.AUD) next["AUD/USD"] = +(1/r.AUD).toFixed(5);
        if (r.CAD) next["USD/CAD"] = +r.CAD.toFixed(5);
        if (r.NZD) next["NZD/USD"] = +(1/r.NZD).toFixed(5);
        if (r.GBP && r.JPY) next["GBP/JPY"] = +((1/r.GBP)*r.JPY).toFixed(3);
      }
    } catch(e) {}

    try {
      // 2. CoinGecko for crypto + gold
      const r2 = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,gold&vs_currencies=usd");
      if (r2.ok) {
        const d = await r2.json();
        if (d.bitcoin)  next["BTC/USD"] = d.bitcoin.usd;
        if (d.ethereum) next["ETH/USD"] = d.ethereum.usd;
        if (d.gold)     next["XAU/USD"] = d.gold.usd;
      }
    } catch(e) {}

    if (Object.keys(next).length === 0) { setErr(true); return; }
    setPrev(prices);
    setPrices(next);
  };

  useEffect(() => { fetch_(); const iv = setInterval(fetch_, 60000); return ()=>clearInterval(iv); }, []);

  const bg     = dark ? "#060606" : "#f0f4f8";
  const border = dark ? "#1a1a1a" : "#e2e8f0";
  const items  = [...TICKER_PAIRS, ...TICKER_PAIRS];

  return (
    <div style={{ background:bg, borderBottom:`1px solid ${border}`, height:36, overflow:"hidden", display:"flex", alignItems:"center", position:"relative" }}>
      <style>{`
        @keyframes mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .tkr { display:flex; animation:mq 50s linear infinite; white-space:nowrap; }
        .tkr:hover { animation-play-state:paused; }
      `}</style>

      {err ? (
        <span style={{ fontSize:11, color:"#f59e0b", padding:"0 14px" }}>⚠ Prices loading… tap ⟳ to retry</span>
      ) : (
        <div className="tkr">
          {items.map((label, i) => {
            const price = prices[label];
            const p0    = prev[label];
            const up    = p0 && price > p0;
            const dn    = p0 && price < p0;
            const col   = up ? "#22c55e" : dn ? "#ef4444" : dark?"#999":"#555";
            return (
              <span key={i} style={{ padding:"0 16px", fontSize:12, fontFamily:"monospace", color:col, borderRight:`1px solid ${border}` }}>
                <span style={{ color:dark?"#444":"#94a3b8", marginRight:5 }}>{label}</span>
                {price ? <>{up?"▲":dn?"▼":""} {price.toLocaleString()}</> : <span style={{color:dark?"#2a2a2a":"#ccc"}}>···</span>}
              </span>
            );
          })}
        </div>
      )}
      <button onClick={fetch_} title="Refresh" style={{ position:"absolute", right:6, background:"none", border:"none", cursor:"pointer", fontSize:15, color:dark?"#444":"#aaa", padding:4 }}>⟳</button>
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
  const [chart,    setChart]    = useState(null); // pair string or null

  const th = {
    bg:      dark ? "#090909" : "#f8fafc",
    surface: dark ? "#111111" : "#ffffff",
    border:  dark ? "#1f1f1f" : "#e2e8f0",
    border2: dark ? "#2a2a2a" : "#cbd5e1",
    text:    dark ? "#e5e5e5" : "#0f172a",
    muted:   dark ? "#666"    : "#94a3b8",
    inputBg: dark ? "#0a0a0a" : "#f1f5f9",
    overlay: dark ? "rgba(0,0,0,0.9)" : "rgba(15,23,42,0.55)",
  };

  const inp = { background:th.inputBg, border:`1px solid ${th.border2}`, borderRadius:7, color:th.text, padding:"9px 11px", fontSize:13, width:"100%", outline:"none", fontFamily:"monospace", boxSizing:"border-box" };
  const lbl = { fontSize:11, color:th.muted, letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:4, marginTop:12 };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setForm({...empty, date: new Date().toISOString().slice(0,10)}); setEditId(null); setShowForm(true); };
  const openEdit = (t) => { setForm({...t}); setEditId(t.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const save = () => {
    const f = { ...form };
    if (!f.pair || !f.entry) { alert("Pair and Entry Price are required."); return; }
    const newTrade = { ...f, id: editId ?? Date.now() };
    setTrades(prev =>
      editId
        ? prev.map(t => t.id === editId ? newTrade : t)
        : [...prev, newTrade]
    );
    closeForm();
  };

  const del = (id) => { if (confirm("Delete this trade?")) setTrades(p => p.filter(t => t.id !== id)); };

  const visible = trades.filter(t => filter === "All" || t.status === filter);
  const closed  = useMemo(() => trades.filter(t => t.status === "Closed" && calcPnl(t)), [trades]);

  const stats = useMemo(() => {
    if (!closed.length) return null;
    const vals  = closed.map(t => calcPnl(t).pnl);
    const wins  = vals.filter(v => v > 0).length;
    const total = vals.reduce((a, b) => a + b, 0);
    return {
      count: closed.length, wins, losses: closed.length - wins,
      wr:    ((wins / closed.length) * 100).toFixed(1),
      total: total.toFixed(2),
      avg:   (total / closed.length).toFixed(2),
      best:  Math.max(...vals).toFixed(2),
      worst: Math.min(...vals).toFixed(2),
    };
  }, [closed]);

  const byPair = useMemo(() => {
    const m = {};
    closed.forEach(t => { const r = calcPnl(t); m[t.pair] = +((m[t.pair] || 0) + r.pnl).toFixed(2); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [closed]);

  const preview = calcPnl(form);

  const badge = (c) => ({
    background: c==="Long"?"#0d2b1a":c==="Short"?"#2b0d0d":"#1c1c1c",
    color:      c==="Long"?"#22c55e":c==="Short"?"#ef4444":"#9ca3af",
    border:     `1px solid ${c==="Long"?"#166534":c==="Short"?"#991b1b":"#374151"}`,
    borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600, display:"inline-block"
  });

  const Field = ({ label, name, type="text", options, placeholder }) => (
    <div>
      <label style={lbl}>{label}</label>
      {options
        ? <select style={inp} value={form[name]} onChange={e => setF(name, e.target.value)}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input style={inp} type={type} step="any" placeholder={placeholder} value={form[name]} onChange={e => setF(name, e.target.value)} />
      }
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:th.bg, color:th.text, fontFamily:"system-ui,sans-serif", transition:"background 0.2s,color 0.2s" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid ${th.border}`, gap:8 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:"#f59e0b", margin:0 }}>📈 TradeLog</h1>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setDark(d => !d)} style={{ background:"none", border:`1px solid ${th.border2}`, color:th.muted, borderRadius:8, padding:"7px 11px", cursor:"pointer", fontSize:15 }}>
            {dark ? "☀️" : "🌙"}
          </button>
          <a href="https://www.tradingview.com/chart/" target="_blank" rel="noopener noreferrer" style={{ background:"none", border:"1px solid #166534", color:"#22c55e", borderRadius:8, padding:"9px 12px", fontWeight:700, fontSize:13, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:5 }}>
            📊 TradingView
          </a>
          <button onClick={openNew} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:8, padding:"9px 14px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
            + New Trade
          </button>
        </div>
      </div>

      {/* Ticker */}
      <Ticker dark={dark} />

      <div style={{ padding:16 }}>
        {/* Tabs */}
        <div style={{ display:"flex", gap:4, borderBottom:`1px solid ${th.border}`, marginBottom:20, marginTop:8 }}>
          {["journal","analytics"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background:"none", border:"none", borderBottom: tab===t?"2px solid #f59e0b":"2px solid transparent", color: tab===t?th.text:th.muted, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:"inherit" }}>
              {t === "journal" ? "📋 Journal" : "📊 Analytics"}
            </button>
          ))}
        </div>

        {/* ── Journal ── */}
        {tab === "journal" && (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              {["All","Open","Closed"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ background:"none", border:`1px solid ${filter===f?th.border2:th.border}`, color:filter===f?th.text:th.muted, borderRadius:6, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{f}</button>
              ))}
              <span style={{ marginLeft:"auto", fontSize:12, color:th.muted, alignSelf:"center" }}>{visible.length} trade{visible.length!==1?"s":""}</span>
            </div>

            {visible.length === 0 && (
              <div style={{ textAlign:"center", padding:"70px 0", color:th.muted }}>
                <div style={{ fontSize:40 }}>📭</div>
                <div style={{ marginTop:10, fontSize:13 }}>No trades yet — tap + New Trade to start</div>
              </div>
            )}

            {[...visible].reverse().map(t => {
              const r   = calcPnl(t);
              const win = r && r.pnl > 0;
              return (
                <div key={t.id} style={{ background:th.surface, border:`1px solid ${th.border}`, borderRadius:12, padding:16, marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{t.pair}</span>
                        <span style={badge(t.direction)}>{t.direction}</span>
                        {t.status === "Open" && <span style={badge("open")}>Open</span>}
                        {/* Chart button */}
                        <button onClick={() => setChart(t.pair)} style={{ background:"none", border:`1px solid ${th.border2}`, color:"#f59e0b", borderRadius:5, padding:"2px 8px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                          📊 Chart
                        </button>
                        <a href={tvURL(t.pair)} target="_blank" rel="noopener noreferrer" style={{ background:"#1a2a1a", border:"1px solid #166534", color:"#22c55e", borderRadius:5, padding:"2px 8px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600, textDecoration:"none" }}>
                          🌐 TradingView
                        </a>
                      </div>
                      <div style={{ fontSize:12, color:th.muted, marginTop:4 }}>{t.date} · {t.session} · {t.strategy}</div>
                      <div style={{ fontSize:12, color:th.muted, fontFamily:"monospace", marginTop:5 }}>
                        Entry {t.entry}{t.exit ? ` → Exit ${t.exit}` : ""} · {t.lots} lot
                      </div>
                      {t.notes && <div style={{ fontSize:12, color:th.muted, marginTop:4, fontStyle:"italic" }}>{t.notes}</div>}
                    </div>
                    <div style={{ textAlign:"right", minWidth:72, flexShrink:0 }}>
                      {r
                        ? <>
                            <div style={{ color:win?"#22c55e":"#ef4444", fontWeight:700, fontFamily:"monospace" }}>{win?"+":""}{r.pnl}</div>
                            <div style={{ fontSize:11, color:win?"#166534":"#991b1b" }}>{win?"+":""}{r.pips}p</div>
                          </>
                        : <span style={{ fontSize:11, color:"#f59e0b" }}>● Live</span>
                      }
                      <div style={{ display:"flex", gap:4, marginTop:8, justifyContent:"flex-end" }}>
                        <button onClick={() => openEdit(t)} style={{ background:"none", border:`1px solid ${th.border}`, color:th.muted, borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>Edit</button>
                        <button onClick={() => del(t.id)}  style={{ background:"none", border:`1px solid ${th.border}`, color:"#ef4444", borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Analytics ── */}
        {tab === "analytics" && (
          <>
            {!stats
              ? <div style={{ textAlign:"center", padding:"70px 0", color:th.muted, fontSize:13 }}>Add closed trades to see analytics</div>
              : <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                    {[
                      { label:"Trades",    val:stats.count,  col:th.text },
                      { label:"Win Rate",  val:`${stats.wr}%`, col:parseFloat(stats.wr)>=50?"#22c55e":"#ef4444", sub:`${stats.wins}W · ${stats.losses}L` },
                      { label:"Total P&L", val:`$${stats.total}`, col:parseFloat(stats.total)>=0?"#22c55e":"#ef4444" },
                      { label:"Avg P&L",   val:`$${stats.avg}`,   col:parseFloat(stats.avg)>=0?"#22c55e":"#ef4444" },
                      { label:"Best",      val:`$${stats.best}`,  col:"#22c55e" },
                      { label:"Worst",     val:`$${stats.worst}`, col:"#ef4444" },
                    ].map(({ label, val, col, sub }) => (
                      <div key={label} style={{ background:th.surface, border:`1px solid ${th.border}`, borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
                        <div style={{ fontSize:22, fontWeight:700, fontFamily:"monospace", color:col }}>{val}</div>
                        {sub && <div style={{ fontSize:11, color:th.muted }}>{sub}</div>}
                        <div style={{ fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:"0.06em", marginTop:2 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background:th.surface, border:`1px solid ${th.border}`, borderRadius:12, padding:16 }}>
                    <div style={{ fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>P&L by Pair</div>
                    {byPair.map(([pair, val]) => {
                      const max = Math.max(...byPair.map(e => Math.abs(e[1])));
                      return (
                        <div key={pair} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, width:80, color:th.muted, flexShrink:0 }}>{pair}</span>
                          <div style={{ flex:1, height:7, background:dark?"#1a1a1a":"#e2e8f0", borderRadius:4 }}>
                            <div style={{ height:"100%", width:`${(Math.abs(val)/max)*100}%`, background:val>=0?"#22c55e":"#ef4444", borderRadius:4 }} />
                          </div>
                          <span style={{ fontFamily:"monospace", fontSize:12, color:val>=0?"#22c55e":"#ef4444", width:70, textAlign:"right", flexShrink:0 }}>{val>=0?"+":""}{val}</span>
                          <button onClick={() => setChart(pair)} style={{ background:"none", border:`1px solid ${th.border2}`, color:"#f59e0b", borderRadius:5, padding:"2px 7px", fontSize:10, cursor:"pointer" }}>📊</button>
                        </div>
                      );
                    })}
                  </div>
                </>
            }
          </>
        )}
      </div>

      {/* ── New/Edit Trade Modal ── */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:th.overlay, display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}
          onClick={e => e.target === e.currentTarget && closeForm()}>
          <div style={{ background:th.surface, border:`1px solid ${th.border2}`, borderRadius:14, padding:22, width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <strong style={{ color:th.text, fontSize:15 }}>{editId ? "Edit Trade" : "New Trade"}</strong>
              <button onClick={closeForm} style={{ background:"none", border:"none", color:th.muted, cursor:"pointer", fontSize:20 }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Date"        name="date"      type="date" />
              <Field label="Status"      name="status"    options={["Open","Closed"]} />
              <Field label="Pair"        name="pair"      options={PAIRS} />
              <Field label="Direction"   name="direction" options={["Long","Short"]} />
              <Field label="Entry Price" name="entry"     type="number" placeholder="e.g. 1.0820" />
              <Field label="Exit Price"  name="exit"      type="number" placeholder="e.g. 1.0890" />
              <Field label="Lot Size"    name="lots"      type="number" placeholder="e.g. 0.01" />
              <Field label="Session"     name="session"   options={SESSIONS} />
            </div>
            <Field label="Strategy" name="strategy" options={STRATEGIES} />
            <div>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, height:60, resize:"vertical" }} placeholder="Trade rationale, observations..." value={form.notes} onChange={e => setF("notes", e.target.value)} />
            </div>

            {/* P&L Preview */}
            {preview && (
              <div style={{ background:preview.pnl>=0?"#0d2b1a":"#2b0d0d", border:`1px solid ${preview.pnl>=0?"#166534":"#991b1b"}`, borderRadius:8, padding:"10px 14px", marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#888" }}>Estimated P&L</span>
                <span style={{ fontFamily:"monospace", fontWeight:700, color:preview.pnl>=0?"#22c55e":"#ef4444" }}>
                  {preview.pnl>=0?"+":""}{preview.pnl} ({preview.pips>=0?"+":""}{preview.pips} pips)
                </span>
              </div>
            )}

            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button onClick={closeForm} style={{ flex:1, background:"none", border:`1px solid ${th.border2}`, color:th.muted, borderRadius:8, padding:11, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Cancel</button>
              <button onClick={save}     style={{ flex:2, background:"#f59e0b", color:"#000", border:"none", borderRadius:8, padding:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
                {editId ? "Update Trade" : "Add Trade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TradingView Chart Modal ── */}
      {chart && <ChartModal pair={chart} dark={dark} onClose={() => setChart(null)} />}
    </div>
  );
}
