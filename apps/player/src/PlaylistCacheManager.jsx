import React, { useEffect, useState } from 'react';

const CACHE_NAME = 'lumen-media-cache';

export default function PlaylistCacheManager({ playlist }) {
    const [cachingStatus, setCachingStatus] = useState('idle'); // idle, caching, done, error
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!playlist || !playlist.items || playlist.items.length === 0) return;

        const cachePlaylist = async () => {
            setCachingStatus('caching');
            setProgress(0);

            try {
                const cache = await caches.open(CACHE_NAME);
                const items = playlist.items;
                let cachedCount = 0;

                for (const item of items) {
                    // Debug: Check what we are working with
                    console.log('Cache processing item:', item);

                    let src = item.url;

                    // Logic to determine the correct URL for the Local Asset Server
                    // ONLY if on localhost
                    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

                    if (!src && isLocalhost) {
                        if (item.relativePath) {
                            src = `http://localhost:11222/${item.relativePath}`;
                        } else if (item.path && item.path.includes('Assets')) {
                            let parts = item.path.split('Assets');
                            if (parts.length > 1) {
                                let rel = parts.pop();
                                rel = rel.replace(/^[/\\]/, '').replace(/\\/g, '/');
                                src = `http://localhost:11222/${rel}`;
                            } else {
                                const filename = item.path.split(/[/\\]/).pop();
                                src = `http://localhost:11222/${filename}`;
                            }
                        } else if (item.name) {
                            src = `http://localhost:11222/${item.name}`;
                        }
                    }

                    if (!src) continue;

                    try {
                        // Check if already in cache
                        const match = await cache.match(src);
                        if (!match) {
                            console.log(`Caching: ${src}`);
                            const response = await fetch(src);
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                            }
                            await cache.put(src, response);
                        }
                    } catch (err) {
                        console.error(`Failed to cache ${src}`, err.message || err);
                    }

                    cachedCount++;
                    setProgress(Math.round((cachedCount / items.length) * 100));
                }

                setCachingStatus('done');
                console.log('Playlist caching complete.');

            } catch (error) {
                console.error("Cache Manager Error:", error);
                setCachingStatus('error');
            }
        };

        cachePlaylist();

    }, [playlist]);

    // Debugging UI (Positioned absolute bottom right)
    if (cachingStatus === 'idle' || cachingStatus === 'done') return null;

    return (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white text-[10px] px-3 py-1.5 rounded-full backdrop-blur-sm z-50 flex items-center space-x-2 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Baixando Conteúdo... {progress}%</span>
        </div>
    );
}
