// Isolated day fixture: no saved-game reads or writes.
import React, { useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FirstPersonScene from '../src/game/FirstPersonScene.jsx';
import InGameHUD from '../src/game/InGameHUD.jsx';
import FarmActivities from '../src/game/FarmActivities.jsx';
import { Modal } from '../src/game/ui.jsx';
import { newGame, gameReducer, farmAnimals } from '../src/game/rules.js';
import '../src/game/game.css';
import '../src/game/gdd.css';
import '../src/game/immersive.css';
import '../src/game/visualUpgrade.css';
import '../src/game/quietFarm.css';
function Preview() {
  const [state, dispatch] = useReducer((s, a) => a.type === 'QA_WEATHER' ? { ...s, farm: { ...s.farm, weather: a.weather } } : gameReducer(s, a), null, newGame);
  const controls = useRef(null), [panel, setPanel] = useState(false);
  function entrance() { const w = controls.current; if (w) { w.camera.position.set(8.9, 1.65, 12.1); w.yaw = -Math.PI / 2; w.pitch = -.18; w.focus(); } }
  return <div className="game-app immersive quiet-farm is-playing"><FirstPersonScene animals={farmAnimals(state)} night={false} farm={state.farm} paused={panel} controlsRef={controls} onSelect={() => {}} onMenu={() => setPanel(true)} onSettings={() => setPanel(true)} onAction={(type, details = {}) => dispatch({ type, ...details })} /><InGameHUD state={state} night={false} onSettings={() => setPanel(true)} />
    <div style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 20, color: '#e9deb5', background: '#18352ad9', padding: 12, borderRadius: 8 }}><span role="status">Kho: {state.inventory.hay} bó · Đã cắt: {state.farm.grassCut}/2 · {state.farm.weather}</span><button onClick={entrance}>Tới lối đồng cỏ</button><button onClick={() => dispatch({ type: 'QA_WEATHER', weather: state.farm.weather === 'sunny' ? 'rainy' : 'sunny' })}>Đổi thời tiết</button></div>
    {panel && <Modal title="Sinh hoạt kiểm thử" onClose={() => setPanel(false)}><FarmActivities state={state} dispatch={dispatch} /></Modal>}
  </div>;
}
createRoot(document.getElementById('root')).render(<Preview />);
