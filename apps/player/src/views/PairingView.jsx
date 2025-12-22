import React, { useState, useEffect } from 'react';
import { Loader2, Monitor } from 'lucide-react';

export default function PairingView({ code }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111] text-white p-8">
            <div className="max-w-md w-full text-center space-y-8 animate-fade-in-up">
                {/* Logo/Icon */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                        <Monitor size={40} className="text-blue-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-light tracking-tight">LumenDS Player</h1>
                    <p className="text-white/40">Para ativar esta tela, digite este código no Dashboard.</p>
                </div>

                {/* Code Display */}
                <div className="py-8">
                    <div className="text-7xl font-mono font-bold tracking-[0.2em] text-white drop-shadow-lg select-text">
                        {code}
                    </div>
                    <div className="mt-4 flex items-center justify-center space-x-2 text-white/20">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm uppercase tracking-wider font-medium">Aguardando Conexão...</span>
                    </div>
                </div>

                {/* Footer info */}
                <div className="absolute bottom-8 left-0 w-full text-center">
                    <p className="text-[10px] text-white/20 font-mono">ID: {localStorage.getItem('device_id')}</p>
                </div>
            </div>
        </div>
    );
}
