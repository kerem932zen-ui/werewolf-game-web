import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Room Operations ───
export async function fetchRooms() {
    const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createRoom(name, ownerId, maxPlayers, isPrivate, password) {
    const { data, error } = await supabase
        .from('game_rooms')
        .insert({
            name,
            owner_id: ownerId,
            max_players: maxPlayers,
            is_private: isPrivate,
            password: password || null,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function joinRoom(roomId, playerId, username, avatarUrl, color) {
    const { data, error } = await supabase
        .from('game_room_players')
        .upsert({
            room_id: roomId,
            player_id: playerId,
            username,
            avatar_url: avatarUrl,
            color,
        }, { onConflict: 'room_id,player_id' })
        .select()
        .single();
    if (error) throw error;

    // current_players güncelle (hata olursa sessiz geç)
    try { await supabase.rpc('increment_room_players', { room_id_input: roomId }); } catch (e) { console.warn('RPC increment:', e); }
    return data;
}

export async function leaveRoom(roomId, playerId) {
    await supabase
        .from('game_room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('player_id', playerId);
    try { await supabase.rpc('decrement_room_players', { room_id_input: roomId }); } catch (e) { console.warn('RPC decrement:', e); }
}

export async function getRoomPlayers(roomId) {
    const { data, error } = await supabase
        .from('game_room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function setPlayerReady(roomId, playerId, ready) {
    await supabase
        .from('game_room_players')
        .update({ is_ready: ready })
        .eq('room_id', roomId)
        .eq('player_id', playerId);
}

export async function updateRoomPhase(roomId, phase, round) {
    await supabase
        .from('game_rooms')
        .update({ game_phase: phase, round_number: round, status: phase === 'lobby' ? 'waiting' : 'playing' })
        .eq('id', roomId);
}

export async function assignRoles(roomId, playerRoles) {
    for (const { playerId, role } of playerRoles) {
        await supabase
            .from('game_room_players')
            .update({ role })
            .eq('room_id', roomId)
            .eq('player_id', playerId);
    }
}

export async function killPlayer(roomId, playerId) {
    await supabase
        .from('game_room_players')
        .update({ is_alive: false })
        .eq('room_id', roomId)
        .eq('player_id', playerId);
}

export async function castVote(roomId, voterId, targetId) {
    await supabase
        .from('game_room_players')
        .update({ voted_for: targetId })
        .eq('room_id', roomId)
        .eq('player_id', voterId);
}

export async function clearVotes(roomId) {
    await supabase
        .from('game_room_players')
        .update({ voted_for: null })
        .eq('room_id', roomId);
}

export async function endGame(roomId, winnerTeam, durationSeconds, totalPlayers, totalRounds) {
    await supabase.from('game_rooms').update({ status: 'finished', winner_team: winnerTeam, game_phase: 'game_over' }).eq('id', roomId);
    await supabase.from('game_history').insert({ room_id: roomId, winner_team: winnerTeam, duration_seconds: durationSeconds, total_players: totalPlayers, total_rounds: totalRounds });
}
