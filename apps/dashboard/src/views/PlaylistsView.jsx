import React, { useState, useEffect } from 'react';
import { Plus, Play, MoreHorizontal, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

import PlaylistEditor from '../components/PlaylistEditor';

export default function PlaylistsView() {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [editingPlaylist, setEditingPlaylist] = useState(null);

    // Fetch Playlists
    useEffect(() => {
        fetchPlaylists();
    }, []);

    const fetchPlaylists = async () => {
        try {
            setLoading(true);

            // Try Supabase directly (User ID is optional)
            const { data, error } = await supabase
                .from('playlists')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Supabase Error (Fallback):', error);
            } else {
                setPlaylists(data);
            }
        } catch (error) {
            console.error('Error fetching playlists:', error);
        } finally {
            setLoading(false);
        }
    };

    const createPlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('playlists')
                .insert([{ name: newPlaylistName, user_id: user?.id || null, items: [] }])
                .select();

            if (error) throw error;
            setPlaylists([data[0], ...playlists]);
            setNewPlaylistName('');
            setIsCreating(false);

            // Open Editor immediately
            setEditingPlaylist(data[0]);

        } catch (error) {
            console.error('Error creating playlist:', error);
            alert('Erro: ' + error.message);
        }
    };

    const deletePlaylist = async (id, e) => {
        e.stopPropagation(); // Prevent opening editor
        if (!confirm('Tem certeza que deseja excluir esta playlist?')) return;

        try {
            const { error } = await supabase.from('playlists').delete().eq('id', id);
            if (error) throw error;
            setPlaylists(playlists.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting playlist:', error);
            alert('Erro ao excluir: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Editor Modal */}
            {editingPlaylist && (
                <PlaylistEditor
                    playlist={editingPlaylist}
                    onClose={() => setEditingPlaylist(null)}
                    onSave={() => {
                        setEditingPlaylist(null);
                        fetchPlaylists();
                    }}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-white">Playlists</h2>
                    <p className="text-white/40 text-sm">Organize seu conteúdo em sequências.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                >
                    <Plus size={18} />
                    <span>Nova Playlist</span>
                </button>
            </div>

            {/* Creator Modal (Simple Inline) */}
            {isCreating && (
                <form onSubmit={createPlaylist} className="bg-white/5 border border-white/10 rounded-xl p-4 animate-fade-in-up">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Nome da Playlist (ex: Manhã)"
                        className="w-full bg-transparent text-white text-lg placeholder-white/20 outline-none border-b border-white/10 focus:border-blue-500 pb-2 transition-colors"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onBlur={() => !newPlaylistName && setIsCreating(false)}
                    />
                </form>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                    <div
                        key={playlist.id}
                        onClick={() => setEditingPlaylist(playlist)}
                        className="group relative bg-[#2a2a2a] hover:bg-[#333] border border-white/5 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                    >
                        {/* Actions Top Right */}
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                            <button
                                onClick={(e) => deletePlaylist(playlist.id, e)}
                                className="text-white/40 hover:text-red-500 transition-colors p-1"
                                title="Excluir Playlist"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-white/10">
                                <Play size={24} className="text-blue-400 fill-current" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-lg leading-tight">{playlist.name}</h3>
                                <div className="flex items-center space-x-3 mt-2 text-xs text-white/40">
                                    <span className="flex items-center space-x-1">
                                        <Clock size={12} />
                                        <span>{new Date(playlist.created_at).toLocaleDateString()}</span>
                                    </span>
                                    <span>•</span>
                                    <span>{(playlist.items || []).length} itens</span>
                                </div>
                            </div>
                        </div>

                        {/* Hover Action */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-all">
                            <span className="text-xs text-blue-400 font-medium tracking-wide uppercase">Editar Sequência</span>
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                <Play size={10} className="ml-0.5 text-white" />
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && playlists.length === 0 && !isCreating && (
                    <div className="col-span-full py-20 text-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl">
                        <p>Nenhuma playlist criada.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
