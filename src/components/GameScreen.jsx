import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import GameWorld3D from './3D/GameWorld3D';
import pieSocket from '../services/pieSocket';
import './GameScreen.css';

const ROLE_INFO = {
    werewolf: { name: '🐺 Vampir', emoji: '🐺' },
    villager: { name: '👤 Köylü', emoji: '👤' },
};

// Süreler
const FREE_ROAM_TIME = 20;
const DISCUSSION_TIME = 15;
const VOTING_TIME = 12;
const RESULT_TIME = 5;

// Placeholder Avatars (Lobby ile aynı)
const PLACEHOLDER_AVATARS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBSnRKCHf4XefX7kWr0dXRY2YuiTFTBCH92uEwQDGQxnZd0rP-n3yOjjChRNh4hlwnLiUj1lJBk9-ZD0qDtQk87G-ND3Wu70Ta7ZQFoihtWLLWAXL1opIwTA3hhFenZyIpkyew4zMtAY366LCiYMjXw6QepcnFWQGnKorTprHWfUlXc7hlzXUqxSqo2mgRh0Ei5Zta62rvXbWwGr4LR6ECS1rKu63X7h1xAiLmgEZTJEVB9LOrZgRZpStq16yMeQnlWUngjYwUyO7Y',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAyr1B96qrr5nK9GXGKrQ_H46cfeVs6nD3O23jVuJP4sFQTZo91ATtcsyevA90OiRvkdRDQNihB9fBM6OQJ1WNJ-OF_NwHz6FIEC1RRfkeEtmByR5F78g5Ou5pK735KuT5NDW49suhGJvyzYl9xN4YnzSgs1JAdjDua3e45kuhLdZgG4bvCbeaodWZM8JCj6bFbVDJDoH5sJjLaxVAADuRlayZy8vfGUtFVxbitozWuWWTqf2WgN01Wpqk5AMmw0RxUyLnbUh4kesY',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDx8JB0UtVkGB5vImIuK7vsnVRHtvRfU3zipJsI81j1cKbaemLQFBsNt3rxpNmVn3t71k56gM93NV_JtX5qfpLuSwF8pP0HEPytqUTXsvRZBF3yzfR3qnou91rc147CDTicJ4zbppJjrIeRaUuIb1mpxOZZp2XGzqQ7R89JZTa9RJ8-t9WRzfzuMbg-in_4e1QwPAalxOKCBgy-rVzJ2-TeyByYz5Ok2D99xHCfnx-JY0NENP566imnSfAFMjPht20udBU1hBXp2k8',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAIejXwCha3fAQ7879gvEMdcmfR05sWj6zczhVF9S1JkYHm4NeYeARqcYdY_trGJemvoEJNIB5sl8Srgd7CFfuaXUY2oBK_E7JyaPY5cJbqKlR67WyG0-BrbFIZVPCs3Hz8NX-Kcq98YaAi_ErZAzRwicBuLmaZYfZihWL-_8l7d-ykRdvgrwhUl39I79IksBiyiadIq3IbPQ8cA7-CmzI_koeBVIs5t9Q5TteL26hd1UUeJD3zyUbsH4cz4HeYfVwJhvkKiOEkk5o',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD_nnr-MNGhzTgtd8QncAcTZRVT8Mwf6zIfno87asGEV7PK4AwEUPQl0EWmJbfyCQXXWlLs2Wla2H2MmgDHrB_dwG_QxocYcmpvVzYyTtgx4vvcvVjf23gh7Rlp4ccLZYV2QW_2QtHkhoMveEJOk0WZ602PDEtwlnBspatUlBye9s9CMlzFnUuCk1L1YJ-KAYePXVAq5EXaJgJ8xt_b5K_31JYnv1YA3wJSjNO1m3pCKS3Nju0K1sY3_PERJOhHnP_6g_gZJoBem_g',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAiRkRK4ZQwWbstL0RlQXwHjCSAjxOJTutFs6zLIiOvcAaXJyh27c77texE-0q2gX8FGHVPz4fn2bf8kRBxlKjhM5C_31FScWPjvjBZwNSvojRCQqBekceuAucdH57eg_dye4eSX0LR9o82LzKXSQvjoQ1i6orzfiXqA23xlaApvPRyiNZX9rzDLvwcNLGuUO3GwZOoATtELh7jWynU7XXcjDHAx-E_GdnyWH49ft5DRGIrJw-ZwCrrUE8VE4gNdW3H3me4KUT1AIM',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB_sP56t-0I0gIiRi6YoDTO-CuS-hxGsMIZZx06rqFy2APvFJZQ1mfb2cRTxEK88E4jAav3pRk8Nrk9jao4S3Po24UTMRmVNrpFvza8XY6tW3n-aGpjeLkaRmUz5xIeMNTI8jvN2KrRVAzcHZBtM5aHVcqG1MCpmzvXXf-sC-cXKuN0v1Gn3VZekZN0evZ8mFeUaDItXByRKUarUdeK3heehNm8TJSZETvwHkehEoyr9Jo7aljInx4V_hS_a6O4QTyi-RmhiOLbwpg'
];

export default function GameScreen() {
    const {
        user, players, phase, setPhase, round, setRound,
        myRole, timer, setTimer, addMessage, winner, setWinner, setScreen, updatePlayer,
    } = useGameStore();

    const timerRef = useRef(null);
    const phaseProcessedRef = useRef('');
    const [myVote, setMyVote] = useState(null);
    const [lastEliminated, setLastEliminated] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false); // Çıkış Onayı

    // ─── SES SİSTEMİ ───
    const [audioStore] = useState(() => ({
        ambient: new Audio('/sounds/ambient.mp3'),
        countdown: new Audio('/sounds/countdown.wav'),
        fail: new Audio('/sounds/fail.mp3'),
        win: new Audio('/sounds/win.mp3')
    }));

    const playSound = (key, loop = false, volume = 0.5) => {
        const audio = audioStore[key];
        if (!audio) return;
        try {
            audio.loop = loop;
            audio.volume = volume;
            if (audio.paused) {
                audio.currentTime = 0;
                audio.play().catch(e => console.warn(`Audio play error (${key}):`, e));
            } else if (!loop) {
                audio.currentTime = 0;
            }
        } catch (e) {
            console.error("Audio trigger error:", e);
        }
    };

    const stopSound = (key) => {
        const audio = audioStore[key];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    };

    // Native Back Button Intercept
    useEffect(() => {
        window.handleBackPress = () => {
            setShowExitConfirm(true);
        };
        return () => { window.handleBackPress = null; };
    }, []);

    const handleExitGame = () => {
        useGameStore.getState().resetGame();
        setScreen('rooms');
    };

    // Ambient Başlat (Sürekli)
    useEffect(() => {
        playSound('ambient', true, 0.15);
        return () => stopSound('ambient');
    }, []);

    // Phase Bazlı Ses Yönetimi
    useEffect(() => {
        if (phase === 'voting') {
            playSound('countdown', true, 0.5);
            if (audioStore.ambient) audioStore.ambient.volume = 0.05;
        } else {
            stopSound('countdown');
            if (audioStore.ambient) audioStore.ambient.volume = 0.15;
        }

        if (phase === 'result') {
            const isVampireFound = lastEliminated?.role === 'werewolf';
            if (!isVampireFound) {
                playSound('fail', false, 0.6);
            }
        }

        if (phase === 'game_over') {
            stopSound('ambient');
            stopSound('countdown');
            playSound('win', false, 0.7);
        }
    }, [phase, lastEliminated]);

    const alivePlayers = players.filter((p) => p.is_alive);
    const aliveCount = alivePlayers.length;
    const myPlayer = players.find((p) => p.player_id === user?.id);
    const myAlive = myPlayer?.is_alive !== false;
    const roleInfo = ROLE_INFO[myRole] || ROLE_INFO.villager;

    const getAvatar = (i) => PLACEHOLDER_AVATARS[i % PLACEHOLDER_AVATARS.length];

    // PieSocket Chat Dinleyicisi
    useEffect(() => {
        const offChat = pieSocket.on('chat_message', (data) => {
            if (data.username !== user?.username) {
                addMessage({ type: 'chat', username: data.username, text: data.text });
            }
        });
        return () => offChat();
    }, [user?.username]);

    // Timer Başlatma Yardımcısı
    function startTimer(seconds, onEnd) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const currentTimer = useGameStore.getState().timer;
            if (currentTimer <= 1) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                setTimer(0);
                onEnd?.();
            } else {
                setTimer(currentTimer - 1);
            }
        }, 1000);
        setTimer(seconds); // Timer'ı başlat
    }

    // Faz Yönetimi
    useEffect(() => {
        const key = `${phase}-${round}`;
        if (phaseProcessedRef.current === key) return;
        phaseProcessedRef.current = key;

        switch (phase) {
            case 'role_reveal':
                setPhase('free_roam');
                break;

            case 'free_roam':
                startTimer(FREE_ROAM_TIME, () => {
                    setPhase('discussion');
                });
                break;

            case 'discussion':
                startTimer(DISCUSSION_TIME, () => {
                    setPhase('voting');
                });
                break;

            case 'voting':
                setMyVote(null);
                botVote();
                startTimer(VOTING_TIME, () => {
                    processVotes();
                });
                break;

            case 'result':
                startTimer(RESULT_TIME, () => {
                    const s = useGameStore.getState();
                    const alive = s.players.filter((p) => p.is_alive);
                    const wolves = alive.filter((p) => p.role === 'werewolf');

                    if (wolves.length === 0) {
                        setWinner('villagers');
                        setPhase('game_over');
                    } else if (wolves.length >= alive.length - wolves.length) {
                        setWinner('werewolves');
                        setPhase('game_over');
                    } else {
                        setRound(s.round + 1);
                        setPhase('free_roam');
                    }
                });
                break;
        }

        if (phase === 'game_over') {
            const tm = setTimeout(() => {
                useGameStore.getState().resetGame();
                setScreen('rooms');
            }, 5000);
            return () => clearTimeout(tm);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase, round]);

    function botVote() {
        const s = useGameStore.getState();
        const bots = s.players.filter((p) => p.is_alive && p.player_id?.startsWith('bot-'));
        const alive = s.players.filter((p) => p.is_alive);

        bots.forEach((bot, i) => {
            setTimeout(() => {
                const targets = alive.filter((t) => t.player_id !== bot.player_id);
                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    updatePlayer(bot.player_id, { voted_for: target.player_id });
                    addMessage({ type: 'vote', text: `${bot.username} → ${target.username}` });
                }
            }, 2000 + i * 1200);
        });
    }

    function processVotes() {
        const alive = useGameStore.getState().players.filter((p) => p.is_alive);
        const votes = {};
        alive.forEach((p) => {
            if (p.voted_for) votes[p.voted_for] = (votes[p.voted_for] || 0) + 1;
        });

        let maxV = 0, elimId = null;
        Object.entries(votes).forEach(([id, c]) => {
            if (c > maxV) { maxV = c; elimId = id; }
        });

        if (elimId) {
            const el = alive.find((p) => p.player_id === elimId);
            updatePlayer(elimId, { is_alive: false });
            setLastEliminated(el);
            setShowResult(true);
            if (el?.role === 'werewolf') {
                addMessage({ type: 'system', text: `🎉 ${el.username} çıkarıldı! VAMPİRDİ! 🐺` });
            } else {
                addMessage({ type: 'system', text: `😔 ${el.username} çıkarıldı! Köylüydü... 👤` });
            }
        } else {
            addMessage({ type: 'system', text: '🤷 Kimse elenilmedi! Eşit oy.' });
            setLastEliminated(null);
            setShowResult(true);
        }

        alive.forEach((p) => updatePlayer(p.player_id, { voted_for: null }));
        setMyVote(null);
        setPhase('result');
    }

    function handleVote(targetId) {
        if (phase !== 'voting' || !myAlive || myVote) return;
        setMyVote(targetId);
        updatePlayer(user.id, { voted_for: targetId });
        const target = players.find((p) => p.player_id === targetId);
        addMessage({ type: 'vote', text: `Sen → ${target?.username}` });
    }

    return (
        <div className="game-screen-wrapper">
            {(phase === 'free_roam' || phase === 'discussion') && (
                <GameWorld3D />
            )}

            {/* Top Right Exit Button (X) */}
            <button
                className="game-exit-x-btn"
                onClick={() => setShowExitConfirm(true)}
                style={{
                    position: 'absolute',
                    top: 15,
                    right: 15,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: 20,
                    cursor: 'pointer',
                    zIndex: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                ✕
            </button>


            {/* HUD Bar */}
            <div className="game-hud-bar">
                <div className="ghb-left">
                    <div className="my-role-info">
                        <span className="mri-label">ROLÜN:</span>
                        <span className={`mri-value ${myRole === 'werewolf' ? 'wolf' : ''}`}>
                            {roleInfo.name}
                        </span>
                    </div>

                    <button
                        className={`mic-toggle-btn ${isMicOn ? 'mic-on' : 'mic-off'}`}
                        onClick={() => setIsMicOn(!isMicOn)}
                    >
                        <span className="material-icons-round">{isMicOn ? 'mic' : 'mic_off'}</span>
                    </button>

                    <div className="phase-timer-badge">
                        <span className="ptb-phase">
                            {phase === 'free_roam' && 'SERBEST'}
                            {phase === 'discussion' && 'TARTIŞMA'}
                            {phase === 'voting' && 'OYLAMA'}
                            {phase === 'result' && 'SONUÇ'}
                            {phase === 'game_over' && 'BİTTİ'}
                        </span>
                        <span className="ptb-timer">{timer}s</span>
                    </div>
                </div>

                <div className="ghb-right">
                    <span className="alive-counter">👥 {aliveCount}/{players.length}</span>
                </div>
            </div>

            {/* Oylama Ekranı */}
            {phase === 'voting' && (
                <div className="assembly-screen">
                    <h2 className="assembly-title">⚖️ OYLAMA: {timer}s</h2>
                    <div className="assembly-grid">
                        {alivePlayers.map((p, i) => {
                            const isMe = p.player_id === user?.id;
                            const isVoted = myVote === p.player_id;
                            const voteCount = alivePlayers.filter((v) => v.voted_for === p.player_id).length;
                            return (
                                <div
                                    key={p.player_id}
                                    className={`vote-card ${isVoted ? 'vote-selected' : ''}`}
                                    onClick={() => !isMe && handleVote(p.player_id)}
                                >
                                    <div className="vote-avatar-frame">
                                        <img
                                            src={p.avatar_url || getAvatar(i)}
                                            alt="Avatar"
                                            onError={(e) => { e.target.onerror = null; e.target.src = getAvatar(i) }}
                                        />
                                        {voteCount > 0 && <div className="vote-badge">{voteCount}</div>}
                                    </div>
                                    <div className="vote-name">{isMe ? '(Sen)' : p.username.split(' (Bot)')[0]}</div>
                                </div>
                            );
                        })}
                    </div>
                    {myVote ? <div className="assembly-status status-voted">✅ OY KULLANILDI</div> : myAlive && <div className="assembly-status pulse-text">👆 BİRİNİ SEÇ!</div>}
                </div>
            )}

            {/* Sonuç Ekranı */}
            {phase === 'result' && showResult && (
                <div className="result-overlay">
                    <div className="result-card">
                        {lastEliminated ? (
                            <>
                                <div className="result-char" style={{ backgroundColor: lastEliminated.color || '#888' }}>
                                    <div className="ap-visor" />
                                </div>
                                <h2>{lastEliminated.username}</h2>
                                <div className="result-role">
                                    {lastEliminated.role === 'werewolf'
                                        ? '🐺 VAMPİRDİ! Köylüler kazandı!'
                                        : '👤 Köylüydü...'}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>🤷 Berabere!</h2>
                                <div className="result-role">Kimse elenilmedi.</div>
                            </>
                        )}
                        <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                            {timer}s sonra yeni tur...
                        </div>
                    </div>
                </div>
            )}

            {/* Exit Confirmation (Game) */}
            {showExitConfirm && (
                <div className="result-overlay">
                    <div className="result-card" style={{ maxWidth: 400 }}>
                        <h2 style={{ color: '#ef4444' }}>Oyundan Çık?</h2>
                        <p style={{ color: '#ccc', margin: '20px 0' }}>Oyundan çıkmak istediğine emin misin? Bu işlem geri alınamaz.</p>
                        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                style={{ padding: '10px 20px', borderRadius: 10, background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                                İPTAL
                            </button>
                            <button
                                onClick={handleExitGame}
                                style={{ padding: '10px 20px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                ÇIK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Oyun Sonu */}
            {phase === 'game_over' && (
                <div className="gameover-overlay">
                    <div className="gameover-card">
                        <h1>{winner === 'villagers' ? '🎉 KÖYLÜLER KAZANDI!' : '🐺 VAMPİR KAZANDI!'}</h1>
                        <div className="go-players">
                            {players.map((p) => (
                                <div key={p.player_id} className={`go-row ${!p.is_alive ? 'dead' : ''}`}>
                                    <span className="go-name">{p.username} {!p.is_alive && '💀'}</span>
                                    <span className="go-role">{ROLE_INFO[p.role]?.name || '?'}</span>
                                </div>
                            ))}
                        </div>
                        <button className="go-btn" onClick={() => {
                            useGameStore.getState().resetGame();
                            setScreen('rooms');
                        }}>🏠 Çıkış</button>
                    </div>
                </div>
            )}
        </div>
    );
}
