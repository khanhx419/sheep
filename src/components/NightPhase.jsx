/* ============================================================
 * NightPhase.jsx - Dieu tra ban dem
 * ============================================================ */

import { useState } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { dogCheck, investigateSheep } from '../systems/investigationSystem.js';
import { processAdvanceDay } from '../systems/economySystem.js';
import { ITEMS } from '../data/items.js';
import { PLAYER_ENERGY_PER_NIGHT } from '../data/constants.js';
import PenScene from './PenScene.jsx';

export default function NightPhase() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const [selectedPen, setSelectedPen] = useState(null);
  const [selectedSheep, setSelectedSheep] = useState(null);
  const [lastClue, setLastClue] = useState(null);
  const [dogResult, setDogResult] = useState(null);

  const energyItems = state.inventory.filter((entry) => {
    const item = ITEMS[entry.itemId];
    return item && item.category === 'consumable' && item.energyAmount && item.usableInNight;
  });

  const handleDogCheck = (penId) => {
    const result = dogCheck(penId, state.infiltratedWolves, state.dog.available);
    setDogResult({ penId, ...result });
  };

  const handleInvestigate = (method) => {
    if (!selectedSheep) return;

    const isShear = method === 'shear';
    if (!isShear && state.player.energy <= 0) return;

    if (isShear) {
      dispatch({
        type: 'SHEAR_SHEEP',
        payload: { sheepId: selectedSheep.id, penId: selectedPen },
      });
    } else {
      dispatch({
        type: 'INVESTIGATE_PEN',
        payload: { penId: selectedPen, method },
      });
    }

    const result = investigateSheep(
      method,
      selectedSheep.id,
      state.sheep,
      state.infiltratedWolves
    );

    setLastClue(result.clue);

    if (result.isWolf && result.wolfData) {
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

  const handleUseEnergyItem = (itemId) => {
    const item = ITEMS[itemId];
    if (!item?.energyAmount || state.player.energy >= PLAYER_ENERGY_PER_NIGHT) return;

    dispatch({ type: 'RESTORE_ENERGY', payload: { amount: item.energyAmount } });
    dispatch({ type: 'USE_ITEM', payload: { itemId } });
    setLastClue(`Uong ${item.name}: hoi ${item.energyAmount} nang luong.`);
  };

  const handleEndNight = () => {
    const payload = processAdvanceDay(state);
    dispatch({ type: 'ADVANCE_DAY', payload });
    dispatch({ type: 'CHECK_LOSE' });
  };

  const sheepInPen = selectedPen !== null
    ? [
        ...state.sheep
          .filter((sheep) => sheep.penId === selectedPen)
          .map((sheep) => ({ ...sheep, penId: selectedPen, tells: [] })),
        ...state.infiltratedWolves
          .filter((wolf) => wolf.penId === selectedPen)
          .map((wolf) => ({
            id: wolf.fakeSheepId || wolf.id,
            fakeSheepId: wolf.fakeSheepId,
            age: wolf.disguise === 'baby' ? 'baby' : 'adult',
            isSheared: wolf.disguise === 'sheared',
            _isWolf: true,
            tells: wolf.tells,
            penId: wolf.penId,
          })),
      ]
    : [];

  const methods = [
    { id: 'check_paws', label: 'Kiem tra chan', cost: true },
    { id: 'check_teeth', label: 'Kiem tra rang', cost: true },
    { id: 'check_eyes', label: 'Kiem tra mat', cost: true },
    { id: 'shear', label: 'Cao long', cost: false },
  ];

  return (
    <div className="night-overlay">
      <div className="night-header">
        <h2 className="font-pixel">Dem {state.day}</h2>
        {state.isFullMoon && (
          <p style={{ color: 'var(--accent-yellow)', marginTop: '4px' }}>
            Trang tron - soi an minh hoan toan!
          </p>
        )}
        <div className="energy-display">
          {Array.from({ length: PLAYER_ENERGY_PER_NIGHT }).map((_, i) => (
            <div
              key={i}
              className={`energy-pip ${i < state.player.energy ? 'filled' : ''}`}
              title="Nang luong dieu tra"
            />
          ))}
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
            {state.player.energy} nang luong
          </span>
        </div>
      </div>

      <div className="game-layout">
        <div className="game-main">
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: 'var(--space-md)' }}>
              Chon chuong de dieu tra
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {state.pens.map((pen) => {
                const penSheep = state.sheep.filter((sheep) => sheep.penId === pen.id).length;
                const penWolves = state.infiltratedWolves.filter((wolf) => wolf.penId === pen.id).length;
                const isSelected = selectedPen === pen.id;

                return (
                  <button
                    key={pen.id}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => {
                      setSelectedPen(pen.id);
                      setSelectedSheep(null);
                      setLastClue(null);
                    }}
                  >
                    {pen.name} ({penSheep + penWolves} con)
                  </button>
                );
              })}
            </div>

            {state.dog.available && selectedPen !== null && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <button className="btn btn-warning" onClick={() => handleDogCheck(selectedPen)}>
                  Cho cho kiem tra chuong
                </button>
                {dogResult && dogResult.penId === selectedPen && (
                  <p style={{ marginTop: '8px', fontSize: '13px', color: dogResult.hasDangerousWolf ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {dogResult.hasDangerousWolf
                      ? 'GAU GAU! Chuong nay co soi.'
                      : 'Cho im lang - chuong nay co ve an toan.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedPen !== null && (
            <div className="card animate-fade">
              <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-md)' }}>
                Cuu trong {state.pens.find((pen) => pen.id === selectedPen)?.name}
              </h3>
              <div className="sheep-grid">
                <PenScene
                  residents={sheepInPen}
                  backgroundImage="/assets/images/background_night.svg"
                  interactive
                  selectedId={selectedSheep?.id}
                  onSelect={setSelectedSheep}
                />
              </div>

              {selectedSheep && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <p style={{ fontSize: '13px', marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
                    Chon phuong phap dieu tra:
                  </p>
                  <div className="investigate-methods">
                    {methods.map((method) => (
                      <button
                        key={method.id}
                        className="btn btn-ghost"
                        style={{ fontSize: '13px', justifyContent: 'flex-start' }}
                        onClick={() => handleInvestigate(method.id)}
                        disabled={method.cost && state.player.energy <= 0}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {lastClue && (
            <div className="card animate-slide-up" style={{ borderColor: 'rgba(255, 212, 59, 0.3)' }}>
              <p style={{ fontSize: '15px', fontFamily: '"VT323", monospace' }}>{lastClue}</p>
            </div>
          )}
        </div>

        <div className="game-sidebar">
          <div className="card">
            <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-md)' }}>Tinh hinh</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>HP: {state.player.hp}/{state.player.maxHp}</div>
              <div>Nang luong: {state.player.energy}/{PLAYER_ENERGY_PER_NIGHT}</div>
              <div>Tong cuu: {state.sheep.length}</div>
              <div>Da kiem tra: {state.nightResults.investigated.length} lan</div>
              <div>Phat hien: {state.nightResults.foundWolves.length} soi</div>
            </div>
          </div>

          {energyItems.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '14px', marginBottom: 'var(--space-md)' }}>Hoi nang luong</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {energyItems.map((entry) => {
                  const item = ITEMS[entry.itemId];
                  return (
                    <button
                      key={entry.itemId}
                      className="btn btn-warning"
                      onClick={() => handleUseEnergyItem(entry.itemId)}
                      disabled={state.player.energy >= PLAYER_ENERGY_PER_NIGHT}
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>{item.name}</span>
                      <span>x{entry.quantity}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn btn-danger btn-lg" onClick={handleEndNight}>
            Ket thuc dem {'->'} Ngay moi
          </button>
        </div>
      </div>
    </div>
  );
}
