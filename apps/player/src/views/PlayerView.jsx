import React, { useState, useEffect, useRef } from 'react';

export default function PlayerView({ playlist }) {
    const [iteration, setIteration] = useState(0); // Use distinct iteration to trigger effects even on same index
    const videoRef = useRef(null);

    const items = playlist?.items || [];
    const currentIndex = iteration % (items.length || 1);
    const currentItem = items[currentIndex];

    useEffect(() => {
        if (!currentItem) return;

        let timer;
        if (currentItem.type === 'image') {
            const duration = (currentItem.duration || 10) * 1000;
            timer = setTimeout(nextItem, duration);
        } else if (currentItem.type === 'video') {
            // Video handles its own nextItem via 'onEnded'
            if (videoRef.current) {
                // Force play if it was already mounted and finished
                videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
            }
        }

        return () => clearTimeout(timer);
    }, [iteration, currentItem]); // Re-run whenever iteration changes

    const nextItem = () => {
        setIteration(prev => prev + 1);
    };

    if (!currentItem) {
        return (
            <div className="bg-black flex items-center justify-center h-screen text-white">
                <p>Playlist Vazia</p>
            </div>
        );
    }

    // Determine Source URL (Handle local tunnel vs remote)
    // For Zero Cost Tunnel, the 'path' might be a full URL or relative.
    // In Dashboard MediaView, we used local paths. 
    // We need to decide: Does the dashboard send the FILE itself or a URL?
    // Current Plan: Dashboard hosts a server.
    // We will assume 'item.url' is provided in the playlist json.
    // Determine Source URL (Handle local tunnel vs remote)
    let src = currentItem.url || currentItem.path;

    // Zero Cost Tunnel Logic:
    // If it's a Windows absolute path, assume it's hosted by Dashboard on localhost
    // FIXED: Do not blindly strip folders. Use relativePath if available.

    // Check if we already constructed a valid URL (e.g. from PlaylistCacheManager logic that might have updated properties? No, that updates cache)
    // We must reconstruct logic here.

    if (!currentItem.url) {
        if (currentItem.relativePath) {
            src = `http://localhost:11222/${currentItem.relativePath}`;
        } else if (src && src.includes('Assets')) {
            // Fallback for items imported before relativePath was added
            let parts = src.split('Assets');
            if (parts.length > 1) {
                let rel = parts.pop();
                rel = rel.replace(/^[/\\]/, '').replace(/\\/g, '/');
                src = `http://localhost:11222/${rel}`;
            }
        } else if (src && (src.includes(':\\') || src.startsWith('/'))) {
            // Absolute path without known 'Assets' anchor? 
            // Fallback to filename (risky but matches old behavior)
            const filename = src.split(/[/\\]/).pop();
            src = `http://localhost:11222/${filename}`;
        }
    }

    // Rotation Styles
    // Rotation Styles


    return (
        <div className="bg-black w-full h-screen overflow-hidden relative">
            <div className="w-full h-full bg-black">
                {currentItem.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={src}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                        onEnded={nextItem}
                    />
                ) : (
                    <img
                        src={src}
                        className="w-full h-full object-cover animate-fade-in"
                        alt="Content"
                    />
                )}
            </div>

            {/* Debug Overlay (Hidden in Prod) */}
            <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] p-1 rounded opacity-0 hover:opacity-100 transition-opacity z-50">
                {currentIndex + 1} / {items.length}
            </div>
        </div>
    );
}
