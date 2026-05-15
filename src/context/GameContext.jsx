/* ============================================================
 * GameContext.jsx — React Context Provider
 * 
 * Split thành StateContext và DispatchContext 
 * để tránh re-render không cần thiết.
 * ============================================================ */

import { createContext, useContext, useReducer, useMemo } from 'react';
import { gameReducer, createInitialState } from '../reducers/gameReducer.js';

const GameStateContext = createContext(null);
const GameDispatchContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  // Memoize để tránh unnecessary re-renders
  const memoState = useMemo(() => state, [state]);

  return (
    <GameDispatchContext.Provider value={dispatch}>
      <GameStateContext.Provider value={memoState}>
        {children}
      </GameStateContext.Provider>
    </GameDispatchContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (ctx === null) throw new Error('useGameState must be inside GameProvider');
  return ctx;
}

export function useGameDispatch() {
  const ctx = useContext(GameDispatchContext);
  if (ctx === null) throw new Error('useGameDispatch must be inside GameProvider');
  return ctx;
}
