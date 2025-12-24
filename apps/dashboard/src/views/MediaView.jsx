import React, { useState, useEffect } from 'react';
import {
    IoCloudUpload,
    IoFolder,
    IoImage,
    IoFilm,
    IoTrash,
    IoClose,
    IoAdd,
    IoSync,
    IoCheckmarkCircle
} from 'react-icons/io5';
import { supabase } from '../lib/supabase';

const AssetCard = ({ file, isSelected, onClick, onNavigate }) => {
    // Construct Local Asset URL
    const assetUrl = `http://localhost:11222/${file.relativePath}`;
    const isVideo = file.type === 'video' || file.name.match(/\.(mp4|webm|mov)$/i);
    const isFolder = file.type === 'folder';

    return (
        <div className={`group relative aspect-square liquid-card overflow-hidden cursor-pointer rounded-[22px]
                ${isSelected
                ? 'ring-2 ring-lumen-accent shadow-[0_0_20px_rgba(94,96,206,0.5)]'
                : 'hover:ring-2 hover:ring-white/10'}
            `}
            onClick={onClick}
            onDoubleClick={(e) => { e.stopPropagation(); isFolder && onNavigate(file.name); }}
        >
            {/* Selection Indicator */}
            {isSelected && (
                <div className="absolute top-2 left-2 z-10 w-3 h-3 bg-lumen-accent rounded-full shadow-[0_0_10px_#5E60CE]" />
            )}

            {/* Preview */}
            <div className="w-full h-full flex items-center justify-center bg-black/20">
                {isFolder ? (
                    <div className="relative flex flex-col items-center justify-center">
                        <IoFolder size={52} className="text-lumen-accent drop-shadow-lg" />
                    </div>
                ) : isVideo ? (
                    <video
                        src={`${assetUrl}#t=0.01`}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        preload="metadata"
                        playsInline
                        onMouseOver={e => e.target.play().catch(() => { })}
                        onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                        onError={(e) => {
                            console.error("Video error:", e);
                            e.target.style.display = 'none';
                        }}
                    >
                        {/* Fallback for really broken videos */}
                        <div className="flex items-center justify-center h-full w-full text-white">
                            <IoFilm size={32} />
                        </div>
                    </video>
                ) : (
                    <img
                        src={assetUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* Overlay Info (Expanded on Hover) */}
            <div className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 transition-all duration-300
                ${isSelected || isFolder ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}
                group-hover:bg-gradient-to-t group-hover:from-black group-hover:via-black/80 group-hover:to-transparent group-hover:pb-4
            `}>
                <p className="text-[10px] font-bold text-white text-center tracking-wide transition-all duration-300
                    truncate group-hover:whitespace-normal group-hover:break-words group-hover:line-clamp-none
                " title={file.name}>
                    {file.name}
                </p>
            </div>
        </div>
    );
};

export default function MediaView() {
    const [assets, setAssets] = useState([]);
    const [currentPath, setCurrentPath] = useState(''); // Relative path (e.g. "Folder A", "Folder A/Sub")
    const [isDragging, setIsDragging] = useState(false);

    // Selection state
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [isSyncing, setIsSyncing] = useState(false);

    // Electron IPC - Safe wrapper
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    useEffect(() => {
        loadAssets();
        setSelectedItems(new Set()); // Clear selection on path change
    }, [currentPath]); // Reload when path changes

    const loadAssets = async () => {
        if (!ipcRenderer) return;
        const files = await ipcRenderer.invoke('get-assets', currentPath);
        // Sort: Folders first, then files
        const sorted = files.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
        setAssets(sorted);
    };

    const handleImportClick = async () => {
        if (!ipcRenderer) return;
        const paths = await ipcRenderer.invoke('open-file-dialog');
        if (paths && paths.length > 0) {
            await ipcRenderer.invoke('import-assets', { filePaths: paths, subDir: currentPath });
            loadAssets();
        }
    };

    const handleCreateFolder = () => {
        setIsCreatingFolder(true);
        setNewFolderName('');
    };

    const submitCreateFolder = async (e) => {
        e.preventDefault();
        if (newFolderName && ipcRenderer) {
            await ipcRenderer.invoke('create-folder', { subDir: currentPath, name: newFolderName });
            loadAssets();
            setIsCreatingFolder(false);
        }
    };

    const handleNavigate = (folderName) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        setCurrentPath(newPath);
    };

    const handleGoBack = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (!ipcRenderer) return;

        const files = Array.from(e.dataTransfer.files);
        // Explicitly map path and filter out undefineds
        const paths = files.map(f => {
            // In some Electron versions/contexts, path is on the file object
            return f.path;
        }).filter(p => !!p);

        console.log('Detected Paths:', paths);

        if (paths.length > 0) {
            await ipcRenderer.invoke('import-assets', { filePaths: paths, subDir: currentPath });
            loadAssets();
        } else {
            console.warn('No paths detected in drop. Electron nodeIntegration might be restricted?');
        }
    };

    const toggleSelection = (relativePath, multiSelect) => {
        const newSet = new Set(multiSelect ? selectedItems : []);
        if (newSet.has(relativePath)) {
            newSet.delete(relativePath);
        } else {
            newSet.add(relativePath);
        }
        setSelectedItems(newSet);
    };

    const deleteSelected = async () => {
        if (selectedItems.size === 0) return;
        if (!ipcRenderer) return;

        const count = selectedItems.size;
        if (confirm(`Tem certeza que deseja deletar ${count} item(s)?`)) {
            // Delete one by one (could be optimized batch IPC but this is fine)
            for (const itemPath of selectedItems) {
                await ipcRenderer.invoke('delete-asset', itemPath);
            }
            setSelectedItems(new Set());
            loadAssets();
        }
    };

    // --- SYNC FOLDER LOGIC ---
    const handleSyncFolder = async () => {
        if (isSyncing) return;
        if (!ipcRenderer) {
            alert('Sincronização disponível apenas no App Desktop.');
            return;
        }

        const filesToSync = assets.filter(f => f.type !== 'folder');
        if (filesToSync.length === 0) {
            alert('Esta pasta não contém arquivos para sincronizar.');
            return;
        }

        if (!confirm(`Deseja enviar ${filesToSync.length} arquivos desta pasta para a nuvem (Supabase)?`)) return;

        try {
            setIsSyncing(true);
            let successCount = 0;
            const errors = [];

            for (const file of filesToSync) {
                // 1. Read Buffer
                const fileBuffer = await ipcRenderer.invoke('read-file-buffer', file.relativePath);
                if (!fileBuffer) {
                    const msg = `Leitura falhou: ${file.name}`;
                    console.error(msg);
                    errors.push(msg);
                    continue;
                }

                // 2. Sanitize Filename (Critical for Supabase)
                // Remove accents, spaces, special chars
                const sanitizedName = file.name
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .replace(/[^a-zA-Z0-9.-]/g, "_"); // Replace non-alphanumeric with _

                // Structure: campaign-assets/folder/sanitizedFilename
                const storagePath = currentPath
                    ? `${currentPath}/${sanitizedName}`
                    : sanitizedName;

                console.log(`Uploading ${file.name} as ${storagePath}...`);

                const { data, error } = await supabase.storage
                    .from('campaign-assets')
                    .upload(storagePath, fileBuffer, {
                        contentType: file.type === 'video' ? 'video/mp4' : 'image/jpeg',
                        upsert: true
                    });

                if (error) {
                    const msg = `Upload erro (${file.name}): ${error.message}`;
                    console.error(msg);
                    errors.push(msg);
                } else {
                    successCount++;
                }
            }

            let msg = `Sincronização finalizada.\nSucesso: ${successCount}/${filesToSync.length}`;
            if (errors.length > 0) {
                msg += `\n\nErros (${errors.length}):\n${errors.slice(0, 5).join('\n')}`;
                if (errors.length > 5) msg += '\n...';
            }
            alert(msg);

        } catch (error) {
            console.error('Sync error:', error);
            alert('Erro fatal ao sincronizar: ' + error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col relative">
            {/* Header */}
            <div className="flex items-center justify-between relative z-20">
                <div className="flex items-center space-x-4">
                    <div>
                        <div>
                            <div className="flex items-center space-x-2">
                                {currentPath && (
                                    <button onClick={handleGoBack} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-lumen-textMuted hover:text-white mr-2 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                )}
                                <p className="text-lumen-textMuted text-sm flex items-center gap-2 font-medium bg-white/5 pl-2 pr-4 py-1.5 rounded-lg border border-white/5">
                                    <span className="bg-lumen-accent/20 text-lumen-accent px-2 py-0.5 rounded-[6px] text-[10px] uppercase tracking-wider font-bold">Local</span>
                                    <span className="text-white font-mono text-xs">{currentPath ? `root/${currentPath}` : 'root/'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Selection Context Actions */}
                    {selectedItems.size > 0 && (
                        <div className="flex items-center space-x-3 glass-panel px-4 py-2 animate-fade-in shadow-xl rounded-[20px]">
                            <span className="text-lumen-accent font-bold">{selectedItems.size}</span>
                            <span className="text-lumen-textMuted text-sm">selecionados</span>

                            <div className="h-4 w-px bg-white/10 mx-2"></div>

                            <button
                                onClick={deleteSelected}
                                className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                                title="Deletar Selecionados"
                            >
                                <IoTrash size={20} />
                            </button>
                            <button
                                onClick={() => setSelectedItems(new Set())}
                                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                title="Cancelar Seleção"
                            >
                                <IoClose size={20} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex space-x-4">
                    {/* Sync Button */}
                    <button
                        onClick={handleSyncFolder}
                        disabled={isSyncing}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-[25px] text-sm font-medium transition-all shadow-lg border border-white/10
                            ${isSyncing
                                ? 'bg-lumen-accent/20 text-lumen-accent cursor-wait'
                                : 'bg-[#1a1a1a]/60 hover:bg-[#2a2a2a] text-white/90 hover:border-white/30'
                            }
                        `}
                    >
                        {isSyncing ? <IoSync size={20} className="animate-spin" /> : <IoCloudUpload size={20} className="" />}
                        <span>{isSyncing ? 'Enviando...' : 'Sincronizar Pasta'}</span>
                    </button>

                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center space-x-2 bg-[#1a1a1a]/60 hover:bg-[#2a2a2a] border border-white/10 text-white/90 px-6 py-3 rounded-[25px] text-sm font-medium transition-all hover:border-white/30 backdrop-blur-md shadow-lg group"
                    >
                        <IoAdd size={20} className="opacity-70 group-hover:scale-110 transition-transform" />
                        <span>Nova Pasta</span>
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="flex items-center space-x-2 bg-gradient-to-br from-lumen-accent/80 to-[#4c1d95]/80 hover:from-lumen-accent hover:to-[#4c1d95] text-white px-6 py-3 rounded-[25px] text-sm font-medium shadow-lg shadow-lumen-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
                    >
                        <IoCloudUpload size={20} />
                        <span>Importar Mídia</span>
                    </button>
                </div>
            </div>

            {/* Create Folder Modal */}
            {isCreatingFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="liquid-card p-8 w-[400px] shadow-2xl relative overflow-hidden ring-1 ring-white/10 rounded-[35px]">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-lumen-accent to-transparent" />

                        <h3 className="text-2xl font-bold text-white mb-6 font-display">Nova Pasta</h3>
                        <form onSubmit={submitCreateFolder}>
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-[#0a0a0a]/50 border border-white/10 rounded-[18px] px-5 py-4 text-white outline-none focus:border-lumen-accent focus:ring-1 focus:ring-lumen-accent transition-all mb-6 placeholder:text-lumen-textMuted/50 font-mono"
                                placeholder="Digite o nome..."
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                            />
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingFolder(false)}
                                    className="px-6 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-[25px]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 text-sm font-semibold bg-lumen-accent hover:bg-lumen-accentHover text-white rounded-[25px] shadow-lg shadow-lumen-accent/20 transition-all border border-white/10"
                                >
                                    Criar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Area with Drop Zone */}
            <div
                className={`flex-1 overflow-y-auto rounded-[40px] border-2 border-dashed transition-all duration-300 relative custom-scrollbar
          ${isDragging
                        ? 'border-electric-blurple bg-electric-blurple/10 backdrop-blur-sm'
                        : 'border-white/5 bg-transparent' // Transparent for liquid bg
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => setSelectedItems(new Set())} // Click background deselects
            >
                {assets.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 pointer-events-none">
                        <div className="w-24 h-24 rounded-[25px] bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                            <IoCloudUpload size={40} className="opacity-50" />
                        </div>
                        <p className="text-xl font-bold font-display">Sua biblioteca está vazia</p>
                        <p className="text-sm mt-2 op-60">Arraste arquivos ou clique em Importar</p>
                    </div>
                ) : (
                    <div className="p-8 grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-6" onClick={e => e.stopPropagation()}>
                        {assets.map((asset, i) => (
                            <AssetCard
                                key={i}
                                file={asset}
                                isSelected={selectedItems.has(asset.relativePath)}
                                onClick={(e) => toggleSelection(asset.relativePath, e.ctrlKey || e.metaKey)}
                                onNavigate={handleNavigate}
                            />
                        ))}
                    </div>
                )}

                {isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-lumen-accent/20 backdrop-blur-md rounded-[40px] pointer-events-none z-50">
                        <div className="bg-black/40 px-8 py-4 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl">
                            <p className="text-2xl font-bold text-white drop-shadow-lg font-display">Solte para adicionar ✨</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
