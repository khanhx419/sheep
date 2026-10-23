// Isolated shop fixture. No access to the player's saved game.
import React, { useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gameReducer, newGame } from '../src/game/rules.js';
import { FarmDayPhase, Inventory } from '../src/game/PhasePanels.jsx';
import { Modal } from '../src/game/ui.jsx';
import '../src/game/game.css';
import '../src/game/gdd.css';
import '../src/game/immersive.css';
import '../src/game/visualUpgrade.css';
import '../src/game/quietFarm.css';
function Preview() {
  const [state, dispatch] = useReducer(gameReducer, null, () => ({ ...newGame(), gold: 200 })), [bag, showBag] = useState(false);
  return <div className="game-app immersive quiet-farm"><Modal title={bag ? 'Túi đồ kiểm thử' : 'Quầy hàng kiểm thử'} className={`camp-menu ${bag ? '' : 'shop-modal'}`}><button className="button secondary" onClick={() => showBag(v => !v)}>{bag ? 'Mở quầy' : 'Mở túi đồ'}</button>{bag ? <Inventory state={state} dispatch={dispatch} /> : <FarmDayPhase state={state} dispatch={dispatch} />}</Modal></div>;
}
createRoot(document.getElementById('root')).render(<Preview />);
