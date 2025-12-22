import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Using Ionicons 5 for that authentic iOS feel (Filled/Sharp variants)
import {
    IoHome,
    IoFolderOpen,
    IoList,
    IoDesktop,
    IoSettingsSharp,
    IoLogOutOutline,
    IoMenu,
    IoClose
} from 'react-icons/io5';
import { supabase } from '../lib/supabase';
import PlaylistsView from '../views/PlaylistsView.jsx';
import MediaView from '../views/MediaView.jsx';
import ScreensView from '../views/ScreensView.jsx';
import SettingsView from '../views/SettingsView.jsx';

const MenuItem = ({ icon: Icon, label, isActive, onClick }) => (
    <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-full flex items-center space-x-4 px-6 py-4 rounded-[25px] transition-all duration-300 font-medium text-lg
      ${isActive
                ? 'bg-electric-blurple text-white shadow-[0_0_20px_#5E60CE]'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
    >
        <Icon size={24} />
        <span>{label}</span>
    </motion.button>
);

export default function MainLayout() {
    const [activeTab, setActiveTab] = React.useState('screens');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleNavigate = (tab) => {
        setActiveTab(tab);
        setIsMenuOpen(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <div className="text-white p-10 font-header text-3xl font-bold">Visão Geral</div>;
            case 'media': return <MediaView />;
            case 'playlists': return <PlaylistsView />;
            case 'screens': return <ScreensView />;
            case 'settings': return <SettingsView />;
            default: return <div className="text-white">404</div>;
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden relative font-sans text-white bg-black">
            {/* Background Animation */}
            <div className="liquid-bg" />

            {/* Top Bar (Floating Dynamic Island feel) */}
            <div className="absolute top-0 left-0 right-0 z-50 p-6 flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMenuOpen(true)}
                        className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[22px] flex items-center justify-center shadow-2xl hover:bg-white/20 transition-colors"
                    >
                        <IoMenu size={28} className="text-white" />
                    </motion.button>
                </div>

                <div className="flex items-center space-x-4 pointer-events-auto">
                    <span className="px-4 py-2 bg-black/40 backdrop-blur-lg rounded-[14px] border border-white/10 text-xs font-bold uppercase tracking-widest text-white/50">
                        LumenDS Studio
                    </span>
                </div>
            </div>

            {/* Content Area - Full Screen */}
            <main className="flex-1 h-full pt-28 px-4 pb-4 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1800px] mx-auto h-full">
                    {renderContent()}
                </div>
            </main>

            {/* Dropdown Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed top-4 left-4 bottom-4 w-[320px] bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-[40px] z-50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col p-8"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/5 rounded-[18px] flex items-center justify-center border border-white/10 shadow-inner">
                                        <IoDesktop size={24} className="text-electric-blurple" />
                                    </div>
                                    <div>
                                        <span className="font-header font-bold text-2xl block leading-none">Menu</span>
                                        <span className="text-xs text-white/30 font-medium tracking-wider uppercase">Navegação</span>
                                    </div>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                >
                                    <IoClose size={24} />
                                </motion.button>
                            </div>

                            <nav className="flex-1 space-y-2">
                                <MenuItem label="Visão Geral" icon={IoHome} isActive={activeTab === 'home'} onClick={() => handleNavigate('home')} />
                                <div className="h-px bg-white/5 my-4 mx-4"></div>
                                <MenuItem label="Mídia" icon={IoFolderOpen} isActive={activeTab === 'media'} onClick={() => handleNavigate('media')} />
                                <MenuItem label="Playlists" icon={IoList} isActive={activeTab === 'playlists'} onClick={() => handleNavigate('playlists')} />
                                <MenuItem label="Telas" icon={IoDesktop} isActive={activeTab === 'screens'} onClick={() => handleNavigate('screens')} />
                            </nav>

                            <div className="mt-auto space-y-2">
                                <div className="h-px bg-white/5 my-4 mx-4"></div>
                                <MenuItem label="Ajustes" icon={IoSettingsSharp} isActive={activeTab === 'settings'} onClick={() => handleNavigate('settings')} />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center space-x-4 px-6 py-4 rounded-[25px] transition-all duration-300 font-medium text-lg text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                >
                                    <IoLogOutOutline size={24} />
                                    <span>Sair</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
