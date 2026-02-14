import { useRef } from 'react';
import './VirtualJoystick.css';

export default function VirtualJoystick({ joystickInput }) {
    const containerRef = useRef(null);
    const knobRef = useRef(null);
    const activeRef = useRef(false);
    const startRef = useRef({ x: 0, y: 0 });
    const touchIdRef = useRef(null); // Track specific touch ID

    const MAX_DIST = 40;

    const handleStart = (clientX, clientY) => {
        activeRef.current = true;
        const rect = containerRef.current.getBoundingClientRect();
        // Joystick merkezi (sabit)
        startRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
        // İlk dokunuşta da hareket hesapla
        handleMove(clientX, clientY);
    };

    const handleMove = (clientX, clientY) => {
        if (!activeRef.current) return;

        // Delta hesapla
        let dx = clientX - startRef.current.x;
        let dy = clientY - startRef.current.y;

        // Mesafe sınırla
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, MAX_DIST);

        const angle = Math.atan2(dy, dx);
        const nx = Math.cos(angle) * clampedDist;
        const ny = Math.sin(angle) * clampedDist;

        if (knobRef.current) {
            knobRef.current.style.transform = `translate(${nx}px, ${ny}px)`;
        }

        // Çıktı: -1 ile 1 arası
        joystickInput.current = {
            x: nx / MAX_DIST,
            y: -(ny / MAX_DIST), // Yukarı (Negative Screen Y) -> Positive Input Y
        };
    };

    const handleEnd = () => {
        activeRef.current = false;
        touchIdRef.current = null;
        if (knobRef.current) {
            knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        joystickInput.current = { x: 0, y: 0 };
    };

    // ─── TOUCH EVENTS ───
    const onTouchStart = (e) => {
        e.preventDefault();
        // Eğer zaten bir parmakla yönetiliyorsa, ikincisini görmezden gel
        if (activeRef.current) return;

        const touch = e.changedTouches[0];
        if (touch) {
            touchIdRef.current = touch.identifier;
            handleStart(touch.clientX, touch.clientY);
        }
    };

    const onTouchMove = (e) => {
        e.preventDefault();
        if (!activeRef.current) return;

        // Bizim takip ettiğimiz parmak mı hareket etti?
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchIdRef.current) {
                handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                return;
            }
        }
    };

    const onTouchEnd = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchIdRef.current) {
                handleEnd();
                return;
            }
        }
    };

    // ─── MOUSE EVENTS (PC DEBUG) ───
    const onMouseDown = (e) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e) => activeRef.current && handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    return (
        <div
            ref={containerRef}
            className="joystick-container"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
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
