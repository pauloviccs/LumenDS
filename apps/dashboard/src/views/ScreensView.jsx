import React, { useState, useEffect } from 'react';
import { Monitor, Plus, Signal, SignalLow, SignalZero, Power, MoreHorizontal, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

const StatusBadge = ({ status }) => {
    const isOnline = status === 'online';
    return (
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${isOnline ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
    );
};

export default function ScreensView() {
    const [screens, setScreens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPairing, setIsPairing] = useState(false);
    const [pairingCode, setPairingCode] = useState('');
    const [screenName, setScreenName] = useState('');

    const [availablePlaylists, setAvailablePlaylists] = useState([]);

    useEffect(() => {
        fetchScreens();
        fetchPlaylists();

        // Subscribe to status changes
        const subscription = supabase
            .channel('public:screens')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'screens' }, (payload) => {
                fetchScreens(); // Simple refresh for now
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchScreens = async () => {
        try {
            setLoading(true);

            // Try Supabase directly (User ID is now optional via SQL)
            const { data, error } = await supabase
                .from('screens')
                .select(`
            *,
            playlists ( name )
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Supabase Fetch Error (falling back to mock for display):', error);
                // Fallback: Use LocalStorage just to not show empty screen if offline
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
                .update({ current_playlist_id: playlistId || null }) // null to unassign
                .eq('id', screenId);

            if (error) throw error;
            fetchScreens();
        } catch (error) {
            console.error('Error assigning playlist:', error);
            alert('Erro ao atribuir playlist: ' + error.message);
        }
    };

    const handlePair = async (e) => {
        e.preventDefault();
        if (!pairingCode || !screenName) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Insert new screen (User ID is optional now)
            const { error } = await supabase
                .from('screens')
                .insert([{
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
            console.error('Error pairing screen:', error);
            alert('Erro ao parear: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja remover esta tela?')) return;
        try {
            const { error } = await supabase
                .from('screens')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchScreens();
        } catch (error) {
            console.error('Error deleting screen:', error);
            alert('Erro ao deletar: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-white">Telas</h2>
                    <p className="text-white/40 text-sm">Gerencie seus pontos de exibição.</p>
                </div>
                <button
                    onClick={() => setIsPairing(true)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                >
                    <LinkIcon size={18} />
                    <span>Parear Nova Tela</span>
                </button>
            </div>

            {/* Pairing Modal Inline */}
            {isPairing && (
                <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl p-6 animate-fade-in-up shadow-2xl">
                    <h3 className="text-lg font-medium text-white mb-4">Parear Nova Tela</h3>
                    <form onSubmit={handlePair} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1">CÓDIGO (mostrado na TV)</label>
                                <input
                                    type="text"
                                    placeholder="Ex: X99-B2A"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-center uppercase tracking-widest font-mono text-xl"
                                    value={pairingCode}
                                    onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-1">NOME DA TELA</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Recepção"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                                    value={screenName}
                                    onChange={(e) => setScreenName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsPairing(false)}
                                className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg"
                            >
                                Conectar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="flex flex-col space-y-3">
                {screens.map((screen) => (
                    <div key={screen.id} className="group bg-[#222] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors">
                        <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${screen.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/20'}`}>
                                <Monitor size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">{screen.name}</h3>
                                <div className="flex items-center space-x-2 text-sm text-white/40">
                                    <span className="font-mono bg-white/5 px-1.5 rounded text-[10px]">{screen.pairing_code}</span>
                                    <span>•</span>
                                    <select
                                        className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white/60 hover:text-white outline-none focus:border-blue-500 cursor-pointer"
                                        value={screen.current_playlist_id || ''}
                                        onChange={(e) => assignPlaylist(screen.id, e.target.value)}
                                    >
                                        <option value="">Sem Playlist</option>
                                        {availablePlaylists.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            <StatusBadge status={screen.status} />
                            <button
                                onClick={() => handleDelete(screen.id)}
                                className="text-white/20 hover:text-red-500 transition-colors"
                                title="Remover Tela"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
