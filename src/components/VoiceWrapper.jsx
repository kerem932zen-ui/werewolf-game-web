import { useEffect, useState } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { supabase } from '../services/supabaseClient'; // Adjusted path

// BU BİLGİLERİ KENDİ LIVEKIT PANELİNDEN ALIP BURAYA YAZABİLİRSİN (GEÇİCİ TEST İÇİN)
// VEYA .env DOSYASINDAN ÇEKEBİLİRİZ
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://seningercekurlin.livekit.cloud";

export default function VoiceWrapper({ children, roomId, username, micOn, onMicError }) {
    const [token, setToken] = useState("");

    useEffect(() => {
        if (!roomId || !username) return;

        // Token alma fonksiyonu
        const fetchToken = async () => {
            try {
                // 1. YÖNTEM: Supabase Edge Function (TERCİH EDİLEN)
                const { data, error } = await supabase.functions.invoke('livekit-token', {
                    body: { roomCode: roomId, username: username }, // UPDATED KEY
                });

                if (error || !data?.token) {
                    console.warn("Supabase Function token veremedi, test tokeni deneniyor...", error);
                    return;
                }

                setToken(data.token);
            } catch (e) {
                console.error("Token hatası:", e);
                onMicError?.(e);
            }
        };

        fetchToken();
    }, [roomId, username]);

    if (!token) {
        // Token yoksa sadece çocukları render et (ses yok)
        return <>{children}</>;
    }

    return (
        <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={token}
            connect={true}
            audio={false} // Başlangıçta global ses kapalı değil, kontrol bizde
            video={false}
            data-lk-theme="default"
        >
            {/* Mikrofon Kontrolcüsü */}
            <MicController micOn={micOn} />

            {/* Odaya gelen sesleri çalar */}
            <RoomAudioRenderer />

            {children}
        </LiveKitRoom>
    );
}

// Mikrofon durumunu LiveKit ile senkronize eden alt bileşen
function MicController({ micOn }) {
    const { localParticipant } = useLocalParticipant();

    useEffect(() => {
        if (localParticipant) {
            localParticipant.setMicrophoneEnabled(micOn).catch(err => {
                console.error("Mic fail:", err);
            });
        }
    }, [micOn, localParticipant]);

    return null;
}
