import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
    // User / Auth state
    user: null,
    setUser: (user) => set({ user }),

    // Room list state
    rooms: [],
    setRooms: (rooms) => set({ rooms }),

    // Current room state
    currentRoom: null,
    setCurrentRoom: (room) => set({ currentRoom: room }),

    // Players in current room
    players: [],
    setPlayers: (players) => set({ players }),
    addPlayer: (player) => set((s) => ({ players: [...s.players.filter((p) => p.player_id !== player.player_id), player] })),
    removePlayer: (playerId) => set((s) => ({ players: s.players.filter((p) => p.player_id !== playerId) })),
    updatePlayer: (playerId, updates) =>
        set((s) => ({
            players: s.players.map((p) => (p.player_id === playerId ? { ...p, ...updates } : p)),
        })),

    // Game phase
    phase: 'lobby', // lobby, role_reveal, night, dawn, day, voting, execution, game_over
    setPhase: (phase) => set({ phase }),

    // Round
    round: 0,
    setRound: (round) => set({ round }),

    // My role
    myRole: null,
    setMyRole: (role) => set({ myRole: role }),

    // Night actions
    nightTarget: null,
    setNightTarget: (id) => set({ nightTarget: id }),

    // Vote
    myVote: null,
    setMyVote: (id) => set({ myVote: id }),

    // Timer
    timer: 0,
    setTimer: (t) => set({ timer: t }),

    // Chat messages
    messages: [],
    addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
    clearMessages: () => set({ messages: [] }),

    // Game result
    winner: null,
    setWinner: (w) => set({ winner: w }),

    // Screen
    screen: 'rooms', // rooms, lobby, game
    setScreen: (screen) => set({ screen }),

    // Reset all game state
    resetGame: () =>
        set({
            currentRoom: null,
            players: [],
            phase: 'lobby',
            round: 0,
            myRole: null,
            nightTarget: null,
            myVote: null,
            timer: 0,
            messages: [],
            winner: null,
        }),
}));
