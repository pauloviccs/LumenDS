import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Server, Trash2, X } from 'lucide-react';

const BlurReveal = ({ children, label }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <div
            onClick={() => setIsRevealed(!isRevealed)}
            className="group relative cursor-pointer select-none transition-all"
            title="Clique para revelar"
        >
            <div className={`transition-all duration-500 ease-out ${isRevealed ? 'blur-0 opacity-100' : 'blur-md opacity-50 grayscale'}`}>
                {children}
            </div>
            {!isRevealed && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 group-hover:text-white/60 transition-colors bg-black/40 px-2 py-1 rounded backdrop-blur-md border border-white/5">
                        {label || 'Oculto'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default function SettingsView() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    return (
        <div className="space-y-8 animate-fade-in-up">
// Header removed

            <div className="grid gap-6">
                {/* Account Section */}
                <div className="liquid-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 font-display border-b border-white/5 pb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <User size={20} className="text-blue-400" />
                        </div>
                        Conta
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-lumen-textMuted text-xs uppercase tracking-wider mb-2 font-medium">Logado como</p>
                            <div className="inline-block bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                                <BlurReveal label="Email">
                                    <p className="text-white font-mono text-sm">
                                        {user?.email || 'Carregando...'}
                                    </p>
                                </BlurReveal>
                            </div>
                        </div>

                        <div>
                            <p className="text-lumen-textMuted text-xs uppercase tracking-wider mb-2 font-medium">ID do Usuário</p>
                            <div className="inline-block bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                                <BlurReveal label="UID">
                                    <p className="text-white/60 font-mono text-xs">
                                        UID: {user?.id}
                                    </p>
                                </BlurReveal>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Section */}
                <div className="liquid-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 font-display border-b border-white/5 pb-4">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Server size={20} className="text-green-400" />
                        </div>
                        Sistema
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="glass-panel p-5 rounded-xl hover:bg-white/5 transition-colors">
                            <p className="text-lumen-textMuted text-xs uppercase tracking-wider mb-2 font-medium">Versão do App</p>
                            <p className="text-white font-medium font-display text-lg">v1.0.0 <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/50 align-middle ml-1">Beta</span></p>
                        </div>
                        <div className="glass-panel p-5 rounded-xl hover:bg-white/5 transition-colors">
                            <p className="text-lumen-textMuted text-xs uppercase tracking-wider mb-2 font-medium">Servidor de Assets</p>
                            <BlurReveal label="Status">
                                <p className="text-green-400 font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#4ade80]" />
                                    Online (Porta 11222)
                                </p>
                            </BlurReveal>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
