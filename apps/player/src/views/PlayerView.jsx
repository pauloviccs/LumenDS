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
    // Determine Source URL
    let src = currentItem.url; // Prefer Cloud URL

    // Fallback to Local Asset Server ONLY if:
    // 1. No Cloud URL exists
    // 2. AND we are running on localhost (Electron/Dev)
    // This prevents "Local Network Access" prompts on public HTTPS deployments
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (!src && isLocalhost) {
        if (currentItem.relativePath) {
            src = `http://localhost:11222/${currentItem.relativePath}`;
        } else if (currentItem.path && currentItem.path.includes('Assets')) {
            // Smart Fallback for Windows Paths
            let parts = currentItem.path.split('Assets');
            if (parts.length > 1) {
                let rel = parts.pop();
                rel = rel.replace(/^[/\\]/, '').replace(/\\/g, '/');
                src = `http://localhost:11222/${rel}`;
            }
        } else if (currentItem.path && (currentItem.path.includes(':\\') || currentItem.path.startsWith('/'))) {
            // Absolute path fallback
            const filename = currentItem.path.split(/[/\\]/).pop();
            src = `http://localhost:11222/${filename}`;
        } else if (currentItem.name) {
            src = `http://localhost:11222/${currentItem.name}`;
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
