import { useRef, useCallback } from 'react';
import './VirtualJoystick.css';

export default function VirtualJoystick({ joystickInput }) {
    const containerRef = useRef(null);
    const knobRef = useRef(null);
    const activeRef = useRef(false);
    const startRef = useRef({ x: 0, y: 0 });

    const MAX_DIST = 40;

    const handleStart = useCallback((clientX, clientY) => {
        activeRef.current = true;
        const rect = containerRef.current.getBoundingClientRect();
        startRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    }, []);

    const handleMove = useCallback((clientX, clientY) => {
        if (!activeRef.current) return;
        const dx = clientX - startRef.current.x;
        const dy = clientY - startRef.current.y;
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DIST);
        const angle = Math.atan2(dy, dx);
        const nx = Math.cos(angle) * dist;
        const ny = Math.sin(angle) * dist;

        if (knobRef.current) {
            knobRef.current.style.transform = `translate(${nx}px, ${ny}px)`;
        }

        joystickInput.current = {
            x: nx / MAX_DIST,
            y: -ny / MAX_DIST, // Y eksenini ters çevir
        };
    }, []);

    const handleEnd = useCallback(() => {
        activeRef.current = false;
        if (knobRef.current) {
            knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        joystickInput.current = { x: 0, y: 0 };
    }, []);

    // Touch events
    const onTouchStart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = (e) => {
        e.preventDefault();
        handleEnd();
    };

    // Mouse events (PC test için)
    const onMouseDown = (e) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    return (
        <div
            ref={containerRef}
            className="joystick-container"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            <div className="joystick-base">
                <div ref={knobRef} className="joystick-knob" />
            </div>
        </div>
    );
}
