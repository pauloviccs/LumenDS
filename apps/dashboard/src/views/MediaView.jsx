import React, { useState, useEffect } from 'react';
import { Upload, Folder, Image as ImageIcon, Film, Trash2 } from 'lucide-react';

const AssetCard = ({ file, onDelete }) => (
    <div className="group relative aspect-square bg-[#2a2a2a] rounded-xl border border-white/5 overflow-hidden transition-all hover:border-blue-500/50">
        {/* Preview */}
        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
            {file.type === 'video' ? (
                <Film size={32} className="text-white/20" />
            ) : (
                <div className="relative w-full h-full">
                    <img src={file.preview} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
            )}
        </div>

        {/* Overlay Info */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pt-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs font-medium text-white truncate">{file.name}</p>
            <p className="text-[10px] text-white/50">{file.size}</p>
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => onDelete(file.path)}
                className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg shadow-sm backdrop-blur-sm transition-colors"
            >
                <Trash2 size={12} />
            </button>
        </div>
    </div>
);

export default function MediaView() {
    const [assets, setAssets] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    // Electron IPC - Safe wrapper
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        if (!ipcRenderer) return;
        const files = await ipcRenderer.invoke('get-assets');
        setAssets(files);
    };

    const handleImportClick = async () => {
        if (!ipcRenderer) return;
        const paths = await ipcRenderer.invoke('open-file-dialog');
        if (paths && paths.length > 0) {
            await ipcRenderer.invoke('import-assets', paths);
            loadAssets();
        }
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
            await ipcRenderer.invoke('import-assets', paths);
            loadAssets();
        } else {
            console.warn('No paths detected in drop. Electron nodeIntegration might be restricted?');
            // Fallback: If no paths, maybe try to read files? (Not implemented for Zero Cost local copy)
        }
    };

    const deleteAsset = async (fullPath) => {
        // We extract filename since our backend expects filename (or we can change backend)
        // Actually backend 'get-assets' returns full path in 'path', but 'delete-asset' currently expects filename?
        // Let's check main.cjs... it joins ASSETS_PATH + fileName. 
        // So we should pass the name.
        // Wait, let's fix the logic to be consistent. 
        // The `AssetCard` usually gets the file object.
        // Let's pass `file.name` to delete.
        if (!ipcRenderer) return;

        const fileName = fullPath.split(/[\\/]/).pop(); // Simple extraction
        await ipcRenderer.invoke('delete-asset', fileName);
        loadAssets();
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-white">Biblioteca</h2>
                    <p className="text-white/40 text-sm">Gerencie imagens e vídeos locais.</p>
                </div>
                <div className="flex space-x-2">
                    <button className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/5">
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
            >
                {assets.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none">
                        <Upload size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Arraste seus arquivos aqui</p>
                        <p className="text-sm">Suporta JPG, PNG, MP4</p>
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {assets.map((asset, i) => (
                            <AssetCard key={i} file={asset} onDelete={deleteAsset} />
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
