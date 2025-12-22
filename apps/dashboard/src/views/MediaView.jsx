import React, { useState, useEffect } from 'react';
import { Upload, Folder, Image as ImageIcon, Film, Trash2, X } from 'lucide-react';

const AssetCard = ({ file, isSelected, onClick, onNavigate }) => {
    // Construct Local Asset URL
    const assetUrl = `http://localhost:11222/${file.relativePath}`;
    // Note: The 'relativePath' might contain subdirs e.g. "Foo/Bar.jpg".
    // Our Server at 11222 handles "Foo/Bar.jpg" correctly if stripped of leading slash?
    // main.cjs: const fileName = safeUrl.replace(/^\//, ''); const filePath = path.join(ASSETS_PATH, fileName);
    // So yes, it should work for nested files.

    const isVideo = file.type === 'video' || file.name.match(/\.(mp4|webm|mov)$/i);
    const isFolder = file.type === 'folder';

    return (
        <div
            className={`group relative aspect-square bg-[#2a2a2a] rounded-xl border overflow-hidden transition-all cursor-pointer
                ${isSelected ? 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.5)]' : 'border-white/5 hover:border-blue-500/50'}
            `}
            onClick={onClick}
            onDoubleClick={(e) => { e.stopPropagation(); isFolder && onNavigate(file.name); }}
        >
            {/* Selection Indicator */}
            {isSelected && (
                <div className="absolute top-2 left-2 z-10 w-4 h-4 bg-blue-500 rounded-full border border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                </div>
            )}

            {/* Preview */}
            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                {isFolder ? (
                    <Folder size={48} className="text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : isVideo ? (
                    <video
                        src={assetUrl}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        muted
                        loop
                        onMouseOver={e => e.target.play().catch(() => { })}
                        onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                ) : (
                    <img
                        src={assetUrl}
                        alt={file.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                )}
            </div>

            {/* Overlay Info */}
            <div className={`absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pt-10 transition-opacity pointer-events-none 
                ${isSelected || isFolder ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <p className="text-xs font-medium text-white truncate">{file.name}</p>
                <p className="text-[10px] text-white/50">{file.size}</p>
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
                                <button onClick={handleGoBack} className="text-white/40 hover:text-white mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                            )}
                            <h2 className="text-2xl font-semibold text-white">Biblioteca</h2>
                        </div>
                        <p className="text-white/40 text-sm flex items-center gap-1">
                            <Folder size={12} />
                            <span>/Assets/{currentPath}</span>
                        </p>
                    </div>

                    {/* Selection Context Actions */}
                    {selectedItems.size > 0 && (
                        <div className="flex items-center space-x-2 bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/30 animate-fade-in">
                            <span className="text-blue-400 text-sm font-medium">{selectedItems.size} selecionado(s)</span>

                            <div className="h-4 w-px bg-blue-500/30 mx-1"></div>

                            <button
                                onClick={deleteSelected}
                                className="p-1.5 text-white/60 hover:text-red-500 transition-colors rounded-md hover:bg-white/5"
                                title="Deletar Selecionados"
                            >
                                <Trash2 size={16} />
                            </button>
                            <button
                                onClick={() => setSelectedItems(new Set())}
                                className="p-1.5 text-white/60 hover:text-white transition-colors rounded-md hover:bg-white/5"
                                title="Cancelar Seleção"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/5"
                    >
                        <Folder size={16} />
                        <span>Nova Pasta</span>
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Upload size={16} />
                        <span>Importar</span>
                    </button>
                </div>
            </div>

            {/* Create Folder Modal */}
            {isCreatingFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#222] border border-white/10 rounded-xl p-6 w-[320px] shadow-2xl">
                        <h3 className="text-white font-medium mb-4">Nova Pasta</h3>
                        <form onSubmit={submitCreateFolder}>
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 mb-4"
                                placeholder="Nome da pasta"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingFolder(false)}
                                    className="px-3 py-1.5 text-sm text-white/60 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
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
                className={`flex-1 overflow-y-auto rounded-3xl border-2 border-dashed transition-all duration-300 relative
          ${isDragging
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/5 bg-[#1a1a1a]/50'
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => setSelectedItems(new Set())} // Click background deselects
            >
                {assets.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none">
                        <Upload size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Arraste seus arquivos aqui</p>
                        <p className="text-sm">Suporta JPG, PNG, MP4</p>
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6" onClick={e => e.stopPropagation()}>
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
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm rounded-[22px] pointer-events-none">
                        <p className="text-2xl font-bold text-white drop-shadow-md">Solte para importar</p>
                    </div>
                )}
            </div>
        </div>
    );
}
