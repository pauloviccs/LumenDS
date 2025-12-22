import React from 'react';
import { Home, Folder, ListVideo, Monitor, Settings } from 'lucide-react';
import PlaylistsView from '../views/PlaylistsView.jsx';
import MediaView from '../views/MediaView.jsx';
import ScreensView from '../views/ScreensView.jsx';

const SidebarItem = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium group
      ${isActive
                ? 'bg-gradient-to-r from-blue-600/90 to-blue-500/90 text-white shadow-lg shadow-blue-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
    >
        <Icon size={18} className={`${isActive ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'}`} />
        <span>{label}</span>
    </button>
);

export default function MainLayout() {
    const [activeTab, setActiveTab] = React.useState('screens'); // Default to Screens for testing

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <div className="text-white">Home View (To Do)</div>;
            case 'media': return <MediaView />;
            case 'playlists': return <PlaylistsView />;
            case 'screens': return <ScreensView />;
            default: return <div className="text-white">404</div>;
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#121212] text-white selection:bg-blue-500/30 font-sans">
            {/* Sidebar */}
            <aside className="w-[260px] h-full flex flex-col bg-[#1a1a1a] border-r border-white/5 pt-10 px-3 relative z-20">
                <div className="absolute top-0 left-0 w-full h-8 wapp-drag-region" />

                <div className="mb-8 px-4 flex items-center space-x-2 opacity-80">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Monitor size={16} className="text-white" />
                    </div>
                    <span className="font-bold tracking-tight text-white">LumenDS</span>
                </div>

                <nav className="space-y-1 flex-1">
                    <SidebarItem label="Visão Geral" icon={Home} isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <div className="pt-4 pb-2 px-4 text-[10px] font-bold uppercase tracking-wider text-white/20">Gerenciamento</div>
                    <SidebarItem label="Mídia" icon={Folder} isActive={activeTab === 'media'} onClick={() => setActiveTab('media')} />
                    <SidebarItem label="Playlists" icon={ListVideo} isActive={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} />
                    <SidebarItem label="Telas" icon={Monitor} isActive={activeTab === 'screens'} onClick={() => setActiveTab('screens')} />
                </nav>

                <div className="pb-6 px-2">
                    <SidebarItem label="Ajustes" icon={Settings} isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-gradient-to-br from-[#121212] to-[#1a1a1a]">
                {/* Top Bar (Draggable) */}
                <div className="h-10 w-full flex items-center justify-end px-4 space-x-2 pointer-events-none wapp-drag-region select-none border-b border-white/5 bg-[#121212]/50 backdrop-blur-sm z-10">
                    <span className="text-[10px] text-white/20 font-medium">v1.0.0 (Local Tunnel)</span>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto animate-fade-in-up">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}
