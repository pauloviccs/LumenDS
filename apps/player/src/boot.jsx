import 'core-js/stable';
import React, { useState, useEffect } from 'react';

// --- SERVICE WORKER KILLER (Fix for Samsung TV Cache) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      console.log('Force Unregistering Stale SW:', registration);
      registration.unregister();
    }
    // Also clear Cache Storage API
    caches.keys().then(function (names) {
      for (let name of names) {
        console.log('Deleting Cache:', name);
        caches.delete(name);
      }
    });
  }).catch(err => console.error("SW Unregister Fail:", err));
}
// --------------------------------------------------------

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

// 3. Auto-Update Logic on Re-Open
// When the app comes back from background (or is reopened), force a reload to get fresh assets.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log("App resumed. Checking for updates by reloading...");
    // Force reload to bypass potential stale cache in long-running TV instances
    window.location.reload();
  }
});

console.log("System Initializing...");
console.log("User Agent:", navigator.userAgent);
// --------------------------------------------------------
console.log("System Initializing...");
console.log("User Agent:", navigator.userAgent);
// --------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
