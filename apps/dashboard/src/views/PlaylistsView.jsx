import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Calendar, Edit, Trash2, Clock, X, CloudUpload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlaylistEditor from '../components/PlaylistEditor';

export default function PlaylistsView() {
    // --- Logic State (from Original) ---
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [editingPlaylist, setEditingPlaylist] = useState(null);
    const [syncingId, setSyncingId] = useState(null); // ID of playlist currently syncing

    // Electron IPC
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

    // --- Fetch Logic ---
    useEffect(() => {
        fetchPlaylists();
    }, []);

    const fetchPlaylists = async () => {
        try {
            setLoading(true);
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
            setEditingPlaylist(data[0]); // Open editor immediately
        } catch (error) {
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
            alert('Erro ao excluir: ' + error.message);
        }
    };

    // --- SYNC LOGIC ---
    const handleSyncPlaylist = async (e, playlist) => {
        e.stopPropagation();
        if (syncingId) return; // Prevent multiple syncs

        if (!ipcRenderer) {
            alert('Sincronização disponível apenas no App Desktop.');
            return;
        }

        try {
            setSyncingId(playlist.id);
            console.log(`Starting sync for playlist: ${playlist.name}`);

            const updatedItems = [];
            let needsUpdate = false;
            const errors = [];

            for (const item of (playlist.items || [])) {
                // Check if item is local (localhost or no http)
                const isLocal = item.url && (item.url.includes('localhost') || !item.url.startsWith('http'));

                if (isLocal) {
                    console.log(`Uploading item: ${item.name}`);
                    needsUpdate = true;

                    // 1. Get File Buffer from Electron
                    // Extract relative path from URL if possible, otherwise use name/id
                    let relativePath = item.name;
                    if (item.url.includes('localhost:11222/')) {
                        relativePath = item.url.split('localhost:11222/')[1];
                    }

                    // Decode URI component in case of spaces
                    relativePath = decodeURIComponent(relativePath);

                    const fileBuffer = await ipcRenderer.invoke('read-file-buffer', relativePath);

                    if (!fileBuffer) {
                        const msg = `Leitura falhou: ${relativePath}`;
                        console.error(msg);
                        errors.push(msg);
                        // Keep original item but maybe mark error? For now, keep as is.
                        updatedItems.push(item);
                        continue;
                    }

                    // 2. Upload to Supabase Storage
                    // Sanitize filename
                    const sanitizedName = item.name
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-zA-Z0-9.-]/g, "_");

                    const fileName = `${Date.now()}_${sanitizedName}`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('campaign-assets') // Bucket corrected
                        .upload(`playlists/${playlist.id}/${fileName}`, fileBuffer, {
                            contentType: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
                            upsert: true
                        });

                    if (uploadError) {
                        const msg = `Upload erro (${item.name}): ${uploadError.message}`;
                        console.error(msg);
                        errors.push(msg);
                        updatedItems.push(item);
                        continue;
                    }

                    // 3. Get Public URL
                    const { data: publicUrlData } = supabase.storage
                        .from('campaign-assets')
                        .getPublicUrl(uploadData.path);

                    console.log(`Uploaded! New URL: ${publicUrlData.publicUrl}`);

                    // 4. Update Item
                    updatedItems.push({
                        ...item,
                        url: publicUrlData.publicUrl,
                        synced: true,
                        local_path: relativePath // Keep ref just in case
                    });

                } else {
                    // Already remote or valid
                    updatedItems.push(item);
                }
            }

            if (needsUpdate) {
                // 5. Update Database
                const { error: dbError } = await supabase
                    .from('playlists')
                    .update({ items: updatedItems })
                    .eq('id', playlist.id);

                if (dbError) throw dbError;

                console.log('Playlist updated in database');

                // Update local state
                setPlaylists(playlists.map(p => p.id === playlist.id ? { ...p, items: updatedItems } : p));

                let msg = 'Sincronização concluída!';
                if (errors.length > 0) {
                    msg += `\nAtenção: ${errors.length} arquivos falharam.`;
                    msg += `\n${errors.join('\n')}`;
                }
                alert(msg);
            } else {
                alert('Playlist já está sincronizada!');
            }

        } catch (error) {
            console.error('Sync error:', error);
            alert('Erro na sincronização: ' + error.message);
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <AnimatePresence>
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
            </AnimatePresence>

            {/* Header / Actions */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end mb-6"
            >
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn-primary-glow flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nova Playlist</span>
                </button>
            </motion.div>

            {/* Quick Creator Inline */}
            <AnimatePresence>
                {isCreating && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={createPlaylist}
                        className="glass-card p-6 mb-6 relative overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="absolute top-4 right-4 text-white/30 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-lumen-accent/20 text-lumen-accent">
                                <Plus className="w-6 h-6" />
                            </div>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Nome da Playlist (ex: Campanhas de Verão)"
                                className="flex-1 bg-transparent text-white text-xl placeholder-white/20 outline-none font-display font-medium"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                            />
                            <button type="submit" className="glass-button bg-lumen-accent/20 hover:bg-lumen-accent/40 text-lumen-accent border-lumen-accent/30">
                                Criar Agora
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Playlist Grid */}
            <div className="grid grid-cols-1 gap-4">
                {playlists.map((playlist, index) => {
                    // Check sync status
                    const isSynced = (playlist.items || []).every(i => i.url && i.url.startsWith('http') && !i.url.includes('localhost'));
                    const isSyncing = syncingId === playlist.id;

                    return (
                        <motion.div
                            key={playlist.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setEditingPlaylist(playlist)}
                            className="glass-card-hover p-6 cursor-pointer group relative"
                        >
                            <div className="flex items-center gap-6">
                                {/* Sync/Play Action */}
                                <div className="relative z-20" onClick={(e) => handleSyncPlaylist(e, playlist)}>
                                    <div className={`p-4 rounded-2xl border border-white/5 shadow-glow transition-all
                                        ${isSynced
                                            ? 'bg-lumen-success/10 text-lumen-success hover:bg-lumen-success/20'
                                            : 'bg-lumen-accent/10 text-lumen-accent hover:bg-lumen-accent/20'
                                        }
                                    `}>
                                        {isSyncing ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : isSynced ? (
                                            <CloudUpload className="w-6 h-6" title="Sincronizado na Nuvem" />
                                        ) : (
                                            <CloudUpload className="w-6 h-6 opacity-50 hover:opacity-100" title="Clique para Sincronizar (Local -> Cloud)" />
                                        )}
                                    </div>
                                    {!isSynced && !isSyncing && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a1a1a] animate-pulse" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <h3 className="text-xl font-display font-semibold text-white group-hover:text-lumen-accent transition-colors flex items-center gap-3">
                                        {playlist.name}
                                        {isSynced && <span className="text-xs bg-lumen-success/20 text-lumen-success px-2 py-0.5 rounded-full border border-lumen-success/20">Online</span>}
                                        {!isSynced && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">Local</span>}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(playlist.created_at).toLocaleDateString()}
                                        </span>
                                        <span>•</span>
                                        <span>{(playlist.items || []).length} itens</span>
                                    </div>
                                </div>

                                {/* Hover Actions */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-lumen-accent hover:border-lumen-accent text-white/60 hover:text-white transition-all">
                                        <Edit className="w-4 h-4" />
                                        <span className="text-sm font-medium hidden sm:inline">EDITAR</span>
                                    </button>
                                    <button
                                        onClick={(e) => deletePlaylist(playlist.id, e)}
                                        className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-lumen-error/20 hover:border-lumen-error hover:text-lumen-error text-white/40 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {!loading && playlists.length === 0 && !isCreating && (
                    <div className="py-20 text-center">
                        <Play className="w-16 h-16 mx-auto text-white/10 mb-4" />
                        <h3 className="text-white/40 font-display text-lg">Nenhuma playlist encontrada</h3>
                    </div>
                )}
            </div>
        </div>
    );
}
