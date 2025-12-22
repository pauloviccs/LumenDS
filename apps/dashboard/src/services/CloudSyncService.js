
import { supabase } from '../lib/supabase';

// Helper to determine mime type (basic)
const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif'
    };
    return map[ext] || 'application/octet-stream';
};

export const CloudSyncService = {

    /**
     * Uploads a single local file to Supabase Storage
     * @param {File} fileObject - The HTML5 File object or similar
     * @param {string} path - The relative path locally (used as storage path)
     * @returns {Promise<string>} - The public URL
     */
    async uploadAsset(fileBuffer, filePath) {
        // Sanitize path for storage (remove spaces, special chars)
        const storagePath = filePath.replace(/[^a-zA-Z0-9/._-]/g, '_');

        try {
            const { data, error } = await supabase.storage
                .from('campaign-assets')
                .upload(storagePath, fileBuffer, {
                    cacheControl: '3600',
                    upsert: true, // Overwrite if exists to ensure latest version
                    contentType: getMimeType(filePath)
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('campaign-assets')
                .getPublicUrl(storagePath);

            return publicUrl;
        } catch (err) {
            console.error('Upload failed:', err);
            throw err;
        }
    },

    /**
     * Syncs a playlist's local assets to the cloud
     * and updates the database record.
     */
    async publishPlaylist(playlistId, playlistName, items) {
        if (!items || items.length === 0) return;

        console.log(`Starting sync for playlist: ${playlistName}`);

        // We need to read the actual files from disk. 
        // In Electron, we can't just pass paths to Supabase JS client easily if they are outside browser scope?
        // Actually, we need to read them as Blobs/Buffers via IPC.

        // 1. Map items to Cloud URLs
        // 1. Map items to Cloud URLs
        const cloudItems = await Promise.all(items.map(async (item) => {
            // Using Electron IPC to read file from disk
            const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
            if (!ipcRenderer) throw new Error("Electron IPC not available");

            const fileData = await ipcRenderer.invoke('read-file-buffer', item.path);

            if (!fileData) {
                console.error(`Could not read file: ${item.path}`);
                return item; // Keep local? Or fail?
            }

            // Convert buffer to Blob for Supabase upload
            const blob = new Blob([fileData], { type: getMimeType(item.path) });

            const publicUrl = await this.uploadAsset(blob, item.relativePath || item.name);

            return {
                ...item,
                url: publicUrl, // The Cloud URL
                source: 'cloud'
            };
        }));

        // 2. Update Playlist in DB
        const { error } = await supabase
            .from('playlists')
            .update({
                items: cloudItems,
                updated_at: new Date()
            })
            .eq('id', playlistId);

        if (error) throw error;

        console.log('Playlist published successfully!');
        return cloudItems;
    }
};
