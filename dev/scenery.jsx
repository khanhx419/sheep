// Visual review only: never reads or writes the player's saved game.
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FirstPersonScene from '../src/game/FirstPersonScene.jsx';
import { newGame } from '../src/game/rules.js';
import '../src/game/game.css';
import '../src/game/gdd.css';
import '../src/game/immersive.css';
import '../src/game/visualUpgrade.css';
import '../src/game/quietFarm.css';
const farm = newGame();
const viewpoints = {
  'Đường quê': [0, 1.65, 21, Math.PI, -.015],
  'Cánh đồng phía đông': [20.3, 1.65, 17, -Math.PI / 2, -.025],
  'Rừng phía bắc': [16, 1.65, -19, 0, -.015],
  'Đàn cừu': [-15, 1.65, -.5, 0, -.24],
  'Quầy hàng': [4, 1.65, 10, Math.PI, -.1],
  'Shiba': [-8.1, 1.4, 13, .63, -.3],
};
function Scenery() {
  const controls = useRef(null), [night, setNight] = useState(false), [rainy, setRainy] = useState(false), [view, setView] = useState('Sân trại'), [toolbar, setToolbar] = useState(true);
  function visit(name) {
    const world = controls.current, point = viewpoints[name]; if (!world) return;
    world.release(); world.camera.position.set(...point.slice(0, 3)); world.yaw = point[3]; world.pitch = point[4]; setView(name);
  }
  return <div className="game-app immersive quiet-farm is-playing"><FirstPersonScene animals={farm.flock} night={night} farm={{ ...farm.farm, pastureOpen: true, weather: rainy ? 'rainy' : 'sunny', dogScan: { danger: night } }} paused={false} controlsRef={controls} merchantPresent onSelect={() => {}} />
    {toolbar ? <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 25, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: '#193b30ed', color: '#efe4c9', padding: 10, borderRadius: 12, fontSize: 12 }}>
      <span role="status">{view} · {night ? 'Ban đêm' : 'Ban ngày'} · {rainy ? 'Mưa' : 'Khô ráo'}</span>
      {Object.keys(viewpoints).map(name => <button key={name} onClick={() => visit(name)}>{name}</button>)}
      <button onClick={() => setNight(!night)}>Đổi ngày / đêm</button><button onClick={() => setRainy(!rainy)}>Đổi thời tiết</button>
      <button onClick={() => setToolbar(false)}>Ẩn bảng kiểm thử</button>
    </div> : <button style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 25, opacity: .5 }} onClick={() => setToolbar(true)}>Hiện bảng kiểm thử</button>}
  </div>;
}
const renderRoot = import.meta.hot?.data.reactRoot || createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.data.reactRoot = renderRoot;
renderRoot.render(<Scenery />);
