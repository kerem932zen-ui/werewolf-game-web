import './Character.css';

export default function Character({ player, isMe, onClick }) {
    const roleIcon = {
        werewolf: '🐺',
        seer: '🔮',
        doctor: '💊',
        hunter: '🏹',
        villager: '👤',
        unassigned: '❓',
    };

    return (
        <div
            className={`character ${!player.is_alive ? 'dead' : ''} ${isMe ? 'is-me' : ''}`}
            onClick={() => onClick?.(player)}
            style={{ '--player-color': player.color || '#FF4444' }}
        >
            {/* Karakter vücudu */}
            <div className="char-body">
                <div className="char-head">
                    <div className="char-eye left"></div>
                    <div className="char-eye right"></div>
                </div>
                <div className="char-torso"></div>
                <div className="char-legs">
                    <div className="char-leg left"></div>
                    <div className="char-leg right"></div>
                </div>
            </div>

            {/* İsim + Rozet */}
            <div className="char-info">
                <span className="char-name">{player.username}</span>
                {!player.is_alive && <span className="char-dead-badge">💀</span>}
            </div>

            {/* Avatar overlay */}
            {player.avatar_url && (
                <img src={player.avatar_url} alt="" className="char-avatar" />
            )}
        </div>
    );
}
