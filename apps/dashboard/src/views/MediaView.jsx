import React, { useState, useEffect } from 'react';
import {
    IoCloudUpload,
    IoFolder,
    IoImage,
    IoFilm,
    IoTrash,
    IoClose,
    IoAdd
} from 'react-icons/io5';

const AssetCard = ({ file, isSelected, onClick, onNavigate }) => {
    // Construct Local Asset URL
    const assetUrl = `http://localhost:11222/${file.relativePath}`;
    const isVideo = file.type === 'video' || file.name.match(/\.(mp4|webm|mov)$/i);
    const isFolder = file.type === 'folder';

    return (
        <div
            className={`group relative aspect-square liquid-card overflow-hidden cursor-pointer rounded-[22px]
                ${isSelected
                    ? 'ring-2 ring-electric-blurple shadow-[0_0_20px_rgba(94,96,206,0.5)]'
                    : 'hover:ring-2 hover:ring-white/10'}
            `}
            onClick={onClick}
            onDoubleClick={(e) => { e.stopPropagation(); isFolder && onNavigate(file.name); }}
        >
            {/* Selection Indicator */}
            {isSelected && (
                <div className="absolute top-2 left-2 z-10 w-3 h-3 bg-electric-blurple rounded-full shadow-[0_0_10px_#5E60CE]" />
            )}

            {/* Preview */}
            <div className="w-full h-full flex items-center justify-center bg-black/20">
                {isFolder ? (
                    <div className="relative flex flex-col items-center justify-center">
                        <IoFolder size={52} className="text-electric-blurple drop-shadow-lg" />
                    </div>
                ) : isVideo ? (
                    <video
                        src={assetUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        onMouseOver={e => e.target.play().catch(() => { })}
                        onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                ) : (
                    <img
                        src={assetUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* Overlay Info (Compact) */}
            <div className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 transition-all duration-300
                ${isSelected || isFolder ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                <p className="text-[10px] font-bold text-white truncate text-center tracking-wide">{file.name}</p>
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

    return (
        <div className="space-y-6 h-full flex flex-col relative">
            {/* Header */}
            <div className="flex items-center justify-between relative z-20">
                <div className="flex items-center space-x-4">
                    <div>
                        <div className="flex items-center space-x-2">
                            {currentPath && (
                                <button onClick={handleGoBack} className="text-white/40 hover:text-white mr-2 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                            )}
                            <h2 className="text-3xl font-bold text-white font-header tracking-tight">Biblioteca</h2>
                        </div>
                        <p className="text-white/40 text-sm flex items-center gap-2 mt-1 font-medium">
                            <span className="bg-white/10 px-2 py-0.5 rounded-[8px] text-[10px] uppercase tracking-wider">Local</span>
                            <span>{currentPath ? `/ ${currentPath}` : '/ Root'}</span>
                        </p>
                    </div>

                    {/* Selection Context Actions */}
                    {selectedItems.size > 0 && (
                        <div className="flex items-center space-x-3 glass-panel px-4 py-2 animate-fade-in shadow-xl rounded-[20px]">
                            <span className="text-electric-blurple font-bold">{selectedItems.size}</span>
                            <span className="text-white/60 text-sm">selecionados</span>

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
                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center space-x-2 bg-[#1a1a1a]/60 hover:bg-[#2a2a2a] border border-white/10 text-white/90 px-6 py-3 rounded-[25px] text-sm font-medium transition-all hover:border-white/30 backdrop-blur-md shadow-lg group"
                    >
                        <IoAdd size={20} className="opacity-70 group-hover:scale-110 transition-transform" />
                        <span>Nova Pasta</span>
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="flex items-center space-x-2 bg-gradient-to-br from-electric-blurple/80 to-[#4c1d95]/80 hover:from-electric-blurple hover:to-[#4c1d95] text-white px-6 py-3 rounded-[25px] text-sm font-medium shadow-lg shadow-electric-blurple/20 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
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
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-electric-blurple to-transparent" />

                        <h3 className="text-2xl font-bold text-white mb-6 font-header">Nova Pasta</h3>
                        <form onSubmit={submitCreateFolder}>
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-[#0a0a0a]/50 border border-white/10 rounded-[18px] px-5 py-4 text-white outline-none focus:border-electric-blurple focus:ring-1 focus:ring-electric-blurple transition-all mb-6 placeholder:text-white/20 font-mono"
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
                                    className="px-8 py-3 text-sm font-semibold bg-electric-blurple hover:bg-[#4d4fbb] text-white rounded-[25px] shadow-lg shadow-electric-blurple/20 transition-all border border-white/10"
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
                        <p className="text-xl font-bold font-header">Sua biblioteca está vazia</p>
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
                    <div className="absolute inset-0 flex items-center justify-center bg-electric-blurple/20 backdrop-blur-md rounded-[40px] pointer-events-none z-50">
                        <div className="bg-black/40 px-8 py-4 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl">
                            <p className="text-2xl font-bold text-white drop-shadow-lg font-header">Solte para adicionar ✨</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
