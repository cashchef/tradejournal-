// src/App.jsx
// Full app with Firebase Auth, Firestore trades, Paystack subscriptions
// and feature gating by tier.

import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useFeatureGate } from "./usePaystack";
import { fetchTrades, addTrade, updateTrade, deleteTrade } from "./tradesService";
import AuthScreen  from "./AuthScreen";
import PricingModal from "./PricingModal";
import UpgradePrompt from "./UpgradePrompt";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS  (same as before)
═══════════════════════════════════════════════════════════════ */
const PAIRS      = ["EUR/USD","GBP/USD","USD/JPY","AUD/USD","BTC/USD","ETH/USD","XAU/USD","GBP/JPY","USD/CAD","NZD/USD"];
const SESSIONS   = ["London","New York","Asian","London/NY Overlap"];
const STRATEGIES = ["Breakout","Trend Follow","Mean Reversion","Scalp","Swing","ICT/SMC","Other"];
const SETUPS     = ["FVG","Order Block","BOS/CHoCH","Liquidity Sweep","VWAP Reclaim","Supply/Demand","EMA Cross","None"];
const MOODS      = ["😤 Revenge","😟 Fearful","😐 Neutral","🙂 Focused","🔥 In the Zone"];
const TABS       = ["journal","analytics","calculator","calendar"];
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

/* ═══════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════ */
const T = {
  bg:"#04080f", surface:"#080e1a", card:"#0c1422",
  border:"#0e1f35", border2:"#1a3050",
  text:"#c8d8e8", muted:"#3a5570", dim:"#1e3248",
  cyan:"#00d4ff", cyanDim:"#003d4d",
  green:"#00ff88", greenDim:"#002d1a",
  red:"#ff3355", redDim:"#2d0010",
  amber:"#ffb800", amberDim:"#2a1e00",
  white:"#e8f4ff",
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════════ */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${T.bg};color:${T.text};font-family:'Rajdhani',sans-serif}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:${T.bg}}
    ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:2px}
    ::-webkit-scrollbar-thumb:hover{background:${T.cyan}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    .fade-in{animation:fadeIn 0.25s ease forwards}
    .tab-btn{background:none;border:none;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:10px 18px;color:${T.muted};border-bottom:2px solid transparent;transition:all 0.2s;position:relative}
    .tab-btn:hover{color:${T.cyan}}
    .tab-btn.active{color:${T.cyan};border-bottom-color:${T.cyan};text-shadow:0 0 12px ${T.cyan}88}
    .btn-primary{background:${T.cyan};color:${T.bg};border:none;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:10px 20px;border-radius:4px;cursor:pointer;transition:all 0.2s;box-shadow:0 0 16px ${T.cyan}44}
    .btn-primary:hover{box-shadow:0 0 24px ${T.cyan}88;transform:translateY(-1px)}
    .btn-ghost{background:none;border:1px solid ${T.border2};color:${T.muted};font-family:'Share Tech Mono',monospace;font-size:11px;padding:7px 14px;border-radius:4px;cursor:pointer;transition:all 0.2s;letter-spacing:0.06em}
    .btn-ghost:hover{border-color:${T.cyan};color:${T.cyan}}
    .btn-danger{background:none;border:1px solid ${T.redDim};color:${T.red}44;font-family:'Share Tech Mono',monospace;font-size:10px;padding:4px 10px;border-radius:3px;cursor:pointer;transition:all 0.2s}
    .btn-danger:hover{border-color:${T.red};color:${T.red};background:${T.redDim}}
    .stat-card{background:${T.card};border:1px solid ${T.border};border-radius:6px;padding:16px;transition:border-color 0.2s;position:relative;overflow:hidden}
    .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${T.cyan}44,transparent)}
    .form-input{background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};padding:9px 12px;font-size:13px;width:100%;outline:none;font-family:'Share Tech Mono',monospace;transition:border-color 0.2s,box-shadow 0.2s}
    .form-input:focus{border-color:${T.cyan};box-shadow:0 0 0 2px ${T.cyan}18}
    .form-input::placeholder{color:${T.muted}}
    .form-label{font-size:10px;color:${T.muted};text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:5px;margin-top:14px;font-family:'Share Tech Mono',monospace}
    .trade-row{border-bottom:1px solid ${T.border};transition:background 0.15s;animation:fadeIn 0.2s ease}
    .trade-row:hover{background:${T.dim}22}
    .ticker-wrap{display:flex;animation:marquee 55s linear infinite;white-space:nowrap}
    .ticker-wrap:hover{animation-play-state:paused}
    .dir-btn{flex:1;padding:9px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:700;letter-spacing:0.08em;border:1px solid;transition:all 0.15s}
    .overlay-bg{position:fixed;inset:0;background:rgba(4,8,15,0.94);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto}
    select option{background:#0c1422}
  `}</style>
);

/* ═══════════════════════════════════════════════════════════════
   TICKER
═══════════════════════════════════════════════════════════════ */
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
    <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,height:34,overflow:"hidden",display:"flex",alignItems:"center",position:"relative"}}>
      {err?<span style={{fontSize:11,color:T.amber,padding:"0 14px",fontFamily:"'Share Tech Mono',monospace"}}>⚠ FEED UNAVAILABLE</span>
        :<div className="ticker-wrap">{items.map((lbl,i)=>{
          const price=prices[lbl],p0=prev[lbl];
          const up=p0&&price>p0,dn=p0&&price<p0;
          const col=up?T.green:dn?T.red:T.muted;
          return<span key={i} style={{padding:"0 20px",fontSize:11,fontFamily:"'Share Tech Mono',monospace",color:col,borderRight:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:T.dim,fontSize:10}}>{lbl}</span>
            {price?<><span style={{fontSize:9}}>{up?"▲":dn?"▼":""}</span>{price.toLocaleString()}</>:<span style={{color:T.border2,animation:"pulse 1.5s infinite"}}>···</span>}
          </span>;
        })}</div>
      }
      <button onClick={load} style={{position:"absolute",right:8,background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:13,padding:4}} onMouseEnter={e=>e.target.style.color=T.cyan} onMouseLeave={e=>e.target.style.color=T.muted}>⟳</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHART MODAL
═══════════════════════════════════════════════════════════════ */
function ChartModal({pair,onClose}){
  const sym=TV_SYMBOLS[pair]||"FX:EURUSD";
  const src=`https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(sym)}&interval=H1&theme=dark&style=1&timezone=Etc%2FUTC&hideideas=1`;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(4,8,15,0.97)",zIndex:200,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px",borderBottom:`1px solid ${T.border}`,background:T.surface}}>
        <span style={{fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:T.cyan,fontSize:14,letterSpacing:"0.1em"}}><span style={{color:T.muted,marginRight:8}}>CHART //</span>{pair}</span>
        <div style={{display:"flex",gap:8}}>
          <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(TV_SYMBOLS[pair]||"FX:EURUSD")}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{textDecoration:"none",fontSize:11}}>↗ TRADINGVIEW</a>
          <button onClick={onClose} className="btn-ghost">✕ CLOSE</button>
        </div>
      </div>
      <iframe src={src} style={{flex:1,border:"none",width:"100%",height:"100%"}} allowFullScreen title="Chart"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EQUITY CURVE
═══════════════════════════════════════════════════════════════ */
function EquityCurve({trades}){
  const points=useMemo(()=>{
    const sorted=[...trades].filter(t=>t.status==="Closed"&&calcPnl(t)).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let cum=0;
    return sorted.map(t=>{cum+=calcPnl(t).pnl;return{date:t.date,val:+cum.toFixed(2)};});
  },[trades]);
  if(points.length<2) return<div style={{textAlign:"center",padding:"28px 0",color:T.muted,fontSize:12,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.08em"}}>— NEED 2+ CLOSED TRADES —</div>;
  const vals=points.map(p=>p.val);
  const min=Math.min(...vals,0),max=Math.max(...vals,0),range=max-min||1;
  const W=400,H=100,pad=12;
  const sx=i=>pad+(i/(points.length-1))*(W-2*pad);
  const sy=v=>H-pad-((v-min)/range)*(H-2*pad);
  const polyline=points.map((p,i)=>`${sx(i)},${sy(p.val)}`).join(" ");
  const last=points[points.length-1].val,col=last>=0?T.green:T.red;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:T.muted,letterSpacing:"0.1em"}}>EQUITY CURVE</span>
        <span style={{fontFamily:"'Share Tech Mono',monospace",fontWeight:700,color:col,fontSize:15}}>{last>=0?"+":""}{last}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H}}>
        <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity="0.25"/><stop offset="100%" stopColor={col} stopOpacity="0"/></linearGradient></defs>
        <line x1={pad} y1={sy(0)} x2={W-pad} y2={sy(0)} stroke={T.border2} strokeWidth="1" strokeDasharray="3,4"/>
        <polygon points={`${sx(0)},${sy(0)} ${polyline} ${sx(points.length-1)},${sy(0)}`} fill="url(#eqGrad)"/>
        <polyline points={polyline} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx={sx(points.length-1)} cy={sy(last)} r="3" fill={col} style={{filter:`drop-shadow(0 0 4px ${col})`}}/>
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.dim,marginTop:4,fontFamily:"'Share Tech Mono',monospace"}}>
        <span>{points[0].date}</span><span>{points[points.length-1].date}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MONTHLY HEATMAP
═══════════════════════════════════════════════════════════════ */
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
  const monthNames=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const maxAbs=Math.max(...Object.values(dailyPnl).map(Math.abs),1);
  const cellColor=pnl=>{if(!pnl)return T.card;const i=Math.min(Math.abs(pnl)/maxAbs,1);return pnl>0?`rgba(0,255,136,${0.1+i*0.5})`:`rgba(255,51,85,${0.1+i*0.5})`;};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:T.muted,letterSpacing:"0.1em"}}>MONTHLY P&L HEATMAP</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} className="btn-ghost" style={{padding:"3px 9px",fontSize:11}}>‹</button>
          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:T.cyan,minWidth:70,textAlign:"center"}}>{monthNames[month]} {year}</span>
          <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} className="btn-ghost" style={{padding:"3px 9px",fontSize:11}}>›</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
        {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:9,color:T.dim,fontFamily:"'Share Tech Mono',monospace",paddingBottom:2}}>{d}</div>)}
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:days}).map((_,i)=>{
          const day=i+1,pnl=dailyPnl[day];
          return<div key={day} title={pnl?`${day}: ${pnl>=0?"+":""}${pnl}`:day} style={{background:cellColor(pnl),border:`1px solid ${pnl?(pnl>0?T.green+"33":T.red+"33"):T.border}`,borderRadius:3,aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:9,color:pnl?T.text:T.muted,fontFamily:"'Share Tech Mono',monospace"}}>{day}</span>
            {pnl&&<span style={{fontSize:8,color:pnl>0?T.green:T.red,fontFamily:"'Share Tech Mono',monospace"}}>{pnl>0?"+":""}{pnl}</span>}
          </div>;
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS (Pro-gated)
═══════════════════════════════════════════════════════════════ */
function Analytics({trades,setChart,onUpgrade}){
  const can=useFeatureGate();
  if(!can("analytics")) return<UpgradePrompt feature="Analytics Dashboard" onUpgrade={onUpgrade}/>;

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

  if(!stats) return<div style={{textAlign:"center",padding:"60px 0",color:T.muted,fontFamily:"'Share Tech Mono',monospace",fontSize:12,letterSpacing:"0.1em"}}>— NO CLOSED TRADES YET —</div>;

  const SC=({label,value,sub,color})=>(
    <div className="stat-card">
      <div style={{fontSize:9,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.12em",marginBottom:8}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:color||T.cyan}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:T.dim,marginTop:3,fontFamily:"'Share Tech Mono',monospace"}}>{sub}</div>}
    </div>
  );

  const BarRow=({label,val,max,onChart})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
      <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,width:110,color:T.muted,flexShrink:0}}>{label}</span>
      <div style={{flex:1,height:5,background:T.bg,borderRadius:3}}>
        <div style={{height:"100%",width:`${(Math.abs(val)/Math.max(...[...byPair,...bySession,...byStrategy,...bySetup].map(([,v])=>Math.abs(v)),1))*100}%`,background:val>=0?T.green:T.red,borderRadius:3,boxShadow:val>=0?`0 0 6px ${T.green}66`:`0 0 6px ${T.red}66`}}/>
      </div>
      <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:val>=0?T.green:T.red,width:60,textAlign:"right",flexShrink:0}}>{val>=0?"+":""}{val}</span>
      {onChart&&<button onClick={onChart} className="btn-ghost" style={{padding:"2px 7px",fontSize:9}}>↗</button>}
    </div>
  );

  return(
    <div className="fade-in">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        <SC label="WIN RATE" value={`${stats.wr}%`} sub={`${stats.wins}W / ${stats.losses}L`} color={parseFloat(stats.wr)>=50?T.green:T.red}/>
        <SC label="NET P&L" value={`${stats.total>=0?"+":""}${stats.total}`} sub={`Avg: ${stats.avg}/trade`} color={stats.total>=0?T.green:T.red}/>
        <SC label="RISK:REWARD" value={stats.rr} sub="Avg R:R ratio" color={T.amber}/>
        <SC label="MAX DRAWDOWN" value={`-${stats.maxDD}`} color={T.red}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        <SC label="BEST TRADE" value={`+${stats.best}`} color={T.green}/>
        <SC label="WORST TRADE" value={stats.worst} color={T.red}/>
        <SC label="TOTAL TRADES" value={stats.count}/>
        <SC label="STREAK" value={`${stats.streak}${stats.streakType}`} color={stats.streakType==="W"?T.green:T.red}/>
      </div>
      <div className="stat-card" style={{marginBottom:16}}><EquityCurve trades={trades}/></div>
      <div className="stat-card" style={{marginBottom:16}}><MonthlyHeatmap trades={trades}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div className="stat-card"><div style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:14}}>P&L BY PAIR</div>{byPair.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val} max={1} onChart={()=>setChart(lbl)}/>)}</div>
        <div className="stat-card"><div style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:14}}>P&L BY SESSION</div>{bySession.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val} max={1}/>)}</div>
        <div className="stat-card"><div style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:14}}>P&L BY STRATEGY</div>{byStrategy.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val} max={1}/>)}</div>
        <div className="stat-card"><div style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:14}}>P&L BY SETUP</div>{bySetup.map(([lbl,val])=><BarRow key={lbl} label={lbl} val={val} max={1}/>)}</div>
      </div>
      {Object.keys(stats.byMood).length>0&&(
        <div className="stat-card">
          <div style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:14}}>🧠 P&L BY MENTAL STATE</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
            {Object.entries(stats.byMood).sort((a,b)=>b[1].pnl-a[1].pnl).map(([mood,d])=>(
              <div key={mood} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:5,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:13,marginBottom:4}}>{mood.split(" ")[0]}</div>
                <div style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace",marginBottom:6}}>{mood.split(" ").slice(1).join(" ")}</div>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontWeight:700,color:d.pnl>=0?T.green:T.red,fontSize:14}}>{d.pnl>=0?"+":""}{d.pnl.toFixed(2)}</div>
                <div style={{fontSize:10,color:T.dim,fontFamily:"'Share Tech Mono',monospace"}}>{d.count} trades</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR
═══════════════════════════════════════════════════════════════ */
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
      <span style={{fontSize:11,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.08em"}}>{label}</span>
      <span style={{fontSize:18,fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:color||T.cyan}}>{value}</span>
    </div>
  );
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div className="stat-card">
        <div style={{fontSize:11,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:16}}>⚖ POSITION SIZER</div>
        <label className="form-label">Account Balance ($)</label><input className="form-input" type="number" value={balance} onChange={e=>setBalance(e.target.value)}/>
        <label className="form-label">Risk per Trade (%)</label><input className="form-input" type="number" value={risk} onChange={e=>setRisk(e.target.value)}/>
        <label className="form-label">Pair</label>
        <select className="form-input" value={pair} onChange={e=>setPair(e.target.value)}>{PAIRS.map(p=><option key={p}>{p}</option>)}</select>
        <label className="form-label">Stop Loss (pips)</label><input className="form-input" type="number" value={sl} onChange={e=>setSl(e.target.value)}/>
        <div style={{marginTop:20,padding:16,background:T.bg,borderRadius:6,border:`1px solid ${T.green}33`}}>
          <Row label="MAX RISK $" value={`$${riskAmt.toFixed(2)}`} color={T.amber}/>
          <Row label="SUGGESTED LOTS" value={sugLots} color={T.cyan}/>
          <Row label="ACTUAL RISK $" value={`$${(pv*sugLots*slPips).toFixed(2)}`} color={T.green}/>
        </div>
      </div>
      <div className="stat-card">
        <div style={{fontSize:11,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:16}}>📐 PIP VALUE (0.01 lot)</div>
        {PAIRS.map(p=>(
          <div key={p} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}>
            <span style={{fontFamily:"'Share Tech Mono',monospace",color:T.muted}}>{p}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",color:T.cyan}}>${pipValue(p,0.01).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRADE FORM
═══════════════════════════════════════════════════════════════ */
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
      <div style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:8,width:"100%",maxWidth:640,animation:"fadeIn 0.2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
          <div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:T.cyan,letterSpacing:"0.1em"}}>{isEdit?"◈ EDIT TRADE":"◈ LOG NEW TRADE"}</div>
            {!isEdit&&limitReached&&<div style={{fontSize:10,color:T.amber,fontFamily:"'Share Tech Mono',monospace",marginTop:3}}>⚠ DAILY LIMIT ({dailyLimit}) REACHED</div>}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{padding:"5px 12px"}}>✕</button>
        </div>
        <div style={{padding:20}}>
          <label className="form-label">Direction</label>
          <div style={{display:"flex",gap:8,marginBottom:4}}>
            {["Long","Short"].map(d=>(
              <button key={d} className="dir-btn" onClick={()=>setF("direction",d)} style={{background:form.direction===d?(d==="Long"?T.greenDim:T.redDim):T.bg,color:form.direction===d?(d==="Long"?T.green:T.red):T.muted,borderColor:form.direction===d?(d==="Long"?T.green+"66":T.red+"66"):T.border,boxShadow:form.direction===d?`0 0 12px ${d==="Long"?T.green:T.red}22`:"none"}}>{d==="Long"?"▲ LONG":"▼ SHORT"}</button>
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
          <label className="form-label">What I'd Do Differently (Replay)</label>
          <textarea className="form-input" value={form.replay||""} onChange={e=>setF("replay",e.target.value)} placeholder="Hindsight analysis, lessons learned..." rows={2} style={{resize:"vertical"}}/>

          {/* Screenshot — Pro only */}
          <label className="form-label">Chart Screenshot {!isPro&&<span style={{color:T.amber,fontSize:9}}>(PRO)</span>}</label>
          {isPro?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button className="btn-ghost" onClick={()=>fileRef.current.click()} style={{fontSize:11}}>📎 Attach</button>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
              {form.screenshot&&<><span style={{fontSize:10,color:T.green,fontFamily:"'Share Tech Mono',monospace"}}>✓ Attached</span><button className="btn-ghost" onClick={()=>setF("screenshot",null)} style={{fontSize:10,padding:"3px 8px"}}>✕</button></>}
            </div>
          ):(
            <div style={{padding:"8px 12px",background:T.amberDim,border:`1px solid ${T.amber}33`,borderRadius:4,fontSize:11,fontFamily:"'Share Tech Mono',monospace",color:T.amber}}>
              Upgrade to Pro to attach chart screenshots
            </div>
          )}
          {form.screenshot&&isPro&&<img src={form.screenshot} alt="chart" style={{marginTop:8,width:"100%",maxHeight:160,objectFit:"cover",borderRadius:4,border:`1px solid ${T.border}`}}/>}

          {preview&&form.status==="Closed"&&(
            <div style={{marginTop:16,padding:"10px 14px",background:preview.pnl>=0?T.greenDim:T.redDim,border:`1px solid ${preview.pnl>=0?T.green+"44":T.red+"44"}`,borderRadius:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em"}}>P&L PREVIEW</span>
              <div style={{display:"flex",gap:20}}>
                <span style={{fontFamily:"'Share Tech Mono',monospace",fontWeight:700,color:preview.pnl>=0?T.green:T.red,fontSize:15}}>{preview.pnl>=0?"+":""}{preview.pnl}</span>
                <span style={{fontFamily:"'Share Tech Mono',monospace",color:T.muted,fontSize:13}}>{preview.pips>=0?"+":""}{preview.pips} pips</span>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,marginTop:18,justifyContent:"flex-end"}}>
            <button className="btn-ghost" onClick={onClose}>CANCEL</button>
            <button className="btn-primary" onClick={onSave}>{isEdit?"UPDATE TRADE":"LOG TRADE"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   JOURNAL TAB
═══════════════════════════════════════════════════════════════ */
function JournalTab({trades,onEdit,onDelete,onChart,filter,setFilter,dailyLimit,setDailyLimit,onUpgrade,isPro}){
  const [expandId,setExpandId]=useState(null);
  const visible=trades.filter(t=>filter==="All"||t.status===filter);
  const today=new Date().toISOString().slice(0,10);
  const todayTrades=trades.filter(t=>t.date===today);
  const todayPnl=todayTrades.filter(t=>t.status==="Closed"&&calcPnl(t)).reduce((a,t)=>a+calcPnl(t).pnl,0);
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:14}}>
        <div className="stat-card">
          <div style={{fontSize:9,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:6}}>TODAY TRADES</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:T.cyan}}>{todayTrades.length}</div>
          <div style={{fontSize:9,color:T.dim,marginTop:2,fontFamily:"'Share Tech Mono',monospace"}}>of {dailyLimit} limit</div>
          <div style={{marginTop:6,height:3,background:T.bg,borderRadius:2}}><div style={{height:"100%",width:`${Math.min((todayTrades.length/dailyLimit)*100,100)}%`,background:todayTrades.length>=dailyLimit?T.red:T.cyan,borderRadius:2,transition:"width 0.4s"}}/></div>
        </div>
        <div className="stat-card">
          <div style={{fontSize:9,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:6}}>TODAY P&L</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:todayPnl>=0?T.green:T.red}}>{todayPnl>=0?"+":""}{todayPnl.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div style={{fontSize:9,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:6}}>TOTAL TRADES</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:T.text}}>{trades.length}</div>
          {!isPro&&<div style={{fontSize:9,color:T.amber,fontFamily:"'Share Tech Mono',monospace",marginTop:3}}>{20-trades.length} free slots left</div>}
        </div>
        <div className="stat-card">
          <div style={{fontSize:9,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:4}}>DAILY LIMIT</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button className="btn-ghost" style={{padding:"3px 9px",fontSize:12}} onClick={()=>setDailyLimit(l=>Math.max(1,l-1))}>−</button>
            <span style={{fontSize:20,fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:T.amber}}>{dailyLimit}</span>
            <button className="btn-ghost" style={{padding:"3px 9px",fontSize:12}} onClick={()=>setDailyLimit(l=>l+1)}>+</button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {["All","Open","Closed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?T.cyan+"22":"none",border:`1px solid ${filter===f?T.cyan:T.border}`,color:filter===f?T.cyan:T.muted,padding:"5px 14px",borderRadius:4,cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:"0.1em",transition:"all 0.15s"}}>{f} {f!=="All"&&`(${trades.filter(t=>t.status===f).length})`}</button>
        ))}
      </div>

      {visible.length===0
        ?<div style={{textAlign:"center",padding:"50px 0",color:T.muted,fontFamily:"'Share Tech Mono',monospace",fontSize:12,letterSpacing:"0.1em"}}>— NO TRADES LOGGED —</div>
        :<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:6,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"90px 80px 60px 80px 80px 60px 90px 80px 80px 60px",padding:"8px 14px",borderBottom:`1px solid ${T.border}`,background:T.surface}}>
            {["DATE","PAIR","DIR","ENTRY","EXIT","LOTS","SESSION","SETUP","P&L",""].map((h,i)=>(
              <span key={i} style={{fontSize:9,color:T.muted,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em"}}>{h}</span>
            ))}
          </div>
          {[...visible].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>{
            const r=calcPnl(t),isExp=expandId===t.id;
            return(
              <div key={t.id} className="trade-row">
                <div style={{display:"grid",gridTemplateColumns:"90px 80px 60px 80px 80px 60px 90px 80px 80px 60px",padding:"9px 14px",alignItems:"center",cursor:"pointer"}} onClick={()=>setExpandId(isExp?null:t.id)}>
                  <span style={{fontSize:11,fontFamily:"'Share Tech Mono',monospace",color:T.muted}}>{t.date}</span>
                  <span style={{fontSize:12,fontFamily:"'Share Tech Mono',monospace",color:T.text,fontWeight:600}}>{t.pair}</span>
                  <span style={{fontSize:11,fontFamily:"'Share Tech Mono',monospace",color:t.direction==="Long"?T.green:T.red,fontWeight:700}}>{t.direction==="Long"?"▲":"▼"} {t.direction}</span>
                  <span style={{fontSize:11,fontFamily:"'Share Tech Mono',monospace",color:T.text}}>{t.entry}</span>
                  <span style={{fontSize:11,fontFamily:"'Share Tech Mono',monospace",color:T.text}}>{t.exit||"—"}</span>
                  <span style={{fontSize:11,fontFamily:"'Share Tech Mono',monospace",color:T.muted}}>{t.lots}</span>
                  <span style={{fontSize:10,fontFamily:"'Share Tech Mono',monospace",color:T.dim}}>{t.session}</span>
                  <span style={{fontSize:10,fontFamily:"'Share Tech Mono',monospace",color:T.muted}}>{t.setup||"—"}</span>
                  <span style={{fontSize:12,fontFamily:"'Share Tech Mono',monospace",fontWeight:700,color:!r?"#666":r.pnl>=0?T.green:T.red}}>{!r?<span style={{color:T.border2,fontSize:10}}>OPEN</span>:`${r.pnl>=0?"+":""}${r.pnl}`}</span>
                  <span style={{fontSize:10,color:T.dim}}>{isExp?"▲":"▼"}</span>
                </div>
                {isExp&&(
                  <div style={{padding:"12px 14px 14px",borderTop:`1px solid ${T.border}`,background:T.bg,animation:"fadeIn 0.15s ease"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div><div style={{fontSize:9,color:T.dim,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:3}}>NOTES</div><div style={{fontSize:12,color:T.text,lineHeight:1.5}}>{t.notes||<span style={{color:T.dim}}>—</span>}</div></div>
                      <div><div style={{fontSize:9,color:T.dim,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.1em",marginBottom:3}}>REPLAY / LESSONS</div><div style={{fontSize:12,color:T.text,lineHeight:1.5}}>{t.replay||<span style={{color:T.dim}}>—</span>}</div></div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontSize:10,background:T.surface,border:`1px solid ${T.border}`,borderRadius:3,padding:"2px 8px",fontFamily:"'Share Tech Mono',monospace",color:T.muted}}>{t.strategy}</span>
                      {t.mood&&<span style={{fontSize:11}}>{t.mood}</span>}
                      {r&&<span style={{fontSize:10,color:T.muted,fontFamily:"'Share Tech Mono',monospace"}}>{r.pips>=0?"+":""}{r.pips} pips</span>}
                      <div style={{flex:1}}/>
                      {t.screenshot&&isPro&&<button className="btn-ghost" onClick={()=>window.open(t.screenshot)} style={{fontSize:10,padding:"3px 10px"}}>📷 Chart</button>}
                      <button className="btn-ghost" onClick={()=>onChart(t.pair)} style={{fontSize:10,padding:"3px 10px"}}>📊 TV</button>
                      <button className="btn-ghost" onClick={()=>onEdit(t)} style={{fontSize:10,padding:"3px 10px"}}>✏ Edit</button>
                      <button className="btn-danger" onClick={()=>onDelete(t.id)}>✕ Del</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const { user, profile, loading, logout, isPro, isFree } = useAuth();
  const can = useFeatureGate();

  const [trades,      setTrades]      = useState([]);
  const [tradesLoading, setTLoding]   = useState(false);
  const [form,        setForm]        = useState({...emptyForm});
  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [tab,         setTab]         = useState("journal");
  const [filter,      setFilter]      = useState("All");
  const [chart,       setChart]       = useState(null);
  const [dailyLimit,  setDailyLimit]  = useState(3);
  const [showPricing, setShowPricing] = useState(false);

  // Load trades from Firestore when user logs in
  useEffect(() => {
    if (!user) { setTrades([]); return; }
    setTLoding(true);
    fetchTrades(user.uid)
      .then(setTrades)
      .catch(console.error)
      .finally(() => setTLoding(false));
  }, [user]);

  if (loading) return (
    <div style={{ minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace",color:T.muted,fontSize:12,letterSpacing:"0.2em",animation:"pulse 1.5s infinite" }}>LOADING...</div>
    </div>
  );

  if (!user) return <AuthScreen/>;

  const setF      = (k,v) => setForm(p=>({...p,[k]:v}));
  const openNew   = () => { setForm({...emptyForm,date:new Date().toISOString().slice(0,10)}); setEditId(null); setShowForm(true); };
  const openEdit  = (t) => { setForm({...t}); setEditId(t.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const today        = new Date().toISOString().slice(0,10);
  const todayTrades  = trades.filter(t=>t.date===today);
  const limitReached = todayTrades.length >= dailyLimit;
  const preview      = calcPnl(form);

  // Free tier: 20 total trade cap
  const freeLimitHit = isFree && trades.length >= 20;

  const save = async () => {
    if (!form.pair||!form.entry) { alert("Pair and Entry Price required."); return; }
    if (!editId && limitReached) { alert(`Daily limit of ${dailyLimit} reached. Stay disciplined. 🛑`); return; }
    if (!editId && freeLimitHit) { setShowPricing(true); return; }
    if (!isPro) { delete form.screenshot; } // strip screenshots on free
    const newTrade = { ...form };
    if (editId) {
      await updateTrade(user.uid, editId, newTrade);
      setTrades(prev=>prev.map(t=>t.id===editId?{...newTrade,id:editId}:t));
    } else {
      const id = await addTrade(user.uid, newTrade);
      setTrades(prev=>[{...newTrade,id},...prev]);
    }
    closeForm();
  };

  const del = async (id) => {
    if (!confirm("Delete this trade?")) return;
    await deleteTrade(user.uid, id);
    setTrades(p=>p.filter(t=>t.id!==id));
  };

  const csvExport = () => {
    if (!can("csv_export")) { setShowPricing(true); return; }
    exportCSV(trades);
  };

  const tierBadge = { free:"FREE", pro:"PRO", elite:"ELITE" }[profile?.tier||"free"];
  const tierColor = { free:T.muted, pro:T.cyan, elite:T.amber }[profile?.tier||"free"];

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text}}>
      <GlobalStyle/>
      {chart&&<ChartModal pair={chart} onClose={()=>setChart(null)}/>}
      {showForm&&<TradeForm form={form} setF={setF} onSave={save} onClose={closeForm} isEdit={!!editId} preview={preview} limitReached={limitReached} dailyLimit={dailyLimit} isPro={isPro}/>}
      {showPricing&&<PricingModal onClose={()=>setShowPricing(false)}/>}

      {/* Header */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 24px",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:28,height:28,background:T.cyan,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:`0 0 14px ${T.cyan}66`}}>◈</div>
            <div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,color:T.white,letterSpacing:"0.08em"}}>TRADELOG</div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:T.muted,letterSpacing:"0.15em",marginTop:-2}}>TERMINAL v2</div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",height:"100%"}}>
            {TABS.map(t=>(
              <button key={t} className={`tab-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
                {t.toUpperCase()}
                {t==="analytics"&&!isPro&&<span style={{marginLeft:4,fontSize:8,color:T.amber}}>PRO</span>}
              </button>
            ))}
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* Tier badge */}
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:tierColor,border:`1px solid ${tierColor}44`,padding:"2px 8px",borderRadius:3,letterSpacing:"0.1em"}}>{tierBadge}</span>
            {/* User */}
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:T.muted}}>{profile?.displayName||user.email?.split("@")[0]}</span>
            {isFree&&<button className="btn-primary" onClick={()=>setShowPricing(true)} style={{padding:"5px 12px",fontSize:10,background:T.amber,color:T.bg,boxShadow:`0 0 12px ${T.amber}44`}}>↑ UPGRADE</button>}
            <button className="btn-ghost" onClick={csvExport} style={{fontSize:10,padding:"6px 12px"}}>↓ CSV</button>
            <button className="btn-primary" onClick={openNew} style={{padding:"7px 16px",fontSize:11}}>+ LOG TRADE</button>
            <button className="btn-ghost" onClick={logout} style={{fontSize:10,padding:"6px 10px"}}>⏏</button>
          </div>
        </div>
      </div>

      <Ticker/>

      {/* Free tier warning bar */}
      {isFree&&trades.length>=15&&(
        <div style={{background:T.amberDim,borderBottom:`1px solid ${T.amber}33`,padding:"7px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:T.amber,letterSpacing:"0.06em"}}>⚠ {20-trades.length} free trade slots remaining</span>
          <button onClick={()=>setShowPricing(true)} style={{background:"none",border:`1px solid ${T.amber}`,color:T.amber,fontFamily:"'Share Tech Mono',monospace",fontSize:10,padding:"4px 12px",borderRadius:3,cursor:"pointer",letterSpacing:"0.08em"}}>UPGRADE →</button>
        </div>
      )}

      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px"}}>
        {tab==="journal"&&(
          <div className="fade-in">
            <JournalTab trades={trades} onEdit={openEdit} onDelete={del} onChart={setChart} filter={filter} setFilter={setFilter} dailyLimit={dailyLimit} setDailyLimit={setDailyLimit} onUpgrade={()=>setShowPricing(true)} isPro={isPro}/>
          </div>
        )}
        {tab==="analytics"&&(
          <div className="fade-in">
            <Analytics trades={trades} setChart={setChart} onUpgrade={()=>setShowPricing(true)}/>
          </div>
        )}
        {tab==="calculator"&&(
          <div className="fade-in"><Calculator/></div>
        )}
        {tab==="calendar"&&(
          <div className="fade-in">
            <div style={{fontSize:11,color:T.muted,marginBottom:12,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.06em"}}>◈ LIVE ECONOMIC CALENDAR</div>
            <div style={{borderRadius:6,overflow:"hidden",border:`1px solid ${T.border}`}}>
              <iframe src={`https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=25,32,6,37,72,22,17,39,14,10,35&calType=week&timeZone=Africa/Nairobi&lang=1&theme=dark&fontSize=13`} style={{width:"100%",height:580,border:"none"}} title="Economic Calendar"/>
            </div>
          </div>
        )}
      </div>

      <div style={{textAlign:"center",padding:"20px 0 32px",borderTop:`1px solid ${T.border}`,marginTop:20}}>
        <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:T.dim,letterSpacing:"0.12em"}}>TRADELOG TERMINAL — NAIROBI, EAT — {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
