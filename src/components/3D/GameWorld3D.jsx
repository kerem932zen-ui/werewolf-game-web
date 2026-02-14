import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';
import { Ground, Fence, Billboard, Sky, Lighting } from './Environment';
import Player from './Player';
import RemotePlayer from './NPC'; // Re-use NPC file but import as RemotePlayer
import VirtualJoystick from './VirtualJoystick';
import ChatBox from './ChatBox';
import pieSocket from '../../services/pieSocket';
import './GameWorld3D.css';
import VoiceWrapper from '../VoiceWrapper';

// ─── ERROR BOUNDARY (Catch WebGL Crashes) ───
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("WebGL Error Caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: '#111', color: '#fff', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20, textAlign: 'center'
                }}>
                    <h2 style={{ color: '#ff5555' }}>⚠️ Grafik Hatası</h2>
                    <p>Tarayıcınız 3D çizim yapmayı reddediyor (WebGL locked).</p>
                    <p style={{ marginTop: 10, color: '#ccc' }}>Bu genellikle tarayıcıyı tamamen kapatıp açınca düzelir.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: 20, padding: '10px 20px', fontSize: 16, cursor: 'pointer' }}
                    >
                        Yeniden Dene
                    </button>
                    <pre style={{ marginTop: 10, color: '#aaa', fontSize: 12 }}>
                        {this.state.error?.message}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

const NPC_COLORS = ['#ff4444', '#44cc44', '#ffcc00', '#aa44ff', '#ff8800', '#ff66aa', '#44cccc', '#ff3366', '#33ccff', '#ff9933'];
const NPC_START_POSITIONS = [
    [6, 0, 3], [-5, 0, 7], [4, 0, -6], [-7, 0, -3], [10, 0, 5],
    [-3, 0, 10], [7, 0, -10], [-10, 0, -7], [12, 0, -3], [-6, 0, -10],
];

export default function GameWorld3D() {
    const { players, user, messages, currentRoom } = useGameStore();
    const joystickInput = useRef({ x: 0, y: 0 });
    const [micOn, setMicOn] = useState(false);
    const [visibleMsgs, setVisibleMsgs] = useState([]);
    const [playerPositions, setPlayerPositions] = useState({}); // { [id]: {x, y, z, rotation} }

    // Aksiyon Sinyalleri
    const [shouldJump, setShouldJump] = useState(false);

    const msgIdRef = useRef(0);

    // Mesajlar geldiğinde göster
    useEffect(() => {
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            const id = ++msgIdRef.current;
            setVisibleMsgs((p) => [...p.slice(-1), { ...last, _id: id }]);
            setTimeout(() => setVisibleMsgs((p) => p.filter((m) => m._id !== id)), 4000);
        }
    }, [messages.length]);

    // Socket'ten gelen hareket verilerini dinle
    useEffect(() => {
        const offMove = pieSocket.on('player_move', (data) => {
            if (data.id === user?.id) return; // Kendi hareketimizi yansıtma
            setPlayerPositions(prev => ({
                ...prev,
                [data.id]: { position: data.position, rotation: data.rotation }
            }));
        });
        return () => offMove();
    }, [user?.id]);

    const otherPlayers = useMemo(() => {
        return players.filter((p) => p.player_id !== user?.id);
    }, [players, user?.id]);

    const getAvatarColor = (index) => NPC_COLORS[index % NPC_COLORS.length];

    function toggleMic() {
        setMicOn(!micOn);
    }

    function sendChat(text) {
        if (!text.trim()) return;
        const msg = { type: 'chat', username: user?.username || 'Sen', text: text.trim() };
        useGameStore.getState().addMessage(msg);
        pieSocket.send('chat_message', msg);
    }

    // Kendi pozisyonumuzu yayınlamak için Player bileşenine callback geçeceğiz
    const broadcastPosition = (pos, rot) => {
        pieSocket.send('player_move', { id: user.id, position: pos, rotation: rot });
    };

    return (
        <VoiceWrapper roomId={currentRoom?.id} username={user?.username} micOn={micOn}>
            <div className="game-world-3d">
                <ErrorBoundary>
                    <Canvas
                        camera={{ position: [0, 8, 12], fov: 55, near: 0.1, far: 200 }}
                        gl={{
                            antialias: false,
                            powerPreference: "default",
                            failIfMajorPerformanceCaveat: false
                        }}
                        dpr={[1, 1]}
                        onCreated={({ gl }) => {
                            gl.setClearColor('#87CEEB');
                            console.log("WebGL Context Initialized");
                        }}
                    >
                        <fog attach="fog" args={['#87CEEB', 45, 85]} />

                        <Suspense fallback={null}>
                            <Lighting />
                            <Ground />
                            <Fence />
                            <Billboard />
                            <Sky />

                            <Player
                                joystickInput={joystickInput}
                                color="#44aaff"
                                username={user?.username || 'Sen'}
                                shouldJump={shouldJump}
                                onJumpReset={() => setShouldJump(false)}
                                onPositionUpdate={broadcastPosition}
                                messages={messages} // Chat mesajlarını geçir
                            />

                            {otherPlayers.map((p, i) => (
                                <RemotePlayer
                                    key={p.player_id}
                                    id={p.player_id}
                                    color={p.color || getAvatarColor(i)}
                                    startPos={NPC_START_POSITIONS[i % NPC_START_POSITIONS.length]}
                                    targetPos={playerPositions[p.player_id]?.position}
                                    targetRot={playerPositions[p.player_id]?.rotation}
                                    username={p.username}
                                    isAlive={p.is_alive !== false}
                                    messages={messages} // Chat mesajlarını geçir
                                />
                            ))}
                        </Suspense>
                    </Canvas>
                </ErrorBoundary>

                <VirtualJoystick joystickInput={joystickInput} />

                {/* AKSİYON BUTONLARI (Şeffaf) */}
                <div className="action-buttons">
                    {/* Mikrofon Butonu */}
                    <div className={`mobile-btn ${micOn ? 'active' : ''}`} onPointerDown={toggleMic} style={{ backgroundColor: micOn ? '#ef4444' : 'rgba(0,0,0,0.5)' }}>
                        {micOn ? (
                            <svg viewBox="0 0 24 24"><path fill="white" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path fill="white" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24"><path fill="white" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 2.76 2.24 5 5 5 .52 0 1.03-.09 1.5-.22l2.31 2.31L19 17.73 4.27 3zM12 19c-2.76 0-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c1.13-.16 2.19-.55 3.1-1.11l-1.58-1.58c-.46.17-.98.27-1.52.27z" /></svg>
                        )}
                    </div>

                    {/* Zıplama (SVG OK) */}
                    <div className="mobile-btn" onPointerDown={() => setShouldJump(true)}>
                        <svg viewBox="0 0 24 24">
                            <path d="M7 14l5-5 5 5H7z" />
                            <path d="M0 0h24v24H0z" fill="none" />
                        </svg>
                    </div>
                </div>

                <ChatBox messages={messages} onSend={sendChat} />

                <div className="controls-hint">
                    <span>WASD: Hareket</span>
                    <span>Space: Zıpla</span>
                    <span>Mouse: Kamera</span>
                </div>
            </div>
        </VoiceWrapper>
    );
}
