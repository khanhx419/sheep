// Public spawner API. The active GDD catalog is the single source of truth.
import { spawnWolves, spawnWeights, evolveWolf, WOLVES } from '../game/catalog.js';
export { spawnWolves, spawnWeights, evolveWolf };
export function spawnWolvesForNight(day, sheepCount, random = Math.random) {
  return { isFullMoon: day % 7 === 0, wolves: spawnWolves(day, sheepCount, true, random).map(w => ({ ...w, fakeSheepId: `disguise-${w.id}` })) };
}
export function getNightPreview(day) {
  return { day, isFullMoon: day % 7 === 0, eligibleWolfTypes: spawnWeights(day).map(a => WOLVES[a.type].name), dangerLevel: Math.min(5, Math.floor((day - 1) / 3) + 1) };
}
