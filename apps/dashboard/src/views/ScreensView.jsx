import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Monitor,
    LayoutGrid,
    List,
    Link as LinkIcon,
    MoreVertical,
    Trash2,
    RefreshCw,
    X,
    Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// --- Sub-components (Visuals) ---

const ViewToggle = ({ mode, setMode }) => (
    <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
        <button
            onClick={() => setMode('grid')}
            className={`p-2 rounded-lg transition-all ${mode === 'grid' ? 'bg-lumen-accent text-white' : 'text-white/50 hover:text-white'
                }`}
        >
            <LayoutGrid className="w-4 h-4" />
        </button>
        <button
            onClick={() => setMode('list')}
            className={`p-2 rounded-lg transition-all ${mode === 'list' ? 'bg-lumen-accent text-white' : 'text-white/50 hover:text-white'
                }`}
        >
            <List className="w-4 h-4" />
        </button>
    </div>
);

const StatusBadge = ({ status }) => {
    const isOnline = status === 'online';
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isOnline
                ? 'bg-lumen-success/20 text-lumen-success border-lumen-success/30'
                : 'bg-lumen-error/20 text-lumen-error border-lumen-error/30'
            }`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
    );
};

// --- Main Component ---

export default function ScreensView() {
    // --- Logic State (from Original) ---
    const [screens, setScreens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPairing, setIsPairing] = useState(false);
    const [pairingCode, setPairingCode] = useState('');
    const [screenName, setScreenName] = useState('');
    const [availablePlaylists, setAvailablePlaylists] = useState([]);

    // --- UI State (from Lovable) ---
    const [viewMode, setViewMode] = useState('list');

    // --- Effects & Data Fetching ---
    useEffect(() => {
        fetchScreens();
        fetchPlaylists();

        const subscription = supabase
            .channel('public:screens')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'screens' }, () => {
                fetchScreens();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchScreens = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('screens')
                .select(`*, playlists ( name )`)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Supabase Fetch Error (using fallback):', error);
                const localScreens = JSON.parse(localStorage.getItem('lumends_mock_screens') || '[]');
                setScreens(localScreens);
            } else {
                setScreens(data);
            }
        } catch (error) {
            console.error('Error fetching screens:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaylists = async () => {
        const { data } = await supabase.from('playlists').select('id, name');
        if (data) setAvailablePlaylists(data);
    };

    const assignPlaylist = async (screenId, playlistId) => {
        try {
            const { error } = await supabase
                .from('screens')
                .update({ current_playlist_id: playlistId || null })
                .eq('id', screenId);

            if (error) throw error;
            fetchScreens();
        } catch (error) {
            alert('Erro ao atribuir playlist: ' + error.message);
        }
    };

    const handlePair = async (e) => {
        e.preventDefault();
        if (!pairingCode || !screenName) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('screens').insert([{
                name: screenName,
                pairing_code: pairingCode,
                user_id: user?.id || null,
                status: 'offline'
            }]);

            if (error) throw error;
            setIsPairing(false);
            setPairingCode('');
            setScreenName('');
            fetchScreens();
        } catch (error) {
            alert('Erro ao parear: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover esta tela?')) return;
        try {
            const { error } = await supabase.from('screens').delete().eq('id', id);
            if (error) throw error;
            fetchScreens();
        } catch (error) {
            alert('Erro ao deletar: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">

            {/* Toolbar (Lovable Layout) */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6"
            >
                <ViewToggle mode={viewMode} setMode={setViewMode} />

                <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm hidden md:block">{screens.length} total</span>
                    <button
                        onClick={() => setIsPairing(true)}
                        className="btn-primary-glow flex items-center gap-2"
                    >
                        <LinkIcon className="w-4 h-4" />
                        <span>Parear Nova Tela</span>
                    </button>
                </div>
            </motion.div>

            {/* Pairing Modal (Overlay) */}
            <AnimatePresence>
                {isPairing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="glass-card w-full max-w-md p-6 relative"
                        >
                            <button
                                onClick={() => setIsPairing(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-display font-bold text-white mb-6">Parear Tela</h3>

                            <form onSubmit={handlePair} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-lumen-textMuted tracking-widest block mb-2">CÓDIGO PAREAMENTO</label>
                                    <input
                                        type="text"
                                        placeholder="X99-B2A"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono text-xl uppercase tracking-[0.3em] focus:border-lumen-accent focus:bg-white/10 outline-none transition-all"
                                        value={pairingCode}
                                        onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-lumen-textMuted tracking-widest block mb-2">NOME IDENTIFICADOR</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Recepção Principal"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-lumen-accent focus:bg-white/10 outline-none transition-all"
                                        value={screenName}
                                        onChange={(e) => setScreenName(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsPairing(false)}
                                        className="px-4 py-2 text-white/60 hover:text-white"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary-glow"
                                    >
                                        Confirmar Conexão
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="glass-card min-h-[400px]"
            >
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-display font-semibold text-white">
                        Dispositivos Conectados
                    </h3>
                    {loading && <RefreshCw className="w-4 h-4 text-white/40 animate-spin" />}
                </div>

                {screens.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-white/30">
                        <Monitor className="w-16 h-16 mb-4 opacity-20" />
                        <p>Nenhuma tela encontrada.</p>
                    </div>
                )}

                {/* LIST MODE */}
                {viewMode === 'list' && (
                    <div className="divide-y divide-white/5">
                        {screens.map((screen, index) => (
                            <motion.div
                                key={screen.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 hover:bg-white/[0.02] transition-colors group flex items-center gap-4"
                            >
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <Monitor className="w-5 h-5 text-white/60" />
                                </div>

                                <div className="flex-1">
                                    <h4 className="font-medium text-white">{screen.name}</h4>
                                    <div className="flex items-center gap-3 text-sm text-white/40 mt-1">
                                        <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-white/60 text-xs">
                                            {screen.pairing_code}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span>Playlist:</span>
                                            <select
                                                className="bg-transparent text-lumen-accent hover:text-white cursor-pointer outline-none transition-colors border-none p-0 w-32 md:w-auto"
                                                value={screen.current_playlist_id || ''}
                                                onChange={(e) => assignPlaylist(screen.id, e.target.value)}
                                            >
                                                <option value="" className="bg-lumen-bg">Nenhuma</option>
                                                {availablePlaylists.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-lumen-bg">{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <StatusBadge status={screen.status} />
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDelete(screen.id)}
                                            className="p-2 rounded-lg hover:bg-lumen-error/20 text-white/40 hover:text-lumen-error transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* GRID MODE */}
                {viewMode === 'grid' && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {screens.map((screen, index) => (
                            <motion.div
                                key={screen.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-lumen-accent/50 transition-all group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <Monitor className="w-6 h-6 text-white/80" />
                                    </div>
                                    <StatusBadge status={screen.status} />
                                </div>

                                <h4 className="font-bold text-white mb-1 truncate">{screen.name}</h4>
                                <p className="text-xs font-mono text-white/40 mb-4">{screen.pairing_code}</p>

                                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                                    <select
                                        className="bg-transparent text-xs text-lumen-accent hover:text-white cursor-pointer outline-none transition-colors max-w-[120px]"
                                        value={screen.current_playlist_id || ''}
                                        onChange={(e) => assignPlaylist(screen.id, e.target.value)}
                                    >
                                        <option value="" className="bg-lumen-bg">Playlist: Nenhuma</option>
                                        {availablePlaylists.map(p => (
                                            <option key={p.id} value={p.id} className="bg-lumen-bg">{p.name}</option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => handleDelete(screen.id)}
                                        className="text-white/20 hover:text-lumen-error transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
