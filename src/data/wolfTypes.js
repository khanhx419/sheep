// Compatibility export for existing tools; use the same six species as the game.
export { WOLVES as WOLF_TYPES } from '../game/catalog.js';
import { WOLVES } from '../game/catalog.js';
export function getEligibleWolves(nightNumber) { return Object.values(WOLVES).filter(w => nightNumber >= w.minNight); }
