/* ============================================================
 * FarmDayPhase.jsx — Giao diện ban ngày
 * Hiển thị chuồng, cừu, HUD, actions
 * ============================================================ */

import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { processAdvanceDay } from '../systems/economySystem.js';
import { saveGame } from '../reducers/gameReducer.js';

export default function FarmDayPhase() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const adultCount = state.sheep.filter(s => s.age === 'adult').length;
  const babyCount = state.sheep.filter(s => s.age === 'baby').length;

  const handleEndDay = () => {
    // Lưu game trước khi chuyển đêm
    saveGame(state);
    dispatch({ type: 'START_NIGHT' });
  };

  const handleShop = () => {
    dispatch({ type: 'OPEN_SHOP' });
  };

  const handleSellFarm = () => {
    if (state.gold >= state.targetGold) {
      dispatch({ type: 'SELL_FARM' });
    }
  };

  // Nhóm cừu theo chuồng
  const sheepByPen = {};
  state.pens.forEach(p => { sheepByPen[p.id] = []; });
  state.sheep.forEach(s => {
    if (sheepByPen[s.penId]) {
      sheepByPen[s.penId].push(s);
    }
  });

  return (
    <div>
      {/* HUD */}
      <div className="hud">
        <div className="hud-stat">
          <span className="icon">📅</span>
          <span>Ngày {state.day}</span>
        </div>
        <div className="hud-stat">
          <span className="icon">💰</span>
          <span className="text-gold">{state.gold} / {state.targetGold} Xu</span>
        </div>
        <div className="hud-stat">
          <span className="icon">🐑</span>
          <span>{adultCount} lớn, {babyCount} con</span>
        </div>
        <div className="hud-stat">
          <span className="icon">{state.weather === 'rainy' ? '🌧️' : '☀️'}</span>
          <span>{state.weather === 'rainy' ? 'Mưa' : 'Nắng'}</span>
        </div>
        <div className="hud-stat">
          <span className="icon">❤️</span>
          <span>{state.player.hp}/{state.player.maxHp}</span>
        </div>
        {state.dog.available && (
          <div className="hud-stat">
            <span className="icon">🐕</span>
            <span className="text-green">Sẵn sàng</span>
          </div>
        )}
        {state.merchant.present && (
          <div className="hud-stat animate-pulse">
            <span className="icon">🧙</span>
            <span className="text-purple" style={{ color: 'var(--accent-purple)' }}>Thương nhân!</span>
          </div>
        )}
      </div>

      <div className="game-layout">
        {/* Main Area — Chuồng cừu */}
        <div className="game-main">
          {state.pens.map(pen => (
            <div className="pen card" key={pen.id}>
              <div className="pen-header">
                <span className="pen-name">{pen.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {pen.roofed && '🏠 Mái che'} {pen.fenced && '🔒 Hàng rào'}
                </span>
              </div>
              <div className="sheep-grid">
                {(sheepByPen[pen.id] || []).map(sheep => (
                  <div
                    key={sheep.id}
                    className={`sheep-icon ${
                      sheep.age === 'baby' ? 'sheep-baby' : 
                      sheep.isSheared ? 'sheep-sheared' : 'sheep-adult'
                    }`}
                    title={sheep.age === 'baby' ? 'Cừu con' : sheep.isSheared ? 'Đã cạo lông' : 'Cừu lớn'}
                  >
                    {sheep.age === 'baby' ? '🐣' : '🐑'}
                  </div>
                ))}
                {(sheepByPen[pen.id] || []).length === 0 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chuồng trống</span>
                )}
              </div>
            </div>
          ))}

          {/* Messages */}
          {state.messages.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                📜 Nhật ký
              </h3>
              <div className="message-log">
                {state.messages.map((msg, i) => (
                  <div className="message" key={i}>{msg}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Actions */}
        <div className="game-sidebar">
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: 'var(--space-md)' }}>⚡ Hành động</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <button className="btn btn-primary" onClick={handleShop}>
                🏪 Cửa hàng
              </button>

              {state.merchant.present && (
                <button className="btn btn-warning" onClick={handleShop}>
                  🧙 Thương nhân bí ẩn
                </button>
              )}

              <button className="btn btn-ghost" onClick={handleEndDay}>
                🌙 Kết thúc ngày → Đêm
              </button>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />

              <button
                className="btn btn-success"
                onClick={handleSellFarm}
                disabled={state.gold < state.targetGold}
              >
                💰 Bán trang trại ({state.targetGold} Xu)
              </button>
              {state.gold < state.targetGold && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Cần thêm {state.targetGold - state.gold} Xu
                </span>
              )}
            </div>
          </div>

          {/* Inventory Preview */}
          <div className="card">
            <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-sm)' }}>🎒 Trang bị</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>⚔️ Vũ khí: {state.player.weapon === 'gun' ? `Súng (${state.player.ammo} đạn)` : 'Nông cụ'}</div>
              <div>🛡️ Giáp: {state.player.armor ? `${state.player.armor.durability}/${state.player.armor.maxDurability}` : 'Không'}</div>
              <div>📦 Vật phẩm: {state.inventory.reduce((a, i) => a + i.quantity, 0)} món</div>
            </div>
          </div>

          {/* Danger indicator */}
          <div className="card" style={{ borderColor: 'rgba(255, 107, 107, 0.2)' }}>
            <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-sm)', color: 'var(--accent-red)' }}>
              ⚠️ Mức nguy hiểm
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div>🐺 Sói tiềm ẩn: {state.infiltratedWolves.length} con</div>
              <div>📊 Ngày {state.day} — {state.isFullMoon ? '🌕 Trăng tròn!' : `Trăng tròn trong ${7 - (state.day % 7)} ngày`}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
