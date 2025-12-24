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

        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="liquid-bg" />

            <div className="w-full max-w-md liquid-card p-8 shadow-2xl animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lumen-accent/20 mb-4 shadow-[0_0_20px_rgba(94,96,206,0.3)]">
                        <span className="material-icons-round text-lumen-accent text-4xl">blur_on</span>
                    </div>
                    <h1 className="text-3xl font-bold font-display text-white tracking-tight">
                        LumenDS
                    </h1>
                    <p className="text-lumen-textMuted mt-2 text-sm">Digital Signage Control</p>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 ${message.type === 'error' ? 'bg-lumen-error/10 text-lumen-error border border-lumen-error/20' : 'bg-lumen-success/10 text-lumen-success border border-lumen-success/20'}`}>
                        <span className="material-icons-round text-lg">{message.type === 'error' ? 'error' : 'check_circle'}</span>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-lumen-textMuted group-focus-within:text-lumen-accent transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Email"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-lumen-accent focus:bg-black/40 transition-all placeholder:text-lumen-textMuted/50"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-lumen-textMuted group-focus-within:text-lumen-accent transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="Senha"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-lumen-accent focus:bg-black/40 transition-all placeholder:text-lumen-textMuted/50"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-lumen-accent hover:bg-lumen-accentHover text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-lumen-accent/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Entrar na Plataforma' : 'Criar Conta Grátis')}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <button
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="text-lumen-textMuted hover:text-white text-sm transition-colors font-medium"
                    >
                        {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
                    </button>
                </div>
            </div>
        </div>
    );
}
