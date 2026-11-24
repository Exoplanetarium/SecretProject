'use client';
import {useEffect, useState} from 'react';
import {icon} from '../src/visuals';
import {WORKSHOP_TIPS} from '../src/loading-tips';

export default function LoadingScreen({stage, progress, exiting}) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * WORKSHOP_TIPS.length));
  }, []);

  useEffect(() => {
    if (exiting) return;
    const timer = setInterval(() => {
      setTipIndex(current => (current + 1) % WORKSHOP_TIPS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [exiting]);

  const barWidth = `${Math.max(8, Math.min(100, progress))}%`;

  return (
    <div className={`workshop-loader${exiting ? ' exiting' : ''}`} role="status" aria-live="polite">
      <div className="loader-card">
        <div className="loader-brand">
          <span className="svg-icon" dangerouslySetInnerHTML={{__html: icon('wire')}} />
          <span>little circuit<strong>.</strong></span>
        </div>

        <svg className="loader-schematic" viewBox="0 0 240 104" aria-hidden="true">
          <circle className="loader-lamp-glow" cx="206" cy="52" r="14" />
          <path
            className="loader-loop"
            d="M34 41V22H96M138 22H206V38M206 66V84H148M88 84H34V51"
          />
          <path className="loader-switch" d="M96 22H138" />
          <circle cx="96" cy="22" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="138" cy="22" r="2.2" fill="currentColor" stroke="none" />
          <path d="M20 41H48M26 51H42" />
          <text x="45" y="34">+</text>
          <path d="M88 84l5-8 10 16 10-16 10 16 10-16 10 16 5-8" />
          <g className="loader-lamp">
            <circle cx="206" cy="52" r="14" />
            <path d="M197 43l18 18m-18 0l18-18" />
            <path d="M206 32v-4m0 48v-4m20-20h4m-10-14 3-3m0 31-3-3" />
          </g>
          <path className="loader-flow" d="M34 22H206V84H34Z" />
        </svg>

        <p className="loader-stage">{stage}</p>
        <div className="loader-bar" aria-hidden="true">
          <span style={{width: barWidth}} />
        </div>

        <div className="loader-tip">
          <div className="loader-tip-head">
            <span>Workbench tip</span>
            <span className="loader-tip-count">{tipIndex + 1} / {WORKSHOP_TIPS.length}</span>
            <button
              type="button"
              className="paper-button loader-next-tip"
              onClick={() => setTipIndex(current => (current + 1) % WORKSHOP_TIPS.length)}
            >
              Next tip
            </button>
          </div>
          <p className="loader-tip-text">{WORKSHOP_TIPS[tipIndex]}</p>
        </div>
      </div>
    </div>
  );
}
