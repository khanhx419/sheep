/* ============================================================
 * FarmDayPhase.jsx - Giao dien ban ngay
 * Hien thi chuong, cuu, HUD, actions
 * ============================================================ */

import { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { saveGame } from '../reducers/gameReducer.js';
import Notebook from './Notebook.jsx';
import PenScene from './PenScene.jsx';

export default function FarmDayPhase() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [showNotebook, setShowNotebook] = useState(false);

  const adultCount = state.sheep.filter((s) => s.age === 'adult').length;
  const babyCount = state.sheep.filter((s) => s.age === 'baby').length;

  const handleEndDay = () => {
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

  const residentsByPen = {};
  state.pens.forEach((pen) => {
    residentsByPen[pen.id] = [];
  });

  state.sheep.forEach((sheep) => {
    if (residentsByPen[sheep.penId]) {
      residentsByPen[sheep.penId].push(sheep);
    }
  });

  state.infiltratedWolves.forEach((wolf) => {
    if (!residentsByPen[wolf.penId]) return;

    residentsByPen[wolf.penId].push({
      id: wolf.fakeSheepId || `wolf-${wolf.id}`,
      fakeSheepId: wolf.fakeSheepId,
      penId: wolf.penId,
      age: wolf.disguise === 'baby' ? 'baby' : 'adult',
      isSheared: wolf.disguise === 'sheared',
      _isWolf: true,
      tells: wolf.tells,
    });
  });

  return (
    <div>
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
            <span style={{ color: 'var(--accent-purple)' }}>Thương nhân!</span>
          </div>
        )}
      </div>

      <div className="game-layout">
        <div className="game-main">
          {state.pens.map((pen) => (
            <div className="pen card" key={pen.id}>
              <div className="pen-header">
                <span className="pen-name">{pen.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {pen.roofed && '🏠 Mái che'} {pen.fenced && '🔒 Hàng rào'}
                </span>
              </div>

              <PenScene
                residents={residentsByPen[pen.id] || []}
                backgroundImage={
                  state.weather === 'rainy'
                    ? '/assets/images/background_rain.svg'
                    : '/assets/images/background_day.svg'
                }
              />
            </div>
          ))}

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
                💰 Ban trang trai ({state.targetGold} Xu)
              </button>
              {state.gold < state.targetGold && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Cần thêm {state.targetGold - state.gold} Xu
                </span>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />

              <button
                className="btn btn-ghost"
                onClick={() => setShowNotebook(true)}
                style={{ fontSize: '13px' }}
              >
                📖 Sổ tay chủ cừu ({state.notebookUnlocked.length})
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-sm)' }}>🎒 Trang bị</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>⚔️ Vũ khí: {state.player.weapon === 'gun' ? `Súng (${state.player.ammo} đạn)` : 'Nông cụ'}</div>
              <div>🛡️ Giáp: {state.player.armor ? `${state.player.armor.durability}/${state.player.armor.maxDurability}` : 'Không'}</div>
              <div>📦 Vật phẩm: {state.inventory.reduce((a, i) => a + i.quantity, 0)} món</div>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'rgba(255, 107, 107, 0.2)' }}>
            <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-sm)', color: 'var(--accent-red)' }}>
              ⚠️ Mức nguy hiểm
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div>🐺 Sói tiềm ẩn: {state.infiltratedWolves.length} con</div>
              <div>📊 Ngày {state.day} - {state.isFullMoon ? '🌕 Trăng tròn!' : `Trăng tròn trong ${7 - (state.day % 7)} ngày`}</div>
            </div>
          </div>
        </div>
      </div>

      {showNotebook && <Notebook onClose={() => setShowNotebook(false)} />}
    </div>
  );
}
