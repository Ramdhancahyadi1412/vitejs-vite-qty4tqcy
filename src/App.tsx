import { useState } from "react";

const W = {
  bg:       "#FDF6EE",
  card:     "#FFFFFF",
  cardBorder:"#F0E4D4",
  accent:   "#C2622A",
  accentSoft:"#FAEEE4",
  accentMid:"#E8845A",
  amber:    "#D4820E",
  amberSoft:"#FEF4DC",
  green:    "#4A8C5C",
  greenSoft:"#E6F4EB",
  red:      "#C0392B",
  redSoft:  "#FDECEA",
  textPrimary: "#2C1A0E",
  textSecondary:"#7A5C44",
  textTertiary:"#B89880",
  divider:  "#EFE0CE",
  navBg:    "#FEFAF6",
  inputBg:  "#FAF3EB",
};

const DEFAULT_CATEGORIES = [
  { name:"Food",          icon:"🍽️", color:"#C2622A" },
  { name:"Transport",     icon:"🚗", color:"#2E7D9A" },
  { name:"Shopping",      icon:"🛍️", color:"#9B4494" },
  { name:"Health",        icon:"💊", color:"#4A8C5C" },
  { name:"Entertainment", icon:"🎬", color:"#7B5EA7" },
  { name:"Bills",         icon:"💡", color:"#D4820E" },
  { name:"Other",         icon:"📦", color:"#7A5C44" },
];

const PALETTE = ["#C2622A","#D4820E","#9B4494","#4A8C5C","#2E7D9A","#7B5EA7","#C0392B","#3B7A57","#7A5C44","#1A6B8A","#8E4585","#556B2F"];
const ICON_OPTIONS = ["🍽️","🚗","🛍️","💊","🎬","💡","📦","✈️","🏠","📚","🐾","🎮","👗","🏋️","☕","🎁","💼","🏦","🎵","🌿"];

const fmt = n => "Rp " + Math.round(n).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0,10);
const monthKey = d => d.slice(0,7);
const curMonth = () => today().slice(0,7);
const monthLabel = m => new Date(m+"-01").toLocaleString("id-ID",{month:"long",year:"numeric"});

function useStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = v => { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
  return [val, set];
}

const Pill = ({label, color, soft, small}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:3,background:soft,color:color,borderRadius:20,padding:small?"2px 8px":"4px 10px",fontSize:small?11:12,fontWeight:500}}>{label}</span>
);

export default function App() {
  const [expenses,   setExpenses]   = useStorage("exp_v3", []);
  const [budgets,    setBudgets]    = useStorage("bud_v3", {total:5000000,Food:1500000,Transport:500000,Shopping:800000,Health:400000,Entertainment:500000,Bills:800000,Other:500000});
  const [categories, setCategories] = useStorage("cats_v3", DEFAULT_CATEGORIES);
  const [view,       setView]       = useState("home");
  const [editId,     setEditId]     = useState(null);
  const [filterMonth,setFilterMonth]= useState(curMonth());
  const [alerts,     setAlerts]     = useState([]);
  const [form,       setForm]       = useState({amount:"",category:"Food",date:today(),note:""});
  const [budgetEdit, setBudgetEdit] = useState(null);
  const [catModal,   setCatModal]   = useState(null);
  const [catForm,    setCatForm]    = useState({name:"",icon:"📦",color:PALETTE[0]});
  const [tableSort,  setTableSort]  = useState({col:"date",dir:"desc"});
  const [tableFilt,  setTableFilt]  = useState({month:"All",cat:"All"});

  const getCat = name => categories.find(c=>c.name===name)||{name,icon:"📦",color:W.textSecondary};

  const monthExp = expenses.filter(e=>monthKey(e.date)===filterMonth);
  const totalSpent = monthExp.reduce((s,e)=>s+e.amount,0);
  const pct = Math.min(100,Math.round((totalSpent/budgets.total)*100));
  const catSpent = categories.reduce((acc,c)=>{
    acc[c.name]=monthExp.filter(e=>e.category===c.name).reduce((s,e)=>s+e.amount,0); return acc;
  },{});

  const months = [...new Set(expenses.map(e=>monthKey(e.date)))].sort().reverse();
  if(!months.includes(curMonth())) months.unshift(curMonth());

  const checkAlerts = (newE, all) => {
    const month = monthKey(newE.date);
    const mExp = all.filter(e=>monthKey(e.date)===month);
    const total = mExp.reduce((s,e)=>s+e.amount,0);
    const msgs = [];
    if(total>budgets.total) msgs.push(`Total budget exceeded! Spent ${fmt(total)} of ${fmt(budgets.total)}`);
    const ct = mExp.filter(e=>e.category===newE.category).reduce((s,e)=>s+e.amount,0);
    if(budgets[newE.category]&&ct>budgets[newE.category]) msgs.push(`${newE.category} budget exceeded! Spent ${fmt(ct)} of ${fmt(budgets[newE.category])}`);
    if(msgs.length) setAlerts(msgs);
  };

  const saveExpense = () => {
    const amt = parseFloat(String(form.amount).replace(/[^0-9]/g,""));
    if(!amt||amt<=0) return;
    let updated;
    if(editId!==null) {
      updated = expenses.map(e=>e.id===editId?{...e,...form,amount:amt}:e);
    } else {
      const newE={id:Date.now(),...form,amount:amt};
      updated=[newE,...expenses];
      checkAlerts(newE,updated);
    }
    setExpenses(updated);
    setForm({amount:"",category:categories[0]?.name||"Other",date:today(),note:""});
    setEditId(null); setView("home");
  };

  const deleteExpense = id => setExpenses(expenses.filter(e=>e.id!==id));
  const startEdit = e => { setForm({amount:String(e.amount),category:e.category,date:e.date,note:e.note}); setEditId(e.id); setView("add"); };

  const saveBudget = (key,val) => {
    const n = parseFloat(String(val).replace(/[^0-9]/g,""));
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

  const allMonths = [...new Set(expenses.map(e=>monthKey(e.date)))].sort().reverse();
  const tableData = expenses.filter(e=>{
    if(tableFilt.month!=="All"&&monthKey(e.date)!==tableFilt.month) return false;
    if(tableFilt.cat!=="All"&&e.category!==tableFilt.cat) return false;
    return true;
  }).sort((a,b)=>{
    const d=tableSort.dir==="asc"?1:-1;
    if(tableSort.col==="date") return a.date.localeCompare(b.date)*d;
    if(tableSort.col==="amount") return (a.amount-b.amount)*d;
    if(tableSort.col==="category") return a.category.localeCompare(b.category)*d;
    return 0;
  });
  const tableTotal=tableData.reduce((s,e)=>s+e.amount,0);
  const toggleSort=col=>setTableSort(s=>({col,dir:s.col===col&&s.dir==="desc"?"asc":"desc"}));
  const si=col=>tableSort.col===col?(tableSort.dir==="asc"?"↑":"↓"):"↕";

  const s = {
    wrap:   {background:W.bg, minHeight:"100vh", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", paddingBottom:84, maxWidth:390, margin:"0 auto"},
    statusBar: {height:44, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px 0 24px", background:W.bg},
    header: {padding:"4px 20px 16px", background:W.bg},
    card:   {background:W.card, borderRadius:16, border:`1px solid ${W.cardBorder}`, padding:"14px 16px", marginBottom:10},
    label:  {fontSize:12, color:W.textSecondary, marginBottom:5, display:"block", letterSpacing:"0.02em"},
    input:  {width:"100%", boxSizing:"border-box", background:W.inputBg, border:`1px solid ${W.cardBorder}`, borderRadius:10, padding:"10px 13px", fontSize:15, color:W.textPrimary, outline:"none"},
    accentBtn: {background:W.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 20px", fontWeight:600, fontSize:15, cursor:"pointer", width:"100%", letterSpacing:"0.01em"},
    outlineBtn:{background:"transparent", color:W.accent, border:`1.5px solid ${W.accent}`, borderRadius:12, padding:"10px 20px", fontWeight:500, fontSize:14, cursor:"pointer"},
    navBar: {display:"flex", background:W.navBg, borderTop:`1px solid ${W.divider}`, position:"fixed", bottom:0, left:0, right:0, paddingBottom:16, paddingTop:6, maxWidth:390, margin:"0 auto"},
    navBtn: active=>({flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, border:"none", background:"none", cursor:"pointer", padding:"4px 0", color:active?W.accent:W.textTertiary}),
    sectionTitle: {fontSize:13, fontWeight:600, color:W.textSecondary, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, marginTop:4},
    pill: (color,soft)=>({display:"inline-flex",alignItems:"center",gap:3,background:soft,color:color,borderRadius:20,padding:"3px 9px",fontSize:12,fontWeight:500}),
  };

  const navItems = [
    {id:"home", icon:"⌂", label:"Home"},
    {id:"table", icon:"≡", label:"Records"},
    {id:"add", icon:"+", label:"Add"},
    {id:"budget", icon:"⊙", label:"Settings"},
  ];

  return (
    <div style={s.wrap}>
      {/* Status bar mock */}
      <div style={s.statusBar}>
        <span style={{fontSize:13, fontWeight:600, color:W.textPrimary}}>9:41</span>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontSize:12,color:W.textPrimary}}>●●●●</span>
          <span style={{fontSize:12,color:W.textPrimary}}>WiFi</span>
          <span style={{fontSize:13,color:W.textPrimary}}>🔋</span>
        </div>
      </div>

      {alerts.length>0&&(
        <div style={{margin:"0 16px 10px", background:W.amberSoft, border:`1px solid ${W.amber}44`, borderRadius:12, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>{alerts.map((a,i)=><div key={i} style={{fontSize:13,color:W.amber,fontWeight:500}}>⚠️ {a}</div>)}</div>
          <button onClick={()=>setAlerts([])} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:W.amber,lineHeight:1,marginLeft:8}}>×</button>
        </div>
      )}

      {/* HOME */}
      {view==="home"&&(
        <div style={{padding:"0 16px"}}>
          <div style={s.header}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:22,fontWeight:700,color:W.textPrimary,letterSpacing:"-0.5px"}}>My Expenses</div>
                <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{border:"none",background:"none",fontSize:14,color:W.textSecondary,padding:0,cursor:"pointer",marginTop:2,fontFamily:"inherit"}}>
                  {months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
                </select>
              </div>
              <button onClick={()=>{setEditId(null);setForm({amount:"",category:categories[0]?.name||"Other",date:today(),note:""});setView("add");}} style={{background:W.accent,color:"#fff",border:"none",borderRadius:50,width:40,height:40,fontSize:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300,marginTop:4}}>+</button>
            </div>
          </div>

          {/* Hero budget card */}
          <div style={{...s.card, padding:"18px 18px", marginBottom:14, borderColor: pct>=100?`${W.red}44`:pct>=80?`${W.amber}44`:W.cardBorder}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:W.textSecondary,marginBottom:3,letterSpacing:"0.03em"}}>TOTAL SPENT</div>
                <div style={{fontSize:30,fontWeight:700,color:pct>=100?W.red:W.textPrimary,letterSpacing:"-1px"}}>{fmt(totalSpent)}</div>
                <div style={{fontSize:12,color:W.textSecondary,marginTop:2}}>of {fmt(budgets.total)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:28,fontWeight:700,color:pct>=100?W.red:pct>=80?W.amber:W.green,letterSpacing:"-1px"}}>{pct}%</div>
                <div style={{fontSize:11,color:W.textSecondary}}>used</div>
              </div>
            </div>
            <div style={{background:W.bg,borderRadius:99,height:9,overflow:"hidden"}}>
              <div style={{height:"100%",width:pct+"%",borderRadius:99,background:pct>=100?W.red:pct>=80?W.amber:W.green,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
              <span style={{fontSize:12,color:W.textSecondary}}>Remaining: {fmt(Math.max(0,budgets.total-totalSpent))}</span>
              {pct>=80&&<span style={{...s.pill(pct>=100?W.red:W.amber, pct>=100?W.redSoft:W.amberSoft),fontSize:11}}>{pct>=100?"Over budget":"Near limit"}</span>}
            </div>
          </div>

          <div style={{fontSize:13,fontWeight:600,color:W.textSecondary,letterSpacing:"0.06em",marginBottom:10}}>CATEGORIES</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {categories.map(cat=>{
              const spent=catSpent[cat.name]||0;
              const bud=budgets[cat.name]||0;
              const p=bud?Math.min(100,Math.round((spent/bud)*100)):0;
              const over=bud&&spent>bud;
              return(
                <div key={cat.name} style={{...s.card,marginBottom:0,padding:"12px 13px",borderColor:over?`${W.red}55`:W.cardBorder}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:18}}>{cat.icon}</span>
                    {over&&<span style={{background:W.redSoft,color:W.red,borderRadius:6,padding:"2px 6px",fontSize:10,fontWeight:600}}>Over</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:W.textPrimary,marginBottom:1}}>{cat.name}</div>
                  <div style={{fontSize:13,fontWeight:700,color:over?W.red:W.textPrimary}}>{fmt(spent)}</div>
                  <div style={{fontSize:11,color:W.textSecondary,marginBottom:7}}>/ {fmt(bud)}</div>
                  <div style={{background:W.bg,borderRadius:99,height:4}}>
                    <div style={{height:"100%",width:p+"%",borderRadius:99,background:over?W.red:cat.color}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent transactions */}
          {expenses.filter(e=>monthKey(e.date)===filterMonth).length>0&&(
            <>
              <div style={{fontSize:13,fontWeight:600,color:W.textSecondary,letterSpacing:"0.06em",marginBottom:10}}>RECENT</div>
              {expenses.filter(e=>monthKey(e.date)===filterMonth).slice(0,5).map(e=>{
                const cat=getCat(e.category);
                return(
                  <div key={e.id} style={{...s.card,display:"flex",alignItems:"center",gap:12,padding:"11px 13px"}}>
                    <div style={{width:40,height:40,borderRadius:12,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{cat.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:W.textPrimary}}>{cat.name}</div>
                      <div style={{fontSize:12,color:W.textSecondary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.note||e.date}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:W.textPrimary,flexShrink:0}}>-{fmt(e.amount)}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* TABLE */}
      {view==="table"&&(
        <div style={{padding:"0 16px"}}>
          <div style={s.header}>
            <div style={{fontSize:22,fontWeight:700,color:W.textPrimary,letterSpacing:"-0.5px"}}>All Records</div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <select value={tableFilt.month} onChange={e=>setTableFilt(f=>({...f,month:e.target.value}))} style={{...s.input,flex:1,fontSize:13,padding:"8px 12px"}}>
              <option value="All">All months</option>
              {allMonths.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <select value={tableFilt.cat} onChange={e=>setTableFilt(f=>({...f,cat:e.target.value}))} style={{...s.input,flex:1,fontSize:13,padding:"8px 12px"}}>
              <option value="All">All categories</option>
              {categories.map(c=><option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:W.accentSoft,borderRadius:10,marginBottom:10}}>
            <span style={{fontSize:13,color:W.accent,fontWeight:500}}>{tableData.length} records</span>
            <span style={{fontSize:14,fontWeight:700,color:W.accent}}>{fmt(tableTotal)}</span>
          </div>
          <div style={{background:W.card,borderRadius:14,border:`1px solid ${W.cardBorder}`,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
              <colgroup><col style={{width:"21%"}}/><col style={{width:"27%"}}/><col style={{width:"26%"}}/><col style={{width:"26%"}}/></colgroup>
              <thead>
                <tr style={{background:W.accentSoft}}>
                  {[["date","Date"],["category","Cat"],["note","Note"],["amount","Amount"]].map(([col,label])=>(
                    <th key={col} onClick={()=>toggleSort(col)} style={{padding:"9px 10px",fontSize:12,fontWeight:600,color:W.accent,textAlign:col==="amount"?"right":"left",cursor:"pointer",letterSpacing:"0.03em",borderBottom:`1px solid ${W.cardBorder}`}}>
                      {label} <span style={{opacity:0.6}}>{si(col)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.length===0&&<tr><td colSpan={4} style={{textAlign:"center",padding:"32px 0",color:W.textSecondary,fontSize:13}}>No records found</td></tr>}
                {tableData.map((e,i)=>{
                  const cat=getCat(e.category);
                  return(
                    <tr key={e.id} style={{background:i%2===0?W.card:"#FDFAF6"}}>
                      <td style={{padding:"9px 10px",fontSize:12,color:W.textSecondary,borderBottom:`1px solid ${W.divider}`}}>
                        <div style={{fontWeight:500,color:W.textPrimary}}>{e.date.slice(5)}</div>
                        <div style={{fontSize:11,color:W.textTertiary}}>{e.date.slice(0,4)}</div>
                      </td>
                      <td style={{padding:"9px 10px",borderBottom:`1px solid ${W.divider}`}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4,background:cat.color+"18",color:cat.color,borderRadius:8,padding:"2px 7px",fontSize:11,fontWeight:600}}>{cat.icon} {cat.name}</span>
                      </td>
                      <td style={{padding:"9px 10px",fontSize:12,color:W.textSecondary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:0,borderBottom:`1px solid ${W.divider}`}}>{e.note||"—"}</td>
                      <td style={{padding:"9px 10px",fontSize:13,fontWeight:700,color:W.textPrimary,textAlign:"right",borderBottom:`1px solid ${W.divider}`}}>
                        <div>{fmt(e.amount)}</div>
                        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:3}}>
                          <button onClick={()=>startEdit(e)} style={{fontSize:11,color:W.accent,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:500}}>Edit</button>
                          <button onClick={()=>deleteExpense(e.id)} style={{fontSize:11,color:W.red,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:500}}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {tableData.length>0&&(
                <tfoot>
                  <tr style={{background:W.accentSoft}}>
                    <td colSpan={3} style={{padding:"9px 10px",fontSize:13,fontWeight:600,color:W.accent}}>Total</td>
                    <td style={{padding:"9px 10px",fontSize:13,fontWeight:700,textAlign:"right",color:W.accent}}>{fmt(tableTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT */}
      {view==="add"&&(
        <div style={{padding:"0 16px"}}>
          <div style={s.header}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>{setView("home");setEditId(null);}} style={{background:W.accentSoft,border:"none",borderRadius:10,width:34,height:34,cursor:"pointer",fontSize:18,color:W.accent,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
              <div style={{fontSize:20,fontWeight:700,color:W.textPrimary}}>{editId!==null?"Edit Expense":"New Expense"}</div>
            </div>
          </div>
          <div style={s.card}>
            <label style={s.label}>AMOUNT (RP)</label>
            <input type="number" placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...s.input,fontSize:28,fontWeight:700,color:W.textPrimary,padding:"10px 14px",marginBottom:16,textAlign:"center",letterSpacing:"-0.5px"}}/>
            <label style={s.label}>CATEGORY</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {categories.map(cat=>(
                <button key={cat.name} onClick={()=>setForm(f=>({...f,category:cat.name}))} style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${form.category===cat.name?cat.color:W.cardBorder}`,background:form.category===cat.name?cat.color+"18":W.inputBg,cursor:"pointer",fontSize:13,color:form.category===cat.name?cat.color:W.textSecondary,display:"flex",alignItems:"center",gap:7,fontWeight:form.category===cat.name?600:400}}>
                  <span style={{fontSize:17}}>{cat.icon}</span>{cat.name}
                </button>
              ))}
            </div>
            <label style={s.label}>DATE</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{...s.input,marginBottom:16}}/>
            <label style={s.label}>NOTE (OPTIONAL)</label>
            <input type="text" placeholder="e.g. lunch with team" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{...s.input,marginBottom:20}}/>
            <button onClick={saveExpense} style={s.accentBtn}>{editId!==null?"Update Expense":"Save Expense"}</button>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {view==="budget"&&(
        <div style={{padding:"0 16px"}}>
          <div style={s.header}>
            <div style={{fontSize:22,fontWeight:700,color:W.textPrimary,letterSpacing:"-0.5px"}}>Settings</div>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:W.textSecondary,letterSpacing:"0.06em",marginBottom:10}}>CATEGORIES</div>
          {categories.map((cat,idx)=>(
            <div key={cat.name} style={{...s.card,display:"flex",alignItems:"center",gap:12,padding:"11px 14px"}}>
              <div style={{width:38,height:38,borderRadius:11,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:W.textPrimary}}>{cat.name}</div>
                <div style={{fontSize:12,color:W.textSecondary}}>Budget: {fmt(budgets[cat.name]||0)}</div>
              </div>
              <button onClick={()=>openEditCat(idx)} style={{background:W.accentSoft,border:`1px solid ${W.accent}44`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,color:W.accent,fontWeight:500}}>Edit</button>
            </div>
          ))}
          <button onClick={openAddCat} style={{...s.outlineBtn,width:"100%",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 20px"}}>
            <span style={{fontSize:18,lineHeight:1}}>+</span> Add new category
          </button>
          <div style={{fontSize:13,fontWeight:600,color:W.textSecondary,letterSpacing:"0.06em",marginBottom:10}}>TOTAL BUDGET</div>
          <div style={{...s.card,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:W.textPrimary}}>Monthly Total</div>
              {budgetEdit==="total"
                ?<input type="number" defaultValue={budgets.total} autoFocus onBlur={e=>saveBudget("total",e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveBudget("total",e.target.value)} style={{...s.input,width:150,marginTop:6,fontSize:14}}/>
                :<div style={{fontSize:13,color:W.textSecondary,marginTop:2}}>{fmt(budgets.total)}</div>
              }
            </div>
            <button onClick={()=>setBudgetEdit("total")} style={{background:W.accentSoft,border:`1px solid ${W.accent}44`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,color:W.accent,fontWeight:500}}>Edit</button>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL — uses in-flow overlay trick */}
      {catModal!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(44,26,14,0.45)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setCatModal(null)}>
          <div style={{background:W.card,borderRadius:"22px 22px 0 0",padding:"20px 18px 36px",width:"100%",maxWidth:390}}>
            <div style={{width:36,height:4,background:W.divider,borderRadius:99,margin:"0 auto 18px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:17,fontWeight:700,color:W.textPrimary}}>{catModal==="add"?"New Category":"Edit Category"}</div>
              <button onClick={()=>setCatModal(null)} style={{background:W.bg,border:"none",borderRadius:50,width:30,height:30,cursor:"pointer",fontSize:17,color:W.textSecondary,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <label style={s.label}>NAME</label>
            <input type="text" placeholder="Category name" value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} style={{...s.input,marginBottom:14}}/>
            <label style={s.label}>ICON</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
              {ICON_OPTIONS.map(ic=>(
                <button key={ic} onClick={()=>setCatForm(f=>({...f,icon:ic}))} style={{width:38,height:38,borderRadius:10,border:`1.5px solid ${catForm.icon===ic?catForm.color:W.cardBorder}`,background:catForm.icon===ic?catForm.color+"18":W.inputBg,cursor:"pointer",fontSize:19}}>{ic}</button>
              ))}
            </div>
            <label style={s.label}>COLOR</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
              {PALETTE.map(col=>(
                <button key={col} onClick={()=>setCatForm(f=>({...f,color:col}))} style={{width:28,height:28,borderRadius:"50%",background:col,border:catForm.color===col?`3px solid ${W.textPrimary}`:"2px solid transparent",cursor:"pointer"}}/>
              ))}
            </div>
            <label style={s.label}>BUDGET (RP)</label>
            <input type="number" placeholder="e.g. 500000" defaultValue={catModal!=="add"?(budgets[categories[catModal]?.name]||""):""}
              onChange={e=>setBudgets({...budgets,[catModal==="add"?catForm.name:categories[catModal]?.name]:parseFloat(e.target.value)||0})}
              style={{...s.input,marginBottom:20}}/>
            <div style={{display:"flex",gap:10}}>
              {catModal!=="add"&&<button onClick={()=>deleteCat(catModal)} style={{...s.outlineBtn,flex:1,color:W.red,borderColor:W.red}}>Delete</button>}
              <button onClick={saveCat} style={{...s.accentBtn,flex:2}}>{catModal==="add"?"Add Category":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Tab Bar */}
      <div style={s.navBar}>
        {navItems.map(({id,icon,label})=>{
          const active=view===id||(id==="add"&&view==="add");
          return(
            <button key={id} style={s.navBtn(active)} onClick={()=>{
              if(id==="add"){setEditId(null);setForm({amount:"",category:categories[0]?.name||"Other",date:today(),note:""});}
              setView(id);
            }}>
              <div style={{width:28,height:28,borderRadius:8,background:active?W.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:id==="add"?22:17,color:active?"#fff":W.textTertiary,fontWeight:id==="add"?300:400,transition:"all .15s"}}>{icon}</div>
              <span style={{fontSize:10,fontWeight:active?600:400,letterSpacing:"0.02em"}}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}