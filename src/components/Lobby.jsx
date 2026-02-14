import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { joinRoom, leaveRoom, getRoomPlayers, setPlayerReady } from '../services/supabaseClient';
import pieSocket from '../services/pieSocket';
import { GAME_CONFIG } from '../config';
import './Lobby.css';

const PLACEHOLDER_AVATARS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBSnRKCHf4XefX7kWr0dXRY2YuiTFTBCH92uEwQDGQxnZd0rP-n3yOjjChRNh4hlwnLiUj1lJBk9-ZD0qDtQk87G-ND3Wu70Ta7ZQFoihtWLLWAXL1opIwTA3hhFenZyIpkyew4zMtAY366LCiYMjXw6QepcnFWQGnKorTprHWfUlXc7hlzXUqxSqo2mgRh0Ei5Zta62rvXbWwGr4LR6ECS1rKu63X7h1xAiLmgEZTJEVB9LOrZgRZpStq16yMeQnlWUngjYwUyO7Y',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAyr1B96qrr5nK9GXGKrQ_H46cfeVs6nD3O23jVuJP4sFQTZo91ATtcsyevA90OiRvkdRDQNihB9fBM6OQJ1WNJ-OF_NwHz6FIEC1RRfkeEtmByR5F78g5Ou5pK735KuT5NDW49suhGJvyzYl9xN4YnzSgs1JAdjDua3e45kuhLdZgG4bvCbeaodWZM8JCj6bFbVDJDoH5sJjLaxVAADuRlayZy8vfGUtFVxbitozWuWWTqf2WgN01Wpqk5AMmw0RxUyLnbUh4kesY',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDx8JB0UtVkGB5vImIuK7vsnVRHtvRfU3zipJsI81j1cKbaemLQFBsNt3rxpNmVn3t71k56gM93NV_JtX5qfpLuSwF8pP0HEPytqUTXsvRZBF3yzfR3qnou91rc147CDTicJ4zbppJjrIeRaUuIb1mpxOZZp2XGzqQ7R89JZTa9RJ8-t9WRzfzuMbg-in_4e1QwPAalxOKCBgy-rVzJ2-TeyByYz5Ok2D99xHCfnx-JY0NENP566imnSfAFMjPht20udBU1hBXp2k8',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAIejXwCha3fAQ7879gvEMdcmfR05sWj6zczhVF9S1JkYHm4NeYeARqcYdY_trGJemvoEJNIB5sl8Srgd7CFfuaXUY2oBK_E7JyaPY5cJbqKlR67WyG0-BrbFIZVPCs3Hz8NX-Kcq98YaAi_ErZAzRwicBuLmaZYfZihWL-_8l7d-ykRdvgrwhUl39I79IksBiyiadIq3IbPQ8cA7-CmzI_koeBVIs5t9Q5TteL26hd1UUeJD3zyUbsH4cz4HeYfVwJhvkKiOEkk5o',
];

export default function Lobby() {
    const { user, currentRoom, players, setPlayers, addPlayer, removePlayer, setScreen, setPhase } = useGameStore();
    const [ready, setReady] = useState(false);
    const isOwner = currentRoom?.owner_id === user?.id;
    const MAX_SLOTS = currentRoom?.max_players || 12;

    const hasJoinedRef = useRef(false);
    // Yeni Ref: Oyun başladı mı?
    const isGameStartingRef = useRef(false);

    useEffect(() => {
        if (!currentRoom || !user) return;
        if (hasJoinedRef.current) return;
        hasJoinedRef.current = true;

        console.log(`[LOBBY] Odaya giriş yapılıyor... Room: ${currentRoom.id}, User: ${user.username}`);

        const color = GAME_CONFIG.COLORS[Math.floor(Math.random() * GAME_CONFIG.COLORS.length)];

        const me = {
            player_id: user.id,
            username: user.username,
            avatar_url: user.avatar_url,
            color: color,
            is_ready: currentRoom.owner_id === user.id,
            is_alive: true,
            is_bot: false
        };

        joinRoom(currentRoom.id, user.id, user.username, user.avatar_url, color)
            .then(() => {
                console.log(`[LOBBY] DB Join başarılı.`);
                addPlayer(me);
                return loadPlayers(me);
            })
            .then(() => {
                console.log(`[LOBBY] Liste güncellendi. Kurucu: ${currentRoom.owner_id} vs Biz: ${user.id}`);
                if (currentRoom.owner_id === user.id) {
                    console.log(`[LOBBY] Kurucu olduğumuz için Ready sinyali atılıyor.`);
                    setPlayerReady(currentRoom.id, user.id, true);
                    setReady(true);
                    useGameStore.getState().updatePlayer(user.id, { is_ready: true });
                    pieSocket.send('player_ready', { id: user.id, ready: true });
                }
            })
            .catch(console.error);

        console.log(`[LOBBY] PieSocket bağlanıyor...`);
        pieSocket.connect(currentRoom.id, { id: user.id, username: user.username, avatar_url: user.avatar_url, color });

        const offJoined = pieSocket.on('player_connected', (data) => {
            console.log(`[LOBBY] Socket: Oyuncu bağlandı ->`, data.username);
            if (data.id !== user.id) {
                addPlayer({ ...data, is_alive: true, is_ready: false });
            }
        });

        const offLeft = pieSocket.on('player_left', (data) => {
            console.log(`[LOBBY] Socket: Oyuncu ayrıldı -> ID:`, data.id);
            removePlayer(data.id);
        });

        const offReady = pieSocket.on('player_ready', (data) => {
            console.log(`[LOBBY] Socket: Hazır durumu değişti -> ID: ${data.id}, Ready: ${data.ready}`);
            useGameStore.getState().updatePlayer(data.id, { is_ready: data.ready });
        });

        // Backend tarafında handleStart fonksiyonu "phase_change" atıyor,
        // ama diğer taraf "game_start" dinlerse çalışmaz.
        // Bu yüzden "phase_change" dinliyoruz.
        const offPhase = pieSocket.on('phase_change', (data) => {
            console.log(`[LOBBY] Socket: Phase Change algılandı (Oyun Başlıyor!) ->`, data);

            // Eğer oyun 'role_reveal' evresine geçtiyse, bu bir oyun başlangıcıdır!
            if (data.phase === 'role_reveal') {
                isGameStartingRef.current = true; // Cleanup'ta 'player_left' atılmasını engelle

                // Rolleri dağıt
                if (data.roles) {
                    const myAssignment = data.roles.find((a) => a.playerId === user?.id);
                    if (myAssignment) useGameStore.getState().setMyRole(myAssignment.role);
                    data.roles.forEach(({ playerId, role }) => useGameStore.getState().updatePlayer(playerId, { role }));
                }

                setPhase('role_reveal');
                setScreen('game');
            }
        });

        return () => {
            console.log(`[LOBBY] Cleanup running... IsGameStarting:`, isGameStartingRef.current);
            offJoined(); offLeft(); offReady(); offPhase();

            // Eğer oyun başlamıyorsa ve biz çıkıyorsak 'player_left' at.
            // Oyun başlıyorsa ATMA, çünkü o zaman diğer oyuncular bizi çıktı sanıp siliyor.
            if (!isGameStartingRef.current) {
                pieSocket.send('player_left', { id: user.id });
                // DEV NOTE: React StrictMode yüzünden leaveRoom'u burada kapalı tutuyoruz,
                // sadece handleLeave'de siliyoruz.
            }

            hasJoinedRef.current = false;
        };
    }, [currentRoom?.id]);

    async function loadPlayers(currentUserData = null) {
        try {
            console.log(`[LOBBY] DB'den oyuncular çekiliyor...`);
            const dbPlayers = await getRoomPlayers(currentRoom.id);
            console.log(`[LOBBY] DB Oyuncuları:`, dbPlayers);

            let finalList = [...dbPlayers];
            const myId = user?.id;

            const amIInList = finalList.find(p => p.player_id === myId);

            if (!amIInList) {
                if (currentUserData) {
                    console.warn(`[LOBBY] !Kritik: DB listesinde yokuz, Local Data ile restore ediliyor.`);
                    finalList.push(currentUserData);
                } else {
                    const currentStorePlayers = useGameStore.getState().players;
                    const meInStore = currentStorePlayers.find(p => p.player_id === myId);
                    if (meInStore) {
                        console.warn(`[LOBBY] !Kritik: DB listesinde yokuz, Store'dan restore ediliyor.`);
                        finalList.push(meInStore);
                    } else {
                        console.error(`[LOBBY] !Hata: Oyuncu verisi kayıp, yeniden oluşturuluyor.`);
                        const emergencyMe = {
                            player_id: user.id,
                            username: user.username,
                            avatar_url: user.avatar_url,
                            color: GAME_CONFIG.COLORS[0],
                            is_ready: currentRoom.owner_id === user.id,
                            is_alive: true,
                            is_bot: false
                        };
                        finalList.push(emergencyMe);
                    }
                }
            }

            finalList = finalList.map(p => {
                if (p.player_id === currentRoom.owner_id) {
                    return { ...p, is_ready: true };
                }
                return p;
            });

            setPlayers(finalList);

        } catch (e) { console.error(`[LOBBY] Oyuncu yükleme hatası:`, e); }
    }

    const getAvatar = (i) => PLACEHOLDER_AVATARS[i % PLACEHOLDER_AVATARS.length];

    function toggleReady() {
        if (!currentRoom || !user) return;
        const newReady = !ready;
        setReady(newReady);
        useGameStore.getState().updatePlayer(user.id, { is_ready: newReady });
        setPlayerReady(currentRoom.id, user.id, newReady);
        pieSocket.send('player_ready', { id: user.id, ready: newReady });
    }

    function handleStart() {
        if (players.length < 2) { alert(`En az 2 oyuncu gerekli!`); return; }
        const everyoneReady = players.every(p => p.is_ready);
        if (!everyoneReady) { alert("Tüm oyuncular hazır olmalı!"); return; }

        // MANTIKSAL BUG FIX: setScreen('game') yapmadan ÖNCE flag'i set etmeliyiz!
        isGameStartingRef.current = true;

        const roles = distributeRoles(players.length);
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const assignments = shuffled.map((p, i) => ({ playerId: p.player_id, role: roles[i] }));
        const myAssignment = assignments.find((a) => a.playerId === user?.id);

        if (myAssignment) useGameStore.getState().setMyRole(myAssignment.role);
        assignments.forEach(({ playerId, role }) => useGameStore.getState().updatePlayer(playerId, { role }));

        // DİKKAT: Burada 'game_start' değil 'phase_change' atıyoruz.
        // Diğer tarafta da 'phase_change' dinlemeliyiz.
        pieSocket.send('phase_change', { phase: 'role_reveal', round: 1, roles: assignments });

        useGameStore.getState().setRound(1);
        setPhase('role_reveal');
        setScreen('game'); // Bu call Lobby'yi unmount eder -> Cleanup çalışır -> isGameStartingRef true olduğu için player_left ATMAZ.
    }

    function distributeRoles(count) {
        const roles = ['werewolf'];
        if (count > 5) roles.push('werewolf');
        if (count > 8) roles.push('werewolf');
        while (roles.length < count) roles.push('villager');
        return roles.sort(() => Math.random() - 0.5);
    }

    function handleLeave() {
        leaveRoom(currentRoom.id, user.id).catch(console.error);
        useGameStore.getState().resetGame();
        setScreen('rooms');
    }

    const readyCount = players.filter(p => p.is_ready).length;
    const allReady = players.length >= 2 && players.every(p => p.is_ready);
    const emptySlots = Math.max(0, MAX_SLOTS - players.length);

    console.log(`[DEBUG] Players: ${players.length}, Ready: ${readyCount}, AllReady: ${allReady}, StartBtn: ${isOwner && allReady}`);

    return (
        <div className="lobby-container">
            <div className="fog-container">
                <div className="fog-layer"></div>
                <div className="gradient-overlay"></div>
                <div className="texture-overlay"></div>
            </div>

            <header className="lobby-header">
                <button className="btn-back-circle" onClick={handleLeave}>
                    <span className="material-icons-round">chevron_left</span>
                </button>
                <div className="room-info-center">
                    <h1>{currentRoom?.name || 'Lobby'}</h1>
                </div>
                <div className="player-count-badge">
                    <span className="material-icons-round" style={{ fontSize: '16px', color: '#df113a' }}>group</span>
                    <span>{players.length}</span>
                    <span className="divider">/</span>
                    <span style={{ color: '#666' }}>{MAX_SLOTS}</span>
                </div>
            </header>

            <div className="lobby-content">
                <div className="grid-container">
                    {players.map((p, i) => (
                        <div key={p.player_id || i} className={`player-item ${p.is_ready ? 'ready' : 'waiting'}`}>
                            <div className="avatar-frame">
                                <img
                                    src={p.avatar_url || getAvatar(i)}
                                    alt="Avatar"
                                    onError={(e) => { e.target.onerror = null; e.target.src = getAvatar(i); }}
                                />
                                {currentRoom.owner_id === p.player_id && (
                                    <span className="material-icons-round owner-star">stars</span>
                                )}
                                {!p.is_ready && <div className="waiting-dot"></div>}
                            </div>
                            <div className="p-name">{p.username}</div>
                            <div className={`p-status ${p.is_ready ? 'status-ready' : 'status-waiting'}`}>
                                {p.is_ready ? 'HAZIR' : 'BEKLİYOR'}
                            </div>
                        </div>
                    ))}
                    {Array.from({ length: emptySlots }).map((_, i) => (
                        <div key={`empty-${i}`} className="empty-slot">
                            <span className="material-icons-round">add</span>
                            <div className="empty-text">Davet Et</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lobby-footer">
                <button className="btn-not-ready" onClick={handleLeave}>ÇIKIŞ</button>
                <button className="btn-not-ready" style={{ background: '#333' }} onClick={() => loadPlayers()}>YENİLE</button>

                {isOwner && allReady ? (
                    <button className="btn-main-action group" onClick={handleStart}>
                        <div className="shimmer-bg"></div>
                        <span>BAŞLAT</span>
                        <span className="material-icons-round">play_arrow</span>
                    </button>
                ) : (
                    <button className={`btn-main-action ${ready ? 'is-ready-btn' : ''} group`} onClick={toggleReady}>
                        {!ready && <div className="shimmer-bg"></div>}
                        <span>{ready ? 'HAZIRLANDIN' : 'HAZIR OL'}</span>
                        <span className="material-icons-round">{ready ? 'check_circle' : 'bolt'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
