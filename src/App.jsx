/* ============================================================
 * App.jsx — Phase Router
 * Render component tương ứng với game phase hiện tại
 * ============================================================ */

import { GameProvider, useGameState } from './context/GameContext.jsx';
import MainMenu from './components/MainMenu.jsx';
import FarmDayPhase from './components/FarmDayPhase.jsx';
import NightPhase from './components/NightPhase.jsx';
import CombatPhase from './components/CombatPhase.jsx';
import ShopScreen from './components/ShopScreen.jsx';
import EndScreen from './components/EndScreen.jsx';

function GameRouter() {
  const state = useGameState();

  switch (state.phase) {
    case 'MENU':
      return <MainMenu />;
    case 'FARM_DAY':
      return <FarmDayPhase />;
    case 'SHOP':
      return <ShopScreen />;
    case 'NIGHT_INVESTIGATE':
      return <NightPhase />;
    case 'COMBAT':
      return <CombatPhase />;
    case 'WIN':
      return <EndScreen result="win" />;
    case 'LOSE':
      return <EndScreen result="lose" />;
    default:
      return <MainMenu />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
