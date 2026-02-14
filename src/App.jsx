import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { supabase } from './services/supabaseClient';
import RoomList from './components/RoomList';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import './App.css';

function App() {
  const { user, setUser, setScreen, setCurrentRoom, screen } = useGameStore();

  useEffect(() => {
    // 1. Flutter'dan kullanıcı bilgisi al (window.setUserData)
    window.setUserData = (data) => {
      setUser({
        id: data.id,
        username: data.username || data.full_name || 'Oyuncu',
        avatar_url: data.avatar_url || null,
      });

      // Flutter'dan oda bilgisi de gelirse
      if (data.roomId) {
        setCurrentRoom({ id: data.roomId });
        setScreen('lobby');
      }
    };

    // 2. URL params'dan oku (Deep Link / WebView için kritik)
    const params = new URLSearchParams(window.location.search);
    const userIdParams = params.get('userId');
    const usernameParams = params.get('username');
    const avatarUrlParams = params.get('avatarUrl');
    const roomIdParams = params.get('roomId'); // Odaya direkt giriş için

    if (userIdParams && usernameParams) {
      // Kullanıcıyı ayarla
      setUser({ id: userIdParams, username: usernameParams, avatar_url: avatarUrlParams || null });

      // Eğer oda ID varsa ve henüz bir odaya girmemişsek -> Lobiye (odaya) at
      if (roomIdParams) {
        setCurrentRoom({ id: roomIdParams });
        setScreen('lobby');
      }
    }

    // 3. Supabase session kontrolü (Web tarayıcıdan girenler için)
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Eğer store'da user yoksa session'dan al
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
  }, []);

  // Kullanıcı yok = login yok = demo mod
  if (!user) {
    return <LoginPrompt onLogin={setUser} />;
  }

  return (
    <div className="app">
      {screen === 'rooms' && <RoomList />}
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
