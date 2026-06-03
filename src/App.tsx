import { useState } from "react";

const G = {
  bg:          "#E8F5EE",
  bgMid:       "#D4EDE0",
  card:        "#FFFFFF",
  cardBorder:  "#C8E6D4",
  accent:      "#2E7D52",
  accentMid:   "#3DAA6E",
  accentLight: "#E8F5EE",
  accentSoft:  "#C8E6D4",
  teal:        "#4ABFA3",
  tealSoft:    "#E0F5F1",
  sage:        "#6BAF8A",
  yellow:      "#F0C050",
  yellowSoft:  "#FEF8E1",
  red:         "#D95F5F",
  redSoft:     "#FDEAEA",
  textPrimary: "#1A3D2B",
  textSecondary:"#4A7A5E",
  textTertiary:"#90B8A0",
  divider:     "#D4EDE0",
  navBg:       "#FAFFFE",
  inputBg:     "#F2FAF5",
  white:       "#FFFFFF",
};

const PAID_BY = ["Tara", "Tara & Ramdhan", "Ramdhan"];

const DEFAULT_CATEGORIES = [
  { name:"Food",          icon:"🍽️", color:"#2E7D52" },
  { name:"Transport",     icon:"🚗", color:"#4ABFA3" },
  { name:"Shopping",      icon:"🛍️", color:"#7B5EA7" },
  { name:"Health",        icon:"💊", color:"#3DAA6E" },
  { name:"Entertainment", icon:"🎬", color:"#5B9BD5" },
  { name:"Bills",         icon:"💡", color:"#E0964A" },
  { name:"Other",         icon:"📦", color:"#6BAF8A" },
];

const PALETTE = ["#2E7D52","#4ABFA3","#3DAA6E","#6BAF8A","#5B9BD5","#7B5EA7","#E0964A","#D95F5F","#E0C050","#2E6B8A","#4A8C6F","#8E6B3E"];
const ICON_OPTIONS = ["🍽️","🚗","🛍️","💊","🎬","💡","📦","✈️","🏠","📚","🐾","🎮","👗","🏋️","☕","🎁","💼","🏦","🎵","🌿"];

const fmt = n => "Rp " + Math.round(n).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0,10);
const monthKey = d => d.slice(0,7);
const curMonth = () => today().slice(0,7);
const monthLabel = m => new Date(m+"-01").toLocaleString("id-ID",{month:"long",year:"numeric"});

const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzYOKOqYzQJwaNLrmO7sAfDxWEK5hmem-ME9jAykTYVBA7tgpT0EnNYVRXRO0TpWYrE/exec";

function useStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = v => { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
  return [val, set];
}

export default function App() {
  const [expenses,   setExpenses]   = useStorage("exp_v4", []);
  const [budgets,    setBudgets]    = useStorage("bud_v4", {total:5000000,Food:1500000,Transport:500000,Shopping:800000,Health:400000,Entertainment:500000,Bills:800000,Other:500000});
  const [categories, setCategories] = useStorage("cats_v4", DEFAULT_CATEGORIES);
  const [view,       setView]       = useState("home");
  const [editId,     setEditId]     = useState(null);
  const [filterMonth,setFilterMonth]= useState(curMonth());
  const [alerts,     setAlerts]     = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [form,       setForm]       = useState({amount:"",category:"Food",date:today(),note:"",paidBy:"Ramdhan"});
  const [budgetEdit, setBudgetEdit] = useState(null);
  const [catModal,   setCatModal]   = useState(null);
  const [catForm,    setCatForm]    = useState({name:"",icon:"📦",color:PALETTE[0]});
  const [tableSort,  setTableSort]  = useState({col:"date",dir:"desc"});
  const [tableFilt,  setTableFilt]  = useState({month:"All",cat:"All",paidBy:"All"});

  const getCat = name => categories.find(c=>c.name===name)||{name,icon:"📦",color:G.sage};

  const monthExp = expenses.filter(e=>monthKey(e.date)===filterMonth);
  const totalSpent = monthExp.reduce((s,e)=>s+e.amount,0);
  const pct = Math.min(100,Math.round((totalSpent/budgets.total)*100));
  const catSpent = categories.reduce((acc,c)=>{
    acc[c.name]=monthExp.filter(e=>e.category===c.name).reduce((s,e)=>s+e.amount,0); return acc;
  },{});

  const months = [...new Set(expenses.map(e=>monthKey(e.date)))].sort().reverse();
  if(!months.includes(curMonth())) months.unshift(curMonth());

  const syncToSheet = async (expense) => {
    const cat = categories.find(c=>c.name===expense.category)||{icon:"📦"};
    setSyncStatus("syncing");
    try {
      await fetch(SHEETS_URL, {
        method:"POST", mode:"no-cors",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({date:expense.date,category:expense.category,icon:cat.icon,amount:expense.amount,note:expense.note||"",paidBy:expense.paidBy||""})
      });
      setSyncStatus("ok"); setTimeout(()=>setSyncStatus(null),3000);
    } catch { setSyncStatus("error"); setTimeout(()=>setSyncStatus(null),4000); }
  };

  const checkAlerts = (newE, all) => {
    const month=monthKey(newE.date);
    const mExp=all.filter(e=>monthKey(e.date)===month);
    const total=mExp.reduce((s,e)=>s+e.amount,0);
    const msgs=[];
    if(total>budgets.total) msgs.push(`Total budget exceeded! Spent ${fmt(total)} of ${fmt(budgets.total)}`);
    const ct=mExp.filter(e=>e.category===newE.category).reduce((s,e)=>s+e.amount,0);
    if(budgets[newE.category]&&ct>budgets[newE.category]) msgs.push(`${newE.category} budget exceeded!`);
    if(msgs.length) setAlerts(msgs);
  };

  const saveExpense = () => {
    const amt=parseFloat(String(form.amount).replace(/[^0-9]/g,""));
    if(!amt||amt<=0) return;
    let updated;
    if(editId!==null) {
      updated=expenses.map(e=>e.id===editId?{...e,...form,amount:amt}:e);
    } else {
      const newE={id:Date.now(),...form,amount:amt};
      updated=[newE,...expenses];
      checkAlerts(newE,updated);
      syncToSheet(newE);
    }
    setExpenses(updated);
    setForm({amount:"",category:categories[0]?.name||"Other",date:today(),note:"",paidBy:"Ramdhan"});
    setEditId(null); setView("home");
  };

  const deleteExpense = id => setExpenses(expenses.filter(e=>e.id!==id));
  const startEdit = e => { setForm({amount:String(e.amount),category:e.category,date:e.date,note:e.note,paidBy:e.paidBy||"Ramdhan"}); setEditId(e.id); setView("add"); };

  const saveBudget = (key,val) => {
    const n=parseFloat(String(val).replace(/[^0-9]/g,""));
    if(!n) return;
    setBudgets({...budgets,[key]:n}); setBudgetEdit(null);
  };

  const openAddCat = () => { setCatForm({name:"",icon:"📦",color:PALETTE[categories.length%PALETTE.length]}); setCatModal("add"); };
  const openEditCat = idx => { setCatForm({...categories[idx]}); setCatModal(idx); };
  const saveCat = () => {
    if(!catForm.name.trim()) return;
    if(catModal==="add") {
      setCategories([...categories,{name:catForm.name.trim(),icon:catForm.icon,color:catForm.color}]);
      setBudgets({...budgets,[catForm.name.trim()]:500000});
    } else {
      const old=categories[catModal].name;
      setCategories(categories.map((c,i)=>i===catModal?{name:catForm.name.trim(),icon:catForm.icon,color:catForm.color}:c));
      const nb={...budgets};
      if(old!==catForm.name.trim()){nb[catForm.name.trim()]=nb[old];delete nb[old];}
      setBudgets(nb);
      setExpenses(expenses.map(e=>e.category===old?{...e,category:catForm.name.trim()}:e));
    }
    setCatModal(null);
  };
  const deleteCat = idx => {
    const name=categories[idx].name;
    setCategories(categories.filter((_,i)=>i!==idx));
    const b={...budgets};delete b[name];setBudgets(b);setCatModal(null);
  };

  const allMonths=[...new Set(expenses.map(e=>monthKey(e.date)))].sort().reverse();
  const tableData=expenses.filter(e=>{
    if(tableFilt.month!=="All"&&monthKey(e.date)!==tableFilt.month) return false;
    if(tableFilt.cat!=="All"&&e.category!==tableFilt.cat) return false;
    if(tableFilt.paidBy!=="All"&&e.paidBy!==tableFilt.paidBy) return false;
    return true;
  }).sort((a,b)=>{
    const d=tableSort.dir==="asc"?1:-1;
    if(tableSort.col==="date") return a.date.localeCompare(b.date)*d;
    if(tableSort.col==="amount") return (a.amount-b.amount)*d;
    if(tableSort.col==="category") return a.category.localeCompare(b.category)*d;
    if(tableSort.col==="paidBy") return (a.paidBy||"").localeCompare(b.paidBy||"")*d;
    return 0;
  });
  const tableTotal=tableData.reduce((s,e)=>s+e.amount,0);
  const toggleSort=col=>setTableSort(s=>({col,dir:s.col===col&&s.dir==="desc"?"asc":"desc"}));
  const si=col=>tableSort.col===col?(tableSort.dir==="asc"?"↑":"↓"):"↕";

  const paidByColor = p => p==="Tara"?G.teal:p==="Ramdhan"?G.accent:"#7B5EA7";
  const paidBySoft  = p => p==="Tara"?G.tealSoft:p==="Ramdhan"?G.accentSoft:"#EDE8F8";

  const s = {
    wrap:    {background:G.bg, minHeight:"100vh", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", paddingBottom:72, width:"100%", maxWidth:430, margin:"0 auto", boxSizing:"border-box"},
    statusBar:{height:44,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px 0 24px",background:"transparent"},
    card:    {background:G.card,borderRadius:16,border:`1px solid ${G.cardBorder}`,padding:"14px 16px",marginBottom:10},
    label:   {fontSize:11,color:G.textSecondary,marginBottom:5,display:"block",letterSpacing:"0.06em",fontWeight:600,textTransform:"uppercase"},
    input:   {width:"100%",boxSizing:"border-box",background:G.inputBg,border:`1.5px solid ${G.cardBorder}`,borderRadius:10,padding:"10px 13px",fontSize:15,color:G.textPrimary,outline:"none",fontFamily:"inherit"},
    accentBtn:{background:`linear-gradient(135deg, ${G.accentMid}, ${G.accent})`,color:"#fff",border:"none",borderRadius:12,padding:"13px 20px",fontWeight:600,fontSize:15,cursor:"pointer",width:"100%",letterSpacing:"0.01em"},
    outlineBtn:{background:"transparent",color:G.accent,border:`1.5px solid ${G.accent}`,borderRadius:12,padding:"10px 20px",fontWeight:500,fontSize:14,cursor:"pointer"},
    navBar:  {display:"flex",background:G.navBg,borderTop:`1px solid ${G.divider}`,position:"fixed",bottom:0,left:0,right:0,paddingBottom:12,paddingTop:6,maxWidth:430,margin:"0 auto",zIndex:50},
    navBtn:  active=>({flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,border:"none",background:"none",cursor:"pointer",padding:"4px 0",color:active?G.accent:G.textTertiary}),
  };

  return (
    <div style={s.wrap}>
      {/* Status bar */}
      <div style={s.statusBar}>
        <span style={{fontSize:13,fontWeight:700,color:G.textPrimary}}>{new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span>
        <div style={{display:"flex",gap:5,alignItems:"center",fontSize:13,color:G.textPrimary}}>
          <span>●●●●</span><span>WiFi</span><span>🔋</span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length>0&&(
        <div style={{margin:"0 14px 10px",background:G.yellowSoft,border:`1px solid ${G.yellow}`,borderRadius:12,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
          <div>{alerts.map((a,i)=><div key={i} style={{fontSize:13,color:"#8A6800",fontWeight:500}}>⚠️ {a}</div>)}</div>
          <button onClick={()=>setAlerts([])} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#8A6800"}}>×</button>
        </div>
      )}

      {/* HOME */}
      {view==="home"&&(
        <div style={{padding:"0 14px"}}>
          {/* Header */}
          <div style={{padding:"4px 0 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:22,fontWeight:800,color:G.textPrimary,letterSpacing:"-0.5px"}}>My Expenses</div>
              <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{border:"none",background:"none",fontSize:13,color:G.textSecondary,padding:0,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>
                {months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {syncStatus==="syncing"&&<span style={{fontSize:11,color:G.accent,background:G.accentSoft,padding:"3px 8px",borderRadius:20}}>⏳ Syncing</span>}
              {syncStatus==="ok"&&<span style={{fontSize:11,color:G.accent,background:G.accentSoft,padding:"3px 8px",borderRadius:20}}>✅ Saved</span>}
              {syncStatus==="error"&&<span style={{fontSize:11,color:G.red,background:G.redSoft,padding:"3px 8px",borderRadius:20}}>⚠️ Failed</span>}
              <button onClick={()=>{setEditId(null);setForm({amount:"",category:categories[0]?.name||"Other",date:today(),note:"",paidBy:"Ramdhan"});setView("add");}} style={{background:`linear-gradient(135deg,${G.accentMid},${G.accent})`,color:"#fff",border:"none",borderRadius:50,width:38,height:38,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300,boxShadow:`0 4px 12px ${G.accent}44`}}>+</button>
            </div>
          </div>

          {/* Hero card */}
          <div style={{background:`linear-gradient(135deg, ${G.accentMid} 0%, ${G.accent} 100%)`,borderRadius:20,padding:"18px 20px",marginBottom:14,color:"#fff",boxShadow:`0 8px 24px ${G.accent}44`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
              <div>
                <div style={{fontSize:12,opacity:0.8,marginBottom:4,letterSpacing:"0.06em",textTransform:"uppercase"}}>Total Spent</div>
                <div style={{fontSize:30,fontWeight:800,letterSpacing:"-1px"}}>{fmt(totalSpent)}</div>
                <div style={{fontSize:12,opacity:0.7,marginTop:2}}>of {fmt(budgets.total)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:28,fontWeight:800,letterSpacing:"-1px"}}>{pct}%</div>
                <div style={{fontSize:11,opacity:0.7}}>used</div>
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,0.25)",borderRadius:99,height:8,overflow:"hidden"}}>
              <div style={{height:"100%",width:pct+"%",borderRadius:99,background:"#fff",transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,opacity:0.8}}>
              <span>Remaining: {fmt(Math.max(0,budgets.total-totalSpent))}</span>
              {pct>=80&&<span style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"2px 8px"}}>{pct>=100?"Over budget ⚠️":"Near limit"}</span>}
            </div>
          </div>

          {/* Paid by summary */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {PAID_BY.map(p=>{
              const spent=monthExp.filter(e=>e.paidBy===p).reduce((s,e)=>s+e.amount,0);
              return(
                <div key={p} style={{background:G.card,borderRadius:12,padding:"10px 10px",border:`1px solid ${G.cardBorder}`,textAlign:"center"}}>
                  <div style={{fontSize:11,fontWeight:600,color:paidByColor(p),marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p}</div>
                  <div style={{fontSize:13,fontWeight:700,color:G.textPrimary}}>{fmt(spent)}</div>
                </div>
              );
            })}
          </div>

          {/* Categories */}
          <div style={{fontSize:11,fontWeight:700,color:G.textSecondary,letterSpacing:"0.08em",marginBottom:8,textTransform:"uppercase"}}>Categories</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {categories.map(cat=>{
              const spent=catSpent[cat.name]||0;
              const bud=budgets[cat.name]||0;
              const p=bud?Math.min(100,Math.round((spent/bud)*100)):0;
              const over=bud&&spent>bud;
              return(
                <div key={cat.name} style={{...s.card,marginBottom:0,padding:"12px 13px",borderColor:over?`${G.red}66`:G.cardBorder}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:18}}>{cat.icon}</span>
                    {over&&<span style={{background:G.redSoft,color:G.red,borderRadius:6,padding:"1px 6px",fontSize:10,fontWeight:600}}>Over</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:G.textPrimary,marginBottom:1}}>{cat.name}</div>
                  <div style={{fontSize:13,fontWeight:700,color:over?G.red:G.textPrimary}}>{fmt(spent)}</div>
                  <div style={{fontSize:11,color:G.textSecondary,marginBottom:6}}>/ {fmt(bud)}</div>
                  <div style={{background:G.bg,borderRadius:99,height:4}}>
                    <div style={{height:"100%",width:p+"%",borderRadius:99,background:over?G.red:cat.color,transition:"width .3s"}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent */}
          {monthExp.length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:G.textSecondary,letterSpacing:"0.08em",marginBottom:8,textTransform:"uppercase"}}>Recent</div>
              {monthExp.slice(0,5).map(e=>{
                const cat=getCat(e.category);
                return(
                  <div key={e.id} style={{...s.card,display:"flex",alignItems:"center",gap:12,padding:"11px 13px"}}>
                    <div style={{width:40,height:40,borderRadius:12,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{cat.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:G.textPrimary}}>{cat.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                        <span style={{fontSize:11,background:paidBySoft(e.paidBy),color:paidByColor(e.paidBy),borderRadius:6,padding:"1px 6px",fontWeight:500}}>{e.paidBy||"—"}</span>
                        {e.note&&<span style={{fontSize:11,color:G.textTertiary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.note}</span>}
                      </div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:G.textPrimary,flexShrink:0}}>{fmt(e.amount)}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* TABLE */}
      {view==="table"&&(
        <div style={{padding:"0 14px"}}>
          <div style={{padding:"4px 0 12px"}}>
            <div style={{fontSize:22,fontWeight:800,color:G.textPrimary}}>All Records</div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {[
              [tableFilt.month, v=>setTableFilt(f=>({...f,month:v})), [["All","All months"],...allMonths.map(m=>[m,monthLabel(m)])]],
              [tableFilt.cat,   v=>setTableFilt(f=>({...f,cat:v})),   [["All","All cats"],...categories.map(c=>[c.name,c.icon+" "+c.name])]],
              [tableFilt.paidBy,v=>setTableFilt(f=>({...f,paidBy:v})),[["All","All payers"],...PAID_BY.map(p=>[p,p])]],
            ].map(([val,onChange,opts],i)=>(
              <select key={i} value={val} onChange={e=>onChange(e.target.value)} style={{...s.input,flex:1,minWidth:80,fontSize:12,padding:"7px 8px"}}>
                {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:G.accentSoft,borderRadius:10,marginBottom:10}}>
            <span style={{fontSize:13,color:G.accent,fontWeight:500}}>{tableData.length} records</span>
            <span style={{fontSize:14,fontWeight:700,color:G.accent}}>{fmt(tableTotal)}</span>
          </div>
          <div style={{background:G.card,borderRadius:14,border:`1px solid ${G.cardBorder}`,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
              <colgroup><col style={{width:"17%"}}/><col style={{width:"22%"}}/><col style={{width:"22%"}}/><col style={{width:"17%"}}/><col style={{width:"22%"}}/></colgroup>
              <thead>
                <tr style={{background:G.accentSoft}}>
                  {[["date","Date"],["category","Cat"],["paidBy","By"],["note","Note"],["amount","Amount"]].map(([col,label])=>(
                    <th key={col} onClick={()=>toggleSort(col)} style={{padding:"8px 8px",fontSize:11,fontWeight:700,color:G.accent,textAlign:col==="amount"?"right":"left",cursor:"pointer",letterSpacing:"0.04em",borderBottom:`1px solid ${G.cardBorder}`,textTransform:"uppercase"}}>
                      {label}<span style={{opacity:0.5}}>{si(col)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.length===0&&<tr><td colSpan={5} style={{textAlign:"center",padding:"32px 0",color:G.textSecondary,fontSize:13}}>No records</td></tr>}
                {tableData.map((e,i)=>{
                  const cat=getCat(e.category);
                  return(
                    <tr key={e.id} style={{background:i%2===0?G.card:G.accentLight}}>
                      <td style={{padding:"8px 8px",fontSize:11,color:G.textSecondary,borderBottom:`1px solid ${G.divider}`}}>
                        <div style={{fontWeight:600,color:G.textPrimary}}>{e.date.slice(5)}</div>
                        <div style={{fontSize:10,color:G.textTertiary}}>{e.date.slice(0,4)}</div>
                      </td>
                      <td style={{padding:"8px 8px",borderBottom:`1px solid ${G.divider}`}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:3,background:cat.color+"18",color:cat.color,borderRadius:8,padding:"2px 6px",fontSize:11,fontWeight:600}}>{cat.icon} {cat.name}</span>
                      </td>
                      <td style={{padding:"8px 8px",borderBottom:`1px solid ${G.divider}`}}>
                        <span style={{display:"inline-flex",alignItems:"center",background:paidBySoft(e.paidBy),color:paidByColor(e.paidBy),borderRadius:8,padding:"2px 6px",fontSize:10,fontWeight:600}}>{e.paidBy||"—"}</span>
                      </td>
                      <td style={{padding:"8px 8px",fontSize:11,color:G.textSecondary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:0,borderBottom:`1px solid ${G.divider}`}}>{e.note||"—"}</td>
                      <td style={{padding:"8px 8px",fontSize:12,fontWeight:700,color:G.textPrimary,textAlign:"right",borderBottom:`1px solid ${G.divider}`}}>
                        <div>{fmt(e.amount)}</div>
                        <div style={{display:"flex",gap:4,justifyContent:"flex-end",marginTop:2}}>
                          <button onClick={()=>startEdit(e)} style={{fontSize:10,color:G.accent,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600}}>Edit</button>
                          <button onClick={()=>deleteExpense(e.id)} style={{fontSize:10,color:G.red,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600}}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {tableData.length>0&&(
                <tfoot>
                  <tr style={{background:G.accentSoft}}>
                    <td colSpan={4} style={{padding:"8px 10px",fontSize:12,fontWeight:700,color:G.accent}}>Total</td>
                    <td style={{padding:"8px 10px",fontSize:13,fontWeight:700,textAlign:"right",color:G.accent}}>{fmt(tableTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT */}
      {view==="add"&&(
        <div style={{padding:"0 14px"}}>
          <div style={{padding:"4px 0 16px",display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{setView("home");setEditId(null);}} style={{background:G.accentSoft,border:"none",borderRadius:10,width:34,height:34,cursor:"pointer",fontSize:18,color:G.accent,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <div style={{fontSize:20,fontWeight:800,color:G.textPrimary}}>{editId!==null?"Edit Expense":"New Expense"}</div>
          </div>
          <div style={s.card}>
            <label style={s.label}>Amount (Rp)</label>
            <input type="number" placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...s.input,fontSize:26,fontWeight:700,textAlign:"center",marginBottom:16}}/>

            <label style={s.label}>Category</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {categories.map(cat=>(
                <button key={cat.name} onClick={()=>setForm(f=>({...f,category:cat.name}))} style={{padding:"9px 8px",borderRadius:10,border:`1.5px solid ${form.category===cat.name?cat.color:G.cardBorder}`,background:form.category===cat.name?cat.color+"18":G.inputBg,cursor:"pointer",fontSize:13,color:form.category===cat.name?cat.color:G.textSecondary,display:"flex",alignItems:"center",gap:7,fontWeight:form.category===cat.name?600:400}}>
                  <span style={{fontSize:16}}>{cat.icon}</span>{cat.name}
                </button>
              ))}
            </div>

            <label style={s.label}>Paid By</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {PAID_BY.map(p=>(
                <button key={p} onClick={()=>setForm(f=>({...f,paidBy:p}))} style={{padding:"9px 6px",borderRadius:10,border:`1.5px solid ${form.paidBy===p?paidByColor(p):G.cardBorder}`,background:form.paidBy===p?paidBySoft(p):G.inputBg,cursor:"pointer",fontSize:12,color:form.paidBy===p?paidByColor(p):G.textSecondary,fontWeight:form.paidBy===p?700:400,textAlign:"center"}}>
                  {p}
                </button>
              ))}
            </div>

            <label style={s.label}>Date</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{...s.input,marginBottom:16}}/>

            <label style={s.label}>Note (optional)</label>
            <input type="text" placeholder="e.g. lunch with team" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{...s.input,marginBottom:20}}/>

            <button onClick={saveExpense} style={s.accentBtn}>{editId!==null?"Update Expense":"Save Expense"}</button>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {view==="budget"&&(
        <div style={{padding:"0 14px"}}>
          <div style={{padding:"4px 0 16px"}}>
            <div style={{fontSize:22,fontWeight:800,color:G.textPrimary}}>Settings</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:G.textSecondary,letterSpacing:"0.08em",marginBottom:8,textTransform:"uppercase"}}>Categories</div>
          {categories.map((cat,idx)=>(
            <div key={cat.name} style={{...s.card,display:"flex",alignItems:"center",gap:12,padding:"11px 14px"}}>
              <div style={{width:38,height:38,borderRadius:11,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:G.textPrimary}}>{cat.name}</div>
                <div style={{fontSize:12,color:G.textSecondary}}>Budget: {fmt(budgets[cat.name]||0)}</div>
              </div>
              <button onClick={()=>openEditCat(idx)} style={{background:G.accentSoft,border:`1px solid ${G.accent}44`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,color:G.accent,fontWeight:600}}>Edit</button>
            </div>
          ))}
          <button onClick={openAddCat} style={{...s.outlineBtn,width:"100%",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 20px"}}>
            <span style={{fontSize:18,lineHeight:1}}>+</span> Add new category
          </button>
          <div style={{fontSize:11,fontWeight:700,color:G.textSecondary,letterSpacing:"0.08em",marginBottom:8,textTransform:"uppercase"}}>Total Budget</div>
          <div style={{...s.card,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:G.textPrimary}}>Monthly Total</div>
              {budgetEdit==="total"
                ?<input type="number" defaultValue={budgets.total} autoFocus onBlur={e=>saveBudget("total",e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveBudget("total",e.target.value)} style={{...s.input,width:150,marginTop:6,fontSize:14}}/>
                :<div style={{fontSize:13,color:G.textSecondary,marginTop:2}}>{fmt(budgets.total)}</div>
              }
            </div>
            <button onClick={()=>setBudgetEdit("total")} style={{background:G.accentSoft,border:`1px solid ${G.accent}44`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,color:G.accent,fontWeight:600}}>Edit</button>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {catModal!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,61,43,0.5)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setCatModal(null)}>
          <div style={{background:G.card,borderRadius:"22px 22px 0 0",padding:"20px 18px 36px",width:"100%",maxWidth:430}}>
            <div style={{width:36,height:4,background:G.divider,borderRadius:99,margin:"0 auto 18px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:17,fontWeight:700,color:G.textPrimary}}>{catModal==="add"?"New Category":"Edit Category"}</div>
              <button onClick={()=>setCatModal(null)} style={{background:G.bg,border:"none",borderRadius:50,width:30,height:30,cursor:"pointer",fontSize:17,color:G.textSecondary}}>×</button>
            </div>
            <label style={s.label}>Name</label>
            <input type="text" placeholder="Category name" value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} style={{...s.input,marginBottom:14}}/>
            <label style={s.label}>Icon</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
              {ICON_OPTIONS.map(ic=>(
                <button key={ic} onClick={()=>setCatForm(f=>({...f,icon:ic}))} style={{width:38,height:38,borderRadius:10,border:`1.5px solid ${catForm.icon===ic?catForm.color:G.cardBorder}`,background:catForm.icon===ic?catForm.color+"18":G.inputBg,cursor:"pointer",fontSize:19}}>{ic}</button>
              ))}
            </div>
            <label style={s.label}>Color</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
              {PALETTE.map(col=>(
                <button key={col} onClick={()=>setCatForm(f=>({...f,color:col}))} style={{width:28,height:28,borderRadius:"50%",background:col,border:catForm.color===col?`3px solid ${G.textPrimary}`:"2px solid transparent",cursor:"pointer"}}/>
              ))}
            </div>
            <label style={s.label}>Budget (Rp)</label>
            <input type="number" placeholder="e.g. 500000" defaultValue={catModal!=="add"?(budgets[categories[catModal]?.name]||""):""}
              onChange={e=>setBudgets({...budgets,[catModal==="add"?catForm.name:categories[catModal]?.name]:parseFloat(e.target.value)||0})}
              style={{...s.input,marginBottom:20}}/>
            <div style={{display:"flex",gap:10}}>
              {catModal!=="add"&&<button onClick={()=>deleteCat(catModal)} style={{...s.outlineBtn,flex:1,color:G.red,borderColor:G.red}}>Delete</button>}
              <button onClick={saveCat} style={{...s.accentBtn,flex:2}}>{catModal==="add"?"Add Category":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={s.navBar}>
        {[["home","⌂","Home"],["table","≡","Records"],["add","＋","Add"],["budget","⊙","Settings"]].map(([id,icon,label])=>{
          const active=view===id;
          return(
            <button key={id} style={s.navBtn(active)} onClick={()=>{
              if(id==="add"){setEditId(null);setForm({amount:"",category:categories[0]?.name||"Other",date:today(),note:"",paidBy:"Ramdhan"});}
              setView(id);
            }}>
              <div style={{width:30,height:30,borderRadius:9,background:active?G.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:id==="add"?22:17,color:active?"#fff":G.textTertiary,transition:"all .15s"}}>{icon}</div>
              <span style={{fontSize:10,fontWeight:active?700:400,letterSpacing:"0.02em"}}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}