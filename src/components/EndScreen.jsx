/* ============================================================
 * EndScreen.jsx — Win / Lose Screen
 * ============================================================ */

import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { deleteSave } from '../reducers/gameReducer.js';

export default function EndScreen({ result }) {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const isWin = result === 'win';

  const handleRestart = () => {
    deleteSave();
    dispatch({ type: 'START_GAME' });
  };

  const handleMenu = () => {
    dispatch({ type: 'SET_PHASE', payload: 'MENU' });
  };

  return (
    <div className={`end-screen ${isWin ? 'win' : 'lose'}`}>
      <div className="animate-slide-up">
        <div style={{ fontSize: '80px', marginBottom: '16px' }}>
          {isWin ? '🎉' : '💀'}
        </div>
        <h1
          className="end-title"
          style={{ color: isWin ? 'var(--accent-green)' : 'var(--accent-red)' }}
        >
          {isWin ? 'CHIẾN THẮNG!' : 'THẤT BẠI...'}
        </h1>
      </div>

      <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
        {isWin ? (
          <div style={{ maxWidth: '420px', textAlign: 'center' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Bạn đã kiếm đủ <span className="text-gold">{state.targetGold} Xu</span> và bán trang trại thành công!
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Sau {state.day} ngày vật lộn với bầy sói tiến hóa, bạn cuối cùng cũng có đủ tiền cưới vợ.
              Trang trại được giao lại cho người chủ mới — hy vọng họ biết cách đối phó với lũ sói...
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: '420px', textAlign: 'center' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-primary)' }}>
              {state.loseReason === 'death'
                ? 'Bạn đã gục ngã trong trận chiến với bầy sói.'
                : 'Bầy sói đã chiếm trọn trang trại.'}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {state.loseReason === 'death'
                ? `Sau ${state.day} ngày chiến đấu, sức lực đã cạn kiệt. Bạn gục ngã trước nanh vuốt của sói. Giấc mơ cưới vợ tan thành mây khói...`
                : `Sau ${state.day} ngày chiến đấu, sói ngụy trang đã vượt quá 75% đàn cừu. Trang trại không thể cứu vãn. Giấc mơ cưới vợ tan thành mây khói...`}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.3s', maxWidth: '320px', width: '100%' }}>
        <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
          📊 Thống kê
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>📅 Số ngày sinh tồn</span>
            <span className="text-gold">{state.day}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>💰 Xu kiếm được</span>
            <span className="text-gold">{state.gold}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🐑 Cừu còn lại</span>
            <span>{state.sheep.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🐺 Sói đã phát hiện</span>
            <span>{state.notebookUnlocked.length} loại</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🐺 Sói trà trộn</span>
            <span style={{ color: state.infiltratedWolves.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {state.infiltratedWolves.length} con
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="animate-slide-up" style={{ animationDelay: '0.45s', display: 'flex', gap: 'var(--space-md)' }}>
        <button className="btn btn-primary btn-lg" onClick={handleRestart}>
          🔄 Chơi lại
        </button>
        <button className="btn btn-ghost btn-lg" onClick={handleMenu}>
          🏠 Về menu
        </button>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '24px', opacity: 0.5 }}>
        Phát triển bởi Lê Tuấn Khanh — Sheep Farm Defense
      </p>
    </div>
  );
}
