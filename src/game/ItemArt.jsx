import { useId } from 'react';
import { CHARMS } from './charms.js';

export default function ItemArt({ item, size = 62 }) {
  const id = useId().replaceAll(':', ''), metal = `metal${id}`, glass = `glass${id}`;
  const bottle = ['medicine', 'strengthPotion', 'beer'].includes(item);
  return <svg className="item-art" width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
    <defs><linearGradient id={metal} x1="16" y1="10" x2="55" y2="64" gradientUnits="userSpaceOnUse"><stop stopColor="#dce7db" /><stop offset=".5" stopColor="#8da59c" /><stop offset="1" stopColor="#435b58" /></linearGradient><linearGradient id={glass} x1="24" y1="15" x2="49" y2="59" gradientUnits="userSpaceOnUse"><stop stopColor={item === 'medicine' ? '#e8ad94' : item === 'beer' ? '#e5bd71' : '#b7b2e1'} /><stop offset="1" stopColor={item === 'medicine' ? '#9f564d' : item === 'beer' ? '#936541' : '#665e91'} /></linearGradient></defs>
    <ellipse cx="36" cy="61" rx="23" ry="5" fill="#071913" opacity=".3" />
    {CHARMS[item] && <><path d="M20 8h32l2 49-7 5-7-3-7 3-7-4-7 2Z" fill="#e8d7af" stroke="#b28d60" strokeWidth="1.5" /><path d="M25 13h22M25 52h22" stroke="#b28d60" strokeWidth="1.5" /><g stroke={CHARMS[item].color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"><CharmGlyph type={CHARMS[item].glyph} /></g></>}
    {item === 'axe' && <><path d="m23 60 19-45" stroke="#ab8658" strokeWidth="7" strokeLinecap="round" /><path d="m37 17 8-5 17 8-7 18-18-8Z" fill={`url(#${metal})`} stroke="#d0d9cb" strokeWidth="1.4" /><path d="m57 19-5 15" stroke="#e6eddc" strokeWidth="3" /></>}
    {item === 'gun' && <><path d="m15 52 18-20 8 7-17 22Z" fill="#9b784d" /><path d="m28 34 25-25 5 5-25 25Z" fill={`url(#${metal})`} /><path d="m36 40 9 4 5-6-8-9" stroke="#677d72" strokeWidth="4" /><path d="m46 13 7 7" stroke="#e4d9b5" strokeWidth="2" /></>}
    {item === 'hay' && <><path d="M10 31 31 20 61 31 41 43Z" fill="#e6c782" /><path d="M10 31v21l31 11V43Z" fill="#c49a58" /><path d="m41 43 20-12v21L41 63Z" fill="#987344" /><path d="m23 25 31 11v21M23 36v21M48 26 28 38v20" stroke="#6b6749" strokeWidth="4" /><path d="m15 40 6 2m-6 5 5 2m25 0 10-6m-10 12 10-6" stroke="#eed391" strokeWidth="1.5" /></>}
    {item === 'battery' && <g transform="rotate(-20 36 36)"><path d="M23 19h26v39c-8 5-18 5-26 0Z" fill={`url(#${metal})`} /><ellipse cx="36" cy="19" rx="13" ry="5" fill="#cad8c7" /><path d="M30 13h12v7H30Z" fill="#e9d7a5" /><path d="M23 37h26v13H23Z" fill="#466e61" /><path d="m38 28-8 14h6l-2 11 9-15h-7Z" fill="#ecd399" /></g>}
    {bottle && <><path d="M29 13h14v15l8 8v21c-7 6-23 6-30 0V36l8-8Z" fill={`url(#${glass})`} stroke="#e8ddbe" strokeOpacity=".4" /><path d="M27 11h18v8H27Z" fill="#b59667" /><path d="M25 38h22v16H25Z" fill="#f0dfbc" /><path d={item === 'medicine' ? 'M33 40h6v4h4v5h-4v4h-6v-4h-4v-5h4Z' : item === 'beer' ? 'M31 42h10v9H31Z' : 'm38 39-8 9h6l-2 6 9-10h-6Z'} fill={item === 'medicine' ? '#a86355' : item === 'beer' ? '#94723e' : '#77709d'} /><path d="M26 34v18" stroke="#fff" strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" /></>}
    {['armorLight', 'armorHeavy'].includes(item) && <><path d="m25 15-13 9 5 14 8-3-3 24c9 5 19 5 28 0l-3-24 8 3 5-14-13-9-11 6Z" fill={`url(#${metal})`} stroke="#c7d0b5" strokeWidth="1.5" /><path d="m25 15 11 14 11-14M36 29v31M25 39l11 6 11-6" stroke="#4f6961" strokeWidth="2" />{item === 'armorHeavy' && <path d="m14 24 11 7-4 8-9-5m48-10-11 7 4 8 9-5" fill="#c9a970" />}</>}
    {item === 'ammo' && <>{[0, 1, 2].map((i) => <g key={i} transform={`translate(${i * 14 - 14} ${Math.abs(i - 1) * 5})`}><path d="M29 28q0-13 7-17 7 4 7 17v27H29Z" fill="#caa46b" /><path d="M29 28h14v23H29Z" fill="#e1c48c" /><path d="M27 51h18v6H27Z" fill="#997b50" /><path d="M32 31v16" stroke="#f8e2b0" strokeWidth="2" /></g>)}</>}
    {item === 'repairKit' && <><path d="M11 31 33 23l29 10v23l-23 8-28-10Z" fill="#826c50" /><path d="m11 31 28 10 23-8-28-10Z" fill="#c19c66" /><path d="M39 41v23" stroke="#534f3d" strokeWidth="2" /><path d="M25 25v-8h20v11" stroke="#b9bca1" strokeWidth="5" /><path d="M35 43h8v8h-8Z" fill="#d9ba7a" /></>}
    {item === 'fence' && <><path d="m11 29 50-9v8l-50 9Zm0 19 50-9v8l-50 9Z" fill="#b18c5d" /><path d="m19 18 6-6 6 4v45l-12 2Zm29-5 6-6 6 4v44l-12 2Z" fill="#d4b17b" /><path d="M28 18v41m29-45v39" stroke="#91704d" strokeWidth="2" /></>}
    {item === 'roof' && <><path d="m11 36 24-22 28 18-24 8Z" fill="#72938a" /><path d="m35 14 4 26 24-8Z" fill="#3f6864" /><path d="M17 38v22m40-24v20M39 40v24" stroke="#c8a16b" strokeWidth="5" /><path d="m17 46 22 7 18-5" stroke="#ad8b5c" strokeWidth="4" /></>}
    {['sheep', 'lamb'].includes(item) && <g transform={item === 'lamb' ? 'translate(7 10) scale(.8)' : ''}><path d="M23 49v13m24-13v13" stroke="#706459" strokeWidth="6" strokeLinecap="round" /><path d="M16 31c-5-10 8-17 14-11 5-11 19-7 20 2 15-2 19 15 10 20 3 13-13 18-20 11-12 7-26 0-24-10-10-1-10-13 0-12Z" fill="#f2e5c5" /><ellipse cx="29" cy="37" rx="13" ry="16" fill="#8d7969" /><path d="m18 30-9-4m30 3 8-5" stroke="#ac9380" strokeWidth="7" strokeLinecap="round" /><circle cx="24" cy="35" r="3" fill="#f7edda" /><circle cx="33" cy="35" r="3" fill="#f7edda" /><circle cx="25" cy="36" r="1.7" fill="#343e39" /><circle cx="34" cy="36" r="1.7" fill="#343e39" /><ellipse cx="29" cy="44" rx="3" ry="2" fill="#51443d" /></g>}
    {item === 'clipper' && <><path d="m24 24 22-3 5 33-22 4Z" fill={`url(#${metal})`} /><path d="m21 14 25-3 2 14-25 3Z" fill="#bfc9bd" /><path d="m24 14 1 9m4-10 1 9m4-10 1 9m4-10 1 9" stroke="#425c52" strokeWidth="2" /><rect x="32" y="34" width="9" height="14" rx="3" fill="#44695d" /></>}
    {['sunDoll', 'rainDoll'].includes(item) && <><path d="M36 9v10" stroke="#9d8c62" strokeWidth="2" /><path d="m28 34-10 24q18 8 36-1L44 34Z" fill={item === 'rainDoll' ? '#95b6ca' : '#e9dec3'} /><circle cx="36" cy="28" r="13" fill="#f4e9cf" /><path d="m24 40 12-4 12 4" stroke={item === 'rainDoll' ? '#6085a7' : '#c79c62'} strokeWidth="4" /><circle cx="32" cy="27" r="1.5" fill="#756650" /><circle cx="40" cy="27" r="1.5" fill="#756650" /><path d="M33 32q3 3 6 0" stroke="#a28768" strokeWidth="1.5" /></>}
  </svg>;
}

export function CharmGlyph({ type }) {
  return <>{type === 'sprout' && <><path d="M36 48V31q-15 0-13-13 14 0 13 13 0-14 14-14 0 14-14 14" /><path d="m28 47 8-5 8 5" /></>}
    {type === 'eye' && <><path d="M23 32q13-18 26 0-13 18-26 0Z" /><circle cx="36" cy="32" r="5" /><path d="m27 18-3-4m21 4 3-4M36 14v-3" /></>}
    {type === 'shield' && <><path d="m36 17 13 6-3 17-10 9-10-9-3-17Z" /><path d="m29 32 5 6 10-12" /></>}
    {type === 'moon' && <><path d="M41 17a15 15 0 1 0 9 24 17 17 0 0 1-9-24Z" /><path d="m47 19 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" /></>}
    {type === 'bomb' && <><path d="m37 17-2 12 9-6-5 14 9-3-12 15 1-13-10 6 3-13-7 1Z" /><path d="m23 19-3-3m29 2 4-3m-2 29 3 3" /></>}
    {type === 'blink' && <><ellipse cx="36" cy="33" rx="9" ry="17" /><path d="m24 24-4 8 4 8m24-16 4 8-4 8M31 33h10" /></>}
    {type === 'wind' && <><path d="M22 26h19q10 0 7-7-3-5-7 0M20 34h29M24 41h14q9 0 6 7-3 4-7 0" /></>}
    {type === 'coin' && <><circle cx="36" cy="33" r="13" /><path d="M36 24v18m6-15h-9q-6 4 3 6 9 2 3 7h-9" /></>}
    {type === 'curse' && <><path d="m36 16 13 16-13 17-13-17ZM30 26l12 13m0-13L30 39" /><path d="M18 23v5m36 11v5" /></>}
  </>;
}
