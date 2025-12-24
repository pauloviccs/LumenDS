import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for Portal
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    X, Save, Clock, Image as ImageIcon, Film, Plus, GripVertical, Trash2,
    Edit, Cloud, Monitor, Folder, ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// --- Sortable Item Component ---
function SortableItem({ id, item, onDelete, onUpdateDuration, onDurationDetected }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    // Auto-detect duration logic for videos
    const handleVideoLoad = (e) => {
        if (item.type === 'video' && (!item.duration || item.duration === 0 || item.duration === 10)) {
            const vidDuration = Math.round(e.target.duration);
            if (vidDuration && vidDuration > 0) {
                onDurationDetected(id, vidDuration);
            }
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/5 
                hover:border-white/10 hover:bg-white/10 transition-all mb-2
                ${isDragging ? 'shadow-glow border-lumen-accent' : ''}
            `}
        >
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-white/20 hover:text-white">
                <GripVertical size={20} />
            </div>

            {/* Thumbnail */}
            <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/50 border border-white/5 flex-shrink-0 relative">
                {item.type === 'video' ? (
                    <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        onLoadedMetadata={handleVideoLoad}
                    />
                ) : (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate text-sm">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider border border-white/10 px-1.5 py-0.5 rounded">
                        {item.type}
                    </span>
                    {item.url && !item.url.includes('localhost') && item.url.startsWith('http') && (
                        <Cloud size={10} className="text-lumen-success" title="Na Nuvem" />
                    )}
                </div>
            </div>

            {/* Duration Input */}
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/5">
                <Clock size={12} className="text-white/40" />
                <input
                    type="number"
                    value={item.duration || 10}
                    onChange={(e) => onUpdateDuration(id, parseInt(e.target.value))}
                    className="w-12 bg-transparent text-white text-sm text-center outline-none"
                    min="1"
                />
                <span className="text-xs text-white/40">s</span>
            </div>

            {/* Delete */}
            <button
                onClick={() => onDelete(id)}
                className="p-2 text-white/20 hover:text-lumen-error hover:bg-lumen-error/10 rounded-lg transition-colors"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

// --- Main Editor Component ---
export default function PlaylistEditor({ playlist, onClose, onSave }) {
    const [items, setItems] = useState(playlist.items || []);
    const [mediaLibrary, setMediaLibrary] = useState([]);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState('all'); // 'all', 'local', 'cloud'

    // Cloud Navigation State
    const [cloudPath, setCloudPath] = useState(''); // '' is root

    // Electron IPC
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchMedia(cloudPath);
    }, [cloudPath]); // Re-fetch when path changes

    const fetchMedia = async (path) => {
        setIsLoadingMedia(true);
        const allMedia = [];

        // 1. Fetch Local Assets (Only if at root, or we need to implement local folder nav too)
        // For simplicity, let's keep local assets as "Flattened View" (All files) as originally implemented,
        // unless we want to complicate the UI with dual navigation.
        // Let's stick to: Local = All Flattened (Easy access). Cloud = Folder Navigable.

        if (ipcRenderer && path === '') { // Only show local files at root 'merged' view, OR show always?
            try {
                // We show local files regardless of cloud path if we want, OR we disable local when drilling down cloud.
                // Let's show local files ONLY at root to avoid confusion, or keep them always visible.
                // Decision: Show local files always in 'all' or 'local' mode.
                const files = await ipcRenderer.invoke('get-all-assets-flattened');
                const localProcessed = files.map(f => ({
                    id: `local-${f.name}`,
                    name: f.name,
                    type: (f.type === 'video' || f.name.match(/\.(mp4|webm|mov)$/i)) ? 'video' : 'image',
                    url: `http://localhost:11222/${f.relativePath}`,
                    duration_seconds: 15,
                    source: 'local'
                }));
                allMedia.push(...localProcessed);
            } catch (e) {
                console.error("Error fetching local media:", e);
            }
        }

        // 2. Fetch Cloud Assets (Navigable)
        if (viewMode !== 'local') {
            try {
                const { data: cloudFiles, error } = await supabase.storage
                    .from('campaign-assets')
                    .list(path, { limit: 100, sortBy: { column: 'name', order: 'asc' } });

                if (!error && cloudFiles) {
                    const cloudProcessed = cloudFiles
                        .filter(f => f.name !== '.emptyFolderPlaceholder')
                        .map(f => {
                            // Check if it is a folder. Supabase Storage `.list()` returns objects.
                            // Folders usually don't have `metadata` or strictly `id`.
                            // We can also assume no mimetype = folder.
                            const isFolder = !f.metadata;

                            let publicUrl = '';
                            if (!isFolder) {
                                const { data } = supabase.storage.from('campaign-assets').getPublicUrl(path ? `${path}/${f.name}` : f.name);
                                publicUrl = data.publicUrl;
                            }

                            return {
                                id: `cloud-${f.name}`, // weak ID but good enough for display
                                name: f.name,
                                type: isFolder ? 'folder' : (f.metadata?.mimetype?.startsWith('video') ? 'video' : 'image'),
                                url: publicUrl,
                                duration_seconds: 15,
                                source: 'cloud',
                                isFolder: isFolder,
                                fullPath: path ? `${path}/${f.name}` : f.name
                            };
                        });

                    allMedia.push(...cloudProcessed);
                }
            } catch (e) {
                console.error("Error fetching cloud media:", e);
            }
        }

        setMediaLibrary(allMedia);
        setIsLoadingMedia(false);
    };

    // --- Actions ---

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex(i => i.uniqueId === active.id);
                const newIndex = items.findIndex(i => i.uniqueId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleItemClick = (mediaItem) => {
        if (mediaItem.isFolder) {
            // Navigate into folder
            setCloudPath(mediaItem.fullPath);
        } else {
            // Add to timestamp
            addItem(mediaItem);
        }
    };

    const handleGoBack = () => {
        if (!cloudPath) return;
        const parts = cloudPath.split('/');
        parts.pop();
        setCloudPath(parts.join('/'));
    };

    const addItem = (mediaItem) => {
        const newItem = {
            ...mediaItem,
            uniqueId: Math.random().toString(36).substr(2, 9),
            duration: mediaItem.type === 'video' ? 10 : 10, // Default 10, will auto-detect
            // Prefer cloud URL if available for remote players
            url: mediaItem.url
        };
        setItems([...items, newItem]);
    };

    const removeItem = (uniqueId) => {
        setItems(items.filter(i => i.uniqueId !== uniqueId));
    };

    const updateDuration = (uniqueId, newDuration) => {
        setItems(items.map(i => i.uniqueId === uniqueId ? { ...i, duration: newDuration } : i));
    };

    const handleDurationDetected = (uniqueId, detectedDuration) => {
        setItems(prevItems => prevItems.map(i => {
            if (i.uniqueId === uniqueId && (i.duration === 10 || i.duration === 0)) {
                return { ...i, duration: detectedDuration };
            }
            return i;
        }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('playlists')
                .update({ items: items })
                .eq('id', playlist.id);

            if (error) throw error;
            onSave();
        } catch (error) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Filter library
    const filteredLibrary = mediaLibrary.filter(item => {
        // Folder logic: Folders are Cloud by nature (or we map local folders later).
        // If we are in root, we might see duplicates if we merged blindly.
        // But our `fetchMedia` does the work.
        // We just filter by view mode.
        if (viewMode === 'local') return item.source === 'local';
        if (viewMode === 'cloud') return item.source === 'cloud' || item.hasCloudCopy;
        return true;
    });

    return ReactDOM.createPortal(
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
        >
            <div className="w-full max-w-6xl h-[85vh] liquid-card flex flex-col overflow-hidden border-lumen-accent/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#0a0a0a]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                            <Edit className="text-lumen-accent" />
                            Editor: {playlist.name}
                        </h2>
                        <p className="text-white/50 text-sm mt-1">Arraste os itens para reordenar.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn-primary-glow flex items-center gap-2 px-6"
                        >
                            {isSaving ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                            <span>Salvar Playlist</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT: Timeline (Sortable) */}
                    <div className="w-1/2 p-6 overflow-y-auto bg-black/20">
                        <h3 className="text-xs font-bold text-lumen-textMuted uppercase tracking-widest mb-4 flex justify-between">
                            <span>Linha do Tempo</span>
                            <span>{items.length} itens • {items.reduce((acc, i) => acc + (parseInt(i.duration) || 0), 0)}s total</span>
                        </h3>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={items.map(i => i.uniqueId)}
                                strategy={verticalListSortingStrategy}
                            >
                                {items.length === 0 ? (
                                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center">
                                        <p className="text-white/30">Playlist vazia.</p>
                                        <p className="text-white/20 text-sm mt-2">Clique nos itens à direita para adicionar.</p>
                                    </div>
                                ) : (
                                    items.map((item) => (
                                        <SortableItem
                                            key={item.uniqueId}
                                            id={item.uniqueId}
                                            item={item}
                                            onDelete={removeItem}
                                            onUpdateDuration={updateDuration}
                                            onDurationDetected={handleDurationDetected}
                                        />
                                    ))
                                )}
                            </SortableContext>
                        </DndContext>
                    </div>

                    {/* RIGHT: Media Library */}
                    <div className="w-1/2 p-6 border-l border-white/10 bg-white/[0.02] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {cloudPath && (
                                    <button onClick={handleGoBack} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                                        <ArrowLeft size={14} className="text-white" />
                                    </button>
                                )}
                                <h3 className="text-xs font-bold text-lumen-textMuted uppercase tracking-widest">
                                    {cloudPath ? `.../${cloudPath}` : 'Biblioteca'} ({filteredLibrary.length})
                                </h3>
                            </div>

                            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('all')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'all' ? 'bg-lumen-accent text-white' : 'text-white/40 hover:text-white'}`} title="Todos"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={() => setViewMode('local')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'local' ? 'bg-lumen-accent text-white' : 'text-white/40 hover:text-white'}`} title="Apenas Local"
                                >
                                    <Monitor size={14} />
                                </button>
                                <button
                                    onClick={() => setViewMode('cloud')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'cloud' ? 'bg-lumen-accent text-white' : 'text-white/40 hover:text-white'}`} title="Apenas Nuvem"
                                >
                                    <Cloud size={14} />
                                </button>
                            </div>
                        </div>

                        {isLoadingMedia ? (
                            <div className="flex-1 flex items-center justify-center text-white/30">
                                <span className="animate-spin mr-2">⏳</span> Carregando...
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                                {filteredLibrary.map((media) => (
                                    <div
                                        key={media.id}
                                        onClick={() => handleItemClick(media)}
                                        className={`group relative cursor-pointer rounded-xl overflow-hidden aspect-video border border-white/5 transition-all hover:scale-105
                                            ${media.isFolder ? 'bg-white/5 flex items-center justify-center hover:border-lumen-accent' : 'hover:border-lumen-accent/50'}
                                        `}
                                    >
                                        {media.isFolder ? (
                                            <div className="flex flex-col items-center justify-center text-lumen-accent">
                                                <Folder size={32} />
                                                <span className="text-xs mt-2 text-white/60 font-medium">{media.name}</span>
                                            </div>
                                        ) : media.type === 'video' ? (
                                            <video src={media.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <img src={media.url} alt={media.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                        )}

                                        {/* Indicators */}
                                        {!media.isFolder && (
                                            <div className="absolute top-2 left-2 flex gap-1">
                                                {media.source === 'local' && <div className="bg-black/50 text-white p-1 rounded-full"><Monitor size={10} /></div>}
                                                {(media.source === 'cloud' || media.hasCloudCopy) && <div className="bg-lumen-accent text-white p-1 rounded-full"><Cloud size={10} /></div>}
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors pointer-events-none" />

                                        {!media.isFolder && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-lumen-accent text-white p-1 rounded-full shadow-lg">
                                                    <Plus size={14} />
                                                </div>
                                            </div>
                                        )}

                                        {!media.isFolder && (
                                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                <p className="text-xs text-white truncate">{media.name}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {filteredLibrary.length === 0 && (
                                    <div className="col-span-full py-10 text-center">
                                        <ImageIcon className="w-12 h-12 text-white/10 mx-auto mb-2" />
                                        <p className="text-lumen-textMuted text-sm">Nenhuma mídia encontrada nesta pasta.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>,
        document.body
    );
}
