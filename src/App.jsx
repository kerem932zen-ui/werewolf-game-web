import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { supabase } from './services/supabaseClient';
import RoomList from './components/RoomList';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import './App.css';

function App() {
  const { user, setUser, screen } = useGameStore();

  useEffect(() => {
    // Flutter'dan kullanıcı bilgisi al
    window.setUserData = (data) => {
      setUser({
        id: data.id,
        username: data.username || data.full_name || 'Oyuncu',
        avatar_url: data.avatar_url || null,
      });
    };

    // URL params'dan da alabiliriz
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const username = params.get('username');
    const avatarUrl = params.get('avatarUrl');

    if (userId && username) {
      setUser({ id: userId, username, avatar_url: avatarUrl || null });
    }

    // Supabase session kontrolü (backup)
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
