import { PIESOCKET_API_KEY, PIESOCKET_CLUSTER_ID } from '../config';

class PieSocketService {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.listeners = {};
        this.reconnectTimer = null;
        this.userData = null;
    }

    connect(roomId, userData) {
        if (this.ws && this.roomId === roomId) return;
        this.disconnect();

        this.roomId = roomId;
        this.userData = userData;
        const url = `wss://${PIESOCKET_CLUSTER_ID}.piesocket.com/v3/werewolf-${roomId}?api_key=${PIESOCKET_API_KEY}&notify_self=0`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('🔌 PieSocket connected:', roomId);
            this.send('player_connected', { ...userData });
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.event === 'system:member_joined' || msg.event === 'system:member_left') return;
                const eventName = msg.event;
                const data = msg.data ? (typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data) : {};
                if (this.listeners[eventName]) {
                    this.listeners[eventName].forEach((cb) => cb(data));
                }
                // Global listener
                if (this.listeners['*']) {
                    this.listeners['*'].forEach((cb) => cb(eventName, data));
                }
            } catch (e) {
                // skip unparseable
            }
        };

        this.ws.onclose = () => {
            console.log('⚠️ PieSocket disconnected, reconnecting in 3s...');
            this.reconnectTimer = setTimeout(() => {
                if (this.roomId) this.connect(this.roomId, this.userData);
            }, 3000);
        };

        this.ws.onerror = (e) => {
            console.error('❌ PieSocket error:', e);
        };
    }

    disconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.roomId = null;
        this.listeners = {};
    }

    send(event, data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({ event, data: JSON.stringify(data) }));
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
        return () => {
            this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
        };
    }

    off(event) {
        delete this.listeners[event];
    }
}

const pieSocket = new PieSocketService();
export default pieSocket;
