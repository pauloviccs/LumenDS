import 'core-js/stable';
import React, { useState, useEffect } from 'react';

// Polyfill for crypto.randomUUID (Chrome 79 / WebOS 5.0 missing feature)
if (!crypto.randomUUID) {
  console.log('[Polyfill] Applying crypto.randomUUID polyfill');
  crypto.randomUUID = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  };
}

import ReactDOM from 'react-dom/client';
import { supabase } from './lib/supabase';
import { generatePairingCode, getDeviceId } from './lib/device';
import PairingView from './views/PairingView';
import PlayerView from './views/PlayerView';
import PlaylistCacheManager from './PlaylistCacheManager';
import './index.css';

function App() {
  const [status, setStatus] = useState('loading'); // loading, pairing, playing
  const [playlist, setPlaylist] = useState(null);
  const [pairingCode, setPairingCode] = useState('');

  useEffect(() => {
    initPlayer();
  }, []);

  const initPlayer = async () => {
    const deviceId = getDeviceId();

    // Check if device is registered in Supabase
    // Note: We need a way to link 'deviceId' to 'pairingCode' in DB?
    // Or we just rely on pairing code.
    // Actually, `screens` table has `pairing_code`.
    // We should check if there is a screen with THIS pairing code formatted?

    // Better logic:
    // 1. Generate/Get Local Code.
    // 2. Poll Supabase: "Is there a screen with pairing_code == MY_CODE?"

    let code = localStorage.getItem('pairing_code');
    if (!code) {
      code = generatePairingCode();
      localStorage.setItem('pairing_code', code);
    }
    setPairingCode(code);

    checkRegistration(code);

    // Polling for registration (Simple for v1)
    const interval = setInterval(() => checkRegistration(code), 5000);
    return () => clearInterval(interval);
  };

  const checkRegistration = async (code) => {
    try {
      // Step 1: Get Screen (No JOIN to avoid 406/Schema issues)
      const { data: screenData, error: screenError } = await supabase
        .from('screens')
        .select('*')
        .eq('pairing_code', code)
        .maybeSingle();

      if (screenError) console.error('Supabase Error:', screenError);

      if (screenData && !screenError) {
        // Send Ping (Using RPC specific for anonymous players)
        const { error: pingError } = await supabase
          .rpc('ping_screen', { p_code: code });

        if (pingError) console.error("Ping Error:", pingError);



        // Step 2: Fetch Playlist if assigned
        if (screenData.current_playlist_id) {
          // Optimization: Only if changed or if we don't have it?
          // For "Zero Cost" realtime, we can just fetch every polling or subscribe.
          // Since we are polling every 5s anyway for ping:
          const { data: playlistData } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', screenData.current_playlist_id)
            .single();

          if (playlistData) {
            // Only update state if JSON stringified items changed (simple diff check)
            setPlaylist(prev => {
              const prevItems = JSON.stringify(prev?.items);
              const newItems = JSON.stringify(playlistData.items);
              if (prevItems !== newItems) {
                console.log("Playlist updated, reloading content...");
                return playlistData;
              }
              return prev; // No change
            });
            setStatus('playing');
          }
        }
      } else {
        setStatus('pairing');
      }
    } catch (e) {
      console.error(e);
      setStatus('pairing');
    }
  };

  if (status === 'pairing') {
    return <PairingView code={pairingCode} />;
  }

  if (status === 'playing') {
    return (
      <>
        <PlaylistCacheManager playlist={playlist} />
        <PlayerView playlist={playlist} />
      </>
    );
  }

  return <div className="bg-black h-screen w-full flex items-center justify-center text-white">Carregando...</div>;
}

// --------------------------------------------------------
// CRITICAL TV DEBUGGER
// Hijack console to show on screen (WebOS has no devtools)
// --------------------------------------------------------
const initDebugger = () => {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debug-console';
  debugDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 300px;
    height: 100vh;
    background: rgba(0,0,0,0.8);
    color: #0f0;
    font-family: monospace;
    font-size: 10px;
    padding: 10px;
    z-index: 9999;
    overflow-y: auto;
    pointer-events: none;
    white-space: pre-wrap;
    word-break: break-all;
  `;
  document.body.appendChild(debugDiv);

  const toggleBtn = document.createElement('div');
  toggleBtn.innerText = '🐞';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    z-index: 10000;
    user-select: none;
    backdrop-filter: blur(4px);
  `;
  toggleBtn.onclick = () => {
    if (debugDiv.style.display === 'none') {
      debugDiv.style.display = 'block';
      toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    } else {
      debugDiv.style.display = 'none';
      toggleBtn.style.background = 'rgba(255, 0, 0, 0.2)';
    }
  };
  document.body.appendChild(toggleBtn);

  const logToScreen = (type, args) => {
    const msg = args.map(a => {
      try {
        return typeof a === 'object' ? JSON.stringify(a) : String(a);
      } catch (e) {
        return '[Circular]';
      }
    }).join(' ');

    const line = document.createElement('div');
    line.style.borderBottom = '1px solid #333';
    line.style.color = type === 'error' ? '#f55' : (type === 'warn' ? '#fb0' : '#0f0');
    line.innerText = `[${type}] ${msg}`;
    debugDiv.appendChild(line);
    // Auto-scroll only if visible to avoid layout trashing if hidden (optional optimization)
    if (debugDiv.style.display !== 'none') {
      debugDiv.scrollTop = debugDiv.scrollHeight;
    }
  };

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => { originalLog(...args); logToScreen('log', args); };
  console.warn = (...args) => { originalWarn(...args); logToScreen('warn', args); };
  console.error = (...args) => { originalError(...args); logToScreen('error', args); };

  window.onerror = (msg, url, line, col, error) => {
    logToScreen('error', [`UNCATCHED: ${msg} @ ${line}:${col}`]);
  };

  window.onunhandledrejection = (event) => {
    logToScreen('error', [`UNHANDLED REJECTION: ${event.reason ? event.reason.toString() : event.reason}`]);
  };
};

initDebugger();
console.log("System Initializing...");
console.log("User Agent:", navigator.userAgent);
// --------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
