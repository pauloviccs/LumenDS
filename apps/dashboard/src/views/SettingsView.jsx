import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Server, Shield, HardDrive } from 'lucide-react';

export default function SettingsView() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white">Ajustes</h2>

            <div className="grid gap-6">
                {/* Account Section */}
                <div className="bg-[#222] border border-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <User size={20} className="text-blue-400" />
                        Conta
                    </h3>
                    <div className="space-y-2">
                        <p className="text-white/60 text-sm">Logado como:</p>
                        <p className="text-white font-mono bg-white/5 px-3 py-2 rounded-lg inline-block">
                            {user?.email || 'Carregando...'}
                        </p>
                        <p className="text-xs text-white/20 mt-2">UID: {user?.id}</p>
                    </div>
                </div>

                {/* System Section */}
                <div className="bg-[#222] border border-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Server size={20} className="text-green-400" />
                        Sistema
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Versão do App</p>
                            <p className="text-white font-medium">v1.0.0 (Beta)</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Servidor de Assets</p>
                            <p className="text-green-400 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Online (Porta 11222)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
