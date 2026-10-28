// Isolated UI fixture. Does not read or write the player's saved game.
import React, { useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import MysticBalance from '../src/game/MysticBalance.jsx';
import { Inventory } from '../src/game/PhasePanels.jsx';
import { newGame, gameReducer } from '../src/game/rules.js';
import { CHARMS } from '../src/game/charms.js';
import { Modal } from '../src/game/ui.jsx';
import '../src/game/game.css';
import '../src/game/gdd.css';
import '../src/game/immersive.css';
import '../src/game/visualUpgrade.css';
import '../src/game/quietFarm.css';
const fresh = (day = 1) => ({ ...newGame(), day, gold: 60, qaCase: 'random', qaRun: 0, qaBag: false });
function reducer(state, action) {
  if (action.type === 'QA_CASE') return { ...state, qaCase: action.value };
  if (action.type === 'QA_BAG') return { ...state, qaBag: !state.qaBag };
  if (action.type === 'QA_RESET') return { ...fresh(action.day || 1), qaRun: state.qaRun + 1 };
  if (action.type === 'WEIGH_CHARM' && state.qaCase !== 'random') action = { ...action, balanceRoll: state.qaCase === 'failure' ? .999 : 0 };
  return gameReducer(state, action);
}
function Preview() {
  const [state, dispatch] = useReducer(reducer, null, () => fresh());
  return <div className="game-app immersive quiet-farm is-playing" style={{ background: 'radial-gradient(ellipse at top,#3c5144,#102720)' }}>
    <div style={{position:'fixed',left:8,top:8,zIndex:2000,display:'flex',gap:8,alignItems:'center',padding:8,background:'#142d27',color:'#dacda9',fontSize:11,borderRadius:8}}>
      <span role="status">Xu: {state.gold} · Ngày {state.day} · Bùa: {Object.entries(state.inventory).filter(([id,n])=> CHARMS[id]&&n>0).map(([id,n])=>`${CHARMS[id].name} ×${n}`).join(', ') || 'chưa có'}</span>
      <select aria-label="Kết quả kiểm thử" value={state.qaCase} onChange={e=>dispatch({type:'QA_CASE',value:e.target.value})}><option value="random">Ngẫu nhiên thật</option><option value="success">Cân bằng</option><option value="failure">Cân lệch</option></select>
      <button onClick={()=>dispatch({type:'QA_RESET',day:1})}>Làm lại ngày 1</button><button onClick={()=>dispatch({type:'QA_RESET',day:31})}>Ngày 31</button><button onClick={()=>dispatch({type:'QA_BAG'})}>{state.qaBag?'Trở về cân':'Túi đồ'}</button>
    </div>
    <Modal title={state.qaBag?'Túi đồ kiểm thử':'Cán cân thương nhân'} className="camp-menu charm-modal">{state.qaBag?<Inventory state={state} dispatch={dispatch}/>:<MysticBalance key={`${state.day}-${state.qaRun}`} state={state} dispatch={dispatch}/>}</Modal>
  </div>;
}
const root = import.meta.hot?.data.reactRoot || createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.data.reactRoot = root;
root.render(<Preview/>);
