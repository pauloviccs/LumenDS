import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, GripVertical, Film } from 'lucide-react';
import { IoCloudUpload } from 'react-icons/io5';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';
import { CloudSyncService } from '../services/CloudSyncService';

// Sortable Item Component
function SortableItem({ id, item, onRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    // Construct Local Asset URL
    const assetUrl = item.relativePath
        ? `http://localhost:11222/${item.relativePath}`
        : `http://localhost:11222/${item.name}`; // Legacy fallback for root items

    return (
        <div ref={setNodeRef} style={style} className="flex items-center space-x-3 bg-[#2a2a2a] p-3 rounded-[18px] border border-white/5 group shadow-sm">
            <button {...attributes} {...listeners} className="text-white/20 hover:text-white cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
            </button>
            <div className="w-12 h-12 bg-black rounded-[14px] overflow-hidden flex-shrink-0 relative border border-white/5">
                {item.type === 'video' ? (
                    <div className="w-full h-full bg-[#111] flex items-center justify-center">
                        <Film size={20} className="text-white/50" />
                    </div>
                ) : (
                    <img src={assetUrl} className="w-full h-full object-cover" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate font-medium">{item.name}</p>
                <div className="flex items-center space-x-2 text-white/40 text-xs">
                    <span>{item.duration}s</span>
                    {item.relativePath && <span className="opacity-50 text-[10px] truncate max-w-[100px]">{item.relativePath}</span>}
                    {item.url && <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Cloud</span>}
                </div>
            </div>
            <button onClick={() => onRemove(id)} className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
            </button>
        </div>
    );
}

export default function PlaylistEditor({ playlist, onClose, onSave }) {
    const [items, setItems] = useState(playlist.items || []);
    const [availableMedia, setAvailableMedia] = useState([]);
    const [name, setName] = useState(playlist.name);
    const [isSyncing, setIsSyncing] = useState(false);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Load available media from IPC
    useEffect(() => {
        const loadMedia = async () => {
            const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
            if (ipcRenderer) {
                // Use flattened recursive list to show ALL media files including those in subfolders
                const files = await ipcRenderer.invoke('get-all-assets-flattened');
                setAvailableMedia(files);
            }
        };
        loadMedia();
    }, []);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addItem = (file) => {
        // Create a playlist item structure
        const newItem = {
            id: crypto.randomUUID(), // Unique ID for the playlist instance
            type: file.type,
            name: file.name,
            path: file.path, // We might want to store relativePath for portability?
            relativePath: file.relativePath, // Store this!
            duration: 10 // Default duration
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSave = async () => {
        try {
            const { error } = await supabase
                .from('playlists')
                .update({ name, items, updated_at: new Date() })
                .eq('id', playlist.id);

            if (error) throw error;
            onSave();
        } catch (e) {
            alert('Erro ao salvar playlist: ' + e.message);
        }
    };

    const handlePublish = async () => {
        if (!confirm('Deseja publicar esta playlist na nuvem? Isso fará upload dos arquivos necessários.')) return;

        setIsSyncing(true);
        try {
            // Check if we need to save first

            // Call Sync Service
            const updatedItems = await CloudSyncService.publishPlaylist(playlist.id, name, items);

            // Update local state to reflect cloud URLs (opt)
            setItems(updatedItems);

            alert('Playlist publicada com sucesso! As TVs baixarão o novo conteúdo.');
            onSave(); // Close/Refresh
        } catch (e) {
            console.error(e);
            alert('Erro ao publicar: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 animate-fade-in">
            <div className="liquid-card w-full max-w-5xl h-full max-h-[85vh] rounded-[30px] flex overflow-hidden shadow-2xl relative ring-1 ring-white/10">

                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-black opacity-90 z-0"></div>

                {/* Left: Editor */}
                <div className="flex-1 flex flex-col border-r border-white/10 relative z-10 glass-panel">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-transparent text-2xl font-bold text-white outline-none placeholder-white/20 w-full font-header"
                        />
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-black/20 custom-scrollbar">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-white/40 text-xs font-bold uppercase tracking-widest">Itens da Playlist</h4>
                            <span className="text-white/20 text-xs">{items.length} itens</span>
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={items} strategy={verticalListSortingStrategy}>
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <SortableItem key={item.id} id={item.id} item={item} onRemove={removeItem} />
                                    ))}
                                    {items.length === 0 && (
                                        <div className="text-center py-20 text-white/20 border-2 border-dashed border-white/5 rounded-[20px] flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                <Film size={24} className="opacity-50" />
                                            </div>
                                            <p className="font-medium">Playlist Vazia</p>
                                            <p className="text-xs mt-1">Arraste itens da biblioteca ao lado</p>
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div className="p-6 border-t border-white/10 bg-black/20 flex space-x-4">
                        <button
                            onClick={handleSave}
                            disabled={isSyncing}
                            className="flex-1 py-4 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-[20px] font-bold flex items-center justify-center space-x-2 transition-all"
                        >
                            <Save size={20} />
                            <span>Salvar Local</span>
                        </button>

                        <button
                            onClick={handlePublish}
                            disabled={isSyncing}
                            className={`flex-1 py-4 text-white rounded-[20px] font-bold flex items-center justify-center space-x-2 transition-all shadow-lg
                                ${isSyncing
                                    ? 'bg-electric-blurple/50 cursor-wait'
                                    : 'bg-electric-blurple hover:bg-[#4d4fbb] shadow-electric-blurple/20'}`}
                        >
                            {isSyncing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Enviando...</span>
                                </>
                            ) : (
                                <>
                                    <IoCloudUpload size={22} />
                                    <span>Publicar / Sync</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Library */}
                <div className="w-80 bg-black/40 backdrop-blur-md flex flex-col border-l border-white/5 relative z-10">
                    <div className="p-5 border-b border-white/10">
                        <h3 className="text-white font-bold font-header text-lg">Biblioteca</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                        {availableMedia.map((file, i) => (
                            <div key={i} className="group flex items-center space-x-3 p-2 hover:bg-white/10 rounded-[16px] cursor-pointer transition-colors" onClick={() => addItem(file)}>
                                <div className="w-12 h-12 bg-black/50 rounded-[12px] overflow-hidden flex-shrink-0 relative border border-white/10">
                                    {/* Use local server for thumbnails */}
                                    {file.type === 'video' ? (
                                        <Film size={20} className="m-auto text-white/50" />
                                    ) : (
                                        <img src={`http://localhost:11222/${file.relativePath}`} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs truncate font-medium">{file.name}</p>
                                    <p className="text-white/30 text-[10px] truncate">{file.relativePath}</p>
                                </div>
                                <Plus size={18} className="text-electric-blurple opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
