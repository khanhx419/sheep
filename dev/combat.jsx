// Isolated QA fixture. Does not read or overwrite the player's save.
import React, { useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import CombatPhase from '../src/game/BulletCombat.jsx';
import { newGame, gameReducer } from '../src/game/rules.js';
import { WOLVES, evolveWolf } from '../src/game/catalog.js';
import '../src/game/game.css';
import '../src/game/gdd.css';
function fixture(type = 'normal') {
  let s = newGame(); s.day = Math.max(1, WOLVES[type].minNight);
  const wolf = { ...evolveWolf(type, s.day), id: `qa-${type}`, name: WOLVES[type].name, wolf: true, penId: 0, checked: [], defeated: false };
  s = gameReducer(s, { type: 'NIGHT', residents: [wolf] });
  s = gameReducer(s, { type: 'CHECK', id: wolf.id, part: 'wool' }); s = gameReducer(s, { type: 'COMBAT' });
  s.player = { ...s.player, ammo: 5, armor: { itemId: 'armorLight', durability: 20, maxDurability: 20 } };
  s.inventory = { ...s.inventory, medicine: 2, repairKit: 2, strengthPotion: 1 };
  return s;
}
function Preview() {
  const [state, dispatch] = useReducer((s, a) => a.type === 'QA_RESET' ? fixture(a.wolf) : gameReducer(s, a), null, () => fixture());
  return <main style={{ maxWidth: 900, margin: '20px auto', padding: 15 }}><h1 style={{ fontSize: 26 }}>Kiểm thử combat Core GDD</h1><p style={{ margin: '15px 0', fontSize: 12 }}>HP {state.hp} · Giáp {state.player.armor.durability}/20 · Đạn {state.player.ammo} · Năng lượng {state.energy}/2</p><label style={{ fontSize: 12 }}>Loài sói: <select aria-label="Loài sói kiểm thử" onChange={e => dispatch({ type: 'QA_RESET', wolf: e.target.value })}>{Object.values(WOLVES).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><div style={{ position: 'relative', height: 650, marginTop: 20, border: '1px solid #5f7155', borderRadius: 10, overflow: 'hidden' }}>{state.phase === 'combat' ? <CombatPhase key={state.activeId} state={state} dispatch={dispatch} /> : <div style={{ padding: 30 }}><h2>{state.phase === 'lose' ? 'Thua trận' : 'Đã thắng trận'}</h2><p>Chọn loài sói khác để bắt đầu lại bài kiểm tra.</p></div>}</div></main>;
}
createRoot(document.getElementById('root')).render(<Preview />);
