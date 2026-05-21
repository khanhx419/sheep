/* ============================================================
 * CombatPhase.jsx — Combat Screen
 * 
 * Kết nối React UI (menu, HP bar) với Canvas CombatEngine.
 * Tuân thủ Guardrail A: useRef cho bridge, throttle dispatch.
 * ============================================================ */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { CombatEngine } from '../canvas/CombatEngine.js';
import { calculateAttackDamage, processStatusEffect } from '../systems/combatSystem.js';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  ATTACK_METER_SPEED_TOOL, ATTACK_METER_SPEED_GUN,
} from '../data/constants.js';
import { ITEMS } from '../data/items.js';

export default function CombatPhase() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const [turn, setTurn] = useState('enemy'); // 'enemy' | 'player'
  const [meterActive, setMeterActive] = useState(false);
  const [meterPos, setMeterPos] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [dogUsed, setDogUsed] = useState(false);
  const [bleedActive, setBleedActive] = useState(false);
  const [combatLog, setCombatLog] = useState([]);

  const wolf = state.activeCombatWolf;

  const addLog = useCallback((msg) => {
    setCombatLog(prev => [...prev.slice(-8), msg]);
  }, []);

  // --- Khởi tạo CombatEngine ---
  useEffect(() => {
    if (!canvasRef.current || !wolf) return;

    const canvas = canvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const engine = new CombatEngine(
      canvas,
      wolf,
      // onDamage — throttled bởi CombatEngine (100ms)
      (damage, isBleed) => {
        dispatch({ type: 'COMBAT_DAMAGE_PLAYER', payload: { damage } });
        if (isBleed && !bleedActive) {
          setBleedActive(true);
        }
      },
      // onPatternEnd — chuyển sang lượt player
      () => {
        setTurn('player');
        // Xử lý bleed DOT
        if (bleedActive) {
          const effect = processStatusEffect('bleed');
          dispatch({ type: 'COMBAT_DAMAGE_PLAYER', payload: { damage: effect.hpLoss } });
          addLog(effect.message);
        }
      }
    );

    engineRef.current = engine;
    engine.start();
    addLog(`⚔️ ${wolf.name} xuất hiện! Né đạn đi!`);

    return () => {
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync wolf HP vào engine khi state thay đổi (từ dispatch)
  useEffect(() => {
    if (engineRef.current && wolf) {
      engineRef.current.updateWolf(wolf);
    }
  }, [wolf]);

  // --- Check win/lose ---
  useEffect(() => {
    if (!wolf) return;
    if (wolf.hp <= 0) {
      engineRef.current?.stop();
      addLog(`🎉 Đã hạ gục ${wolf.name}!`);
      setTimeout(() => {
        dispatch({
          type: 'END_COMBAT',
          payload: { won: true, wolfType: wolf.id },
        });
      }, 1200);
    }
    if (state.player.hp <= 0) {
      engineRef.current?.stop();
      addLog('💀 Bạn đã gục ngã...');
      setTimeout(() => {
        dispatch({ type: 'SET_PHASE', payload: 'LOSE' });
      }, 1500);
    }
  }, [wolf?.hp, state.player.hp, wolf, dispatch, addLog]);

  // --- Attack Meter oscillation ---
  useEffect(() => {
    if (!meterActive) return;

    const speed = state.player.weapon === 'gun'
      ? ATTACK_METER_SPEED_GUN
      : ATTACK_METER_SPEED_TOOL;

    let pos = 0;
    let dir = 1;
    const interval = setInterval(() => {
      pos += 0.02 * speed * dir;
      if (pos >= 1) { pos = 1; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      setMeterPos(pos);
    }, 16);

    return () => clearInterval(interval);
  }, [meterActive, state.player.weapon]);

  // --- Handlers ---
  const handleAttack = () => {
    if (turn !== 'player') return;

    if (state.player.weapon === 'gun' && state.player.ammo <= 0) {
      addLog('⚠️ Hết đạn! Chuyển về nông cụ.');
      dispatch({ type: 'COMBAT_USE_AMMO' }); // sẽ không trừ dưới 0
      return;
    }

    setMeterActive(true);
    setLastResult(null);
  };

  const handleMeterStop = () => {
    if (!meterActive) return;
    setMeterActive(false);

    const result = calculateAttackDamage(meterPos, state.player.weapon, {
      dogAssist: dogUsed,
      buffs: state.player.buffs,
      wolfEvasion: wolf?.evasion || 0,
    });

    if (state.player.weapon === 'gun') {
      dispatch({ type: 'COMBAT_USE_AMMO' });
    }

    setLastResult(result);

    if (result.damage > 0) {
      dispatch({ type: 'COMBAT_DAMAGE_WOLF', payload: { damage: result.damage } });
      addLog(`⚔️ ${result.rating}! Gây ${result.damage} sát thương.`);
    } else {
      addLog(`❌ ${result.rating}! Không gây sát thương.`);
    }

    // Chuyển lượt về sói sau 1.2s
    setTimeout(() => {
      if (wolf && wolf.hp > 0) {
        setTurn('enemy');
        setDogUsed(false);
        engineRef.current?.startEnemyTurn();
      }
    }, 1200);
  };

  const handleCallDog = () => {
    if (!state.dog.available || dogUsed) return;
    setDogUsed(true);
    dispatch({ type: 'CALL_DOG' });
    addLog('🐕 Chó đã xông vào hỗ trợ! (+20% dame, đỡ 1 đòn)');
  };

  const handleUseItem = (itemId) => {
    const item = ITEMS[itemId];
    if (!item) return;

    if (item.healAmount) {
      dispatch({ type: 'HEAL_PLAYER', payload: { amount: item.healAmount } });
      addLog(`🍺 Dùng ${item.name}: hồi ${item.healAmount} HP`);
    }
    dispatch({ type: 'USE_ITEM', payload: { itemId } });
  };

  const handleSwitchWeapon = () => {
    const newWeapon = state.player.weapon === 'tool' ? 'gun' : 'tool';
    // Trực tiếp đổi weapon qua state (cần thêm action hoặc xử lý local)
    addLog(`🔄 Chuyển sang ${newWeapon === 'gun' ? 'Súng' : 'Nông cụ'}`);
  };

  // --- Consumable items trong inventory ---
  const consumables = state.inventory.filter(i => {
    const item = ITEMS[i.itemId];
    return item && item.category === 'consumable';
  });

  if (!wolf) return null;

  const hpPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  const wolfHpPercent = Math.max(0, (wolf.hp / (wolf.hp + 1)) * 100); // rough display
  const armorPercent = state.player.armor
    ? (state.player.armor.durability / state.player.armor.maxDurability) * 100
    : 0;

  return (
    <div className="combat-wrapper">
      {/* Wolf Info */}
      <div style={{ textAlign: 'center' }}>
        <h2 className="font-pixel" style={{ color: 'var(--accent-red)', fontSize: '24px' }}>
          ⚔️ {wolf.name}
        </h2>
        <div className="bar-container bar-hp" style={{ maxWidth: '300px', margin: '8px auto' }}>
          <div className="bar-fill" style={{ width: `${wolfHpPercent}%` }} />
          <span className="bar-label">HP: {wolf.hp}</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="combat-canvas"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      />

      {/* Player Info */}
      <div className="combat-info">
        <div className="combat-info-col">
          <div style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>❤️ HP</div>
          <div className="bar-container bar-hp">
            <div className="bar-fill" style={{ width: `${hpPercent}%` }} />
            <span className="bar-label">{state.player.hp}/{state.player.maxHp}</span>
          </div>
          {state.player.armor && (
            <>
              <div style={{ fontSize: '13px', marginTop: '8px', marginBottom: '4px', color: 'var(--text-secondary)' }}>🛡️ Giáp</div>
              <div className="bar-container bar-armor">
                <div className="bar-fill" style={{ width: `${armorPercent}%` }} />
                <span className="bar-label">{state.player.armor.durability}/{state.player.armor.maxDurability}</span>
              </div>
            </>
          )}
          {bleedActive && (
            <div style={{ color: 'var(--accent-red)', fontSize: '12px', marginTop: '4px' }} className="animate-pulse">
              🩸 Chảy máu!
            </div>
          )}
        </div>
        <div className="combat-info-col">
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            ⚔️ {state.player.weapon === 'gun' ? `Súng (${state.player.ammo} đạn)` : 'Nông cụ'}
          </div>
          {dogUsed && (
            <div style={{ color: 'var(--accent-yellow)', fontSize: '12px' }}>
              🐕 Chó hỗ trợ! (+20% dame)
            </div>
          )}
        </div>
      </div>

      {/* Attack Meter */}
      {meterActive && (
        <div className="animate-fade" style={{ textAlign: 'center' }}>
          <p className="font-pixel" style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--accent-yellow)' }}>
            Nhấn SPACE hoặc Click để dừng!
          </p>
          <div
            className="attack-meter"
            onClick={handleMeterStop}
            onKeyDown={(e) => { if (e.key === ' ') handleMeterStop(); }}
            tabIndex={0}
          >
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

      {/* Attack Result */}
      {lastResult && !meterActive && (
        <div className="animate-slide-up font-pixel" style={{
          fontSize: '22px',
          color: lastResult.isCritical ? 'var(--accent-yellow)' :
                 lastResult.evaded ? 'var(--accent-purple)' :
                 lastResult.damage > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          {lastResult.rating} — {lastResult.damage > 0 ? `${lastResult.damage} DMG` : 'Miss!'}
        </div>
      )}

      {/* Combat Menu — visible only during player turn */}
      {turn === 'player' && !meterActive && (
        <div className="combat-menu animate-fade">
          <button className="btn btn-danger" onClick={handleAttack}>
            ⚔️ Tấn công
          </button>

          {consumables.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-success"
                onClick={() => handleUseItem(consumables[0].itemId)}
              >
                🎒 Dùng {ITEMS[consumables[0].itemId]?.name} ({consumables[0].quantity})
              </button>
            </div>
          )}

          <button
            className="btn btn-warning"
            onClick={handleCallDog}
            disabled={!state.dog.available || dogUsed}
          >
            🐕 Gọi chó
          </button>
        </div>
      )}

      {/* Turn indicator */}
      {turn === 'enemy' && (
        <div className="font-pixel animate-pulse" style={{ color: 'var(--accent-red)', fontSize: '18px' }}>
          Sói đang tấn công! Dùng WASD/Arrow để né!
        </div>
      )}

      {/* Combat Log */}
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
