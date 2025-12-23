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

// Sub-component for rendering individual media item
const MediaLayer = ({ item, isVisible, onEnded, zIndex, onAutoplayError }) => {
    const videoRef = useRef(null);
    const src = useMemo(() => getMediaSrc(item), [item]);
    const [opacity, setOpacity] = useState(0);

    // Fade-in Logic
    useEffect(() => {
        if (isVisible) {
            // Small delay to ensure mount before transition
            requestAnimationFrame(() => {
                setOpacity(1);
            });
        } else {
            setOpacity(0);
        }
    }, [isVisible]);

    useEffect(() => {
        // Handle Video Playback
        if (item?.type === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            // IMPORTANT: "muted" attribute in JSX is sometimes not enough for React re-renders
            videoRef.current.muted = true;

            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("Autoplay blocked (caught in MediaLayer):", e);
                    if (onAutoplayError) onAutoplayError();
                });
            }
        }
    }, [item]);

    if (!item) return null;

    return (
        <div
            className="absolute inset-0 w-full h-full bg-black transition-opacity duration-1000 ease-in-out"
            style={{
                zIndex,
                opacity: isVisible ? opacity : 0 // Controlled opacity
            }}
        >
            {item.type === 'video' ? (
                <video
                    ref={videoRef}
                    src={src}
                    className="w-full h-full object-cover"
                    muted={true} // Explicit JSX property
                    autoPlay={true} // Try force autoplay
                    playsInline={true}
                    onEnded={onEnded}
                    onError={(e) => console.error("Video Load Error:", e)}
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
    // Double Buffer: Active (1) and Previous (0).
    const [activeIndex, setActiveIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState(0);
    const [needsInteraction, setNeedsInteraction] = useState(false);

    const activeItem = items[activeIndex];
    const prevItem = items[prevIndex];

    const timeoutRef = useRef(null);

    const triggerNext = () => {
        if (items.length <= 1) return;

        setPrevIndex(activeIndex);
        const next = (activeIndex + 1) % items.length;
        setActiveIndex(next);

        // Cleanup background after transition (1.2s)
        setTimeout(() => {
            setPrevIndex(next);
        }, 1200);
    };

    // Duration Timer for Images
    useEffect(() => {
        if (!activeItem) return;

        if (activeItem.type === 'image') {
            const duration = (activeItem.duration || 10) * 1000;
            timeoutRef.current = setTimeout(triggerNext, duration);
        }
        return () => clearTimeout(timeoutRef.current);
    }, [activeIndex, activeItem, items.length]);

    const handleVideoEnded = () => {
        triggerNext();
    };

    const handleAutoplayError = () => {
        console.log("TRIGGERING TAP TO START OVERLAY");
        setNeedsInteraction(true);
    };

    const handleUserInteraction = () => {
        console.log("User tapped screen. Retrying playback.");
        setNeedsInteraction(false);
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            v.muted = true;
            v.play().then(() => console.log("Retry success")).catch(e => console.error("Retry failed:", e));
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
        <div className="bg-black w-full h-screen overflow-hidden relative" onClick={() => {
            // Global click handler to unlock context just in case
            if (needsInteraction) handleUserInteraction();
        }}>

            {/* Background Layer (Previous Item) */}
            {prevIndex !== activeIndex && (
                <MediaLayer
                    item={prevItem}
                    isVisible={true} // Previous item stays visible (opacity 1) until unmounted/replaced
                    zIndex={0}
                />
            )}

            {/* Foreground Layer (Active Item) */}
            {/* Key forces remount, triggering opacity 0->1 transition */}
            <MediaLayer
                key={activeIndex}
                item={activeItem}
                isVisible={true}
                zIndex={10}
                onEnded={handleVideoEnded}
                onAutoplayError={handleAutoplayError}
            />

            {/* Interaction Overlay */}
            {needsInteraction && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/90 cursor-pointer"
                    style={{ zIndex: 9999, pointerEvents: 'auto' }}
                    onClick={handleUserInteraction}
                >
                    {console.log("RENDER: Rendering Interaction Overlay")}
                    <div className="text-center">
                        <div className="text-6xl mb-6 text-yellow-400">👆</div>
                        <h2 className="text-4xl font-bold text-white mb-2">Toque para Iniciar</h2>
                        <p className="text-xl text-gray-300">Necessário interação para ativar o som/vídeo</p>
                        <button className="mt-4 px-6 py-2 bg-yellow-500 text-black font-bold rounded">INICIAR AGORA</button>
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
