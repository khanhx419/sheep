/* ============================================================
 * CombatPhase.jsx - Combat Screen
 * ============================================================ */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { CombatEngine } from '../canvas/CombatEngine.js';
import { calculateAttackDamage, processStatusEffect } from '../systems/combatSystem.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ATTACK_METER_SPEED_TOOL,
  ATTACK_METER_SPEED_GUN,
} from '../data/constants.js';
import { ITEMS } from '../data/items.js';

export default function CombatPhase() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bleedActiveRef = useRef(false);
  const wolfRef = useRef(null);

  const [turn, setTurn] = useState('enemy');
  const [meterActive, setMeterActive] = useState(false);
  const [meterPos, setMeterPos] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [dogUsed, setDogUsed] = useState(false);
  const [bleedActive, setBleedActive] = useState(false);
  const [combatLog, setCombatLog] = useState([]);
  const [selectedAction, setSelectedAction] = useState(0);

  const wolf = state.activeCombatWolf;

  const addLog = useCallback((msg) => {
    setCombatLog((prev) => [...prev.slice(-8), msg]);
  }, []);

  const consumables = useMemo(
    () => state.inventory.filter((itemStack) => {
      const item = ITEMS[itemStack.itemId];
      return item && item.category === 'consumable' && item.usableInCombat !== false;
    }),
    [state.inventory]
  );

  const actionItems = useMemo(() => {
    const items = [{ id: 'attack', enabled: true }];
    if (consumables.length > 0) {
      items.push({ id: 'item', enabled: true });
    }
    items.push({ id: 'dog', enabled: state.dog.available && !dogUsed });
    items.push({ id: 'switch', enabled: true });
    return items;
  }, [consumables.length, state.dog.available, dogUsed]);

  useEffect(() => {
    bleedActiveRef.current = bleedActive;
  }, [bleedActive]);

  useEffect(() => {
    wolfRef.current = wolf;
  }, [wolf]);

  useEffect(() => {
    if (selectedAction >= actionItems.length) {
      setSelectedAction(Math.max(0, actionItems.length - 1));
    }
  }, [selectedAction, actionItems.length]);

  const handleAttack = useCallback(() => {
    if (turn !== 'player') return;

    if (state.player.weapon === 'gun' && state.player.ammo <= 0) {
      addLog('Het dan! Chuyen ve nong cu.');
      dispatch({ type: 'COMBAT_USE_AMMO' });
      return;
    }

    setMeterActive(true);
    setMeterPos(0);
    setLastResult(null);
  }, [turn, state.player.weapon, state.player.ammo, addLog, dispatch]);

  const handleUseItem = useCallback((itemId) => {
    const item = ITEMS[itemId];
    if (!item) return;

    if (item.healAmount) {
      dispatch({ type: 'HEAL_PLAYER', payload: { amount: item.healAmount } });
      addLog(`Dung ${item.name}: hoi ${item.healAmount} HP`);
    }
    dispatch({ type: 'USE_ITEM', payload: { itemId } });
  }, [dispatch, addLog]);

  const handleCallDog = useCallback(() => {
    if (!state.dog.available || dogUsed) return;
    setDogUsed(true);
    dispatch({ type: 'CALL_DOG' });
    addLog('Cho da xong vao ho tro! (+20% dame)');
  }, [state.dog.available, dogUsed, dispatch, addLog]);

  const handleSwitchWeapon = useCallback(() => {
    dispatch({ type: 'SWITCH_WEAPON' });
    const newWeapon = state.player.weapon === 'tool' ? 'gun' : 'tool';
    addLog(`Chuyen sang ${newWeapon === 'gun' ? 'Sung' : 'Nong cu'}`);
  }, [dispatch, state.player.weapon, addLog]);

  const runSelectedAction = useCallback((actionId) => {
    if (actionId === 'attack') {
      handleAttack();
    } else if (actionId === 'item' && consumables[0]) {
      handleUseItem(consumables[0].itemId);
    } else if (actionId === 'dog') {
      handleCallDog();
    } else if (actionId === 'switch') {
      handleSwitchWeapon();
    }
  }, [handleAttack, handleUseItem, handleCallDog, handleSwitchWeapon, consumables]);

  const handleMeterStop = useCallback(() => {
    if (!meterActive) return;
    setMeterActive(false);

    const currentWolf = wolfRef.current;
    const result = calculateAttackDamage(meterPos, state.player.weapon, {
      dogAssist: dogUsed,
      buffs: state.player.buffs,
      wolfEvasion: currentWolf?.evasion || 0,
    });

    if (state.player.weapon === 'gun') {
      dispatch({ type: 'COMBAT_USE_AMMO' });
    }

    setLastResult(result);

    if (result.damage > 0) {
      dispatch({ type: 'COMBAT_DAMAGE_WOLF', payload: { damage: result.damage } });
      addLog(`${result.rating}! Gay ${result.damage} sat thuong.`);
    } else {
      addLog(`${result.rating}! Khong gay sat thuong.`);
    }

    setTimeout(() => {
      if (wolfRef.current && wolfRef.current.hp > 0) {
        setTurn('enemy');
        setDogUsed(false);
        engineRef.current?.startEnemyTurn();
      }
    }, 1200);
  }, [meterActive, meterPos, state.player.weapon, state.player.buffs, dogUsed, dispatch, addLog]);

  useEffect(() => {
    if (!canvasRef.current || !wolf) return;

    const canvas = canvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const engine = new CombatEngine(
      canvas,
      wolf,
      (damage, isBleed) => {
        dispatch({ type: 'COMBAT_DAMAGE_PLAYER', payload: { damage } });
        if (isBleed && !bleedActiveRef.current) {
          setBleedActive(true);
        }
      },
      () => {
        setTurn('player');
        if (bleedActiveRef.current) {
          const effect = processStatusEffect('bleed');
          dispatch({ type: 'COMBAT_DAMAGE_PLAYER', payload: { damage: effect.hpLoss } });
          addLog(effect.message);
        }
      }
    );

    engineRef.current = engine;
    engine.start();
    setTurn('enemy');
    setMeterActive(false);
    setSelectedAction(0);
    addLog(`${wolf.name} xuat hien! Ne dan di!`);

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [wolf?.id, dispatch, addLog]);

  useEffect(() => {
    if (engineRef.current && wolf) {
      engineRef.current.updateWolf(wolf);
    }
  }, [wolf]);

  useEffect(() => {
    if (!wolf) return;

    if (wolf.hp <= 0) {
      engineRef.current?.stop();
      addLog(`Da ha guc ${wolf.name}!`);
      setTimeout(() => {
        dispatch({
          type: 'END_COMBAT',
          payload: { won: true, wolfType: wolf.id },
        });
      }, 1200);
    }

    if (state.player.hp <= 0) {
      engineRef.current?.stop();
      addLog('Ban da guc nga...');
      setTimeout(() => {
        dispatch({ type: 'LOSE_GAME', payload: { reason: 'death' } });
      }, 1500);
    }
  }, [wolf?.hp, state.player.hp, wolf, dispatch, addLog]);

  useEffect(() => {
    if (!meterActive) return;

    const speed = state.player.weapon === 'gun'
      ? ATTACK_METER_SPEED_GUN
      : ATTACK_METER_SPEED_TOOL;

    let pos = 0;
    let dir = 1;
    const interval = setInterval(() => {
      pos += 0.0125 * speed * dir;
      if (pos >= 1) {
        pos = 1;
        dir = -1;
      }
      if (pos <= 0) {
        pos = 0;
        dir = 1;
      }
      setMeterPos(pos);
    }, 16);

    return () => clearInterval(interval);
  }, [meterActive, state.player.weapon]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (meterActive) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleMeterStop();
        }
        return;
      }

      if (turn !== 'player') return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAction((current) => (current + 1) % actionItems.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAction((current) => (current - 1 + actionItems.length) % actionItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const action = actionItems[selectedAction];
        if (action?.enabled) {
          runSelectedAction(action.id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [meterActive, turn, actionItems, selectedAction, runSelectedAction, handleMeterStop]);

  if (!wolf) return null;

  const hpPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  const wolfHpPercent = Math.max(0, (wolf.hp / (wolf.maxHp || wolf.hp || 1)) * 100);
  const armorPercent = state.player.armor
    ? (state.player.armor.durability / state.player.armor.maxDurability) * 100
    : 0;

  const dogIndex = consumables.length > 0 ? 2 : 1;
  const switchIndex = actionItems.length - 1;

  return (
    <div className="combat-wrapper">
      <div style={{ textAlign: 'center' }}>
        <h2 className="font-pixel" style={{ color: 'var(--accent-red)', fontSize: '24px' }}>
          ⚔️ {wolf.name}
        </h2>
        <div className="bar-container bar-hp" style={{ maxWidth: '300px', margin: '8px auto' }}>
          <div className="bar-fill" style={{ width: `${wolfHpPercent}%` }} />
          <span className="bar-label">HP: {wolf.hp}/{wolf.maxHp || '?'}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="combat-canvas"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      />

      <div className="combat-info">
        <div className="combat-info-col">
          <div style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>❤️ HP</div>
          <div className="bar-container bar-hp">
            <div className="bar-fill" style={{ width: `${hpPercent}%` }} />
            <span className="bar-label">{state.player.hp}/{state.player.maxHp}</span>
          </div>
          {state.player.armor && (
            <>
              <div style={{ fontSize: '13px', marginTop: '8px', marginBottom: '4px', color: 'var(--text-secondary)' }}>🛡️ Giap</div>
              <div className="bar-container bar-armor">
                <div className="bar-fill" style={{ width: `${armorPercent}%` }} />
                <span className="bar-label">{state.player.armor.durability}/{state.player.armor.maxDurability}</span>
              </div>
            </>
          )}
          {bleedActive && (
            <div style={{ color: 'var(--accent-red)', fontSize: '12px', marginTop: '4px' }} className="animate-pulse">
              🩸 Chay mau!
            </div>
          )}
        </div>
        <div className="combat-info-col">
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            ⚔️ {state.player.weapon === 'gun' ? `Sung (${state.player.ammo} dan)` : 'Nong cu'}
          </div>
          {dogUsed && (
            <div style={{ color: 'var(--accent-yellow)', fontSize: '12px' }}>
              🐕 Cho ho tro! (+20% dame)
            </div>
          )}
        </div>
      </div>

      {meterActive && (
        <div className="animate-fade" style={{ textAlign: 'center' }}>
          <p className="font-pixel" style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--accent-yellow)' }}>
            Nhan Enter, Space hoac Click de dung!
          </p>
          <div className="attack-meter" onClick={handleMeterStop} tabIndex={0}>
            <div className="attack-meter-zones">
              <div className="zone-miss" />
              <div className="zone-good" />
              <div className="zone-good" />
              <div className="zone-miss" />
            </div>
            <div className="zone-critical" />
            <div className="attack-meter-cursor" style={{ left: `${meterPos * 100}%` }} />
          </div>
        </div>
      )}

      {lastResult && !meterActive && (
        <div
          className="animate-slide-up font-pixel"
          style={{
            fontSize: '22px',
            color: lastResult.isCritical
              ? 'var(--accent-yellow)'
              : lastResult.evaded
                ? 'var(--accent-purple)'
                : lastResult.damage > 0
                  ? 'var(--accent-green)'
                  : 'var(--accent-red)',
          }}
        >
          {lastResult.rating} - {lastResult.damage > 0 ? `${lastResult.damage} DMG` : 'Miss!'}
        </div>
      )}

      {turn === 'player' && !meterActive && (
        <div className="combat-menu animate-fade">
          <button
            className="btn btn-danger"
            onClick={handleAttack}
            style={selectedAction === 0 ? { outline: '2px solid var(--accent-yellow)', outlineOffset: '2px' } : undefined}
          >
            ⚔️ Tan cong
          </button>

          {consumables.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-success"
                onClick={() => handleUseItem(consumables[0].itemId)}
                style={selectedAction === 1 ? { outline: '2px solid var(--accent-yellow)', outlineOffset: '2px' } : undefined}
              >
                🎒 Dung {ITEMS[consumables[0].itemId]?.name} ({consumables[0].quantity})
              </button>
            </div>
          )}

          <button
            className="btn btn-warning"
            onClick={handleCallDog}
            disabled={!state.dog.available || dogUsed}
            style={selectedAction === dogIndex ? { outline: '2px solid var(--accent-yellow)', outlineOffset: '2px' } : undefined}
          >
            🐕 Goi cho
          </button>

          <button
            className="btn btn-ghost"
            onClick={handleSwitchWeapon}
            style={selectedAction === switchIndex ? { outline: '2px solid var(--accent-yellow)', outlineOffset: '2px' } : undefined}
          >
            🔄 {state.player.weapon === 'gun' ? 'Nong cu' : 'Sung'}
          </button>
        </div>
      )}

      {turn === 'enemy' && (
        <div className="font-pixel animate-pulse" style={{ color: 'var(--accent-red)', fontSize: '18px' }}>
          Soi dang tan cong! Dung WASD/Arrow de ne!
        </div>
      )}

      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div className="message-log" style={{ maxHeight: '120px' }}>
          {combatLog.map((msg, i) => (
            <div className="message" key={i} style={{ fontSize: '12px' }}>{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
