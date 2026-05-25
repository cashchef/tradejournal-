import { useState, useRef } from "react";

/* ═══════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════ */
const T = {
  bg:       "#080c14",
  surface:  "#0c1220",
  card:     "#0f1726",
  cardHov:  "#131e30",
  border:   "#1a2740",
  border2:  "#243450",
  text:     "#c8daf0",
  muted:    "#4a6280",
  gold:     "#d4a843",
  goldGlow: "#d4a84322",
  goldDim:  "#2a1f08",
  cyan:     "#3b9eff",
  green:    "#22d47a",
  greenDim: "#0a2416",
  red:      "#f04560",
  redDim:   "#2d0a14",
  white:    "#eef4ff",
};

const SIDEBAR_W   = 220;
const COLLAPSED_W = 60;

/* ═══════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════ */
const TRADES = [
  { id:1, pair:"EUR/USD", dir:"Long",  entry:1.0842, exit:1.0891, lots:0.5,  pnl:245,  pips:49,   session:"London",            strategy:"ICT/SMC" },
  { id:2, pair:"GBP/USD", dir:"Short", entry:1.2734, exit:1.2698, lots:0.3,  pnl:108,  pips:36,   session:"New York",          strategy:"Breakout" },
  { id:3, pair:"XAU/USD", dir:"Long",  entry:2312.4, exit:2298.1, lots:0.1,  pnl:-143, pips:-14,  session:"Asian",             strategy:"Trend Follow" },
  { id:4, pair:"BTC/USD", dir:"Long",  entry:62400,  exit:63850,  lots:0.02, pnl:290,  pips:1450, session:"New York",          strategy:"Breakout" },
  { id:5, pair:"USD/JPY", dir:"Short", entry:155.42, exit:154.88, lots:0.4,  pnl:192,  pips:54,   session:"Asian",             strategy:"ICT/SMC" },
  { id:6, pair:"EUR/USD", dir:"Short", entry:1.0915, exit:1.0937, lots:0.5,  pnl:-110, pips:-22,  session:"London",            strategy:"Scalp" },
  { id:7, pair:"GBP/JPY", dir:"Long",  entry:197.32, exit:198.15, lots:0.2,  pnl:166,  pips:83,   session:"London/NY Overlap", strategy:"Swing" },
];

const EQUITY = [
  {d:"Apr 28",v:10000},{d:"Apr 29",v:10180},{d:"Apr 30",v:10095},
  {d:"May 1", v:10310},{d:"May 2", v:10440},{d:"May 3", v:10390},
  {d:"May 4", v:10390},{d:"May 5", v:10556},{d:"May 6", v:10446},
  {d:"May 7", v:10736},{d:"May 8", v:10984},
];

const PAIR_PNL = [
  {pair:"EUR/USD",pnl:135},{pair:"GBP/USD",pnl:108},
  {pair:"XAU/USD",pnl:-143},{pair:"BTC/USD",pnl:290},
  {pair:"USD/JPY",pnl:192},{pair:"GBP/JPY",pnl:166},
];

const NAV = [
  { id:"dashboard",  label:"Dashboard",
    d:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { id:"journal",    label:"Journal",
    d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
  { id:"analytics",  label:"Analytics",
    d:"M18 20V10M12 20V4M6 20v-6" },
  { id:"calculator", label:"Risk Calc",
    d:"M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h2m4 0h2" },
  { id:"calendar",   label:"Calendar",
    d:"M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M2 10h20" },
];

/* ═══════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════ */
const Styles = ({ collapsed }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%}
    body{background:${T.bg};color:${T.text};font-family:'DM Sans',sans-serif;font-size:14px}

    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:4px}
    ::-webkit-scrollbar-thumb:hover{background:${T.gold}55}

    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes drawLine{from{stroke-dashoffset:1200}to{stroke-dashoffset:0}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

    .fu {animation:fadeUp .4s cubic-bezier(.22,1,.36,1) both}
    .fu1{animation:fadeUp .4s .06s cubic-bezier(.22,1,.36,1) both}
    .fu2{animation:fadeUp .4s .12s cubic-bezier(.22,1,.36,1) both}
    .fu3{animation:fadeUp .4s .18s cubic-bezier(.22,1,.36,1) both}
    .fu4{animation:fadeUp .4s .24s cubic-bezier(.22,1,.36,1) both}

    /* Sidebar */
    .sidebar{
      position:fixed;top:0;left:0;bottom:0;z-index:100;
      width:${collapsed ? COLLAPSED_W : SIDEBAR_W}px;
      background:${T.surface};
      border-right:1px solid ${T.border};
      display:flex;flex-direction:column;
      transition:width .28s cubic-bezier(.4,0,.2,1);
      overflow:hidden;
    }

    /* Fade-slide for sidebar text */
    .sb-text{
      overflow:hidden;white-space:nowrap;
      max-width:${collapsed ? 0 : 140}px;
      opacity:${collapsed ? 0 : 1};
      transition:max-width .28s cubic-bezier(.4,0,.2,1), opacity .18s;
    }

    /* Nav item */
    .nav-item{
      position:relative;
      display:flex;align-items:center;gap:11px;
      padding:${collapsed ? "10px 0" : "10px 16px"};
      margin:1px 7px;width:calc(100% - 14px);
      border-radius:10px;cursor:pointer;
      border:1px solid transparent;
      color:${T.muted};font-size:13px;font-weight:500;
      font-family:'DM Sans',sans-serif;background:none;text-align:left;
      transition:color .15s,background .15s,border-color .15s,padding .28s;
      justify-content:${collapsed ? "center" : "flex-start"};
    }
    .nav-item:hover{color:${T.text};background:rgba(255,255,255,0.05)}
    .nav-item.active{color:${T.gold};background:${T.goldGlow};border-color:${T.gold}33}

    /* Active dot */
    .nav-dot{
      position:absolute;right:11px;top:50%;transform:translateY(-50%);
      width:5px;height:5px;border-radius:50%;
      background:${T.gold};box-shadow:0 0 6px ${T.gold};
      opacity:${collapsed ? 0 : 1};transition:opacity .2s;
      pointer-events:none;
    }

    /* Tooltip (collapsed only) */
    .tip{
      display:none;
      position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%);
      background:${T.card};border:1px solid ${T.border2};
      border-radius:7px;padding:5px 11px;
      font-size:12px;font-weight:600;color:${T.white};
      white-space:nowrap;pointer-events:none;z-index:200;
      box-shadow:0 4px 16px rgba(0,0,0,.55);
    }
    .tip::before{
      content:'';position:absolute;right:100%;top:50%;transform:translateY(-50%);
      border:5px solid transparent;border-right-color:${T.border2};
    }
    ${collapsed ? ".nav-item:hover .tip{display:block}" : ""}

    /* Toggle button */
    .toggle-btn{
      position:absolute;top:50%;right:-13px;transform:translateY(-50%);
      width:26px;height:26px;border-radius:50%;
      background:${T.card};border:1px solid ${T.border2};
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      color:${T.muted};z-index:102;
      transition:background .15s,color .15s,box-shadow .15s;
      box-shadow:0 2px 10px rgba(0,0,0,.45);
    }
    .toggle-btn:hover{background:${T.gold};color:#080c14;border-color:${T.gold};box-shadow:0 0 12px ${T.gold}55}

    /* Cards */
    .card{
      background:${T.card};border:1px solid ${T.border};border-radius:14px;
      transition:border-color .2s;
    }
    .card:hover{border-color:${T.border2}}

    .gold-card{
      background:linear-gradient(140deg,#0f1726 0%,#130f05 100%);
      border:1px solid ${T.gold}44;border-radius:14px;
      position:relative;overflow:hidden;
    }
    .gold-card::after{
      content:'';position:absolute;top:0;left:0;right:0;height:1px;
      background:linear-gradient(90deg,transparent,${T.gold}88,transparent);
    }

    /* Utility */
    .mono{font-family:'IBM Plex Mono',monospace}
    .syne{font-family:'Syne',sans-serif}

    .pill{
      display:inline-flex;align-items:center;padding:3px 8px;
      border-radius:20px;font-size:10.5px;font-weight:700;
      font-family:'IBM Plex Mono',monospace;letter-spacing:.03em;
    }

    .trade-row{
      display:grid;
      grid-template-columns:90px 58px 78px 78px 60px 1fr 90px;
      align-items:center;padding:10px 20px;
      border-bottom:1px solid ${T.border};
      font-size:12.5px;transition:background .12s;
    }
    .trade-row:hover{background:${T.cardHov}}
    .trade-row:last-child{border-bottom:none}

    .btn{
      display:inline-flex;align-items:center;gap:6px;
      padding:8px 16px;border-radius:8px;
      font-size:12.5px;font-weight:600;cursor:pointer;
      font-family:'DM Sans',sans-serif;border:none;
      transition:all .18s;
    }
    .btn-gold{background:${T.gold};color:#080c14;box-shadow:0 2px 14px ${T.gold}44}
    .btn-gold:hover{filter:brightness(1.1);box-shadow:0 4px 22px ${T.gold}66;transform:translateY(-1px)}
    .btn-ghost{background:none;border:1px solid ${T.border2};color:${T.muted}}
    .btn-ghost:hover{border-color:${T.gold};color:${T.gold};background:${T.goldGlow}}

    .section-hd{
      display:flex;align-items:center;gap:8px;
      font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:${T.white};
    }
    .sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0}

    .filter-btn{
      padding:4px 11px;border-radius:6px;font-size:11px;
      font-weight:600;cursor:pointer;border:1px solid ${T.border};
      font-family:'DM Sans',sans-serif;transition:all .15s;
      background:none;color:${T.muted};
    }

    @media(max-width:900px){
      .main-grid{grid-template-columns:1fr !important}
      .stat-grid{grid-template-columns:1fr 1fr !important}
    }
    @media(max-width:480px){
      .stat-grid{grid-template-columns:1fr !important}
      .trade-row{grid-template-columns:80px 52px 68px 68px 1fr 80px !important}
      .trade-row>*:nth-child(5){display:none}
    }
  `}</style>
);

/* ═══════════════════════════════════════════════
   ICON
═══════════════════════════════════════════════ */
const Icon = ({d, size=16, color="currentColor", sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{flexShrink:0}}>
    <path d={d}/>
  </svg>
);

const Chevron = ({right, size=11}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    {right
      ? <polyline points="9 18 15 12 9 6"/>
      : <polyline points="15 18 9 12 15 6"/>}
  </svg>
);

/* ═══════════════════════════════════════════════
   EQUITY CHART
═══════════════════════════════════════════════ */
function EquityChart({data}) {
  const [tip, setTip] = useState(null);
  const ref = useRef();
  const W=540, H=148, P={t:14,r:12,b:26,l:46};
  const cW=W-P.l-P.r, cH=H-P.t-P.b;
  const vals=data.map(d=>d.v);
  const min=Math.min(...vals)-80, max=Math.max(...vals)+80;
  const xS=i=>P.l+(i/(data.length-1))*cW;
  const yS=v=>P.t+cH-((v-min)/(max-min))*cH;
  const line=data.map((d,i)=>`${i===0?"M":"L"}${xS(i).toFixed(1)},${yS(d.v).toFixed(1)}`).join(" ");
  const area=`${line} L${xS(data.length-1).toFixed(1)},${(P.t+cH).toFixed(1)} L${P.l},${(P.t+cH).toFixed(1)} Z`;
  const yTicks=[0,1,2,3,4].map(i=>min+((max-min)/4)*i);

  return (
    <div style={{position:"relative",width:"100%"}}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`}
        style={{width:"100%",height:"auto",display:"block",overflow:"visible"}}>
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.gold} stopOpacity=".3"/>
            <stop offset="100%" stopColor={T.gold} stopOpacity=".01"/>
          </linearGradient>
          <filter id="gf">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={P.l} y1={yS(v)} x2={W-P.r} y2={yS(v)}
              stroke={T.border} strokeWidth=".6" strokeDasharray="3,5"/>
            <text x={P.l-6} y={yS(v)+4} fontSize="8.5" fill={T.muted}
              textAnchor="end" fontFamily="IBM Plex Mono">
              {(v/1000).toFixed(1)}k
            </text>
          </g>
        ))}

        {data.filter((_,i)=>i%2===0).map((d,i)=>(
          <text key={i} x={xS(i*2)} y={H-3} fontSize="8" fill={T.muted}
            textAnchor="middle" fontFamily="IBM Plex Mono">{d.d}</text>
        ))}

        <path d={area} fill="url(#eg)"/>
        <path d={line} fill="none" stroke={T.gold} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#gf)"
          style={{strokeDasharray:1200,strokeDashoffset:1200,
            animation:"drawLine 1.5s ease forwards"}}/>

        {/* Invisible hover zones */}
        {data.map((d,i)=>(
          <rect key={i} x={xS(i)-16} y={0} width={32} height={H} fill="transparent"
            onMouseEnter={()=>setTip({i,d})} onMouseLeave={()=>setTip(null)}/>
        ))}

        {/* Dot shown on hover */}
        {tip && (
          <circle cx={xS(tip.i)} cy={yS(tip.d.v)} r={4.5}
            fill={T.bg} stroke={T.gold} strokeWidth="2.2"/>
        )}
      </svg>

      {tip && (
        <div style={{
          position:"absolute",
          left:`${(xS(tip.i)/540)*100}%`,
          top:0,
          transform:"translateX(-50%)",
          background:T.surface,border:`1px solid ${T.border2}`,
          borderRadius:8,padding:"6px 11px",
          fontSize:11,pointerEvents:"none",zIndex:10,
          boxShadow:"0 6px 20px rgba(0,0,0,.5)",
        }}>
          <div style={{color:T.muted,fontSize:9.5,marginBottom:2}}>{tip.d.d}</div>
          <div className="mono" style={{color:T.gold,fontWeight:600}}>
            ${tip.d.v.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAIR BARS
═══════════════════════════════════════════════ */
function PairBars({data}) {
  const maxAbs=Math.max(...data.map(d=>Math.abs(d.pnl)));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      {data.map((d,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:9}}>
          <div className="mono" style={{width:56,fontSize:10.5,color:T.text,flexShrink:0}}>{d.pair}</div>
          <div style={{flex:1,position:"relative",height:5,borderRadius:3,background:T.border}}>
            {/* centre tick */}
            <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:T.border2}}/>
            <div style={{
              position:"absolute",top:0,height:"100%",borderRadius:3,
              left:d.pnl>=0?"50%":`${50-(Math.abs(d.pnl)/maxAbs)*50}%`,
              width:`${(Math.abs(d.pnl)/maxAbs)*50}%`,
              background:d.pnl>=0?T.green:T.red,
              boxShadow:d.pnl>=0?`0 0 5px ${T.green}55`:`0 0 5px ${T.red}55`,
              transition:`width .9s ${i*.07}s cubic-bezier(.22,1,.36,1)`,
            }}/>
          </div>
          <div className="mono" style={{
            width:50,fontSize:10.5,textAlign:"right",flexShrink:0,
            color:d.pnl>=0?T.green:T.red,fontWeight:600,
          }}>
            {d.pnl>=0?"+":""}${d.pnl}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   RISK CALCULATOR
═══════════════════════════════════════════════ */
function RiskCalc() {
  const [balance,   setBalance]   = useState("10000");
  const [riskPct,   setRiskPct]   = useState("1");
  const [entry,     setEntry]     = useState("");
  const [sl,        setSl]        = useState("");
  const [tp,        setTp]        = useState("");
  const [pair,      setPair]      = useState("EUR/USD");

  const bal   = parseFloat(balance)  || 0;
  const rPct  = parseFloat(riskPct)  || 0;
  const ent   = parseFloat(entry)    || 0;
  const stop  = parseFloat(sl)       || 0;
  const take  = parseFloat(tp)       || 0;

  const riskAmt   = bal * (rPct / 100);
  const pipSl     = stop && ent ? Math.abs(ent - stop) : 0;
  const pipTp     = take && ent ? Math.abs(take - ent) : 0;
  const rrRatio   = pipSl > 0 && pipTp > 0 ? (pipTp / pipSl).toFixed(2) : "—";
  const lotSize   = pipSl > 0 ? (riskAmt / (pipSl * 10000)).toFixed(2) : "—";
  const potProfit = pipSl > 0 && pipTp > 0 ? (riskAmt * (pipTp / pipSl)).toFixed(2) : "—";

  const Field = ({label, value, onChange, placeholder}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",
        color:T.muted,marginBottom:6}}>{label}</div>
      <input value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:"100%",background:T.surface,border:`1px solid ${T.border2}`,
          borderRadius:9,padding:"10px 13px",fontSize:13,
          color:T.white,fontFamily:"'IBM Plex Mono',monospace",outline:"none",
          transition:"border-color .15s",
        }}
        onFocus={e=>e.target.style.borderColor=T.gold}
        onBlur={e=>e.target.style.borderColor=T.border2}
      />
    </div>
  );

  return (
    <div>
      <div className="fu" style={{marginBottom:20}}>
        <h1 className="syne" style={{fontSize:21,fontWeight:800,color:T.white}}>Risk Calculator</h1>
        <p style={{fontSize:12,color:T.muted,marginTop:3}}>Position sizing & risk management</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Inputs */}
        <div className="fu1 card" style={{padding:"22px 22px"}}>
          <div className="section-hd" style={{marginBottom:18}}>
            <span className="sdot" style={{background:T.cyan}}/>
            Trade Parameters
          </div>

          {/* Pair selector */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",
              color:T.muted,marginBottom:6}}>Instrument</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["EUR/USD","GBP/USD","XAU/USD","BTC/USD","USD/JPY"].map(p=>(
                <button key={p} onClick={()=>setPair(p)} style={{
                  padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace",border:`1px solid ${pair===p?T.gold:T.border}`,
                  background:pair===p?T.goldGlow:"none",color:pair===p?T.gold:T.muted,
                  transition:"all .15s",
                }}>{p}</button>
              ))}
            </div>
          </div>

          <Field label="Account Balance ($)" value={balance} onChange={setBalance} placeholder="10000"/>
          <Field label="Risk %" value={riskPct} onChange={setRiskPct} placeholder="1"/>
          <Field label="Entry Price" value={entry} onChange={setEntry} placeholder="1.0850"/>
          <Field label="Stop Loss" value={sl} onChange={setSl} placeholder="1.0800"/>
          <Field label="Take Profit" value={tp} onChange={setTp} placeholder="1.0950"/>
        </div>

        {/* Results */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="fu2 gold-card" style={{padding:"22px"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:8}}>Risk Amount</div>
            <div className="mono" style={{fontSize:32,fontWeight:700,color:T.red}}>
              ${riskAmt.toFixed(2)}
            </div>
            <div style={{fontSize:11,color:T.muted,marginTop:4}}>{riskPct}% of ${parseFloat(balance||0).toLocaleString()}</div>
          </div>

          <div className="fu2 card" style={{padding:"20px"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:8}}>Lot Size</div>
            <div className="mono" style={{fontSize:28,fontWeight:700,color:T.cyan}}>{lotSize}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:4}}>Standard lots ({pair})</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div className="fu3 card" style={{padding:"18px"}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:T.muted,marginBottom:6}}>R:R Ratio</div>
              <div className="mono" style={{fontSize:22,fontWeight:700,color:T.gold}}>{rrRatio}</div>
            </div>
            <div className="fu3 card" style={{padding:"18px"}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:T.muted,marginBottom:6}}>Pot. Profit</div>
              <div className="mono" style={{fontSize:22,fontWeight:700,color:T.green}}>
                {potProfit!=="—"?`+$${potProfit}`:"—"}
              </div>
            </div>
          </div>

          <div className="fu4 card" style={{padding:"18px 20px"}}>
            <div className="section-hd" style={{marginBottom:12,fontSize:12}}>
              <span className="sdot" style={{background:T.green}}/>
              Pip Summary
            </div>
            {[
              {label:"SL Distance",val:pipSl?(pipSl*10000).toFixed(1)+" pips":"—",color:T.red},
              {label:"TP Distance",val:pipTp?(pipTp*10000).toFixed(1)+" pips":"—",color:T.green},
            ].map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",
                padding:"6px 0",borderBottom:`1px solid ${i<1?T.border:"transparent"}`}}>
                <span style={{fontSize:12,color:T.muted}}>{r.label}</span>
                <span className="mono" style={{fontSize:12,fontWeight:600,color:r.color}}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TRADE CALENDAR
═══════════════════════════════════════════════ */
function TradeCalendar() {
  const [month] = useState(4); // May = index 4
  const year = 2025;
  const monthName = "May 2025";

  // Map trade data to days
  const tradesByDay = {
    1: [{pnl:310,count:1}],
    2: [{pnl:290,count:1}],
    6: [{pnl:-143,count:1}],
    7: [{pnl:192,count:1}],
    8: [{pnl:-110,count:1}],
    12: [{pnl:166,count:1}],
    14: [{pnl:245,count:1}],
    15: [{pnl:108,count:1}],
  };

  // May 2025 starts on Thursday (day 4, 0=Sun)
  const firstDay = 4;
  const daysInMonth = 31;
  const weeks = [];
  let day = 1 - firstDay;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(day > 0 && day <= daysInMonth ? day : null);
      day++;
    }
    weeks.push(week);
    if (day > daysInMonth) break;
  }

  const monthStats = Object.values(tradesByDay);
  const totalPnl = monthStats.reduce((s,d)=>s+d[0].pnl,0);
  const tradeDays = monthStats.length;
  const winDays = monthStats.filter(d=>d[0].pnl>0).length;

  return (
    <div>
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
        <div>
          <h1 className="syne" style={{fontSize:21,fontWeight:800,color:T.white}}>Trade Calendar</h1>
          <p style={{fontSize:12,color:T.muted,marginTop:3}}>Daily P&L overview · {monthName}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" style={{fontSize:11.5,padding:"6px 12px"}}>◀</button>
          <span className="mono" style={{fontSize:12,color:T.text,padding:"6px 12px",
            background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>{monthName}</span>
          <button className="btn btn-ghost" style={{fontSize:11.5,padding:"6px 12px"}}>▶</button>
        </div>
      </div>

      {/* Month summary */}
      <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
        {[
          {label:"Month P&L",value:`${totalPnl>=0?"+":""}$${totalPnl}`,color:totalPnl>=0?T.green:T.red},
          {label:"Trade Days",value:`${tradeDays}`,color:T.cyan,sub:"active days"},
          {label:"Win Days",value:`${winDays}/${tradeDays}`,color:T.gold,sub:`${Math.round((winDays/tradeDays)*100)}% win rate`},
        ].map((s,i)=>(
          <div key={i} className="card" style={{padding:"16px 20px"}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:7}}>{s.label}</div>
            <div className="mono" style={{fontSize:22,fontWeight:700,color:s.color}}>{s.value}</div>
            {s.sub&&<div style={{fontSize:11,color:T.muted,marginTop:4}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="fu2 card" style={{padding:"20px"}}>
        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,
              letterSpacing:".08em",textTransform:"uppercase",color:T.muted,padding:"4px 0"}}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week,wi)=>(
          <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
            {week.map((d,di)=>{
              const trades = d ? tradesByDay[d] : null;
              const pnl = trades ? trades[0].pnl : null;
              const isToday = d === 14; // highlight a day
              return (
                <div key={di} style={{
                  minHeight:58,borderRadius:10,padding:"7px 8px",
                  background: pnl!==null ? (pnl>=0?T.greenDim:T.redDim) : d?T.surface:"transparent",
                  border:`1px solid ${pnl!==null?(pnl>=0?T.green+"55":T.red+"55"):d?T.border:"transparent"}`,
                  cursor: d ? "pointer" : "default",
                  transition:"border-color .15s,background .15s",
                  outline: isToday ? `2px solid ${T.gold}` : "none",
                }}>
                  {d && (
                    <>
                      <div style={{fontSize:11,fontWeight:600,color:pnl!==null?T.white:T.muted}}>{d}</div>
                      {pnl !== null && (
                        <div className="mono" style={{
                          fontSize:11,fontWeight:700,marginTop:4,
                          color:pnl>=0?T.green:T.red,
                        }}>
                          {pnl>=0?"+":""}${pnl}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div style={{display:"flex",gap:16,marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
          {[
            {color:T.green,label:"Profit day"},
            {color:T.red,label:"Loss day"},
            {color:T.muted,label:"No trades"},
          ].map((l,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:10,height:10,borderRadius:3,background:l.color==="muted"?T.surface:l.color==="green"?T.greenDim:T.redDim,
                border:`1px solid ${l.color}`}}/>
              <span style={{fontSize:11,color:T.muted}}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   APP
═══════════════════════════════════════════════ */
export default function TradeEdgeDashboard() {
  const [tab,       setTab]       = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [filter,    setFilter]    = useState("all");

  const wins   = TRADES.filter(t=>t.pnl>0);
  const losses = TRADES.filter(t=>t.pnl<0);
  const totalPnl     = TRADES.reduce((s,t)=>s+t.pnl,0);
  const winRate      = Math.round((wins.length/TRADES.length)*100);
  const avgWin       = wins.length   ? Math.round(wins.reduce((s,t)=>s+t.pnl,0)/wins.length)   : 0;
  const avgLoss      = losses.length ? Math.round(losses.reduce((s,t)=>s+t.pnl,0)/losses.length): 0;
  const rrRatio      = avgLoss ? Math.abs(avgWin/avgLoss).toFixed(2) : "—";
  const profitFactor = losses.length
    ? Math.abs(wins.reduce((s,t)=>s+t.pnl,0)/losses.reduce((s,t)=>s+t.pnl,0)).toFixed(2)
    : "—";
  const filteredTrades = filter==="wins"?wins:filter==="losses"?losses:TRADES;
  const sideW = collapsed ? COLLAPSED_W : SIDEBAR_W;

  return (
    <>
      <Styles collapsed={collapsed}/>

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className="sidebar">

        {/* Collapse toggle — floats on the border edge */}
        <button className="toggle-btn" onClick={()=>setCollapsed(c=>!c)}
          title={collapsed?"Expand sidebar":"Collapse sidebar"}>
          <Chevron right={collapsed}/>
        </button>

        {/* ── Logo ── */}
        <div style={{
          padding: collapsed ? "17px 0" : "17px 16px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex",alignItems:"center",
          justifyContent:collapsed?"center":"flex-start",
          gap:10,flexShrink:0,
          transition:"padding .28s",
        }}>
          <div style={{
            width:32,height:32,borderRadius:9,flexShrink:0,
            background:`linear-gradient(135deg,${T.gold},#7a4f0e)`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:15,fontWeight:800,color:"#080c14",
            fontFamily:"'Syne',sans-serif",
            boxShadow:`0 0 14px ${T.gold}44`,
          }}>T</div>
          <div className="sb-text">
            <div className="syne" style={{fontSize:14,fontWeight:800,color:T.white,lineHeight:1.15}}>
              Trade<span style={{color:T.gold}}>Edge</span>
            </div>
            <div className="mono" style={{fontSize:8.5,color:T.muted,letterSpacing:".1em",textTransform:"uppercase"}}>
              Terminal
            </div>
          </div>
        </div>

        {/* ── Account ── */}
        <div style={{
          padding: collapsed ? "10px 7px" : "10px 11px",
          borderBottom:`1px solid ${T.border}`,
          flexShrink:0,transition:"padding .28s",
        }}>
          <div style={{
            display:"flex",alignItems:"center",
            justifyContent:collapsed?"center":"flex-start",
            gap: collapsed ? 0 : 9,
            background:T.goldGlow,border:`1px solid ${T.gold}33`,
            borderRadius:10,
            padding: collapsed ? "8px" : "8px 10px",
            transition:"padding .28s,gap .28s",
          }}>
            <div style={{
              width:27,height:27,borderRadius:"50%",flexShrink:0,
              background:`linear-gradient(135deg,${T.gold},#7a4f0e)`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,color:"#080c14",fontWeight:800,
            }}>E</div>
            <div className="sb-text">
              <div style={{fontSize:12,fontWeight:600,color:T.white}}>Erico</div>
              <div className="mono" style={{fontSize:9.5,color:T.gold,fontWeight:600}}>PRO Plan</div>
            </div>
          </div>
        </div>

        {/* ── Section label (hidden when collapsed) ── */}
        <div style={{
          overflow:"hidden",
          maxHeight: collapsed ? 0 : 36,
          opacity: collapsed ? 0 : 1,
          transition:"max-height .28s,opacity .2s",
          flexShrink:0,
        }}>
          <div className="mono" style={{
            fontSize:9,color:T.muted,fontWeight:700,letterSpacing:".1em",
            textTransform:"uppercase",padding:"13px 20px 5px",
          }}>Main Menu</div>
        </div>

        {/* ── Nav ── */}
        <nav style={{flex:1,padding:"5px 0",overflowY:"auto",overflowX:"hidden"}}>
          {NAV.map(item=>(
            <button key={item.id}
              className={`nav-item${tab===item.id?" active":""}`}
              onClick={()=>setTab(item.id)}>
              <Icon d={item.d} size={17} color={tab===item.id?T.gold:"currentColor"}/>
              <span className="sb-text" style={{maxWidth: collapsed ? 0 : 130, opacity: collapsed ? 0 : 1}}>
                {item.label}
              </span>
              {tab===item.id && <span className="nav-dot"/>}
              <span className="tip">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Bottom ── */}
        <div style={{borderTop:`1px solid ${T.border}`,padding:"7px 0",flexShrink:0}}>
          {[
            {d:"M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",label:"Settings"},
            {d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",label:"Log Out"},
          ].map((item,i)=>(
            <button key={i} className="nav-item">
              <Icon d={item.d} size={16}/>
              <span className="sb-text" style={{maxWidth: collapsed ? 0 : 130, opacity: collapsed ? 0 : 1}}>
                {item.label}
              </span>
              <span className="tip">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ══════════ CONTENT ══════════ */}
      <div style={{
        marginLeft:sideW,
        transition:"margin-left .28s cubic-bezier(.4,0,.2,1)",
        display:"flex",flexDirection:"column",minHeight:"100vh",
      }}>

        {/* Top bar */}
        <header style={{
          height:52,background:T.surface,
          borderBottom:`1px solid ${T.border}`,
          display:"flex",alignItems:"center",
          justifyContent:"space-between",
          padding:"0 24px",
          position:"sticky",top:0,zIndex:50,
          flexShrink:0,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span className="syne" style={{fontSize:15,fontWeight:700,color:T.white}}>
              {NAV.find(n=>n.id===tab)?.label}
            </span>
            <span style={{color:T.border2,fontSize:16}}>·</span>
            <span className="mono" style={{fontSize:10.5,color:T.muted}}>May 2025</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost" style={{fontSize:11.5,padding:"6px 13px"}}>
              ↓ Export CSV
            </button>
            <button className="btn btn-gold" style={{fontSize:12.5}}>
              + Log Trade
            </button>
          </div>
        </header>

        {/* Ticker */}
        <div style={{
          height:30,background:T.bg,
          borderBottom:`1px solid ${T.border}`,
          overflow:"hidden",display:"flex",alignItems:"center",
          flexShrink:0,
        }}>
          <div style={{display:"flex",animation:"marquee 48s linear infinite",whiteSpace:"nowrap"}}>
            {[...TRADES,...TRADES].map((t,i)=>(
              <span key={i} style={{
                padding:"0 16px",borderRight:`1px solid ${T.border}`,
                display:"flex",alignItems:"center",gap:7,
              }}>
                <span className="mono" style={{fontSize:9.5,color:T.muted}}>{t.pair}</span>
                <span className="mono" style={{fontSize:10.5,fontWeight:600,color:t.pnl>=0?T.green:T.red}}>
                  {t.pnl>=0?"▲":"▼"} {t.pnl>=0?"+":""}${t.pnl}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main style={{flex:1,padding:"22px 24px",overflowY:"auto"}}>

          {tab==="dashboard" && (
            <div>
              {/* Heading */}
              <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <h1 className="syne" style={{fontSize:21,fontWeight:800,color:T.white}}>Overview</h1>
                  <p style={{fontSize:12,color:T.muted,marginTop:3}}>7 trades · May 2025 · Nairobi</p>
                </div>
                <button className="btn btn-ghost" style={{fontSize:11.5,padding:"6px 12px"}}>📅 This Month</button>
              </div>

              {/* Stat cards */}
              <div className="stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                <div className="gold-card fu1" style={{padding:"18px 20px"}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:10}}>Net P&L</div>
                  <div className="mono" style={{fontSize:26,fontWeight:600,color:totalPnl>=0?T.green:T.red}}>
                    {totalPnl>=0?"+":""}${totalPnl.toLocaleString()}
                  </div>
                  <div style={{marginTop:10,display:"flex",alignItems:"center",gap:7}}>
                    <span className="mono" style={{fontSize:10,color:T.green,background:T.greenDim,padding:"2px 7px",borderRadius:10,fontWeight:600}}>+9.84%</span>
                    <span style={{fontSize:10,color:T.muted}}>this month</span>
                  </div>
                </div>

                <div className="card fu2" style={{padding:"18px 20px"}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:10}}>Win Rate</div>
                  <div className="mono" style={{fontSize:26,fontWeight:600,color:T.cyan}}>{winRate}%</div>
                  <div style={{marginTop:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:10,color:T.green,fontWeight:600}}>{wins.length}W</span>
                      <span style={{fontSize:10,color:T.red,fontWeight:600}}>{losses.length}L</span>
                    </div>
                    <div style={{height:4,borderRadius:2,background:T.border,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${winRate}%`,borderRadius:2,
                        background:`linear-gradient(90deg,${T.cyan},${T.green})`,
                        transition:"width 1.1s .3s ease"}}/>
                    </div>
                  </div>
                </div>

                <div className="card fu3" style={{padding:"18px 20px"}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:10}}>Avg R:R</div>
                  <div className="mono" style={{fontSize:26,fontWeight:600,color:T.gold}}>{rrRatio}</div>
                  <div style={{marginTop:10,display:"flex",gap:14}}>
                    <div>
                      <div style={{fontSize:9,color:T.muted,marginBottom:2}}>AVG WIN</div>
                      <div className="mono" style={{fontSize:12,color:T.green,fontWeight:600}}>+${avgWin}</div>
                    </div>
                    <div style={{width:1,background:T.border}}/>
                    <div>
                      <div style={{fontSize:9,color:T.muted,marginBottom:2}}>AVG LOSS</div>
                      <div className="mono" style={{fontSize:12,color:T.red,fontWeight:600}}>${avgLoss}</div>
                    </div>
                  </div>
                </div>

                <div className="card fu4" style={{padding:"18px 20px"}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:10}}>Profit Factor</div>
                  <div className="mono" style={{fontSize:26,fontWeight:600,color:T.white}}>{profitFactor}</div>
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:9,color:T.muted}}>Total Trades</div>
                    <div className="mono" style={{fontSize:20,color:T.text,fontWeight:600,marginTop:2}}>{TRADES.length}</div>
                  </div>
                </div>
              </div>

              {/* Charts row */}
              <div className="main-grid fu2" style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:12,marginBottom:14}}>
                <div className="card" style={{padding:"18px 18px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div className="section-hd">
                      <span className="sdot" style={{background:T.gold,boxShadow:`0 0 6px ${T.gold}`}}/>
                      Equity Curve
                    </div>
                    <div className="mono" style={{fontSize:10,color:T.muted}}>
                      $10,000 → <span style={{color:T.gold}}>${EQUITY[EQUITY.length-1].v.toLocaleString()}</span>
                    </div>
                  </div>
                  <EquityChart data={EQUITY}/>
                </div>

                <div className="card" style={{padding:"18px"}}>
                  <div className="section-hd" style={{marginBottom:16}}>
                    <span className="sdot" style={{background:T.cyan}}/>
                    Pair P&L
                  </div>
                  <PairBars data={PAIR_PNL}/>
                  <div style={{marginTop:18,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9.5,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:9}}>Sessions</div>
                    {["London","New York","Asian","London/NY Overlap"].map((s,i)=>{
                      const c=TRADES.filter(t=>t.session===s).length;
                      return c>0?(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:11.5}}>
                          <span style={{color:T.text}}>{s}</span>
                          <span className="mono" style={{color:T.muted,fontSize:11}}>{c} trade{c>1?"s":""}</span>
                        </div>
                      ):null;
                    })}
                  </div>
                </div>
              </div>

              {/* Trades table */}
              <div className="card fu3">
                <div style={{
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"14px 20px",borderBottom:`1px solid ${T.border}`,
                }}>
                  <div className="section-hd">
                    <span className="sdot" style={{background:T.green}}/>
                    Recent Trades
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    {["all","wins","losses"].map(f=>(
                      <button key={f} className="filter-btn" onClick={()=>setFilter(f)}
                        style={{
                          background:filter===f?(f==="wins"?T.greenDim:f==="losses"?T.redDim:T.goldGlow):"none",
                          borderColor:filter===f?(f==="wins"?T.green:f==="losses"?T.red:T.gold):T.border,
                          color:filter===f?(f==="wins"?T.green:f==="losses"?T.red:T.gold):T.muted,
                        }}>
                        {f.charAt(0).toUpperCase()+f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="trade-row" style={{
                  background:T.surface,fontSize:10,fontWeight:700,
                  letterSpacing:".08em",textTransform:"uppercase",
                  color:T.muted,animation:"none",
                  borderBottom:`1px solid ${T.border}`,
                }}>
                  <div>Pair</div><div>Dir</div><div>Entry</div>
                  <div>Exit</div><div>Lots</div><div>Session</div>
                  <div style={{textAlign:"right"}}>P&L / Pips</div>
                </div>

                {filteredTrades.map(t=>(
                  <div key={t.id} className="trade-row">
                    <div className="mono" style={{fontWeight:700,fontSize:12,color:T.white}}>{t.pair}</div>
                    <div>
                      <span className="pill" style={{
                        background:t.dir==="Long"?T.greenDim:T.redDim,
                        color:t.dir==="Long"?T.green:T.red,
                      }}>{t.dir}</span>
                    </div>
                    <div className="mono" style={{fontSize:12}}>{t.entry}</div>
                    <div className="mono" style={{fontSize:12}}>{t.exit}</div>
                    <div className="mono" style={{fontSize:12}}>{t.lots}</div>
                    <div style={{color:T.muted,fontSize:11}}>{t.session.replace("/NY Overlap","")}</div>
                    <div style={{textAlign:"right"}}>
                      <div className="mono" style={{fontWeight:700,fontSize:13,color:t.pnl>=0?T.green:T.red}}>
                        {t.pnl>=0?"+":""}${t.pnl}
                      </div>
                      <div className="mono" style={{fontSize:10,color:T.muted}}>
                        {t.pips>=0?"+":""}{t.pips} pips
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ JOURNAL TAB ══════════ */}
          {tab==="journal" && (
            <div>
              <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <h1 className="syne" style={{fontSize:21,fontWeight:800,color:T.white}}>Trade Journal</h1>
                  <p style={{fontSize:12,color:T.muted,marginTop:3}}>{TRADES.length} trades logged · May 2025</p>
                </div>
                <button className="btn btn-gold" style={{fontSize:12.5}}>+ Log Trade</button>
              </div>

              {/* Search / filter bar */}
              <div className="fu1 card" style={{padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span style={{fontSize:12,color:T.muted}}>Search trades, pairs, strategies…</span>
                <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                  {["All","Long","Short"].map(f=>(
                    <button key={f} className="filter-btn" style={{
                      background:f==="All"?T.goldGlow:"none",
                      borderColor:f==="All"?T.gold:T.border,
                      color:f==="All"?T.gold:T.muted,
                    }}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Journal entries */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {TRADES.map((t,i)=>(
                  <div key={t.id} className={`card fu${Math.min(i+1,4)}`} style={{
                    padding:"16px 20px",
                    borderLeft:`3px solid ${t.pnl>=0?T.green:T.red}`,
                    borderRadius:"0 14px 14px 0",
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                      {/* Left: pair + meta */}
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <span className="mono" style={{fontSize:15,fontWeight:700,color:T.white}}>{t.pair}</span>
                            <span className="pill" style={{
                              background:t.dir==="Long"?T.greenDim:T.redDim,
                              color:t.dir==="Long"?T.green:T.red,
                            }}>{t.dir}</span>
                            <span style={{fontSize:10.5,color:T.muted,background:T.surface,padding:"2px 8px",borderRadius:6,border:`1px solid ${T.border}`}}>
                              {t.strategy}
                            </span>
                          </div>
                          <div style={{display:"flex",gap:16,fontSize:11,color:T.muted}}>
                            <span>Entry <span className="mono" style={{color:T.text}}>{t.entry}</span></span>
                            <span>Exit <span className="mono" style={{color:T.text}}>{t.exit}</span></span>
                            <span>Lots <span className="mono" style={{color:T.text}}>{t.lots}</span></span>
                            <span>Session <span style={{color:T.text}}>{t.session}</span></span>
                          </div>
                        </div>
                      </div>
                      {/* Right: P&L */}
                      <div style={{textAlign:"right"}}>
                        <div className="mono" style={{fontSize:20,fontWeight:700,color:t.pnl>=0?T.green:T.red}}>
                          {t.pnl>=0?"+":""}${t.pnl}
                        </div>
                        <div className="mono" style={{fontSize:11,color:T.muted}}>{t.pips>=0?"+":""}{t.pips} pips</div>
                      </div>
                    </div>
                    {/* Notes placeholder */}
                    <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${T.border}`,
                      fontSize:11.5,color:T.muted,fontStyle:"italic"}}>
                      📝 No notes added yet — click to annotate this trade
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ ANALYTICS TAB ══════════ */}
          {tab==="analytics" && (
            <div>
              <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <h1 className="syne" style={{fontSize:21,fontWeight:800,color:T.white}}>Analytics</h1>
                  <p style={{fontSize:12,color:T.muted,marginTop:3}}>Performance breakdown · May 2025</p>
                </div>
                <button className="btn btn-ghost" style={{fontSize:11.5,padding:"6px 12px"}}>↓ Export Report</button>
              </div>

              {/* Top stats row */}
              <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
                {[
                  {label:"Best Trade",value:"+$290",sub:"BTC/USD · Breakout",color:T.green},
                  {label:"Worst Trade",value:"-$143",sub:"XAU/USD · Trend Follow",color:T.red},
                  {label:"Avg Hold",value:"4.2h",sub:"per trade avg",color:T.cyan},
                ].map((s,i)=>(
                  <div key={i} className="card" style={{padding:"18px 20px"}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:T.muted,marginBottom:8}}>{s.label}</div>
                    <div className="mono" style={{fontSize:22,fontWeight:700,color:s.color}}>{s.value}</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:6}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Strategy breakdown */}
              <div className="fu2 card" style={{padding:"18px 20px",marginBottom:14}}>
                <div className="section-hd" style={{marginBottom:16}}>
                  <span className="sdot" style={{background:T.gold,boxShadow:`0 0 6px ${T.gold}`}}/>
                  Strategy Performance
                </div>
                {[
                  {name:"ICT/SMC",trades:2,pnl:437,wins:2},
                  {name:"Breakout",trades:2,pnl:398,wins:2},
                  {name:"Trend Follow",trades:1,pnl:-143,wins:0},
                  {name:"Swing",trades:1,pnl:166,wins:1},
                  {name:"Scalp",trades:1,pnl:-110,wins:0},
                ].map((s,i)=>{
                  const wr=Math.round((s.wins/s.trades)*100);
                  return (
                    <div key={i} style={{
                      display:"flex",alignItems:"center",gap:12,
                      padding:"10px 0",borderBottom:`1px solid ${i<4?T.border:"transparent"}`,
                    }}>
                      <div style={{width:110,fontSize:12.5,fontWeight:600,color:T.text}}>{s.name}</div>
                      <div style={{flex:1}}>
                        <div style={{height:6,borderRadius:3,background:T.border,overflow:"hidden"}}>
                          <div style={{
                            height:"100%",borderRadius:3,
                            width:`${wr}%`,
                            background:s.pnl>=0?`linear-gradient(90deg,${T.cyan},${T.green})`:`linear-gradient(90deg,${T.red},#f0455055)`,
                            transition:`width 1s ${i*.1}s ease`,
                          }}/>
                        </div>
                      </div>
                      <div className="mono" style={{width:36,fontSize:11,color:T.muted,textAlign:"center"}}>{wr}%</div>
                      <div style={{width:30,fontSize:11,color:T.muted,textAlign:"center"}}>{s.trades}T</div>
                      <div className="mono" style={{width:60,fontSize:12,fontWeight:600,textAlign:"right",color:s.pnl>=0?T.green:T.red}}>
                        {s.pnl>=0?"+":""}${s.pnl}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Session + Direction breakdown */}
              <div className="fu3" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="card" style={{padding:"18px 20px"}}>
                  <div className="section-hd" style={{marginBottom:16}}>
                    <span className="sdot" style={{background:T.cyan}}/>
                    Session Breakdown
                  </div>
                  {[
                    {session:"London",trades:3,pnl:301},
                    {session:"New York",trades:2,pnl:398},
                    {session:"Asian",trades:2,pnl:49},
                  ].map((s,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"9px 0",borderBottom:`1px solid ${i<2?T.border:"transparent"}`}}>
                      <span style={{fontSize:12.5,color:T.text}}>{s.session}</span>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span className="mono" style={{fontSize:11,color:T.muted}}>{s.trades} trades</span>
                        <span className="mono" style={{fontSize:12,fontWeight:600,color:s.pnl>=0?T.green:T.red}}>
                          {s.pnl>=0?"+":""}${s.pnl}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{padding:"18px 20px"}}>
                  <div className="section-hd" style={{marginBottom:16}}>
                    <span className="sdot" style={{background:T.green}}/>
                    Long vs Short
                  </div>
                  {[
                    {dir:"Long",trades:TRADES.filter(t=>t.dir==="Long").length,pnl:TRADES.filter(t=>t.dir==="Long").reduce((s,t)=>s+t.pnl,0)},
                    {dir:"Short",trades:TRADES.filter(t=>t.dir==="Short").length,pnl:TRADES.filter(t=>t.dir==="Short").reduce((s,t)=>s+t.pnl,0)},
                  ].map((d,i)=>(
                    <div key={i} style={{padding:"12px 0",borderBottom:`1px solid ${i<1?T.border:"transparent"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{fontSize:12.5,fontWeight:600,color:d.dir==="Long"?T.green:T.red}}>{d.dir}</span>
                        <span className="mono" style={{fontSize:12,fontWeight:700,color:d.pnl>=0?T.green:T.red}}>
                          {d.pnl>=0?"+":""}${d.pnl}
                        </span>
                      </div>
                      <div style={{height:5,borderRadius:3,background:T.border,overflow:"hidden"}}>
                        <div style={{
                          height:"100%",borderRadius:3,
                          width:`${Math.round((d.trades/TRADES.length)*100)}%`,
                          background:d.dir==="Long"?T.green:T.red,
                          transition:"width 1s ease",
                        }}/>
                      </div>
                      <div style={{fontSize:10.5,color:T.muted,marginTop:5}}>{d.trades} trades · {Math.round((d.trades/TRADES.length)*100)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ RISK CALCULATOR TAB ══════════ */}
          {tab==="calculator" && <RiskCalc />}

          {/* ══════════ CALENDAR TAB ══════════ */}
          {tab==="calendar" && <TradeCalendar />}
        </main>

        {/* Footer */}
        <footer style={{
          height:38,borderTop:`1px solid ${T.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"0 24px",flexShrink:0,
        }}>
          <span className="mono" style={{fontSize:10.5,color:T.muted}}>TradeEdge Terminal v2.0</span>
          <span style={{fontSize:10.5,color:T.muted}}>May 2025 · Nairobi, KE</span>
        </footer>
      </div>
    </>
  );
}
