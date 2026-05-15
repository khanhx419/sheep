/* ============================================================
 * NightPhase.jsx — Điều tra ban đêm
 * Chọn chuồng → chọn cừu → chọn phương pháp → phát hiện sói → combat
 * ============================================================ */

import { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { dogCheck, investigateSheep } from '../systems/investigationSystem.js';
import { processAdvanceDay } from '../systems/economySystem.js';

export default function NightPhase() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const [selectedPen, setSelectedPen] = useState(null);
  const [selectedSheep, setSelectedSheep] = useState(null);
  const [lastClue, setLastClue] = useState(null);
  const [dogResult, setDogResult] = useState(null);

  const handleDogCheck = (penId) => {
    const result = dogCheck(penId, state.infiltratedWolves, state.dog.available);
    setDogResult({ penId, ...result });
  };

  const handleInvestigate = (method) => {
    if (state.player.energy <= 0 || !selectedSheep) return;

    // Dispatch energy cost
    dispatch({
      type: 'INVESTIGATE_PEN',
      payload: { penId: selectedPen, method },
    });

    // Check for wolf
    const result = investigateSheep(
      method, selectedSheep.id, state.sheep, state.infiltratedWolves
    );

    setLastClue(result.clue);

    if (result.isWolf && result.wolfData) {
      // Phát hiện sói! → Combat
      dispatch({
        type: 'WOLF_FOUND',
        payload: { wolf: result.wolfData, sheepId: selectedSheep.id },
      });
      setTimeout(() => {
        dispatch({ type: 'START_COMBAT' });
      }, 1500);
    }

    setSelectedSheep(null);
  };

  const handleEndNight = () => {
    // Chuyển sang ngày mới
    const payload = processAdvanceDay(state);
    dispatch({ type: 'ADVANCE_DAY', payload });
    dispatch({ type: 'CHECK_LOSE' });
  };

  // Cừu trong chuồng đang chọn (bao gồm sói ngụy trang)
  const sheepInPen = selectedPen !== null
    ? [
        ...state.sheep.filter(s => s.penId === selectedPen),
        ...state.infiltratedWolves
          .filter(w => w.penId === selectedPen)
          .map(w => ({ id: w.fakeSheepId || w.id, age: w.disguise === 'baby' ? 'baby' : 'adult', _isWolf: true })),
      ]
    : [];

  const methods = [
    { id: 'check_paws', label: '🐾 Kiểm tra chân', desc: 'Phát hiện sói bình thường' },
    { id: 'check_teeth', label: '🦷 Kiểm tra răng', desc: 'Phát hiện sói con' },
    { id: 'check_eyes', label: '👀 Kiểm tra mắt', desc: 'Phát hiện sói dại' },
    { id: 'shear', label: '✂️ Cạo lông', desc: 'Phát hiện sói gầy (cần Pin)' },
  ];

  return (
    <div className="night-overlay">
      {/* Night Header */}
      <div className="night-header">
        <h2 className="font-pixel">🌙 Đêm {state.day}</h2>
        {state.isFullMoon && (
          <p style={{ color: 'var(--accent-yellow)', marginTop: '4px' }}>
            🌕 Trăng tròn — Sói ẩn mình hoàn toàn!
          </p>
        )}
        <div className="energy-display">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className={`energy-pip ${i < state.player.energy ? 'filled' : ''}`}
              title="Năng lượng điều tra"
            />
          ))}
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
            {state.player.energy} năng lượng
          </span>
        </div>
      </div>

      <div className="game-layout">
        <div className="game-main">
          {/* Chọn chuồng */}
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: 'var(--space-md)' }}>
              🔍 Chọn chuồng để điều tra
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              {state.pens.map(pen => {
                const penSheep = state.sheep.filter(s => s.penId === pen.id);
                const isSelected = selectedPen === pen.id;
                return (
                  <button
                    key={pen.id}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => { setSelectedPen(pen.id); setSelectedSheep(null); setLastClue(null); }}
                  >
                    {pen.name} ({penSheep.length} cừu)
                  </button>
                );
              })}
            </div>

            {/* Dog check */}
            {state.dog.available && selectedPen !== null && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <button className="btn btn-warning" onClick={() => handleDogCheck(selectedPen)}>
                  🐕 Cho chó kiểm tra chuồng
                </button>
                {dogResult && dogResult.penId === selectedPen && (
                  <p style={{ marginTop: '8px', fontSize: '13px', color: dogResult.hasDangerousWolf ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {dogResult.hasDangerousWolf
                      ? '🐕 GÂU GÂU! Chó sủa dữ dội — có sói trong chuồng!'
                      : '🐕 Chó im lặng — chuồng an toàn (hoặc chỉ có sói con).'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cừu trong chuồng */}
          {selectedPen !== null && (
            <div className="card animate-fade">
              <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-md)' }}>
                🐑 Cừu trong {state.pens.find(p => p.id === selectedPen)?.name}
              </h3>
              <div className="sheep-grid">
                {sheepInPen.map(sheep => (
                  <div
                    key={sheep.id}
                    className={`sheep-icon ${sheep.age === 'baby' ? 'sheep-baby' : 'sheep-adult'}`}
                    style={{
                      outline: selectedSheep?.id === sheep.id ? '2px solid var(--accent-blue)' : 'none',
                      outlineOffset: '2px',
                    }}
                    onClick={() => setSelectedSheep(sheep)}
                  >
                    {sheep.age === 'baby' ? '🐣' : '🐑'}
                  </div>
                ))}
              </div>

              {/* Investigation methods */}
              {selectedSheep && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <p style={{ fontSize: '13px', marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
                    Chọn phương pháp điều tra:
                  </p>
                  <div className="investigate-methods">
                    {methods.map(m => (
                      <button
                        key={m.id}
                        className="btn btn-ghost"
                        style={{ fontSize: '13px', justifyContent: 'flex-start' }}
                        onClick={() => handleInvestigate(m.id)}
                        disabled={state.player.energy <= 0}
                        title={m.desc}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clue result */}
          {lastClue && (
            <div className="card animate-slide-up" style={{ borderColor: 'rgba(255, 212, 59, 0.3)' }}>
              <p style={{ fontSize: '15px', fontFamily: '"VT323", monospace' }}>{lastClue}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="game-sidebar">
          <div className="card">
            <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-md)' }}>📊 Tình hình</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>❤️ HP: {state.player.hp}/{state.player.maxHp}</div>
              <div>⚡ Năng lượng: {state.player.energy}/2</div>
              <div>🐑 Tổng cừu: {state.sheep.length}</div>
              <div>🔍 Đã kiểm tra: {state.nightResults.investigated.length} lần</div>
              <div>🐺 Phát hiện: {state.nightResults.foundWolves.length} sói</div>
            </div>
          </div>

          <button className="btn btn-danger btn-lg" onClick={handleEndNight}>
            ☀️ Kết thúc đêm → Ngày mới
          </button>
        </div>
      </div>
    </div>
  );
}
