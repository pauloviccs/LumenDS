import React, { useState, useEffect, useRef, useMemo } from 'react';

// Helper to resolve media URLs
const getMediaSrc = (item) => {
    if (!item) return '';
    let src = item.url;
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
            }
        } else if (item.path && (item.path.includes(':\\') || item.path.startsWith('/'))) {
            const filename = item.path.split(/[/\\]/).pop();
            src = `http://localhost:11222/${filename}`;
        } else if (item.name) {
            src = `http://localhost:11222/${item.name}`;
        }
    }
    return src;
};

// Sub-component for rendering individual media item
const MediaLayer = ({ item, className, onEnded, zIndex, onAutoplayError }) => {
    const videoRef = useRef(null);
    const src = useMemo(() => getMediaSrc(item), [item]);

    useEffect(() => {
        // Handle Video Playback
        if (item?.type === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.muted = true; // Enforce muted!

            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("Autoplay blocked (interaction needed?):", e);
                    if (onAutoplayError) onAutoplayError();
                });
            }
        }
    }, [item]);

    if (!item) return null;

    return (
        <div
            className={`absolute inset-0 w-full h-full bg-black ${className || ''}`}
            style={{ zIndex }}
        >
            {item.type === 'video' ? (
                <video
                    ref={videoRef}
                    src={src}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onEnded={onEnded}
                />
            ) : (
                <img
                    src={src}
                    className="w-full h-full object-cover"
                    alt="Content"
                />
            )}
        </div>
    );
};

export default function PlayerView({ playlist }) {
    const items = playlist?.items || [];

    // Logic: 
    // We keep two layers: Active (Foreground) and Previous (Background).
    // When changing items, we set Prev = Old Active, Active = New.
    // The Active layer mounts with 'animate-fade-in' (opacity 0 -> 1).
    // The Prev layer stays visible behind it (opacity 1).
    // After 1s, we remove the Prev layer (set Prev = Active).

    const [activeIndex, setActiveIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState(0);
    const [needsInteraction, setNeedsInteraction] = useState(false);

    const activeItem = items[activeIndex];
    const prevItem = items[prevIndex];

    const timeoutRef = useRef(null);

    const triggerNext = () => {
        if (items.length <= 1) return;

        setPrevIndex(activeIndex); // Keep current as background

        const next = (activeIndex + 1) % items.length;
        setActiveIndex(next); // Start fading in new one

        // Cleanup background after transition
        setTimeout(() => {
            setPrevIndex(next);
        }, 1200); // 1.2s to be safe (Anim is 1s)
    };

    // Duration Timer for Images
    useEffect(() => {
        if (!activeItem) return;

        // If activeItem is image, wait duration then next.
        // If Active != Prev, we are transitioning, but the duration should count for the NEW item being shown.

        if (activeItem.type === 'image') {
            const duration = (activeItem.duration || 10) * 1000;
            timeoutRef.current = setTimeout(triggerNext, duration);
        }

        return () => clearTimeout(timeoutRef.current);
    }, [activeIndex, activeItem, items.length]);

    const handleVideoEnded = () => {
        // Only trigger if this is the ACTIVE video ending
        triggerNext();
    };

    const handleAutoplayError = () => {
        setNeedsInteraction(true);
    };

    const handleUserInteraction = () => {
        setNeedsInteraction(false);
        // Attempt to play all videos (usually just the active one)
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            v.muted = true;
            v.play().catch(e => console.log("Retry play failed", e));
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
        <div className="bg-black w-full h-screen overflow-hidden relative">

            {/* Background Layer (Previous Item) */}
            {/* Only render if different, otherwise it's redundant/wasteful */}
            {prevIndex !== activeIndex && (
                <MediaLayer
                    item={prevItem}
                    zIndex={0}
                // No animation, just stays there
                />
            )}

            {/* Foreground Layer (Active Item) */}
            {/* Key needed to force remount and trigger animation */}
            <MediaLayer
                key={activeIndex}
                item={activeItem}
                zIndex={10}
                className="animate-fade-in"
                onEnded={handleVideoEnded}
                onAutoplayError={handleAutoplayError}
            />

            {/* Interaction Overlay */}
            {needsInteraction && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
                    onClick={handleUserInteraction}
                >
                    <div className="text-center animate-pulse">
                        <div className="text-6xl mb-4">👆</div>
                        <h2 className="text-2xl font-bold text-white">Toque para Iniciar</h2>
                        <p className="text-white/70">O som/vídeo foi bloqueado pelo navegador.</p>
                    </div>
                </div>
            )}

            {/* Debug Overlay (Hidden in Prod) */}
            <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] p-1 rounded opacity-0 hover:opacity-100 transition-opacity z-50">
                {activeIndex + 1} / {items.length}
            </div>
        </div>
    );
}
