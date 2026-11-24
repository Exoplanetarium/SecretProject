'use client';
import {useEffect,useState} from 'react';
import {SignInButton,SignUpButton,UserButton,useAuth} from '@clerk/nextjs';
import {icon} from '../src/visuals';
import LoadingScreen from './loading-screen';

let workshopModulePromise=null;
function loadWorkshopModule(){return (workshopModulePromise??=import('../src/main'));}
function hasSessionHint(){return typeof document!=='undefined'&&/(?:^|;\s*)__client_uat=[1-9]/.test(document.cookie);}

function Icon({name}){return <span className="svg-icon" dangerouslySetInnerHTML={{__html:icon(name)}}/>;}
function Tool({id,name,label}){return <button id={id} className="tool" title={label} aria-label={label}><Icon name={name}/></button>;}
export default function Workshop(){
 const {isLoaded,isSignedIn,userId}=useAuth();
 const [started,setStarted]=useState(false);
 const [showLoader,setShowLoader]=useState(true);
 const [loadStage,setLoadStage]=useState('Opening workbench…');
 const [loadProgress,setLoadProgress]=useState(18);
 const [clerkTimedOut,setClerkTimedOut]=useState(false);

 useEffect(()=>{
  void loadWorkshopModule();
  if(!document.getElementById('little-circuit-fonts')){
   const link=document.createElement('link');
   link.id='little-circuit-fonts';
   link.rel='stylesheet';
   link.href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap';
   document.head.append(link);
  }
 },[]);

 useEffect(()=>{
  if(isLoaded||!hasSessionHint())return;
  const timer=setTimeout(()=>setClerkTimedOut(true),3000);
  return ()=>clearTimeout(timer);
 },[isLoaded]);

 const authSettled=isLoaded||clerkTimedOut||!hasSessionHint();
 const effectiveUserId=isLoaded?(userId??null):null;

 useEffect(()=>{
  if(!authSettled){
   setLoadStage('Checking account…');
   setLoadProgress(30);
   return;
  }
  let cancelled=false,dispose;
  async function start(){
   let accountProgress=null,cloudReady=false,cloudError=false,workshopMod;
   if(effectiveUserId){
    setLoadStage('Syncing saved builds…');
    setLoadProgress(48);
    const [mod,progressResult]=await Promise.all([
     loadWorkshopModule(),
     fetch('/api/progress',{cache:'no-store',signal:AbortSignal.timeout(4000)})
      .then(async response=>{
       if(!response.ok)return {cloudError:true};
       return {accountProgress:(await response.json()).progress,cloudReady:true};
      })
      .catch(error=>{console.error('Could not load cloud progress.',error);return {cloudError:true};})
    ]);
    workshopMod=mod;
    ({accountProgress=null,cloudReady=false,cloudError=false}=progressResult);
   }else{
    setLoadStage('Opening workbench…');
    setLoadProgress(48);
    workshopMod=await loadWorkshopModule();
   }
   if(cancelled)return;
   setLoadStage('Setting up components…');
   setLoadProgress(82);
   try{
    dispose=workshopMod.initWorkshop({
     userId:effectiveUserId,
     accountProgress,
     cloudReady,
     cloudError,
     onReady:()=>{
      if(!cancelled){
       setLoadProgress(100);
       setStarted(true);
      }
     }
    });
   }catch(error){
    console.error('Could not initialize workshop.',error);
    if(!cancelled){
     setLoadProgress(100);
     setStarted(true);
    }
   }
  }
  setStarted(false);
  setShowLoader(true);
  void start();
  return ()=>{cancelled=true;dispose?.();};
 },[authSettled,effectiveUserId]);

 useEffect(()=>{
  if(!started)return;
  const timer=setTimeout(()=>setShowLoader(false),300);
  return ()=>clearTimeout(timer);
 },[started]);
 return <div id="workshop">
 <header><button className="brand" id="home" aria-label="Home"><Icon name="wire"/>little circuit<span>.</span></button><div id="progress" hidden aria-label="Level progress"/><div id="account-controls">{isLoaded&&(isSignedIn?<><span className="account-save-label">Account saves</span><UserButton/></>:<><SignInButton mode="modal"><button className="account-button">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="account-button account-primary">Create account</button></SignUpButton></>)}</div><button id="mainframe-button" className="mainframe-pill" title="Observatory Mainframe" aria-label="Observatory Mainframe"><Icon name="observatory"/><span id="mainframe-count">0 / 11</span></button><button id="guide-button" className="tool" title="Levels" aria-label="Levels"><Icon name="levels"/></button></header>
 <main id="game" hidden><aside className="sidebar"><span id="unit-name" className="unit-name">Unit 0</span><div className="level-heading"><span id="level-number">01 / 05</span><span id="goal-icon" aria-label="Incomplete">○</span></div><h1 id="level-title">Complete circuit</h1>
 <span id="completion-status" className="sr-only" role="status"/>
 <section id="win" className="completion-card" aria-labelledby="completion-title" hidden>
 <h2 id="completion-title"><Icon name="check"/>Complete</h2>
 <p id="win-learning"/>
 <button id="next" className="paper-button">Next <Icon name="next"/></button>
 </section>
 <p id="activity-goal" hidden/><div id="goal-picture" className="goal-picture"/><div id="challenge-target" hidden/><div id="challenge-readings" hidden/><div id="instrument" hidden/><div id="activity-controls" hidden/><div id="parts"/><div className="sidebar-bottom"><Tool id="hint-button" name="bulb" label="Hint"/><Tool id="replay-lesson" name="help" label="Replay instructions"/><Tool id="save" name="save" label="Save build"/></div><div id="hint" hidden/></aside>
 <section className="workspace"><div className="workspace-head"><span id="board-status" className="board-indicator" title="Power off" role="status" aria-label="Power off"><i/><i/><i/></span><div><Tool id="pan" name="hand" label="Pan view"/><Tool id="camera" name="camera" label="Reset view"/><Tool id="reset" name="reset" label="Clear board"/></div></div><div id="viewport" role="application" aria-label="Circuit workbench. Drag parts to move them. Click two terminals to connect a wire. Right drag to pan, or use the pan button."/><div id="empty-prompt" aria-hidden="true"><Icon name="hand"/><span className="drop-outline"/></div><div id="selection" hidden><span id="selection-name"/><label id="value-label" hidden><span className="sr-only">Resistance</span><input id="resistor-value" type="range" min="10" max="100" step="10" defaultValue="30"/><output id="resistor-output">30 Ω</output></label><label id="gate-mode-label" hidden>Mode <select id="gate-mode">{['NAND','NOR','AND','OR','XOR','NOT'].map(m=><option key={m} value={m}>{m}</option>)}</select></label><label id="clock-rate-label" hidden>Rate <select id="clock-rate"><option value="0.5">0.5 Hz</option><option value="1">1 Hz</option><option value="2">2 Hz</option><option value="4">4 Hz</option></select></label><button id="press-button" className="paper-button" hidden>Press button</button><button id="reset-latch" className="paper-button" hidden>Clear bit</button><button id="toggle" className="tool" hidden title="Toggle switch" aria-label="Toggle switch"><Icon name="switch"/></button><button id="reverse" className="paper-button" hidden>Reverse polarity</button><Tool id="delete" name="trash" label="Remove part"/></div>
 <section id="teaching" className="teaching-card" aria-label="Lesson instructions" hidden><div className="teaching-meta"><span id="teaching-count"/><button id="skip-teaching" className="small-button">Skip tips</button></div><h2 id="teaching-title"/><p id="teaching-text" aria-live="polite"/><div className="teaching-bottom"><span id="teaching-action"/><button id="teaching-next" className="paper-button">Continue <Icon name="next"/></button></div></section>
 <div className="workbench-bottom"><span id="pliers-hint" className="wire-indicator" role="status" hidden>Choose a wire to remove</span><span id="wire-hint" className="wire-indicator" hidden><Icon name="wire"/><span className="terminal-dot"/><span className="wire-dash"/><span className="terminal-dot pulse"/><button id="cancel-wire" className="tool" aria-label="Cancel wire" title="Cancel wire"><Icon name="close"/></button></span><div className="control-bar"><button id="power" className="primary" title="Turn on power" aria-label="Turn on power" aria-pressed="false"><Icon name="power"/></button><button id="pliers" className="tool" aria-label="Pliers" title="Pliers · Remove a wire" aria-pressed="false" disabled><Icon name="pliers"/></button><span id="current">0.00 A</span></div></div><div id="toast" role="status" aria-live="polite"/></section></main>
 <section id="landing"><div id="hero-scene" aria-label="Wooden circuit board with battery, switch and glowing lamp"/><div className="landing-controls"><button id="play" className="primary large"><Icon name="play"/>Play</button><button id="landing-mainframe" className="secondary"><Icon name="observatory"/>Mainframe</button><button id="landing-guide" className="secondary"><Icon name="levels"/>Levels</button></div></section>
 <footer><button id="help-button" className="tool" aria-label="Controls" title="Controls"><Icon name="help"/></button><button id="sound" className="tool" aria-pressed="false" title="Enable sound" aria-label="Enable sound"><Icon name="mute"/></button></footer>
 <dialog id="guide"><button className="close-dialog tool" aria-label="Close levels"><Icon name="close"/></button><h2>Levels</h2><nav id="unit-links" aria-label="Jump to unit"/><div id="levels"/></dialog>
 <dialog id="mainframe" aria-label="Observatory Mainframe"><button className="close-dialog tool" aria-label="Close mainframe"><Icon name="close"/></button><h2>Observatory Mainframe</h2><p id="mainframe-summary" className="mainframe-summary"/><div id="mainframe-blueprint"/><div id="mainframe-sections"/><div id="toolbelt-section"/><div className="mainframe-actions"><button id="open-freebuild" className="primary">Open Free build</button></div></dialog>
 <dialog id="help"><button className="close-dialog tool" aria-label="Close help"><Icon name="close"/></button><h2>Controls</h2><div className="help-steps"><div><Icon name="hand"/><span>Drag</span></div><div><Icon name="wire"/><span>Connect</span></div><div><Icon name="power"/><span>Power</span></div></div><div className="shortcuts"><span>Right drag or hand button: pan</span><span>Scroll or pinch: zoom</span><span>Two fingers: pan and zoom</span><span>Pliers: tap a wire, or use ← → and Enter</span><span><kbd>Esc</kbd> Put down tool or cancel wire</span><span><kbd>Del</kbd> Remove</span><span><kbd>Space</kbd> Power</span></div><details><summary>Model</summary><p>6 V battery · 20 Ω lamps · 10 to 100 Ω resistors. The 0.10 F capacitor module includes 12 Ω. The LED module includes a 2 V LED and 20 Ω. The motor uses a fixed 30 Ω load and reaches 180 rpm at 6 V. Coil relays use a 120 Ω coil (3 V pickup) switching C between NC and NO. Logic gates, memory cells, clocks, and the 4-bit readout switch at 3 V with 6 V outputs. Power off pauses the simulation.</p></details><button className="primary close-help">Close</button></dialog>
 {showLoader&&<LoadingScreen stage={loadStage} progress={loadProgress} exiting={started}/>}
 </div>;
}
