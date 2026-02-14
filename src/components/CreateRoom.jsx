import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { createRoom } from '../services/supabaseClient';
import './RoomList.css'; // Stil paylaşımı

export default function CreateRoom() {
    const { user, setCurrentRoom, setScreen } = useGameStore();
    const [newRoomName, setNewRoomName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Native Back -> Go to Rooms
        window.handleBackPress = () => {
            setScreen('rooms');
        };
        return () => { window.handleBackPress = null; };
    }, [setScreen]);

    async function handleCreate() {
        if (!newRoomName.trim()) { alert("Lütfen bir oda ismi girin."); return; }
        if (!user) { alert("Oturum açılmamış."); return; }

        setLoading(true);
        try {
            const room = await createRoom(newRoomName.trim(), user.id, maxPlayers, false, null);
            setCurrentRoom(room);
            setScreen('lobby');
        } catch (e) {
            alert('Oda oluşturulamadı: ' + e.message);
        }
        setLoading(false);
    }

    return (
        <div className="room-list-container">
            {/* Header with Back Button */}
            <div className="rl-header" style={{ paddingTop: '50px', position: 'relative' }}>
                <button
                    className="btn-back-circle"
                    onClick={() => setScreen('rooms')}
                    style={{ position: 'absolute', top: 50, left: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                    <span className="material-icons-round">arrow_back</span>
                </button>

                <div className="rl-subtitle">YENİ ODA</div>
                <div className="rl-title">OLUŞTUR</div>
            </div>

            <div className="rl-content" style={{ marginTop: 20 }}>
                <div className="glass-panel" style={{ display: 'block' }}>

                    {/* ODA İSMİ */}
                    <div className="form-group">
                        <label className="form-label">Oda İsmi</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Örn: Karanlık Orman"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* OYUNCU SAYISI SLIDER (2-10) */}
                    <div className="form-group">
                        <label className="form-label">Oyuncu Sayısı</label>
                        <div className="slider-container">
                            <span className="slider-value" style={{ width: '30px' }}>2</span>
                            <input
                                type="range"
                                min="2"
                                max="10"
                                step="1"
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span className="slider-value">{maxPlayers}</span>
                        </div>
                    </div>

                    {/* OLUŞTUR BUTONU */}
                    <button className="btn-popup-create" onClick={handleCreate} disabled={loading} style={{ marginTop: 30 }}>
                        {loading ? 'OLUŞTURULUYOR...' : '🚀 ODAYI AÇ'}
                    </button>
                </div>
            </div>
        </div>
    );
}
