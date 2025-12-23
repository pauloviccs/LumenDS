import React, { useState, useEffect, useRef, useMemo } from 'react';

// Helper to resolve media URLs
const getMediaSrc = (item) => {
    if (!item) return '';
    let src = item.url;
    // Simple localhost check to strip absolute paths if needed (legacy logic)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!src && isLocalhost) {
        if (item.path && (item.path.includes(':\\') || item.path.startsWith('/'))) {
            const filename = item.path.split(/[/\\]/).pop();
            src = `http://localhost:11222/${filename}`;
        } else if (item.name) {
            src = `http://localhost:11222/${item.name}`;
        }
    }
    return src;
};

export default function PlayerView({ playlist }) {
    const items = playlist?.items || [];

    // BACK TO BASICS: Single Active Item. No Double Buffer. No Crossfade.
    // Goal: 100% Autoplay Reliability on webOS.

    const [currentIndex, setCurrentIndex] = useState(0);
    const [needsInteraction, setNeedsInteraction] = useState(false);

    const activeItem = items[currentIndex];
    const videoRef = useRef(null);
    const timeoutRef = useRef(null);

    // Resolve URL
    const src = useMemo(() => getMediaSrc(activeItem), [activeItem]);

    const nextItem = () => {
        if (items.length <= 1) return;
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    // Effect: Handle Video Playback & Image Duration
    useEffect(() => {
        if (!activeItem) return;

        // Reset interaction state on change? Maybe not, if we needed it once, we might need it again?
        // Usually once unlocked, it stays unlocked.

        if (activeItem.type === 'image') {
            const duration = (activeItem.duration || 10) * 1000;
            timeoutRef.current = setTimeout(nextItem, duration);
        } else if (activeItem.type === 'video') {
            // Wait for 'onEnded' event.
            // But we must ensure it plays.
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.muted = true; // Force muted for autoplay policy

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error("Autoplay Error (Simple Mode):", e);
                        setNeedsInteraction(true);
                    });
                }
            }
        }

        return () => clearTimeout(timeoutRef.current);
    }, [activeItem]); // Trigger when item changes

    const handleUserInteraction = () => {
        setNeedsInteraction(false);
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            v.muted = false; // Try unmuted on interaction? Or keep muted safe? 
            // Let's keep strict policy: User clicked, we try to play.
            v.play().catch(e => console.error("Retry failed:", e));
        });
    };

    if (items.length === 0) {
        return (
            <div className="bg-black flex items-center justify-center h-screen text-white">
                <p>Playlist Vazia</p>
            </div>
        );
    }

    return (
        <div className="bg-black w-full h-full relative overflow-hidden" onClick={() => { if (needsInteraction) handleUserInteraction(); }}>

            {/* Direct Render: No Layers, No Opacity Tricks */}
            {activeItem.type === 'video' ? (
                <video
                    ref={videoRef}
                    src={src}
                    className="w-full h-full object-cover"
                    muted={true}
                    autoPlay={true}
                    playsInline={true}
                    onEnded={nextItem}
                    onError={(e) => console.error("Video Error:", e)}
                />
            ) : (
                <img
                    src={src}
                    className="w-full h-full object-cover"
                    alt="Content"
                />
            )}

            {/* Interaction Overlay */}
            {needsInteraction && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/90 cursor-pointer"
                    style={{ zIndex: 9999, pointerEvents: 'auto' }}
                    onClick={handleUserInteraction}
                >
                    <div className="text-center">
                        <div className="text-6xl mb-6 text-yellow-400">👆</div>
                        <h2 className="text-4xl font-bold text-white mb-2">Toque para Iniciar</h2>
                        <button className="mt-4 px-6 py-2 bg-yellow-500 text-black font-bold rounded">INICIAR</button>
                    </div>
                </div>
            )}

            {/* Debug Overlay */}
            <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] p-1 rounded opacity-0 hover:opacity-100 transition-opacity z-50">
                {currentIndex + 1} / {items.length}
            </div>
        </div>
    );
}
