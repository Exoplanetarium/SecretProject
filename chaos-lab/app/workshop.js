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
 <header><button className="brand" id="home" aria-label="Home"><Icon name="wire"/>little circuit<span>.</span></button><div id="progress" hidden aria-label="Level progress"/><div id="account-controls">{isLoaded&&(isSignedIn?<><span className="account-save-label">Account saves</span><UserButton/></>:<><SignInButton mode="modal"><button className="account-button">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="account-button account-primary">Create account</button></SignUpButton></>)}</div><button id="library-button" className="library-pill" title="The Library" aria-label="The Library"><Icon name="library"/><span id="library-count">7 / 26</span></button><button id="master-button" className="master-pill" title="Master Challenges" aria-label="Master Challenges"><Icon name="master"/><span id="master-count">0 / 7</span></button><button id="mainframe-button" className="mainframe-pill" title="Observatory Mainframe" aria-label="Observatory Mainframe"><Icon name="observatory"/><span id="mainframe-count">0 / 11</span></button><button id="guide-button" className="tool" title="Levels" aria-label="Levels"><Icon name="levels"/></button></header>
 <main id="game" hidden><aside className="sidebar"><span id="unit-name" className="unit-name">Tutorial</span><div className="level-heading"><span id="level-number">01 / 05</span><span id="goal-icon" aria-label="Incomplete">○</span></div><h1 id="level-title">Complete circuit</h1>
 <span id="completion-status" className="sr-only" role="status"/>
 <section id="win" className="completion-card" aria-labelledby="completion-title" hidden>
 <h2 id="completion-title"><Icon name="check"/>Complete</h2>
 <p id="win-learning"/>
 <button id="next" className="paper-button">Next <Icon name="next"/></button>
 </section>
 <p id="activity-goal" hidden/><div id="goal-picture" className="goal-picture"/><div id="challenge-target" hidden/><div id="challenge-readings" hidden/><div id="instrument" hidden/><div id="activity-controls" hidden/><div id="sandbox-slots" className="sandbox-slots" hidden><div className="slot-head"><input id="slot-name" type="text" maxLength={32} aria-label="Build name" placeholder="Build name"/><button id="slot-clear" type="button" className="small-button" title="Clear this slot">Clear</button></div><div id="slot-tabs" className="slot-tabs" role="tablist" aria-label="Save slots"/></div><div id="sandbox-categories" className="sandbox-categories" hidden role="tablist" aria-label="Part categories"/><div id="parts"/><div className="sidebar-bottom"><Tool id="hint-button" name="bulb" label="Hint"/><Tool id="replay-lesson" name="help" label="Replay instructions"/><Tool id="save" name="save" label="Save build"/></div><div id="hint" hidden/></aside>
 <section className="workspace"><div className="workspace-head"><span id="board-status" className="board-indicator" title="Power off" role="status" aria-label="Power off"><i/><i/><i/></span><div id="layer-switcher" className="layer-switcher" hidden role="group" aria-label="Wiring layer"><button type="button" className="layer-btn active" data-layer="0" aria-pressed="true" title="Layer 1 (Key 1)">L1</button><button type="button" className="layer-btn" data-layer="1" aria-pressed="false" title="Layer 2 (Key 2)">L2</button><button type="button" className="layer-btn" data-layer="2" aria-pressed="false" title="Layer 3 (Key 3)">L3</button></div><div><Tool id="undo" name="undo" label="Undo (Ctrl+Z)"/><Tool id="pan" name="hand" label="Pan view"/><Tool id="camera" name="camera" label="Reset view"/><Tool id="reset" name="reset" label="Clear board"/></div></div><div id="viewport" role="application" aria-label="Circuit workbench. Drag parts to move them. Click two terminals to connect a wire. Right drag to pan, or use the pan button."/><div id="empty-prompt" aria-hidden="true"><Icon name="hand"/><span className="drop-outline"/></div><div id="hover-probe" className="hover-probe" hidden aria-live="polite"/><div id="selection" hidden><span id="selection-name"/><button id="selection-help" className="part-help-inline" title="How to use this part" aria-label="How to use this part">?</button><label id="battery-volt-label" hidden>Voltage <input id="battery-volt" type="range" min="3" max="12" step="1" defaultValue="6"/><output id="battery-volt-output">6 V</output></label><label id="part-layer-label" hidden>Layer <select id="part-layer"><option value="0">L1</option><option value="1">L2</option><option value="2">L3</option></select></label><label id="value-label" hidden><span className="sr-only">Resistance</span><input id="resistor-value" type="range" min="10" max="100" step="10" defaultValue="30"/><output id="resistor-output">30 Ω</output></label><label id="pot-label" hidden>Dial <input id="pot-value" type="range" min="0" max="100" step="5" defaultValue="50"/><output id="pot-output">50%</output></label><label id="photo-lux-label" hidden>Light <input id="photo-lux" type="range" min="0" max="100" step="5" defaultValue="100"/><output id="photo-lux-output">Bright</output></label><label id="servo-dial-label" hidden>Angle <input id="servo-dial" type="range" min="-45" max="45" step="5" defaultValue="0"/><output id="servo-dial-output">0°</output></label><label id="fuse-rating-label" hidden>Rating <select id="fuse-rating"><option value="0.2">0.20 A</option><option value="0.35">0.35 A</option><option value="0.5">0.50 A</option></select></label><button id="replace-fuse" className="paper-button" hidden>Replace fuse</button><label id="gate-mode-label" hidden>Mode <select id="gate-mode">{['NAND','NOR','AND','OR','XOR','NOT'].map(m=><option key={m} value={m}>{m}</option>)}</select></label><label id="clock-rate-label" hidden>Rate <select id="clock-rate"><option value="0.5">0.5 Hz</option><option value="1">1 Hz</option><option value="2">2 Hz</option><option value="4">4 Hz</option></select></label><button id="press-button" className="paper-button" hidden>Press button</button><button id="reset-latch" className="paper-button" hidden>Clear bit</button><button id="toggle" className="tool" hidden title="Toggle switch" aria-label="Toggle switch"><Icon name="switch"/></button><button id="reverse" className="paper-button" hidden>Reverse polarity</button><Tool id="rotate" name="rotate" label="Rotate part"/><Tool id="delete" name="trash" label="Remove part"/></div>
 <section id="teaching" className="teaching-card" aria-label="Lesson instructions" hidden><div className="teaching-meta"><span id="teaching-count"/><button id="skip-teaching" className="small-button">Skip tips</button></div><h2 id="teaching-title"/><p id="teaching-text" aria-live="polite"/><div className="teaching-bottom"><span id="teaching-action"/><button id="teaching-next" className="paper-button">Continue <Icon name="next"/></button></div></section>
 <div className="workbench-bottom"><span id="pliers-hint" className="wire-indicator" role="status" hidden>Choose a wire to remove</span><span id="wire-hint" className="wire-indicator" hidden><Icon name="wire"/><span className="terminal-dot"/><span className="wire-dash"/><span className="terminal-dot pulse"/><button id="cancel-wire" className="tool" aria-label="Cancel wire" title="Cancel wire"><Icon name="close"/></button></span><div className="control-bar"><button id="power" className="primary" title="Turn on power" aria-label="Turn on power" aria-pressed="false"><Icon name="power"/></button><button id="pliers" className="tool" aria-label="Pliers" title="Pliers · Remove a wire" aria-pressed="false" disabled><Icon name="pliers"/></button><span id="current">0.00 A</span></div></div><div id="toast" role="status" aria-live="polite"/></section></main>
 <section id="landing"><div id="hero-scene" aria-label="Wooden circuit board with battery, switch and glowing lamp"/><div className="landing-controls"><button id="landing-freebuild" className="secondary"><Icon name="sandbox"/>Free build</button><button id="play" className="primary large"><Icon name="play"/>Play</button><button id="landing-master" className="secondary"><Icon name="master"/>Master Challenges</button></div></section>
 <footer><button id="help-button" className="tool" aria-label="Controls" title="Controls"><Icon name="help"/></button><button id="short-mode" className="footer-toggle" role="switch" aria-checked="false" title="Short-circuit mode: Smoke (non-destructive). Switch to Explosive." aria-label="Explosive short circuits"><Icon name="spark"/><span className="footer-toggle-label">Shorts: Smoke</span><span className="toggle-track" aria-hidden="true"><span className="toggle-knob"/></span></button><button id="sound" className="tool" aria-pressed="false" title="Enable sound" aria-label="Enable sound"><Icon name="mute"/></button></footer>
 <dialog id="guide"><button className="close-dialog tool" aria-label="Close levels"><Icon name="close"/></button><h2>Levels</h2><nav id="unit-links" aria-label="Jump to chapter"/><div id="guide-banner" className="guide-banner"/><div id="levels"/></dialog>
 <dialog id="mainframe" aria-label="Observatory Mainframe"><button className="close-dialog tool" aria-label="Close mainframe"><Icon name="close"/></button><h2>Observatory Mainframe</h2><p id="mainframe-summary" className="mainframe-summary"/><div id="mainframe-blueprint"/><div id="mainframe-sections"/><div id="toolbelt-section"/><div className="mainframe-actions"><button id="mainframe-first-light" className="primary" hidden>Replay First Light</button><button id="mainframe-open-library" className="secondary">The Library</button><button id="open-freebuild" className="primary">Open Free build</button></div></dialog>
 <dialog id="library" aria-label="The Library"><button className="close-dialog tool" aria-label="Close library"><Icon name="close"/></button><h2>The Library</h2><p id="library-summary" className="library-summary"/><div id="library-filters" className="library-filters"/><div id="library-shelves"/><div className="mainframe-actions"><button id="library-freebuild" className="primary">Open Free build</button></div></dialog>
 <dialog id="master" aria-label="Master Challenges"><button className="close-dialog tool" aria-label="Close Master Challenges"><Icon name="close"/></button><h2>Master Challenges</h2><p id="master-summary" className="library-summary"/><div id="master-list" className="master-list"/></dialog>
 <dialog id="component-guide" className="part-guide-dialog" aria-labelledby="guide-title"><button className="close-dialog tool" aria-label="Close component guide"><Icon name="close"/></button><div className="guide-head"><div><h2 id="guide-title"/><div id="guide-spec" className="guide-spec"/></div><span id="guide-status" className="guide-status"/></div><div className="guide-visuals"><figure className="guide-figure"><figcaption>On a diagram</figcaption><div id="guide-diagram" className="guide-diagram-box"/></figure><figure className="guide-figure"><figcaption>On the workbench</figcaption><div id="guide-illustration" className="guide-illustration-box"/></figure></div><div className="guide-body"><section className="guide-section"><h3>What it does</h3><p id="guide-summary"/><ul id="guide-usage" className="guide-usage"/></section><section className="guide-section"><h3>Terminals</h3><div id="guide-terminals" className="guide-terminals"/></section></div><div className="guide-actions"><button id="guide-unlock-action" className="primary" hidden/><button id="guide-close-action" className="secondary">Close</button></div></dialog>
 <dialog id="help"><button className="close-dialog tool" aria-label="Close help"><Icon name="close"/></button><h2>Controls</h2><div className="help-steps"><div><Icon name="hand"/><span>Drag</span></div><div><Icon name="wire"/><span>Connect</span></div><div><Icon name="power"/><span>Power</span></div></div><div className="shortcuts"><span>Right drag or hand button: pan</span><span>Scroll or pinch: zoom</span><span>Two fingers: pan and zoom</span><span>Pliers: tap a wire, or use ← → and Enter</span><span><kbd>Esc</kbd> Put down tool or cancel wire</span><span><kbd>Ctrl+Z</kbd> Undo</span><span><kbd>Ctrl+Y</kbd> Redo</span><span><kbd>R</kbd> Rotate</span><span><kbd>Del</kbd> Remove</span><span><kbd>Space</kbd> Power</span></div><details><summary>Model</summary><p>6 V battery · 20 Ω lamps · 10 to 100 Ω resistors. The 0.10 F capacitor module includes 12 Ω. The LED module includes a 2 V LED and 20 Ω. The motor uses a fixed 30 Ω load and reaches 180 rpm at 6 V. Coil relays use a 120 Ω coil (3 V pickup) switching C between NC and NO. Logic gates, memory cells, clocks, and the 4-bit readout switch at 3 V with 6 V outputs. Power off pauses the simulation.</p></details><button className="primary close-help">Close</button></dialog>
 <div id="first-light" className="first-light" hidden role="dialog" aria-modal="true" aria-label="Observatory First Light">
  <div id="first-light-stage" className="first-light-stage"/>
  <div className="fl-vignette" aria-hidden="true"/>
  <div id="fl-flash" className="fl-flash" aria-hidden="true"/>
  <div className="fl-bar top">
   <div className="fl-progress"><div id="fl-progress-fill" className="fl-progress-fill"/></div>
   <div className="fl-top-actions">
    <button id="fl-sound" className="fl-icon" type="button" title="Toggle sound" aria-label="Toggle sound"><Icon name="sound"/></button>
   </div>
  </div>
  <div className="fl-bar bottom">
   <div className="fl-copy">
    <span id="fl-eyebrow" className="fl-eyebrow">ACT I · CORE BOOT</span>
    <h2 id="fl-title" className="fl-title">MAINFRAME ONLINE</h2>
    <p id="fl-sub" className="fl-sub">Binary clock locked · Sequence 0 → 1 → 2 → 3 verified</p>
   </div>
   <div className="fl-actions">
    <button id="fl-replay" className="fl-btn" type="button" hidden>Replay</button>
    <button id="fl-freebuild" className="fl-btn fl-primary" type="button" hidden>Open Free build</button>
    <button id="fl-exit" className="fl-btn" type="button">Skip</button>
   </div>
  </div>
 </div>
 {showLoader&&<LoadingScreen stage={loadStage} progress={loadProgress} exiting={started}/>}
 </div>;
}
