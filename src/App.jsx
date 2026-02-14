import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { supabase } from './services/supabaseClient';
import RoomList from './components/RoomList';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import CreateRoom from './components/CreateRoom';
import './App.css';

function App() {
  const { user, setUser, setScreen, setCurrentRoom, screen } = useGameStore();

  // 1. Ekran Yönü Sinyali (Flutter için)
  useEffect(() => {
    const sendOrientation = (mode) => {
      // FlutterBridge JavascriptChannel ile tanımlanır
      if (window.FlutterBridge && typeof window.FlutterBridge.postMessage === 'function') {
        window.FlutterBridge.postMessage(mode);
        console.log("Sent to Flutter:", mode);
      }
    };

    if (screen === 'game') {
      sendOrientation('setLandscape');
    } else {
      // Lobi, Odalar veya Login ekranındaysak DİKEY olsun
      sendOrientation('setPortrait');
    }
  }, [screen]);

  useEffect(() => {
    // 2. Flutter'dan kullanıcı bilgisi al (window.setUserData manuel tetikleme için)
    window.setUserData = (data) => {
      setUser({
        id: data.id,
        username: data.username || data.full_name || 'Oyuncu',
        avatar_url: data.avatar_url || null,
      });

      if (data.roomId) {
        setCurrentRoom({ id: data.roomId });
        setScreen('lobby');
      }
    };

    // 3. URL params'dan oku (Deep Link / WebView başlangıcı)
    const params = new URLSearchParams(window.location.search);
    const userIdParams = params.get('userId');
    const usernameParams = params.get('username');
    let avatarUrlParams = params.get('avatarUrl');
    const roomIdParams = params.get('roomId');

    console.log("[App] URL Params Raw:", { userIdParams, usernameParams, avatarUrlParams, roomIdParams });

    // Avatar boş/null kontrolü
    if (avatarUrlParams) {
      if (avatarUrlParams === "null" || avatarUrlParams === "undefined" || avatarUrlParams.trim() === "") {
        avatarUrlParams = null;
      }
    }

    if (userIdParams && usernameParams) {
      console.log("[App] Auto-Login via URL");
      setUser({ id: userIdParams, username: usernameParams, avatar_url: avatarUrlParams || null });

      if (roomIdParams) {
        setCurrentRoom({ id: roomIdParams });
        setScreen('lobby');
      }
    }

    // 4. Supabase session backup (Web tarayıcıda test için)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !useGameStore.getState().user) {
        const u = session.user;
        setUser({
          id: u.id,
          username: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Oyuncu',
          avatar_url: u.user_metadata?.avatar_url || null,
        });
      }
    });

    return () => {
      delete window.setUserData;
    };
  }, []); // Mount only

  // Kullanıcı yok = login yok = demo mod
  if (!user) {
    return <LoginPrompt onLogin={setUser} />;
  }

  return (
    <div className="app">
      {screen === 'rooms' && <RoomList />}
      {screen === 'create_room' && <CreateRoom />}
      {screen === 'lobby' && <Lobby />}
      {screen === 'game' && <GameScreen />}
    </div>
  );
}

// ─── Basit login ekranı (Flutter'dan gelmezse) ───
function LoginPrompt({ onLogin }) {
  function handleDemoLogin() {
    const demoId = 'demo-' + Math.random().toString(36).substring(2, 8);
    onLogin({
      id: demoId,
      username: 'Oyuncu' + Math.floor(Math.random() * 999),
      avatar_url: null,
    });
  }

  return (
    <div className="login-prompt">
      <div className="login-card">
        <h1>🐺 Vampir Köylü</h1>
        <p>Oynamak için giriş yap!</p>
        <button onClick={handleDemoLogin} className="btn-demo">
          🎮 Demo Giriş
        </button>
        <p className="login-hint">Flutter uygulamasından açılınca otomatik giriş yapılır.</p>
      </div>
    </div>
  );
}

export default App;
