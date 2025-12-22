import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Github, Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginView() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [message, setMessage] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = mode === 'login'
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });

            if (error) throw error;
            if (mode === 'register') {
                setMessage({ type: 'success', text: 'Verifique seu email para confirmar o cadastro!' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLogin = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: 'http://localhost:5173' // For Electron, handling redirects needs deep linking or this localhost hack for dev
                }
            });
            if (error) throw error;
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        LumenDS
                    </h1>
                    <p className="text-white/40 mt-2">Digital Signage Control</p>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-white/20" size={20} />
                            <input
                                type="email"
                                placeholder="Email"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition-colors"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-white/20" size={20} />
                            <input
                                type="password"
                                placeholder="Senha"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition-colors"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="text-white/40 hover:text-white text-sm transition-colors"
                    >
                        {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
                    </button>
                </div>
            </div>
        </div>
    );
}
