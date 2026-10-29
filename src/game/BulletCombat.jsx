import { tr } from './i18n.js';
import { useEffect, useRef, useState } from 'react';
import { CombatEngine } from '../canvas/CombatEngine.js';
import { calculateStrike, ITEMS, WOLVES } from './catalog.js';
import { dogAvailable } from './rules.js';
import { Icon } from './ui.jsx';
import CombatDiorama from './CombatDiorama.jsx';
import ItemArt from './ItemArt.jsx';
import { sound } from './audio.js';

export default function CombatPhase({ state, dispatch }) {
  const wolf = state.residents.find(a => a.id === state.activeId);
  const speciesName = wolf.speciesName || WOLVES[wolf.type]?.name || wolf.name;
  const canvas = useRef(null), engine = useRef(null), needle = useRef(null), position = useRef(0), lock = useRef(false);
  const [turn, setTurn] = useState(state.combatHp === 0 ? 'victory' : 'player'), [aiming, setAiming] = useState(false), [items, setItems] = useState(false);
  const [message, setMessage] = useState('Chọn Attack để căn thanh đánh. Đến lượt sói, di chuyển trái tim để né đạn.');
  const latest = useRef(null); latest.current = { state, turn, aiming };
  useEffect(() => {
    const instance = new CombatEngine(canvas.current, { ...wolf, name: speciesName, hp: state.combatHp }, (damage, bleed) => { sound('hit'); dispatch({ type: 'DAMAGE', amount: damage, bleed }); }, () => { dispatch({ type: 'END_DODGE' }); lock.current = false; setTurn('player'); setMessage('Đã hết chuỗi đạn. Chọn Attack, Items hoặc Call Dog.'); });
    engine.current = instance; instance.isEnemyTurn = false; instance.start();
    return () => { instance.stop(); engine.current = null; };
  }, [state.activeId, dispatch]);
  useEffect(() => { engine.current?.updateWolf({ ...wolf, name: speciesName, hp: state.combatHp }); }, [wolf, speciesName, state.combatHp]);
  useEffect(() => {
    if (!aiming) return;
    let frame, start = performance.now();
    const draw = now => { position.current = (Math.sin((now - start) / (state.player.weapon === 'gun' ? 700 : 360)) + 1) / 2; if (needle.current) needle.current.style.left = `${position.current * 100}%`; frame = requestAnimationFrame(draw); };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, [aiming, state.player.weapon]);
  useEffect(() => {
    if (turn !== 'victory') return;
    sound('win'); const timer = setTimeout(() => dispatch({ type: 'WON_FIGHT' }), 1100); return () => clearTimeout(timer);
  }, [turn, dispatch]);
  function enemyTurn() { setAiming(false); setItems(false); setTurn('enemy'); engine.current?.startEnemyTurn(); }
  function attack() {
    if (turn !== 'player' || lock.current) return;
    if (state.player.weapon === 'gun' && !state.player.ammo) { setMessage('Súng hết đạn. Hãy đổi sang nông cụ hoặc mua đạn từ thương nhân.'); return; }
    if (!aiming) { setAiming(true); setMessage('Bấm Attack lần nữa hoặc Space khi kim đến vùng vàng.'); return; }
    lock.current = true;
    const roll = Math.random(), result = calculateStrike(position.current, state.player, wolf, state.combatDog, () => roll);
    dispatch({ type: 'STRIKE', position: position.current, roll }); sound('hit');
    setMessage(`${result.label} ${result.damage ? `−${result.damage} HP sói.` : ''}`); setAiming(false);
    if (state.combatHp <= result.damage) setTurn('victory'); else enemyTurn();
  }
  useEffect(() => {
    const key = e => { if (e.code === 'Space' && !e.repeat && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); attack(); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  function useItem(id) {
    if (turn !== 'player' || aiming || lock.current || !state.inventory[id]) return;
    lock.current = true; dispatch({ type: 'USE', item: id }); setMessage(`Đã dùng ${ITEMS[id].name}.`); enemyTurn();
  }
  function dragHeart(event) {
    if (turn !== 'enemy') return;
    event.preventDefault(); const rect = canvas.current.getBoundingClientRect(), heart = engine.current?.heart;
    if (!heart) return;
    heart.x = Math.max(67, Math.min(333, (event.clientX - rect.left) / rect.width * 400)); heart.y = Math.max(67, Math.min(333, (event.clientY - rect.top) / rect.height * 400));
  }
  return <div className="bullet-combat outdoor-combat"><CombatDiorama type={wolf.type} turn={turn} hp={state.combatHp} /><div className="bullet-heading"><span className="eyebrow">{tr("SÂN TRẠI · ")}{tr(speciesName)}{tr(" · TIẾN HÓA ")}{tr(wolf.evolution)}</span><h2>{tr(turn === 'victory' ? 'Sói đã bị đánh bại.' : turn === 'enemy' ? 'Né đòn của sói.' : 'Đến lượt của bạn.')}</h2><div className="wolf-health"><span style={{ width: `${state.combatHp / state.combat.wolfMaxHp * 100}%` }} /></div><small>{tr(state.combatHp)}{tr("/")}{tr(state.combat.wolfMaxHp)}{tr(" HP · ")}{tr(wolf.mechanic)}</small></div>
    <div className="bullet-stage"><div className="bullet-wolf"><span className="eyebrow">{tr("TRANG BỊ CHỦ TRẠI")}</span><p>{tr(state.player.weapon === 'gun' ? `Súng · ${state.player.ammo} viên` : 'Nông cụ · Không tốn tài nguyên')}</p><small>{tr(state.player.armor ? `Giáp ${state.player.armor.durability}/${state.player.armor.maxDurability}` : 'Không có giáp')}{tr(state.combat.bleedTurns > 0 && ` · Chảy máu ${state.combat.bleedTurns} lượt`)}</small>{tr(state.combatDog && <span>Chó hỗ trợ: +20% sát thương{state.combat.shieldAvailable ? ' · Còn đỡ 1 đòn' : ''}</span>)}</div><canvas width="400" height="400" ref={canvas} aria-label={tr("Khung né đạn: di chuyển trái tim bằng WASD hoặc mũi tên")} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); dragHeart(e); }} onPointerMove={e => e.buttons && dragHeart(e)} /></div>
    <div className="bullet-console"><p role="status">{tr(message)}</p>{tr(aiming && <div className={`aim-meter ${state.player.weapon === 'gun' ? 'gun-meter' : ''}`}><span className="good-zone" /><span className="perfect-zone" /><i ref={needle} /><b>ATTACK · SPACE ĐỂ CHỐT</b></div>)}
      <div className="combat-buttons"><button className="button primary" disabled={turn !== 'player'} onClick={attack}>{tr(aiming ? 'Chốt Attack' : 'Attack')}<kbd>{tr("Space")}</kbd></button><button className="button secondary" disabled={turn !== 'player' || aiming} onClick={() => setItems(v => !v)}>{tr("Items")}</button><button className="button secondary" disabled={turn !== 'player' || aiming || state.combatDog || !dogAvailable(state)} onClick={() => { dispatch({ type: 'DOG' }); sound('bark'); setMessage('Chó đỡ một đòn, tăng 20% sát thương. Đêm sau sẽ kiệt sức.'); }}>{tr("Call Dog")}</button><button className="button secondary" disabled={turn !== 'player' || aiming} onClick={() => dispatch({ type: 'SWITCH_WEAPON' })}>{tr("Đổi vũ khí")}</button></div>
      {tr(items && <div className="combat-items">{['medicine', 'repairKit', 'strengthPotion'].map(id => <button key={id} disabled={!state.inventory[id] || id === 'medicine' && state.hp >= 100 || id === 'repairKit' && (!state.player.armor || state.player.armor.durability === state.player.armor.maxDurability) || id === 'strengthPotion' && state.player.damageBuff > 1} onClick={() => useItem(id)}><ItemArt item={id} size={32} />{ITEMS[id].name} ×{state.inventory[id]}</button>)}</div>)}
      <small>{tr(turn === 'enemy' ? 'WASD / MŨI TÊN để né · Điện thoại: kéo trái tim trên Canvas' : 'Nông cụ Critical hẹp · Súng dễ Critical, mỗi phát tốn 1 viên')}</small>
    </div></div>;
}
