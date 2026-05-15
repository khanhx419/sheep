/* ============================================================
 * MainMenu.jsx — Màn hình chính
 * ============================================================ */

import { useGameDispatch } from '../context/GameContext.jsx';
import { loadGame } from '../reducers/gameReducer.js';

export default function MainMenu() {
  const dispatch = useGameDispatch();

  const handleNewGame = () => {
    dispatch({ type: 'START_GAME' });
  };

  const handleLoadGame = () => {
    const saved = loadGame();
    if (saved) {
      dispatch({ type: 'LOAD_GAME', payload: saved });
    } else {
      alert('Không tìm thấy bản lưu!');
    }
  };

  const hasSave = !!localStorage.getItem('sheep_farm_defense_save');

  return (
    <div className="menu-screen">
      <div className="animate-slide-up">
        <div style={{ fontSize: '72px', marginBottom: '8px' }}>🐑</div>
        <h1 className="menu-title">Sheep Farm Defense</h1>
        <p className="menu-subtitle">
          Bảo vệ trang trại cừu khỏi bầy sói tiến hóa. 
          Kiếm đủ 200 Xu để bán trang trại và cưới vợ!
        </p>
      </div>

      <div className="menu-buttons animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <button className="btn btn-primary btn-lg" onClick={handleNewGame}>
          🌾 Trò Chơi Mới
        </button>
        
        <button 
          className="btn btn-ghost btn-lg" 
          onClick={handleLoadGame}
          disabled={!hasSave}
        >
          📂 Tiếp Tục
        </button>
      </div>

      <p className="text-muted" style={{ fontSize: '12px', opacity: 0.5, marginTop: '32px' }}>
        Phát triển bởi Lê Tuấn Khanh — Phase 1 MVP
      </p>
    </div>
  );
}
