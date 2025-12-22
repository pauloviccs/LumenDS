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

    initializePlayer();
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
        .eq('id', deviceId) // Assuming we use UUID as ID. Or we use a hardware_id column?
        // Actually, for better security/flow, we should verify if 'id' matches.
        // But standard flow: 
        // - If row exists -> Check status.
        // - If row does NOT exist -> Create 'pending' row.
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

      return () => {
        subscription.unsubscribe();
      };
    };

    const generatePairingCode = () => {
      // Generate 6-char random code (A-Z, 0-9)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, 1, O, 0 for clarity
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const registerNewScreen = async (deviceId) => {
      const code = generatePairingCode();
      setPairingCode(code);

      // Insert into DB
      // Note: This requires RLS to allow INSERT for anonymous? Or we use a public RPC?
      // If strict RLS is on, this might fail without a public policy. 
      // Assuming 'screens' allows public insert for 'pending' status or we use a function.
      // For MVP/Demo: Let's assume we can insert.

      // We need to be careful. Ideally, we shouldn't allow random inserts. 
      // BUT for a pairing flow, usually the client creates a "Tentative" record.

      const { data, error } = await supabase
        .from('screens')
        .upsert({
          id: deviceId, // We force the UUID
          name: `TV-${code}`,
          status: 'pending',
          pairing_code: code,
          last_ping: new Date()
        })
        .select()
        .single();

      if (error) {
        console.error('Error registering screen:', error);
        // Fallback or retry
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
      return <div className="bg-black text-white h-screen flex items-center justify-center">Loading Player...</div>;
    }

    if (status === 'pairing') {
      return <PairingView code={pairingCode} />;
    }

    return <PlayerView screenId={screenData?.id} />;
  }
