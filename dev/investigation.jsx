// Isolated exploration fixture; never reads or writes the player's save.
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FirstPersonScene, { FieldInspection } from '../src/game/FirstPersonScene.jsx';
import InGameHUD from '../src/game/InGameHUD.jsx';
import { newGame, gameReducer, farmAnimals } from '../src/game/rules.js';
import { evolveWolf, WOLVES } from '../src/game/catalog.js';
import '../src/game/game.css';
import '../src/game/gdd.css';
import '../src/game/immersive.css';
import '../src/game/visualUpgrade.css';
import '../src/game/quietFarm.css';
function fixture(type, difficulty) {
  let s = newGame(); s.day = Math.max(1, WOLVES[type].minNight); s.flock = s.flock.slice(0, 7);
  const wolf = { ...evolveWolf(type, s.day), id: 'disguise-qa', wolf: true, age: type === 'pup' ? 'baby' : 'adult', checked: [], penId: 0 };
  s = gameReducer(s, { type: 'NIGHT', residents: [...s.flock.slice(0, 1), wolf, ...s.flock.slice(1)].map(a => ({ ...a, checked: [] })) });
  return { ...s, difficulty };
}
function Preview() {
  const [type, setType] = useState('normal'), [difficulty, setDifficulty] = useState('hard'), [selected, select] = useState(null), [part, setPart] = useState(null), [result, setResult] = useState('');
  const controls = useRef(null), state = fixture(type, difficulty), animals = farmAnimals(state), animal = animals.find(a => a.id === selected);
  function testIme() {
    const world = controls.current; if (!world) return;
    const key = (kind, data) => document.dispatchEvent(new KeyboardEvent(kind, { bubbles: true, cancelable: true, ...data }));
    const scenarios = [
      () => key('keyup', { code: 'KeyW', key: 'ư', keyCode: 229, isComposing: true }),
      () => key('keyup', { code: '', key: 'Process', keyCode: 229 }),
      () => document.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })),
      () => key('keydown', { code: 'Backspace', key: 'Backspace' }),
      () => key('keyup', { code: '', key: 'ư', keyCode: 87 }),
      () => key('keydown', { code: 'ShiftLeft', key: 'Shift', ctrlKey: true }),
    ];
    let passed = 0;
    for (const release of scenarios) {
      world.keys.clear(); world.focus(); key('keydown', { code: 'KeyW', key: 'w', keyCode: 87 });
      const held = world.keys.has('KeyW'); release(); if (held && !world.keys.has('KeyW')) passed++;
    }
    world.keys.clear(); setResult(`${passed}/${scenarios.length} chuỗi IME giả lập đã nhả phím`);
  }
  return <div className="game-app immersive quiet-farm is-playing">
    <FirstPersonScene animals={animals} night difficulty={difficulty} farm={{ ...state.farm, dogReady: true }} controlsRef={controls} paused={false} selectedId={selected} inspectionPart={part} onSelect={select} sensitivity={1}>
      {animal && <FieldInspection key={animal.id} animal={animal} state={state} part={part} onPart={setPart} onClose={() => { select(null); setPart(null); }} dispatch={() => {}} />}
    </FirstPersonScene><InGameHUD state={state} night onSettings={() => {}} />
    <div style={{ position: 'absolute', bottom: 16, left: 20, zIndex: 30, padding: 12, background: '#142c24', color: '#eee0ba' }}>
      <label>Loài kiểm thử <select aria-label="Loài ngụy trang" value={type} onChange={e => { setType(e.target.value); select(null); }}>{Object.values(WOLVES).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label> Độ khó <select aria-label="Độ khó kiểm thử" value={difficulty} onChange={e => setDifficulty(e.target.value)}>{['easy', 'normal', 'hard'].map(d => <option key={d}>{d}</option>)}</select></label>
      <button onClick={testIme}>Thử nhả phím UniKey</button><span role="status">{result}</span>
      <button onClick={() => select('disguise-qa')}>Soi con #02</button>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Preview />);
