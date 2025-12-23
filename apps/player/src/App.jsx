import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import PairingView from './views/PairingView';
import PlayerView from './views/PlayerView';

export default function App() {
  const [status, setStatus] = useState('loading'); // loading, pairing, active
  const [pairingCode, setPairingCode] = useState(null);
  const [screenData, setScreenData] = useState(null);
  const [debugError, setDebugError] = useState(null);

  // UUID Polyfill for older TVs
  const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    // Global Error Handler for TV Debugging
    const errorHandler = (message, source, lineno, colno, error) => {
      setDebugError(`${message} at ${lineno}:${colno}`);
    }
    window.onerror = errorHandler;
    window.addEventListener('unhandledrejection', (event) => {
      setDebugError(`Unhandled Rejection: ${event.reason}`);
    });

    const enterFullScreen = () => {
      const doc = window.document;
      const docEl = doc.documentElement;

      const requestFullScreen =
        docEl.requestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.webkitRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFullScreen) {
        requestFullScreen.call(docEl).catch((err) => {
          console.log("Fullscreen blocked (normal behavior if no gesture):", err);
        });
      }
    };

    // Attempt immediately (works on some TVs/Kiosks)
    enterFullScreen();

    // Attempt on any user interaction (required by most browsers)
    const handleInteraction = () => {
      enterFullScreen();
      // Optional: Remove listeners after success if desired, but keeping them ensures
      // we go back to FS if the user escaped.
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    initializePlayer();

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.onerror = null;
    };
  }, []);

  const initializePlayer = async () => {
    try {
      // 1. Get or Generate Device ID
      let deviceId = localStorage.getItem('lumends_device_id');
      if (!deviceId) {
        deviceId = uuidv4(); // Use polyfill
        localStorage.setItem('lumends_device_id', deviceId);
      }

      console.log('Device ID:', deviceId);

      // 2. Check existence in DB
      const { data: screen, error } = await supabase
        .from('screens')
        .select('*')
        .eq('id', deviceId)
        .single();

      if (screen) {
        handleScreenState(screen);
      } else {
        await registerNewScreen(deviceId);
      }

      // 3. Subscribe to changes
      const subscription = supabase
        .channel('screen_updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'screens', filter: `id=eq.${deviceId}` },
          (payload) => {
            console.log('Screen updated:', payload);
            handleScreenState(payload.new);
          }
        )
        .subscribe();

      // Note: We can't easily return cleanup from async function inside useEffect
      // so we rely on the mount cycle.
    } catch (e) {
      console.error("Init Error:", e);
      setDebugError(e.toString());
    }
  };

  const generatePairingCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const registerNewScreen = async (deviceId) => {
    const code = generatePairingCode();
    setPairingCode(code);

    const { data, error } = await supabase
      .from('screens')
      .upsert({
        id: deviceId,
        name: `TV-${code}`,
        status: 'pending',
        pairing_code: code,
        last_ping: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering screen:', error);
      setDebugError('Registration Failed: ' + error.message);
    } else {
      setStatus('pairing');
    }
  };

  const handleScreenState = (screen) => {
    setScreenData(screen);
    if (screen.status === 'active' || screen.status === 'online') {
      setStatus('active');
    } else {
      setPairingCode(screen.pairing_code);
      setStatus('pairing');
    }
  };

  if (status === 'loading') {
    return (
      <div className="bg-black text-white h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-2xl font-bold">LumenDS Player</div>
        <div className="animate-pulse">Carregando Sistema...</div>
        <div className="text-xs text-gray-500 font-mono mt-8">v1.2.0 (Build: {new Date().toISOString().split('T')[0]}) - BOOT</div>
      </div>
    );
  }

  if (status === 'pairing') {
    return <PairingView code={pairingCode} />;
  }

  return <PlayerView screenId={screenData?.id} />;
}
