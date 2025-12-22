import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, GripVertical, Image as ImageIcon, Film } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';

// Sortable Item Component
function SortableItem({ id, item, onRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center space-x-3 bg-[#2a2a2a] p-3 rounded-lg border border-white/5 group">
            <button {...attributes} {...listeners} className="text-white/20 hover:text-white cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
            </button>
            <div className="w-12 h-12 bg-black rounded overflow-hidden flex-shrink-0">
                {item.type === 'video' ? <Film size={20} className="m-auto text-white/50 h-full" /> : <img src={`file://${item.path}`} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{item.name}</p>
                <p className="text-white/40 text-xs">{item.duration}s</p>
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
                const files = await ipcRenderer.invoke('get-assets');
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
            path: file.path,
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
            <div className="bg-[#1a1a1a] w-full max-w-5xl h-full max-h-[80vh] rounded-3xl border border-white/10 flex overflow-hidden shadow-2xl">

                {/* Left: Editor */}
                <div className="flex-1 flex flex-col border-r border-white/10">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-transparent text-2xl font-bold text-white outline-none placeholder-white/20 w-full"
                        />
                        <button onClick={onClose} className="text-white/40 hover:text-white"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-[#111]">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={items} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <SortableItem key={item.id} id={item.id} item={item} onRemove={removeItem} />
                                    ))}
                                    {items.length === 0 && (
                                        <div className="text-center py-20 text-white/20 border-2 border-dashed border-white/5 rounded-xl">
                                            Adicione itens da biblioteca ao lado
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div className="p-6 border-t border-white/10 bg-[#1a1a1a]">
                        <button onClick={handleSave} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2">
                            <Save size={20} />
                            <span>Salvar Playlist</span>
                        </button>
                    </div>
                </div>

                {/* Right: Library */}
                <div className="w-80 bg-[#222] flex flex-col">
                    <div className="p-4 border-b border-white/5">
                        <h3 className="text-white font-medium">Biblioteca</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {availableMedia.map((file, i) => (
                            <div key={i} className="group flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors" onClick={() => addItem(file)}>
                                <div className="w-12 h-12 bg-black rounded overflow-hidden flex-shrink-0">
                                    {file.type === 'video' ? <Film size={20} className="m-auto text-white" /> : <img src={file.preview} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs truncate">{file.name}</p>
                                    <p className="text-white/30 text-[10px]">Clique para adicionar</p>
                                </div>
                                <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
