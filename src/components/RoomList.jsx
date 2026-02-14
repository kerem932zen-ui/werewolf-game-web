import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { fetchRooms, createRoom } from '../services/supabaseClient';
import './RoomList.css';

const ROOM_ICONS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBCUEQcyAgQggPOeSUkLYwRr2DKhht-18YZmV6CCOoP2kHQUHhENg4mwb0IL63zvJabjEvHgcmIRaJkuA_Vs0N8UMcoyfkk_YycbIGXE1-q97coCSaemPOLOsnCpo4bG5cdtQODvJX6NH0fuoB8GmbEc9VdDfnA70zLSWTbtvA8zdORcuJCIIeQfP8kKCvgh76RnQKn-w71NcGhsgy1rTdEhKAUgg9uxUsA7bTTQHLDgEanR3KYpt82IE9kTx57xijy4KZD4A35b50',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAiadLPpHobUs7GDQQDv3-lcmGpaV56SmEpYfjtIs2sBRiyh3M3vxt9RFxwr9sCcUqzMV_qAkO5E53DsGTxY6tjUHDo-aHMOnhiOhDkntIu32ABgnP_VyVIzelJMRMaCemZABrbFeRn7oLGJFLWjvhbef3JCIjd1t8F7ghiW08Hn3CPRkpV1X0W0DLHnU20tSqIS-0UdKXL8aHZPnh5tf5V99VUo6XquMZaora4cXkVzuz2xjrxO4IqQemMLi2xNlo7Qqsc9vgzRYU',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDDxS7oSYYXdPYitShTEitxryMYESVKCgUseZBPtuqSvhxiV_xcoTprYCMnmguxzSQJWsVhkY6eqElXo_v0TUcZbpT252oTiFJzuC_tZzDG9dFaKUZKIKqHTabGzmf79znq3KmuQOao3Fw_ffT8YrTlfQVdD7GsJu1idaykhSP0wxi3-qxAOFMhV7bYlwxGM2QO3pw9LQzt63e31P3ZJEZ4sYZ4DesdxVXMjT_ZdoMI2tCjA_e40KDREIPavIVojrbp7y3K-9po81w',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA5i21TAvNShFUXXYX-Kq3eHBbVFHJP0rFhkZNDJtNC-nnzcXqN1-b3NAXF1Ccn1RBgLSviRRie8TbpSGBNYsqs5KL4F3qc4yhVeKhXqF4ewURTlZNT_WFcZvqK4q6C7gcF3WkkFZsQhfpQy6oiXHpVEHchZjFGdJtxjL-kBtzOyOtTr6SHTzePxG_hEo2wTzAc_lv3AdnBvBnhjYF0m05np3J2P61rpG44rELieEjtbNcndxBbwYgxT-SM74JQT1WdbFnMjZgnHmw'
];

// Placeholder avatar havuzu (Rastgele kullanıcılar için)
const PLACEHOLDERS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBSnRKCHf4XefX7kWr0dXRY2YuiTFTBCH92uEwQDGQxnZd0rP-n3yOjjChRNh4hlwnLiUj1lJBk9-ZD0qDtQk87G-ND3Wu70Ta7ZQFoihtWLLWAXL1opIwTA3hhFenZyIpkyew4zMtAY366LCiYMjXw6QepcnFWQGnKorTprHWfUlXc7hlzXUqxSqo2mgRh0Ei5Zta62rvXbWwGr4LR6ECS1rKu63X7h1xAiLmgEZTJEVB9LOrZgRZpStq16yMeQnlWUngjYwUyO7Y',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAyr1B96qrr5nK9GXGKrQ_H46cfeVs6nD3O23jVuJP4sFQTZo91ATtcsyevA90OiRvkdRDQNihB9fBM6OQJ1WNJ-OF_NwHz6FIEC1RRfkeEtmByR5F78g5Ou5pK735KuT5NDW49suhGJvyzYl9xN4YnzSgs1JAdjDua3e45kuhLdZgG4bvCbeaodWZM8JCj6bFbVDJDoH5sJjLaxVAADuRlayZy8vfGUtFVxbitozWuWWTqf2WgN01Wpqk5AMmw0RxUyLnbUh4kesY',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDx8JB0UtVkGB5vImIuK7vsnVRHtvRfU3zipJsI81j1cKbaemLQFBsNt3rxpNmVn3t71k56gM93NV_JtX5qfpLuSwF8pP0HEPytqUTXsvRZBF3yzfR3qnou91rc147CDTicJ4zbppJjrIeRaUuIb1mpxOZZp2XGzqQ7R89JZTa9RJ8-t9WRzfzuMbg-in_4e1QwPAalxOKCBgy-rVzJ2-TeyByYz5Ok2D99xHCfnx-JY0NENP566imnSfAFMjPht20udBU1hBXp2k8',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAIejXwCha3fAQ7879gvEMdcmfR05sWj6zczhVF9S1JkYHm4NeYeARqcYdY_trGJemvoEJNIB5sl8Srgd7CFfuaXUY2oBK_E7JyaPY5cJbqKlR67WyG0-BrbFIZVPCs3Hz8NX-Kcq98YaAi_ErZAzRwicBuLmaZYfZihWL-_8l7d-ykRdvgrwhUl39I79IksBiyiadIq3IbPQ8cA7-CmzI_koeBVIs5t9Q5TteL26hd1UUeJD3zyUbsH4cz4HeYfVwJhvkKiOEkk5o',
];

export default function RoomList() {
    const { user, setUser, rooms, setRooms, setCurrentRoom, setScreen } = useGameStore();
    const [showCreate, setShowCreate] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(2); // Varsayılan 2
    const [loading, setLoading] = useState(false);

    // Rastgele Kullanıcı Oluştur (Eğer yoksa)
    useEffect(() => {
        if (!user) {
            const randomId = Math.floor(Math.random() * 1000000).toString();
            const randomUser = {
                id: randomId,
                username: `Misafir-${randomId.slice(0, 4)}`,
                avatar_url: PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
                is_guest: true
            };
            setUser(randomUser);
            // console.log("Geçici misafir oluşturuldu:", randomUser);
        }
    }, [user, setUser]);

    async function loadRooms() {
        try {
            const data = await fetchRooms();
            setRooms(data);
        } catch (e) {
            console.error('Odalar yüklenirken hata:', e);
        }
    }

    // İlk açılışta yükle
    useEffect(() => { loadRooms(); }, []);

    async function handleCreate() {
        if (!newRoomName.trim()) { alert("Lütfen bir oda ismi girin."); return; }
        if (!user) { alert("Oturum açılmamış, lütfen sayfayı yenileyin."); return; }

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

    function handleJoin(room) {
        if (!user) {
            // Eğer kullanıcı henüz oluşmadıysa bir saniye bekle ve tekrar dene (Effect'in çalışmasını bekle)
            alert("Kullanıcı oluşturuluyor, lütfen 1 saniye sonra tekrar deneyin.");
            return;
        }
        setCurrentRoom(room);
        setScreen('lobby');
    }

    // Rastgele ikon seçimi için basit helper
    const getRoomIcon = (index) => ROOM_ICONS[index % ROOM_ICONS.length];

    return (
        <div className="room-list-container">
            {/* === HEADER === */}
            <div className="rl-header">
                <div className="rl-subtitle">APEXMATCH</div>
                <div className="rl-title">VAMPİR <span>KÖYLÜ</span></div>
                {/* Misafir Bilgisi */}
                {user && (
                    <div style={{ position: 'absolute', top: 10, right: 10, color: '#aaa', fontSize: 10 }}>
                        {user.username}
                    </div>
                )}
            </div>

            {/* === CREATE BUTTON === */}
            <div className="rl-create-section">
                <button className="btn-metallic" onClick={() => setShowCreate(true)}>
                    <span className="material-icons-round">add_circle</span>
                    ODA OLUŞTUR
                </button>
            </div>

            {/* === ROOM LIST === */}
            <div className="rl-content">
                <div className="rl-list-header">
                    <div className="rl-list-title"><span className="status-dot"></span>Aktif Odalar</div>
                </div>

                <div className="rl-list-scroll">
                    {/* Yükleniyor veya Boş Durumu */}
                    {rooms.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontSize: '14px' }}>
                            Henüz açık oda yok. İlk sen oluştur! 🩸
                        </div>
                    )}

                    {rooms.map((room, index) => (
                        <div key={room.id} className="glass-panel group">
                            <div className="card-left">
                                <div className="card-icon">
                                    <img src={getRoomIcon(index)} alt="Room Icon" />
                                </div>
                                <div className="card-info">
                                    <h3>{room.name}</h3>
                                    <div className="card-meta">
                                        <span className="material-icons-round" style={{ fontSize: '14px' }}>person</span>
                                        {room.current_players} / {room.max_players}
                                        <span style={{ width: '4px', height: '4px', background: '#666', borderRadius: '50%' }}></span>
                                        <span style={{
                                            color: room.status === 'waiting' ? '#4ade80' : '#ef4444',
                                            fontWeight: '600'
                                        }}>
                                            {room.status === 'waiting' ? 'Bekliyor' : 'Oyunda'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button className="btn-join" onClick={() => handleJoin(room)} disabled={room.status !== 'waiting'}>
                                KATIL
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* === POPUP (CREATE ROOM) === */}
            {showCreate && (
                <div className="popup-overlay" onClick={() => setShowCreate(false)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-close" onClick={() => setShowCreate(false)}>×</button>

                        <div className="popup-header">
                            <h2 className="popup-title">Yeni Oda Oluştur</h2>
                        </div>

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
                        <button className="btn-popup-create" onClick={handleCreate} disabled={loading}>
                            {loading ? 'OLUŞTURULUYOR...' : '🚀 ODAYI AÇ'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
