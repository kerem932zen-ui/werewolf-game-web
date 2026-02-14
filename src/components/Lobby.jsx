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
    const [showExitConfirm, setShowExitConfirm] = useState(false); // Çıkış Onayı

    const isOwner = currentRoom?.owner_id === user?.id;
    const MAX_SLOTS = currentRoom?.max_players || 12;

    const hasJoinedRef = useRef(false);
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
                console.log(`[LOBBY] Liste güncellendi.`);
                if (currentRoom.owner_id === user.id) {
                    setPlayerReady(currentRoom.id, user.id, true);
                    setReady(true);
                    useGameStore.getState().updatePlayer(user.id, { is_ready: true });
                    pieSocket.send('player_ready', { id: user.id, ready: true });
                }
            })
            .catch(console.error);

        pieSocket.connect(currentRoom.id, { id: user.id, username: user.username, avatar_url: user.avatar_url, color });

        const offJoined = pieSocket.on('player_connected', (data) => {
            if (data.id !== user.id) {
                addPlayer({ ...data, is_alive: true, is_ready: false });
            }
        });

        const offLeft = pieSocket.on('player_left', (data) => {
            removePlayer(data.id);
        });

        const offReady = pieSocket.on('player_ready', (data) => {
            useGameStore.getState().updatePlayer(data.id, { is_ready: data.ready });
        });

        const offPhase = pieSocket.on('phase_change', (data) => {
            if (data.phase === 'role_reveal') {
                isGameStartingRef.current = true;
                if (data.roles) {
                    const myAssignment = data.roles.find((a) => a.playerId === user?.id);
                    if (myAssignment) useGameStore.getState().setMyRole(myAssignment.role);
                    data.roles.forEach(({ playerId, role }) => useGameStore.getState().updatePlayer(playerId, { role }));
                }
                setPhase('role_reveal');
                setScreen('game');
            }
        });

        // Native Back Button
        window.handleBackPress = () => {
            setShowExitConfirm(true);
        };

        return () => {
            console.log(`[LOBBY] Cleanup running...`);
            offJoined(); offLeft(); offReady(); offPhase();
            window.handleBackPress = null;

            if (!isGameStartingRef.current) {
                pieSocket.send('player_left', { id: user.id });
            }
            hasJoinedRef.current = false;
        };
    }, [currentRoom?.id]);

    async function loadPlayers(currentUserData = null) {
        try {
            const dbPlayers = await getRoomPlayers(currentRoom.id);
            let finalList = [...dbPlayers];
            const myId = user?.id;

            const amIInList = finalList.find(p => p.player_id === myId);

            if (!amIInList) {
                if (currentUserData) {
                    finalList.push(currentUserData);
                } else {
                    const currentStorePlayers = useGameStore.getState().players;
                    const meInStore = currentStorePlayers.find(p => p.player_id === myId);
                    if (meInStore) {
                        finalList.push(meInStore);
                    } else {
                        const emergencyMe = {
                            player_id: user.id, username: user.username, avatar_url: user.avatar_url,
                            color: GAME_CONFIG.COLORS[0], is_ready: currentRoom.owner_id === user.id,
                            is_alive: true, is_bot: false
                        };
                        finalList.push(emergencyMe);
                    }
                }
            }
            finalList = finalList.map(p => {
                if (p.player_id === currentRoom.owner_id) return { ...p, is_ready: true };
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

        isGameStartingRef.current = true;

        const roles = distributeRoles(players.length);
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const assignments = shuffled.map((p, i) => ({ playerId: p.player_id, role: roles[i] }));

        pieSocket.send('phase_change', { phase: 'role_reveal', round: 1, roles: assignments });
        setPhase('role_reveal');
        setScreen('game');
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

    return (
        <div className="lobby-container">
            <div className="fog-container">
                <div className="fog-layer"></div>
                <div className="gradient-overlay"></div>
                <div className="texture-overlay"></div>
            </div>

            <header className="lobby-header">
                {/* Sol Üst Geri Butonu -> POPUP */}
                <button className="btn-back-circle" onClick={() => setShowExitConfirm(true)}>
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
                {/* Alt Çıkış Butonu -> POPUP */}
                <button className="btn-not-ready" onClick={() => setShowExitConfirm(true)}>ÇIKIŞ</button>
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

            {/* Exit Confirmation (Lobby) */}
            {showExitConfirm && (
                <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowExitConfirm(false)}>
                    <div style={{
                        background: '#111', border: '1px solid #333', padding: '30px', borderRadius: '24px',
                        textAlign: 'center', maxWidth: '80%', width: '300px', boxShadow: '0 0 50px rgba(0,0,0,0.8)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ color: '#ef4444', marginBottom: 10 }}>Odadan Ayrıl?</h2>
                        <p style={{ color: '#ccc', margin: '20px 0' }}>Lobiden çıkmak istediğine emin misin?</p>
                        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                style={{ padding: '10px 20px', borderRadius: 10, background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                                İPTAL
                            </button>
                            <button
                                onClick={handleLeave}
                                style={{ padding: '10px 20px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                ÇIK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
