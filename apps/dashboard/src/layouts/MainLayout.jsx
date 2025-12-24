import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PlaylistsView from '../views/PlaylistsView.jsx';
import MediaView from '../views/MediaView.jsx';
import ScreensView from '../views/ScreensView.jsx';
import SettingsView from '../views/SettingsView.jsx';
import DashboardView from '../views/DashboardView.jsx';

import {
    LayoutDashboard,
    Monitor,
    ListVideo,
    FolderOpen,
    Settings,
    LogOut,
    Command,
    Bell,
    Plus
} from 'lucide-react';

export default function MainLayout() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Get initial user
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleNavigate = (tab) => {
        setActiveTab(tab);
    };

    const getHeaderInfo = () => {
        switch (activeTab) {
            case 'dashboard': return { title: 'Visão Geral', subtitle: 'Status em tempo real da rede' };
            case 'media': return { title: 'Arquivos', subtitle: 'Upload e gerenciamento de mídia' };
            case 'playlists': return { title: 'Playlists', subtitle: 'Crie e organize sua programação' };
            case 'screens': return { title: 'Telas', subtitle: 'Gerencie seus dispositivos conectados' };
            case 'settings': return { title: 'Ajustes', subtitle: 'Configurações do sistema' };
            default: return { title: 'LumenDS', subtitle: '' };
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardView />;
            case 'media': return <MediaView />;
            case 'playlists': return <PlaylistsView />;
            case 'screens': return <ScreensView />;
            case 'settings': return <SettingsView />;
            default: return <DashboardView />;
        }
    };

    const { title, subtitle } = getHeaderInfo();

    return (
        <div className="font-sans antialiased h-screen flex overflow-hidden selection:bg-lumen-accent selection:text-white relative text-white">
            {/* Global Liquid Background */}
            <div className="liquid-bg" />

            {/* Sidebar Navigation */}
            <aside className="w-64 flex-shrink-0 z-20 flex flex-col liquid-card m-4 mr-0 h-[calc(100vh-2rem)] border-white/10 bg-black/40">
                {/* Logo Area */}
                <div className="p-8 pb-4">
                    <h1 className="font-display font-bold text-2xl tracking-tighter text-white flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-lumen-accent/20">
                            <Command className="w-6 h-6 text-lumen-accent" />
                        </div>
                        LumenDS
                    </h1>
                    <p className="text-[10px] font-bold text-white/40 mt-2 tracking-[0.2em] uppercase ml-11">Digital Signage OS</p>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto custom-scrollbar">
                    <NavButton
                        id="dashboard"
                        icon={<LayoutDashboard size={20} />}
                        label="Dashboard"
                        active={activeTab === 'dashboard'}
                        onClick={() => handleNavigate('dashboard')}
                    />
                    <NavButton
                        id="screens"
                        icon={<Monitor size={20} />}
                        label="Telas"
                        active={activeTab === 'screens'}
                        onClick={() => handleNavigate('screens')}
                    />
                    <NavButton
                        id="playlists"
                        icon={<ListVideo size={20} />}
                        label="Playlists"
                        active={activeTab === 'playlists'}
                        onClick={() => handleNavigate('playlists')}
                    />
                    <NavButton
                        id="media"
                        icon={<FolderOpen size={20} />}
                        label="Arquivos"
                        active={activeTab === 'media'}
                        onClick={() => handleNavigate('media')}
                    />

                    <div className="my-4 border-t border-white/5 mx-4"></div>

                    <NavButton
                        id="settings"
                        icon={<Settings size={20} />}
                        label="Ajustes"
                        active={activeTab === 'settings'}
                        onClick={() => handleNavigate('settings')}
                    />
                </nav>

                {/* User Profile (Bottom) */}
                <div className="p-4 mt-auto">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lumen-accent to-purple-800 flex items-center justify-center font-bold font-display shadow-lg shadow-lumen-accent/30 group-hover:scale-110 transition-transform">
                            {user?.email?.[0].toUpperCase() || 'A'}
                        </div>
                        <div className="overflow-hidden min-w-0">
                            <p className="text-sm font-bold text-white leading-none truncate">{user?.email?.split('@')[0] || 'Admin'}</p>
                            <p className="text-xs text-lumen-success mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-lumen-success animate-pulse"></span>
                                Online
                            </p>
                        </div>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="text-white/40 ml-auto hover:text-lumen-error transition-colors p-2 rounded-lg hover:bg-white/5"
                            title="Sair"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 w-full">

                {/* Top Bar (Contextual) */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 py-4 z-10">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-white tracking-tight animate-fade-in">{title}</h2>
                        <p className="text-sm text-lumen-textMuted animate-fade-in" style={{ animationDelay: '75ms' }}>{subtitle}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-lumen-textMuted hover:text-white hover:bg-white/10 transition-all cursor-not-allowed opacity-50">
                            <Bell size={20} />
                        </button>
                        {activeTab !== 'playlists' && (
                            <button
                                onClick={() => setActiveTab('playlists')}
                                className="btn-primary-glow flex items-center gap-2 px-5 py-2.5 text-sm"
                            >
                                <Plus size={18} />
                                <span>Nova Playlist</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0 pb-20">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

// Sub-component for Nav Buttons
function NavButton({ id, icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative overflow-hidden
                ${active ? 'bg-lumen-accent/10 text-white' : 'text-lumen-textMuted hover:text-white hover:bg-white/5'}
            `}
        >
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-lumen-accent rounded-r-full shadow-[0_0_10px_#5E60CE]"></div>
            )}
            <span className={`transition-colors ${active ? 'text-lumen-accent' : 'group-hover:text-lumen-accent'}`}>
                {icon}
            </span>
            <span className="font-medium text-sm">{label}</span>
        </button>
    );
}
