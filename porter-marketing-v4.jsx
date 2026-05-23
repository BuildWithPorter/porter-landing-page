import { useState, useEffect, useRef } from "react";

/*
 * CLAUDE CODE NOTES:
 * • Porter logo in nav/sidebar/footer = PLACEHOLDER — replace with actual SVG
 * • All customer/company names are fictional
 * • Fonts via Google Fonts CDN
 */

/* ═══ HOOKS ═══ */
function useInView(th=0.13){const r=useRef(null);const[v,s]=useState(false);useEffect(()=>{const e=r.current;if(!e)return;const o=new IntersectionObserver(([x])=>{if(x.isIntersecting)s(true)},{threshold:th});o.observe(e);return()=>o.disconnect()},[th]);return[r,v]}
function useTypewriter(t,a,sp=20){const[d,s]=useState("");useEffect(()=>{if(!a){s("");return}let i=0;const id=setInterval(()=>{i++;s(t.slice(0,i));if(i>=t.length)clearInterval(id)},sp);return()=>clearInterval(id)},[t,a,sp]);return d}
function useCounter(t,a,d=1000){const[v,s]=useState(0);useEffect(()=>{if(!a)return;const st=performance.now();const f=(n)=>{const p=Math.min((n-st)/d,1);s(Math.round(t*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)},[t,a,d]);return v}

/* ═══ TOKENS ═══ */
const C={bg:"#FAFAFA",white:"#FFFFFF",black:"#0A0A0A",text2:"#525252",muted:"#9A9A9A",border:"#E5E5E5",borderSub:"#F0F0F0",tint:"#F8F8F8",green:"#2D6A4F",greenBg:"rgba(45,106,79,0.08)",red:"#DC2626",amber:"#92400E",sidebar:"#111111"};
const F="'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const FS="'Instrument Serif',Georgia,serif";
const FM="'DM Mono','SF Mono',monospace";

const css=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes slideR{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
`;

const an=(iv,d=0)=>({opacity:iv?1:0,transform:iv?"translateY(0)":"translateY(28px)",transition:`all .8s cubic-bezier(.16,1,.3,1) ${d}ms`});

/* ═══ PRIMITIVES ═══ */
function Pill({children}){return <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:100,background:C.greenBg,marginBottom:20}}><div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/><span style={{fontFamily:F,fontSize:11,fontWeight:500,color:C.green,letterSpacing:".04em",textTransform:"uppercase"}}>{children}</span></div>}

function SHead({label,title,sub,iv}){return <div style={{textAlign:"center",maxWidth:660,margin:"0 auto 56px",...an(iv)}}><Pill>{label}</Pill><h2 style={{fontFamily:FS,fontSize:42,fontWeight:400,color:C.black,lineHeight:1.12,marginBottom:14}}>{title}</h2><p style={{fontFamily:F,fontSize:15,color:C.text2,lineHeight:1.6}}>{sub}</p></div>}

function Badge({children,v="green"}){const m={green:{c:C.green,bg:C.greenBg},gray:{c:C.muted,bg:"#F5F5F5"},amber:{c:C.amber,bg:"rgba(146,64,14,.08)"},red:{c:C.red,bg:"rgba(220,38,38,.08)"},posted:{c:C.white,bg:C.green},approved:{c:C.white,bg:C.green},ready:{c:C.amber,bg:"rgba(146,64,14,.08)"},complete:{c:C.white,bg:C.green},progress:{c:C.amber,bg:"rgba(146,64,14,.08)"},notstarted:{c:C.muted,bg:"#F5F5F5"}};const s=m[v]||m.green;return <span style={{fontFamily:F,fontSize:10,fontWeight:500,padding:"3px 8px",borderRadius:3,color:s.c,background:s.bg,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap"}}>{children}</span>}

/* ═══ APP FRAME ═══ */
function AppFrame({children,title="Greenfield Properties",badges=["QBO"],active="Home",iv,delay=200}){
  const pages=["Home","Porter AI","Transactions","Schedules","Monthly Close","Reports","Trial Balance"];
  return <div style={{maxWidth:920,margin:"0 auto",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.white,boxShadow:"0 1px 3px rgba(0,0,0,.04),0 8px 40px rgba(0,0,0,.06)",opacity:iv?1:0,transform:iv?"scale(1)":"scale(.97)",transition:`all .8s cubic-bezier(.16,1,.3,1) ${delay}ms`}}>
    <div style={{display:"flex",height:540}}>
      <div style={{width:192,background:C.sidebar,padding:"18px 0",flexShrink:0,display:"flex",flexDirection:"column"}}>
        {/* PLACEHOLDER LOGO */}
        <div style={{padding:"0 14px 18px",display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#2D6A4F,#1a4a35)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:14,fontWeight:700,fontFamily:F}}>P</span></div>
          <span style={{fontFamily:F,fontSize:15,fontWeight:600,color:"#fff"}}>Porter</span>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:1,padding:"0 7px"}}>
          {pages.map(p=><div key={p} style={{padding:"7px 10px",borderRadius:5,background:p===active?"rgba(255,255,255,.1)":"transparent"}}><span style={{fontFamily:F,fontSize:12,color:p===active?"#fff":"rgba(255,255,255,.45)",fontWeight:p===active?500:400}}>{p}</span></div>)}
        </div>
        <div style={{padding:"0 7px"}}><div style={{padding:"7px 10px",borderRadius:5}}><span style={{fontFamily:F,fontSize:12,color:"rgba(255,255,255,.45)"}}>Settings</span></div></div>
        <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,.06)",marginTop:6,display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:20,height:20,borderRadius:5,background:"rgba(255,255,255,.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:F,fontSize:9,color:"#fff",fontWeight:500}}>J</span></div>
          <span style={{fontFamily:F,fontSize:11,color:"rgba(255,255,255,.45)"}}>Jordan Mitchell</span>
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"9px 18px",borderBottom:`1px solid ${C.borderSub}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:F,fontSize:13,fontWeight:500,color:C.black}}>{title}</span>
          {badges.map(b=><span key={b} style={{fontFamily:F,fontSize:10,fontWeight:500,padding:"2px 8px",borderRadius:3,border:`1px solid ${C.border}`,color:C.text2}}>{b}</span>)}
        </div>
        <div style={{flex:1,overflow:"hidden"}}>{children}</div>
      </div>
    </div>
  </div>
}

/* ToolChip */
function ToolChip({name,i=0}){return <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:6,background:"#F5F5F5",border:`1px solid ${C.borderSub}`,animation:`slideR .4s ease ${i*150}ms both`}}><div style={{width:16,height:16,borderRadius:4,background:C.tint,border:`1px solid ${C.borderSub}`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:8}}>◻</span></div><span style={{fontFamily:FM,fontSize:10.5,color:C.text2}}>{name}</span><div style={{flex:1}}/><svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" style={{animation:`fadeIn .3s ease ${300+i*150}ms both`}}/></svg></div>}

/* UserBubble */
function UB({children}){return <div style={{alignSelf:"flex-end",maxWidth:"72%",animation:"fadeIn .4s ease both"}}><div style={{padding:"11px 15px",borderRadius:"12px 12px 4px 12px",background:C.black,color:C.white,fontFamily:F,fontSize:13,lineHeight:1.5}}>{children}</div></div>}

/* AI conclusion */
function AICta({children}){return <div style={{padding:"10px 14px",borderRadius:7,background:C.greenBg,fontFamily:F,fontSize:12,color:C.green,lineHeight:1.5,animation:"fadeIn .4s ease both"}}>{children}</div>}

/* ═══════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════ */
function Hero(){
  const[l,sL]=useState(false);
  useEffect(()=>{setTimeout(()=>sL(true),100)},[]);
  return <section style={{padding:"80px 32px 64px",background:C.white,textAlign:"center",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(${C.border} 1px,transparent 1px)`,backgroundSize:"32px 32px",opacity:.3}}/>
    <div style={{position:"relative",zIndex:1}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:100,border:`1px solid ${C.border}`,background:C.white,marginBottom:28,...an(l,100)}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s ease infinite"}}/>
        <span style={{fontFamily:F,fontSize:12,color:C.text2,fontWeight:500}}>Now onboarding new clients</span>
      </div>
      <h1 style={{fontFamily:FS,fontSize:58,fontWeight:400,color:C.black,lineHeight:1.08,maxWidth:740,margin:"0 auto 22px",...an(l,200)}}>
        Your AI financial copilot.<br/>Always on. Always ready.
      </h1>
      <p style={{fontFamily:F,fontSize:16,color:C.text2,lineHeight:1.65,maxWidth:580,margin:"0 auto 36px",...an(l,350)}}>
        Porter closes your books, explains your numbers, generates reports with real insights, and answers any question about your financial data — like having a senior financial analyst by your side, at a fraction of the cost.
      </p>
      <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16,...an(l,450)}}>
        <button style={{fontFamily:F,fontSize:13,fontWeight:500,padding:"14px 28px",borderRadius:8,background:C.black,color:C.white,border:"none",cursor:"pointer"}}>See Porter in Action</button>
        <button style={{fontFamily:F,fontSize:13,fontWeight:500,padding:"14px 28px",borderRadius:8,background:C.white,color:C.black,border:`1px solid ${C.border}`,cursor:"pointer"}}>Why Founders Switch</button>
      </div>
      <p style={{fontFamily:F,fontSize:12,color:C.muted,...an(l,500)}}>Works with QuickBooks Online. No migration required.</p>
      <div style={{display:"flex",gap:48,justifyContent:"center",maxWidth:600,margin:"40px auto 0",...an(l,600)}}>
        {[{v:"3–5 day",l:"monthly close"},{v:"90+",l:"AI tools via MCP"},{v:"24/7",l:"instant answers"}].map(s=><div key={s.l} style={{textAlign:"center"}}><div style={{fontFamily:FS,fontSize:30,color:C.black}}>{s.v}</div><div style={{fontFamily:F,fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".04em",marginTop:2}}>{s.l}</div></div>)}
      </div>
    </div>
  </section>
}

/* ═══════════════════════════════════════════════════
   "YOU'VE BEEN HERE" — RELATABLE PAIN POINTS
   ═══════════════════════════════════════════════════ */
function PainPoints(){
  const[ref,iv]=useInView(.08);
  const pains=[
    {frustration:"Why are my margins compressing?",old:"Hours in Excel. Pivot tables. Still not sure.",porter:"Porter tells you in minutes — which line items moved, by how much, and why it matters."},
    {frustration:"OpEx jumped 17% this month. Why?",old:"Comb through transactions, vendor by vendor, hoping to spot the spike.",porter:"Porter breaks it down by vendor and category instantly. You see exactly what drove the increase."},
    {frustration:"Reports that don't tell me anything.",old:"Static P&L and balance sheet. No context. No recommendations.",porter:"Porter generates reports that explain what changed, what's trending, and what to pay attention to — written for you, not your accountant."},
    {frustration:"Accounts that don't match my business.",old:"Your chart of accounts was set up by someone who doesn't know your business. The labels are meaningless.",porter:"Porter restructures your books so every account and label maps to how you actually think about your business."},
    {frustration:"I'd hire a financial analyst, but...",old:"$80–120K for a senior hire. Not the right time when you need another engineer or salesperson.",porter:"Porter gives you the analysis, the answers, and the insight — 24/7, at a fraction of the cost."},
    {frustration:"Books arrive 3 weeks late. Full of errors.",old:"Your outsourced bookkeeper closes late, miscategorizes transactions, and you still have to review everything.",porter:"Porter closes within 3–5 days with AI-powered categorization that actually learns your business."},
  ];

  return <section ref={ref} style={{padding:"100px 32px",background:C.white}}>
    <SHead label="Sound familiar?" title="You've been here before." sub="Every founder hits the same walls with their financial operations. Here's what changes with Porter." iv={iv}/>
    <div style={{maxWidth:920,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {pains.map((p,i)=><div key={i} style={{
        padding:"28px 28px",borderRadius:12,border:`1px solid ${C.border}`,background:C.white,
        opacity:iv?1:0,transform:iv?"translateY(0)":"translateY(16px)",
        transition:`all .5s cubic-bezier(.16,1,.3,1) ${200+i*100}ms`,
      }}>
        <div style={{fontFamily:FS,fontSize:20,fontStyle:"italic",color:C.black,marginBottom:12,lineHeight:1.3}}>"{p.frustration}"</div>
        <div style={{fontFamily:F,fontSize:12.5,color:C.muted,lineHeight:1.55,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.borderSub}`}}>
          <span style={{fontWeight:500,color:C.text2}}>Before: </span>{p.old}
        </div>
        <div style={{fontFamily:F,fontSize:12.5,color:C.green,lineHeight:1.55}}>
          <span style={{fontWeight:600}}>With Porter: </span>{p.porter}
        </div>
      </div>)}
    </div>
  </section>
}

/* ═══════════════════════════════════════════════════
   TWO PATHS — Managed + Self-Serve
   ═══════════════════════════════════════════════════ */
function TwoPaths(){
  const[ref,iv]=useInView(.1);
  const paths=[
    {tag:"MANAGED SERVICE",title:"We do it for you.",desc:"Porter's team, powered by AI, manages your books end-to-end. Monthly closes in days. Full transparency into every number.",features:["Books closed within 3–7 days","AI categorization reviewed by humans","Automated schedules and journal entries","Monthly reports that explain what changed","Log in anytime — every number is explainable"],cta:"Talk to Us",note:"For founders who want to stop thinking about bookkeeping."},
    {tag:"SELF-SERVE PLATFORM",title:"AI tools. Your control.",desc:"Connect Porter to Claude, Cursor, or any AI client via MCP. Categorize, close, reconcile, and ask your books anything — from a single conversation.",features:["90+ AI tools via Model Context Protocol","Natural-language questions about financials","Categorize and post transactions with AI","Build and maintain schedules automatically","Generate reports and insights on demand"],cta:"Try Porter",note:"For operators and finance-savvy founders who want superpowers."},
  ];
  return <section ref={ref} style={{padding:"100px 32px",background:C.bg}}>
    <SHead label="Two ways to work" title="Choose how you want your books done." sub="Whether you want a team managing everything or AI-powered tools to move faster on your own — Porter meets you where you are." iv={iv}/>
    <div style={{maxWidth:920,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      {paths.map((p,i)=><div key={p.tag} style={{padding:"32px 28px",borderRadius:12,background:C.white,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",...an(iv,200+i*200)}}>
        <div style={{fontFamily:F,fontSize:10,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>{p.tag}</div>
        <h3 style={{fontFamily:FS,fontSize:26,fontWeight:400,color:C.black,marginBottom:10}}>{p.title}</h3>
        <p style={{fontFamily:F,fontSize:13.5,color:C.text2,lineHeight:1.55,marginBottom:20}}>{p.desc}</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24,flex:1}}>
          {p.features.map(f=><div key={f} style={{display:"flex",gap:9,alignItems:"flex-start"}}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{flexShrink:0,marginTop:1}}><path d="M3 8L6.5 11.5L13 4.5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span style={{fontFamily:F,fontSize:13,color:C.black,lineHeight:1.45}}>{f}</span></div>)}
        </div>
        <button style={{fontFamily:F,fontSize:13,fontWeight:500,padding:"12px 24px",borderRadius:8,cursor:"pointer",width:"100%",background:i===0?C.black:C.white,color:i===0?C.white:C.black,border:i===0?"none":`1px solid ${C.border}`}}>{p.cta}</button>
        <p style={{fontFamily:F,fontSize:11,color:C.muted,marginTop:10,textAlign:"center",fontStyle:"italic"}}>{p.note}</p>
      </div>)}
    </div>
  </section>
}

/* ═══════════════════════════════════════════════════
   MCP DEMO 1: Close Status + Agentic Tasks
   ═══════════════════════════════════════════════════ */
function MCPClose(){
  const[ref,iv]=useInView(.12);
  const[step,setStep]=useState(0);
  useEffect(()=>{if(!iv)return;const t=[setTimeout(()=>setStep(1),400),setTimeout(()=>setStep(2),1200),setTimeout(()=>setStep(3),3800),setTimeout(()=>setStep(4),5600)];return()=>t.forEach(clearTimeout)},[iv]);

  const tasks=[
    {name:"Categorize bank transactions",status:"Complete",done:true,ai:true},
    {name:"Categorize credit card transactions",status:"Complete",done:true,ai:true},
    {name:"Review & approve pending transactions",status:"Not Started",done:false,ai:false},
    {name:"Post revenue recognition entries",status:"Not Started",done:false,ai:true},
    {name:"Run bank reconciliation",status:"Not Started",done:false,ai:true},
    {name:"Generate financial report",status:"Not Started",done:false,ai:true},
  ];

  return <section ref={ref} style={{padding:"100px 32px",background:C.white}}>
    <SHead label="AI-Powered Close" title="Ask where you stand. Porter does the rest." sub="Porter doesn't just report status — it identifies what's outstanding, tells you what it can handle, and executes." iv={iv}/>
    <AppFrame title="Greenfield Properties" active="Porter AI" iv={iv}>
      <div style={{padding:"16px 20px",height:"100%",overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
        {step>=1&&<UB>Where are we with Greenfield's February close? What's left?</UB>}
        {step>=2&&<div style={{display:"flex",flexDirection:"column",gap:4}}>{["get_close_summary","list_close_tasks"].map((t,i)=><ToolChip key={t} name={t} i={i}/>)}</div>}
        {step>=2&&<div style={{fontFamily:F,fontSize:13,color:C.black,lineHeight:1.6,animation:"fadeIn .4s ease .2s both"}}>
          <strong>February 2026:</strong> 13 of 91 tasks complete (14%).<br/><br/>
          Phase 1 — Data Collection: <strong>Done</strong> (4 complete, 1 skipped)<br/>
          Phase 2 — Transactions: <strong>In progress</strong> (4/8)
        </div>}
        {step>=3&&<div style={{animation:"scaleIn .5s cubic-bezier(.16,1,.3,1) both"}}>
          <div style={{fontFamily:F,fontSize:12,fontWeight:500,color:C.black,marginBottom:10}}>Outstanding tasks:</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {tasks.map((t,i)=><div key={t.name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:7,border:`1px solid ${C.borderSub}`,background:C.white,animation:`slideR .35s ease ${i*70}ms both`}}>
              <div style={{width:16,height:16,borderRadius:3,flexShrink:0,background:t.done?C.green:"transparent",border:t.done?"none":`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.done&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}</div>
              <span style={{fontFamily:F,fontSize:11.5,color:t.done?C.muted:C.black,textDecoration:t.done?"line-through":"none",flex:1}}>{t.name}</span>
              <Badge v={t.done?"complete":t.status==="Not Started"?"notstarted":"progress"}>{t.status}</Badge>
              {t.ai&&!t.done&&<span style={{fontFamily:F,fontSize:9,fontWeight:500,padding:"2px 6px",borderRadius:3,background:C.greenBg,color:C.green,whiteSpace:"nowrap"}}>Porter can do this</span>}
            </div>)}
          </div>
        </div>}
        {step>=4&&<AICta>I can handle 4 of the 6 outstanding tasks right now. Want me to start with revenue recognition entries?</AICta>}
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   MCP DEMO 2: Categorize + Post
   ═══════════════════════════════════════════════════ */
function MCPCategorize(){
  const[ref,iv]=useInView(.12);
  const[step,setStep]=useState(0);
  useEffect(()=>{if(!iv)return;const t=[setTimeout(()=>setStep(1),400),setTimeout(()=>setStep(2),1000),setTimeout(()=>setStep(3),2200),setTimeout(()=>setStep(4),3800),setTimeout(()=>setStep(5),5200)];return()=>t.forEach(clearTimeout)},[iv]);

  const txns=[
    {desc:"AWS Monthly",amt:"-$2,847.32",acct:"Cloud Infrastructure",rule:"Rule: AWS*"},
    {desc:"Gusto Payroll",amt:"-$34,521.00",acct:"Salaries & Wages",rule:"Rule: Gusto*"},
    {desc:"Stripe Deposit",amt:"$12,450.00",acct:"Revenue",rule:"Rule: Stripe*"},
    {desc:"WeWork Office",amt:"-$4,200.00",acct:"Rent Expense",rule:"Rule: WeWork*"},
    {desc:"Unknown Transfer",amt:"$8,100.00",acct:"—",rule:"No rule matched"},
  ];

  return <section ref={ref} style={{padding:"100px 32px",background:C.bg}}>
    <SHead label="Smart Categorization" title="Categorize, review, and post — in one conversation." sub="Porter applies your rules, flags what it can't match, and posts approved transactions to QuickBooks." iv={iv}/>
    <AppFrame title="Greenfield Properties" active="Porter AI" iv={iv}>
      <div style={{padding:"16px 20px",height:"100%",overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
        {step>=1&&<UB>Categorize the 5 uncategorized bank transactions for February and post the ones you're confident about.</UB>}
        {step>=2&&<div style={{display:"flex",flexDirection:"column",gap:4}}>{["list_bank_transactions","list_rules","bulk_categorize_bank_transactions"].map((t,i)=><ToolChip key={t} name={t} i={i}/>)}</div>}
        {step>=3&&<><div style={{fontFamily:F,fontSize:13,color:C.black,lineHeight:1.6,animation:"fadeIn .4s ease both"}}>Matched <strong>4 of 5</strong> transactions using your bank feed rules:</div>
          <div style={{borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden",animation:"scaleIn .5s ease both"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 100px 140px 120px",padding:"7px 14px",background:C.tint,borderBottom:`1px solid ${C.borderSub}`}}>
              {["DESCRIPTION","AMOUNT","GL ACCOUNT","MATCH"].map(h=><span key={h} style={{fontFamily:F,fontSize:9.5,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em"}}>{h}</span>)}
            </div>
            {txns.map((t,i)=><div key={t.desc} style={{display:"grid",gridTemplateColumns:"1fr 100px 140px 120px",padding:"9px 14px",borderBottom:i<4?`1px solid ${C.borderSub}`:"none",background:t.acct==="—"?"rgba(146,64,14,.04)":"transparent",animation:`slideR .35s ease ${i*60}ms both`}}>
              <span style={{fontFamily:F,fontSize:11,color:C.black}}>{t.desc}</span>
              <span style={{fontFamily:FM,fontSize:11,color:t.amt.startsWith("-")?C.black:C.green}}>{t.amt}</span>
              <span style={{fontFamily:F,fontSize:11,color:t.acct==="—"?C.amber:C.black}}>{t.acct}</span>
              <span style={{fontFamily:F,fontSize:10,color:t.rule.includes("No")?C.amber:C.muted}}>{t.rule}</span>
            </div>)}
          </div></>}
        {step>=4&&<div style={{display:"flex",flexDirection:"column",gap:4,animation:"fadeIn .4s ease both"}}><ToolChip name="approve_bank_transaction × 4" i={0}/></div>}
        {step>=5&&<AICta>Done — 4 transactions categorized and approved. The $8,100 transfer needs your input. Could be a customer payment or inter-account transfer. How should I categorize it?</AICta>}
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   MCP DEMO 3: Reconciliation
   ═══════════════════════════════════════════════════ */
function MCPRecon(){
  const[ref,iv]=useInView(.12);
  const[step,setStep]=useState(0);
  useEffect(()=>{if(!iv)return;const t=[setTimeout(()=>setStep(1),400),setTimeout(()=>setStep(2),1000),setTimeout(()=>setStep(3),2400),setTimeout(()=>setStep(4),4200)];return()=>t.forEach(clearTimeout)},[iv]);

  return <section ref={ref} style={{padding:"100px 32px",background:C.white}}>
    <SHead label="Reconciliation" title="Find the discrepancy. Fix it. Move on." sub="Porter compares bank to QBO, surfaces variances, traces them to specific transactions, and offers to fix them." iv={iv}/>
    <AppFrame title="Greenfield Properties" active="Porter AI" iv={iv}>
      <div style={{padding:"16px 20px",height:"100%",overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
        {step>=1&&<UB>Run the bank reconciliation for Chase checking. Flag any discrepancies.</UB>}
        {step>=2&&<div style={{display:"flex",flexDirection:"column",gap:4}}>{["get_trial_balance","compare_to_qbo","list_bank_transactions"].map((t,i)=><ToolChip key={t} name={t} i={i}/>)}</div>}
        {step>=3&&<div style={{animation:"fadeIn .4s ease both"}}>
          <div style={{fontFamily:F,fontSize:13,color:C.black,lineHeight:1.6,marginBottom:12}}>Found <strong>1 variance</strong> on Chase checking (1000-00):</div>
          <div style={{borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"7px 14px",background:C.tint,borderBottom:`1px solid ${C.borderSub}`}}>
              {["","BANK BALANCE","QBO BALANCE"].map(h=><span key={h||"x"} style={{fontFamily:F,fontSize:9.5,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em",textAlign:h?"right":"left"}}>{h}</span>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"10px 14px",borderBottom:`1px solid ${C.borderSub}`}}>
              <span style={{fontFamily:F,fontSize:11,color:C.black}}>Chase Checking (1000-00)</span>
              <span style={{fontFamily:FM,fontSize:11,color:C.black,textAlign:"right"}}>$142,847.33</span>
              <span style={{fontFamily:FM,fontSize:11,color:C.black,textAlign:"right"}}>$141,597.33</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"10px 14px",background:"rgba(220,38,38,.03)"}}>
              <span style={{fontFamily:F,fontSize:11,fontWeight:600,color:C.black}}>Variance</span><span/>
              <span style={{fontFamily:FM,fontSize:11,color:C.red,fontWeight:600,textAlign:"right"}}>$1,250.00</span>
            </div>
          </div>
          <div style={{fontFamily:F,fontSize:13,color:C.black,lineHeight:1.6,marginTop:12}}>Traced to a <strong>$1,250.00 deposit on 02/24</strong> in the bank feed that hasn't been posted to QBO. Description: "Wire — Summit Partners." Looks like a customer payment that wasn't recorded.</div>
        </div>}
        {step>=4&&<AICta>Want me to match this to an open Summit Partners invoice and post it? That would clear the variance.</AICta>}
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   PORTER AI CHAT (Screenshot 1 — AR query)
   ═══════════════════════════════════════════════════ */
function PorterAIScreen(){
  const[ref,iv]=useInView(.12);
  const[step,setStep]=useState(0);
  useEffect(()=>{if(!iv)return;const t=[setTimeout(()=>setStep(1),400),setTimeout(()=>setStep(2),1200),setTimeout(()=>setStep(3),4000)];return()=>t.forEach(clearTimeout)},[iv]);

  const invoices=[
    {inv:"2041",rem:"$954.75",due:"Nov 27, 2025",days:"103"},
    {inv:"2058",rem:"$629.10",due:"Nov 28, 2025",days:"102"},
    {inv:"2063",rem:"$477.50",due:"Nov 29, 2025",days:"101"},
    {inv:"2055",rem:"$414.72",due:"Nov 26, 2025",days:"104"},
    {inv:"2037",rem:"$375.00",due:"Nov 27, 2025",days:"103"},
  ];

  return <section ref={ref} style={{padding:"100px 32px",background:C.bg}}>
    <SHead label="Ask Anything" title="Your books answer back." sub="Porter queries your real financial data in real-time. AR aging, vendor spend, cash position — any question, grounded in your actual numbers." iv={iv}/>
    <AppFrame title="Apex Home Services" active="Porter AI" iv={iv}>
      <div style={{padding:"16px 20px",height:"100%",overflowY:"auto",display:"flex",flexDirection:"column",gap:14}}>
        {step>=1&&<div style={{display:"flex",flexDirection:"column",gap:4}}>{["get_ar_balance_report","submit_feedback"].map((t,i)=><ToolChip key={t} name={t} i={i}/>)}</div>}
        {step>=2&&<div style={{fontFamily:F,fontSize:13.5,color:C.black,lineHeight:1.65,animation:"fadeIn .5s ease both"}}>
          Yes — as of <strong>Mar 10, 2026</strong> you have <strong>$4,588.52</strong> in outstanding A/R, and it's <strong>all 90+ days past due</strong>.<br/><br/>Here are the <strong>largest open invoices</strong>:
        </div>}
        {step>=3&&<><div style={{borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden",animation:"scaleIn .5s ease both"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:"7px 14px",background:C.tint,borderBottom:`1px solid ${C.borderSub}`}}>
            {["INVOICE","REMAINING","DUE DATE","DAYS PAST DUE"].map(h=><span key={h} style={{fontFamily:F,fontSize:9.5,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em"}}>{h}</span>)}
          </div>
          {invoices.map((inv,i)=><div key={inv.inv} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:"9px 14px",borderBottom:i<4?`1px solid ${C.borderSub}`:"none",animation:`slideR .35s ease ${i*70}ms both`}}>
            <span style={{fontFamily:F,fontSize:11,color:C.black,textAlign:"center"}}>{inv.inv}</span>
            <span style={{fontFamily:FM,fontSize:11,color:C.black,fontWeight:500}}>{inv.rem}</span>
            <span style={{fontFamily:F,fontSize:11,color:C.text2}}>{inv.due}</span>
            <span style={{fontFamily:FM,fontSize:11,color:C.red,textAlign:"right"}}>{inv.days}</span>
          </div>)}
        </div>
        <p style={{fontFamily:F,fontSize:13.5,color:C.black,lineHeight:1.65,animation:"fadeIn .5s ease .3s both"}}>I can pull the full list (<strong>17</strong> open invoices) and help you prioritize follow-ups or decide what to write off.</p></>}
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   DASHBOARD (Screenshot 5)
   ═══════════════════════════════════════════════════ */
function Dashboard(){
  const[ref,iv]=useInView(.12);
  const[a,sA]=useState(false);
  useEffect(()=>{if(iv)setTimeout(()=>sA(true),400)},[iv]);
  const ms=["Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb"];
  const rv=[35,80,55,30,20,25,40,65,90,85,95,100],ex=[20,30,25,20,15,18,22,25,30,28,32,35];
  const ar=[{l:"CURRENT",v:"$215k",p:48,c:C.green},{l:"1–30",v:"$99k",p:22,c:C.black},{l:"31–60",v:"$47k",p:10,c:"#6B7280"},{l:"61–90",v:"$59k",p:13,c:C.amber},{l:"90+",v:"$29k",p:7,c:C.red}];

  return <section ref={ref} style={{padding:"100px 32px",background:C.white}}>
    <SHead label="Dashboard" title="Know where you stand. Always." sub="Revenue, expenses, AR aging, and AI-powered alerts — all in one view. Log in anytime." iv={iv}/>
    <AppFrame title="Greenfield Properties" active="Home" iv={iv}>
      <div style={{padding:16,height:"100%",overflowY:"auto"}}>
        <div style={{padding:16,borderRadius:8,border:`1px solid ${C.borderSub}`,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontFamily:F,fontSize:12.5,fontWeight:500,color:C.black}}>Revenue vs Expenses (LTM)</span>
            <div style={{display:"flex",gap:12}}><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:7,height:7,borderRadius:2,background:C.green}}/><span style={{fontFamily:F,fontSize:10,color:C.muted}}>Revenue</span></div><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:7,height:7,borderRadius:2,background:"#D4D4D4"}}/><span style={{fontFamily:F,fontSize:10,color:C.muted}}>Expenses</span></div></div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:150,paddingBottom:20,borderBottom:`1px solid ${C.borderSub}`}}>
            {ms.map((m,i)=><div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{display:"flex",gap:2,alignItems:"flex-end",height:130}}><div style={{width:13,borderRadius:"2px 2px 0 0",background:C.green,height:a?`${(rv[i]/100)*130}px`:"0",transition:`height .7s cubic-bezier(.16,1,.3,1) ${200+i*70}ms`}}/><div style={{width:13,borderRadius:"2px 2px 0 0",background:"#E5E5E5",height:a?`${(ex[i]/100)*130}px`:"0",transition:`height .7s cubic-bezier(.16,1,.3,1) ${280+i*70}ms`}}/></div><span style={{fontFamily:F,fontSize:9,color:C.muted,marginTop:5}}>{m}</span></div>)}
          </div>
          <div style={{display:"flex",gap:16,marginTop:10,justifyContent:"center",flexWrap:"wrap"}}>
            {[{l:"Revenue",v:"$2.0M"},{l:"COGS",v:"$228k"},{l:"Gross Profit",v:"$1.8M"},{l:"OpEx",v:"$11.0M"},{l:"Net Income",v:"$-7.8M",c:C.red}].map(s=><span key={s.l} style={{fontFamily:F,fontSize:10}}><span style={{color:C.muted}}>{s.l} </span><span style={{fontWeight:600,color:s.c||C.black}}>{s.v}</span></span>)}
          </div>
        </div>
        <div>
          <div style={{fontFamily:F,fontSize:10,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Accounts Receivable</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:10}}><span style={{fontFamily:FS,fontSize:26,color:C.black}}>$448,781</span><span style={{fontFamily:F,fontSize:12,color:C.muted}}>outstanding</span><div style={{flex:1}}/><span style={{fontFamily:F,fontSize:11,color:C.red}}>$87,739 past 60 days</span></div>
          <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:10}}>{ar.map((b,i)=><div key={b.l} style={{width:a?`${b.p}%`:"0%",background:b.c,height:"100%",transition:`width .8s cubic-bezier(.16,1,.3,1) ${400+i*120}ms`}}/>)}</div>
          <div style={{display:"flex"}}>{ar.map(b=><div key={b.l} style={{flex:b.p,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:3,marginBottom:2}}><div style={{width:5,height:5,borderRadius:"50%",background:b.c}}/><span style={{fontFamily:F,fontSize:9,color:C.muted}}>{b.l}</span></div><span style={{fontFamily:FM,fontSize:11,fontWeight:500,color:C.black}}>{b.v}</span></div>)}</div>
        </div>
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   TRANSACTIONS (Screenshot 2)
   ═══════════════════════════════════════════════════ */
function Transactions(){
  const[ref,iv]=useInView(.12);
  const[step,setStep]=useState(0);
  useEffect(()=>{if(!iv)return;const t=[0,1,2,3,4,5,6].map(i=>setTimeout(()=>setStep(i+1),300+i*300));return()=>t.forEach(clearTimeout)},[iv]);

  const tabs=[{name:"All",count:"12,847",active:true},{name:"Ready",count:"5"},{name:"Needs Review",count:"2"},{name:"Approved",count:"38"},{name:"Posted",count:"12,794"}];
  const rows=[
    {date:"02/27/2026",desc:"ACH Deposit — Billing Cle...",amt:"$644.01",type:"Deposit",acct:"Clearing Account",sVar:"ready",status:"Ready"},
    {date:"02/27/2026",desc:"ACH via Bill.com — vendor...",amt:"$1,000.00",type:"Deposit",acct:"Accounts Receivable",sVar:"posted",status:"Posted"},
    {date:"02/27/2026",desc:"Wire Transfer — Client Pa...",amt:"$22,000.00",type:"Deposit",acct:"Accounts Receivable",sVar:"posted",status:"Posted"},
    {date:"02/27/2026",desc:"Utility Payment — Electric...",amt:"-$767.37",type:"Withdrawal",acct:"Utilities Expense",sVar:"approved",status:"Approved"},
    {date:"02/27/2026",desc:"Wire from Storage Co — n...",amt:"$22,000.00",type:"Deposit",acct:"Accounts Receivable",sVar:"posted",status:"Posted"},
    {date:"02/27/2026",desc:"Interest Payment — Chec...",amt:"$0.01",type:"Deposit",acct:"Bank Interest Income",sVar:"approved",status:"Approved"},
    {date:"02/27/2026",desc:"Payroll Deduction — Ben...",amt:"-$630.86",type:"Withdrawal",acct:"Benefits Expense",sVar:"posted",status:"Posted"},
  ];

  return <section ref={ref} style={{padding:"100px 32px",background:C.bg}}>
    <SHead label="Transactions" title="Every transaction, categorized." sub="Bank and credit card transactions flow in. Porter categorizes, flags what needs review, and handles the rest." iv={iv}/>
    <AppFrame title="Greenfield Properties" active="Transactions" iv={iv}>
      <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",gap:16,padding:"10px 16px",borderBottom:`1px solid ${C.borderSub}`}}>
          {["Bank","Credit Cards","Invoices","Bills","Payments"].map((t,i)=><span key={t} style={{fontFamily:F,fontSize:12,color:i===0?C.black:C.muted,fontWeight:i===0?500:400,paddingBottom:3,borderBottom:i===0?`2px solid ${C.black}`:"none"}}>{t}</span>)}
        </div>
        <div style={{display:"flex",gap:4,padding:"8px 16px",borderBottom:`1px solid ${C.borderSub}`,overflowX:"auto"}}>
          {tabs.map((t,i)=><div key={t.name} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:5,background:t.active?C.black:"transparent",opacity:step>=1?1:0,transition:`opacity .3s ease ${i*50}ms`}}><span style={{fontFamily:F,fontSize:11,color:t.active?C.white:C.text2,fontWeight:t.active?500:400}}>{t.name}</span><span style={{fontFamily:FM,fontSize:9.5,color:t.active?"rgba(255,255,255,.6)":C.muted}}>{t.count}</span></div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"72px 1fr 90px 130px 64px",padding:"0 10px",height:28,alignItems:"center",background:C.tint,borderBottom:`1px solid ${C.borderSub}`}}>
          {["DATE","DESCRIPTION","AMOUNT","ACCOUNT","STATUS"].map(h=><span key={h} style={{fontFamily:F,fontSize:9.5,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em"}}>{h}</span>)}
        </div>
        <div style={{flex:1,overflow:"hidden"}}>
          {rows.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"72px 1fr 90px 130px 64px",padding:"7px 10px",alignItems:"center",borderBottom:`1px solid ${C.borderSub}`,opacity:step>i?1:0,transform:step>i?"translateX(0)":"translateX(-10px)",transition:`all .4s cubic-bezier(.16,1,.3,1) ${i*50}ms`}}>
            <span style={{fontFamily:F,fontSize:10.5,color:C.text2}}>{r.date}</span>
            <span style={{fontFamily:F,fontSize:10.5,color:C.black,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.desc}</span>
            <span style={{fontFamily:FM,fontSize:10.5,color:r.amt.startsWith("-")?C.black:C.green,fontWeight:500}}>{r.amt}</span>
            <span style={{fontFamily:F,fontSize:10.5,color:C.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.acct}</span>
            <Badge v={r.sVar}>{r.status}</Badge>
          </div>)}
        </div>
        <div style={{padding:"6px 12px",borderTop:`1px solid ${C.borderSub}`,display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:F,fontSize:10,color:C.muted}}>Showing 1 to 100 of 12,847</span><span style={{fontFamily:F,fontSize:10,color:C.muted}}>Page 1 of 129</span></div>
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   MONTHLY CLOSE (Screenshot 4)
   ═══════════════════════════════════════════════════ */
function MonthlyClose(){
  const[ref,iv]=useInView(.12);
  const[step,setStep]=useState(0);
  const prog=useCounter(13,step>=1,1000);
  useEffect(()=>{if(!iv)return;const t=[setTimeout(()=>setStep(1),400),setTimeout(()=>setStep(2),1000),setTimeout(()=>setStep(3),1800)];return()=>t.forEach(clearTimeout)},[iv]);

  const tasks=[
    {name:"Upload bank transactions",cat:"Upload",status:"In Progress",done:false},
    {name:"Upload credit card transactions",cat:"Upload",status:"In Progress",done:false},
    {name:"Import vendor bills",cat:"Upload",status:"Skipped",done:false},
    {name:"Import customer payments",cat:"Upload",status:"Complete",done:true},
    {name:"Categorize bank transactions",cat:"Review",status:"Complete",done:true},
    {name:"Categorize credit card transactions",cat:"Review",status:"Complete",done:true},
    {name:"Review & approve pending",cat:"Review",status:"Not Started",done:false},
  ];

  return <section ref={ref} style={{padding:"100px 32px",background:C.white}}>
    <SHead label="Monthly Close" title="Close in days, not weeks." sub="A structured checklist guides every close. Track progress, see what's done, and never miss a step." iv={iv}/>
    <AppFrame title="Greenfield Properties" active="Monthly Close" iv={iv}>
      <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:FS,fontSize:26,color:C.black}}>February 2026</span>
          <Badge v="amber">In Progress</Badge>
          <div style={{flex:1}}/><div style={{padding:"7px 14px",borderRadius:6,background:C.black}}><span style={{fontFamily:F,fontSize:11,color:C.white,fontWeight:500}}>Submit for Review</span></div>
        </div>
        <div style={{padding:"0 20px 12px"}}><div style={{height:5,borderRadius:3,background:C.borderSub,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:C.green,width:`${(prog/91)*100}%`,transition:"width 1s cubic-bezier(.16,1,.3,1)"}}/></div><span style={{fontFamily:F,fontSize:10.5,color:C.muted,marginTop:3,display:"block"}}>{prog}/91 complete</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"0 20px 12px"}}>
          {[{l:"CHECKLIST",v:"9/73 tasks",s:"All on track",sc:C.green},{l:"JOURNAL ENTRIES",v:"35 entries",s:"$1,878,119 total debits"},{l:"RECONCILIATIONS",v:"4/18 accounts",s:"2 variances",sc:C.amber}].map((c,i)=><div key={c.l} style={{padding:"12px 14px",borderRadius:7,background:C.tint,border:`1px solid ${C.borderSub}`,opacity:step>=1?1:0,transition:`opacity .4s ease ${200+i*120}ms`}}>
            <div style={{fontFamily:F,fontSize:9.5,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em",marginBottom:5}}>{c.l}</div>
            <div style={{fontFamily:F,fontSize:13,fontWeight:600,color:C.black}}>{c.v}</div>
            <div style={{fontFamily:F,fontSize:10.5,color:c.sc||C.muted,marginTop:2}}>{c.s}</div>
          </div>)}
        </div>
        <div style={{flex:1,overflow:"hidden",padding:"0 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 0",borderBottom:`1px solid ${C.borderSub}`,opacity:step>=2?1:0,transition:"opacity .4s ease .4s"}}>
            <span style={{fontSize:9,color:C.muted}}>›</span>
            <div style={{width:20,height:20,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:F,fontSize:10.5,color:C.white,fontWeight:600}}>1</span></div>
            <span style={{fontFamily:F,fontSize:12.5,fontWeight:500,color:C.black}}>Pre-Close</span>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke={C.green} strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div style={{flex:1}}/><span style={{fontFamily:F,fontSize:10.5,color:C.muted}}>5/5</span>
          </div>
          <div style={{opacity:step>=2?1:0,transition:"opacity .4s ease .6s"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 0"}}><span style={{fontSize:9,color:C.muted}}>⌄</span><div style={{width:20,height:20,borderRadius:"50%",background:C.greenBg,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:F,fontSize:10.5,color:C.green,fontWeight:600}}>2</span></div><span style={{fontFamily:F,fontSize:12.5,fontWeight:500,color:C.black}}>Transactions</span><div style={{flex:1}}/><span style={{fontFamily:F,fontSize:10.5,color:C.muted}}>4/8</span></div>
            {tasks.map((t,i)=><div key={t.name} style={{display:"grid",gridTemplateColumns:"22px 1fr 52px 60px",padding:"6px 0 6px 28px",alignItems:"center",borderBottom:`1px solid ${C.borderSub}`,opacity:step>=3?1:0,transition:`opacity .3s ease ${i*70}ms`}}>
              <div style={{width:16,height:16,borderRadius:3,background:t.done?C.green:"transparent",border:t.done?"none":`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.done&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}</div>
              <span style={{fontFamily:F,fontSize:10.5,color:C.black}}>{t.name}</span>
              <Badge v="gray">{t.cat}</Badge>
              <Badge v={t.status==="Complete"?"posted":t.status==="In Progress"?"ready":"gray"}>{t.status}</Badge>
            </div>)}
          </div>
        </div>
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   SCHEDULES (Screenshot 3)
   ═══════════════════════════════════════════════════ */
function Schedules(){
  const[ref,iv]=useInView(.12);
  const[step,setStep]=useState(0);
  useEffect(()=>{if(!iv)return;const t=[setTimeout(()=>setStep(1),400),setTimeout(()=>setStep(2),900)];return()=>t.forEach(clearTimeout)},[iv]);

  const custs=[
    {n:"Baxter Industrial",v:["$1,528.77","$1,528.77","$1,479.45","$1,528.77","$1,528.77","$1,380.82"]},
    {n:"Cornerstone Group",v:["$2,038.36","$2,038.36","$1,972.60","$2,038.36","$2,038.36","$1,841.10"]},
    {n:"Northfield Capital",v:["–","–","$19.73","$591.78","$611.51","$552.33"]},
    {n:"Summit Partners",v:["$3,397.26","$3,397.26","$3,287.68","–","–","–"]},
    {n:"Ridgemont Solutions",v:["$21.86","$677.75","$655.89","–","–","–"]},
    {n:"Clearwater Advisors",v:["–","–","–","$49.32","$509.59","$460.27"]},
  ];
  const months=["JUL 2025","AUG 2025","SEP 2025","OCT 2025","NOV 2025","DEC 2025"];

  return <section ref={ref} style={{padding:"100px 32px",background:C.bg}}>
    <SHead label="Schedules" title="The stuff your bookkeeper keeps forgetting." sub="Revenue recognition, prepaids, fixed assets, depreciation — all tracked, calculated, and posted to QBO automatically." iv={iv}/>
    <AppFrame title="Greenfield Properties" active="Schedules" iv={iv}>
      <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",gap:14,padding:"10px 16px",borderBottom:`1px solid ${C.borderSub}`}}>{["Source Data","Activity"].map((t,i)=><span key={t} style={{fontFamily:F,fontSize:12,color:i===1?C.black:C.muted,fontWeight:i===1?500:400,paddingBottom:3,borderBottom:i===1?`2px solid ${C.black}`:"none"}}>{t}</span>)}</div>
        <div style={{display:"flex",gap:3,padding:"8px 16px",borderBottom:`1px solid ${C.borderSub}`,overflowX:"auto"}}>
          {["Rev Rec","Deferred Revenue","Unbilled","Prepaid Expenses","Fixed Assets"].map((t,i)=><span key={t} style={{fontFamily:F,fontSize:11,padding:"4px 10px",borderRadius:5,whiteSpace:"nowrap",background:i===0?C.black:"transparent",color:i===0?C.white:C.text2,opacity:step>=1?1:0,transition:`opacity .3s ease ${i*50}ms`}}>{t}</span>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"140px repeat(6,1fr)",padding:"0 10px",height:28,alignItems:"center",background:C.tint,borderBottom:`1px solid ${C.borderSub}`}}>
          <span style={{fontFamily:F,fontSize:9.5,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em"}}>CUSTOMER</span>
          {months.map(m=><span key={m} style={{fontFamily:F,fontSize:9,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".03em",textAlign:"right"}}>{m}</span>)}
        </div>
        <div style={{flex:1,overflow:"hidden"}}>
          {custs.map((c,i)=><div key={c.n} style={{display:"grid",gridTemplateColumns:"140px repeat(6,1fr)",padding:"7px 10px",borderBottom:`1px solid ${C.borderSub}`,opacity:step>=2?1:0,transition:`opacity .35s ease ${i*60}ms`}}>
            <span style={{fontFamily:F,fontSize:10.5,color:C.black}}>{c.n}</span>
            {c.v.map((v,j)=><span key={j} style={{fontFamily:FM,fontSize:10.5,color:v==="–"?C.muted:C.black,textAlign:"right"}}>{v}</span>)}
          </div>)}
          {step>=2&&<div style={{borderTop:`2px solid ${C.border}`,animation:"fadeIn .5s ease .4s both"}}>
            {[{l:"Beginning Balance",v:["857,236","$1,041,616","$1,241,553","$1,440,334","$1,660,789","$1,892,631"]},{l:"Net Activity",v:["184,380","$199,937","$198,781","$220,455","$231,842","$252,777"]},{l:"Ending Balance",v:["$1,041,616","$1,241,553","$1,440,334","$1,660,789","$1,892,631","$2,145,408"]}].map((r,ri)=><div key={r.l} style={{display:"grid",gridTemplateColumns:"140px repeat(6,1fr)",padding:"7px 10px",borderBottom:ri<2?`1px solid ${C.borderSub}`:"none",background:ri===2?C.tint:"transparent"}}>
              <span style={{fontFamily:F,fontSize:10.5,fontWeight:600,color:C.black}}>{r.l}</span>
              {r.v.map((v,j)=><span key={j} style={{fontFamily:FM,fontSize:10.5,color:C.black,fontWeight:500,textAlign:"right"}}>{v}</span>)}
            </div>)}
          </div>}
        </div>
      </div>
    </AppFrame>
  </section>
}

/* ═══════════════════════════════════════════════════
   COMPARISON
   ═══════════════════════════════════════════════════ */
function Comparison(){
  const[ref,iv]=useInView(.1);
  const rows=[{l:"Monthly close time",p:"3–7 days",b:"3–4 weeks",d:"Varies"},{l:"Transaction accuracy",p:"AI + business context",b:"Generic rules",d:"Manual"},{l:"Schedules & depreciation",p:"Automated",b:"Frequently missed",d:"—"},{l:"AI you can ask anything",p:"✓",b:"—",d:"—"},{l:"Responsiveness",p:"Instant",b:"Days to weeks",d:"N/A"},{l:"Reports that explain",p:"Every month",b:"Static financials",d:"—"},{l:"Founder can log in & understand",p:"✓",b:"—",d:"Built for accountants"}];
  return <section ref={ref} style={{padding:"100px 32px",background:C.white}}>
    <SHead label="Why Porter" title="Not another bookkeeping service." sub="Porter combines managed service reliability with AI that understands your business." iv={iv}/>
    <div style={{maxWidth:740,margin:"0 auto",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.white,...an(iv,200)}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 110px 130px 90px",padding:"10px 18px",background:C.tint,borderBottom:`1px solid ${C.borderSub}`}}><span/>{["Porter","Bookkeeper","DIY / QBO"].map(h=><span key={h} style={{fontFamily:F,fontSize:10,fontWeight:500,color:C.muted,textTransform:"uppercase",letterSpacing:".04em",textAlign:"center"}}>{h}</span>)}</div>
      {rows.map((r,i)=><div key={r.l} style={{display:"grid",gridTemplateColumns:"1fr 110px 130px 90px",padding:"11px 18px",borderBottom:`1px solid ${C.borderSub}`,opacity:iv?1:0,transition:`opacity .4s ease ${300+i*50}ms`}}>
        <span style={{fontFamily:F,fontSize:12,color:C.black}}>{r.l}</span>
        <span style={{fontFamily:F,fontSize:12,fontWeight:600,color:C.green,textAlign:"center"}}>{r.p}</span>
        <span style={{fontFamily:F,fontSize:11.5,color:C.muted,textAlign:"center"}}>{r.b}</span>
        <span style={{fontFamily:F,fontSize:11.5,color:C.muted,textAlign:"center"}}>{r.d}</span>
      </div>)}
    </div>
  </section>
}

/* ═══════════════════════════════════════════════════
   CTA
   ═══════════════════════════════════════════════════ */
function CTA(){
  const[ref,iv]=useInView(.2);
  return <section ref={ref} style={{padding:"100px 32px",background:C.bg,textAlign:"center"}}>
    <div style={an(iv)}>
      <h2 style={{fontFamily:FS,fontSize:42,color:C.black,marginBottom:14,fontWeight:400}}>Your books should work as hard as you do.</h2>
      <p style={{fontFamily:F,fontSize:15,color:C.text2,maxWidth:480,margin:"0 auto 36px",lineHeight:1.6}}>We'll show you how Porter replaces the back-and-forth with books you can actually trust.</p>
      <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:12}}>
        <button style={{fontFamily:F,fontSize:13,fontWeight:500,padding:"14px 32px",borderRadius:8,background:C.black,color:C.white,border:"none",cursor:"pointer"}}>Talk to Us</button>
        <button style={{fontFamily:F,fontSize:13,fontWeight:500,padding:"14px 32px",borderRadius:8,background:C.white,color:C.black,border:`1px solid ${C.border}`,cursor:"pointer"}}>Try the Platform</button>
      </div>
      <p style={{fontFamily:F,fontSize:12,color:C.muted}}>No credit card required. 15-minute call to understand your business.</p>
    </div>
  </section>
}

/* ═══════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════ */
export default function PorterPage(){
  return <div style={{fontFamily:F,background:C.white,minHeight:"100vh"}}>
    <style>{css}</style>
    {/* NAV — PLACEHOLDER LOGO */}
    <nav style={{position:"sticky",top:0,zIndex:50,padding:"12px 32px",background:"rgba(255,255,255,.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.borderSub}`,display:"flex",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#2D6A4F,#1a4a35)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:15,fontWeight:700,fontFamily:F}}>P</span></div>
        <span style={{fontFamily:F,fontSize:16,fontWeight:600,color:C.black}}>Porter</span>
      </div>
      <div style={{flex:1}}/>
      <div style={{display:"flex",gap:28,alignItems:"center"}}>
        {["How It Works","Features","Talk to Us"].map(i=><span key={i} style={{fontFamily:F,fontSize:13,color:C.text2,cursor:"pointer"}}>{i}</span>)}
        <button style={{fontFamily:F,fontSize:12,fontWeight:500,padding:"8px 18px",borderRadius:6,background:C.black,color:C.white,border:"none",cursor:"pointer"}}>Get Started</button>
      </div>
    </nav>

    <Hero/>
    <PainPoints/>
    <TwoPaths/>
    <MCPClose/>
    <MCPCategorize/>
    <MCPRecon/>
    <PorterAIScreen/>
    <Dashboard/>
    <Transactions/>
    <MonthlyClose/>
    <Schedules/>
    <Comparison/>
    <CTA/>

    <footer style={{padding:"24px 32px",borderTop:`1px solid ${C.borderSub}`,display:"flex",justifyContent:"space-between"}}>
      <span style={{fontFamily:F,fontSize:12,color:C.muted}}>© 2026 Porter Operations LLC</span>
      <div style={{display:"flex",gap:20}}>{["Terms","Privacy","Contact"].map(l=><span key={l} style={{fontFamily:F,fontSize:12,color:C.muted,cursor:"pointer"}}>{l}</span>)}</div>
    </footer>
  </div>
}
