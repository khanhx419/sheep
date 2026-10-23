import { useEffect, useRef } from 'react';
import { ART, Icon } from './ui.jsx';
import { sound } from './audio.js';
import CombatDiorama from './CombatDiorama.jsx';

export function Reveal({ dispatch, wolf }) {
  const played = useRef(false);
  useEffect(() => {
    if (!played.current) { sound('reveal'); played.current = true; }
    const timer = setTimeout(() => dispatch({ type: 'COMBAT' }), 3400);
    return () => clearTimeout(timer);
  }, [dispatch]);
  return <div className="reveal-screen outdoor-reveal" role="alert"><CombatDiorama type={wolf?.type || 'normal'} turn="enemy" hp={wolf?.hp || 36} reveal /><div className="reveal-rays" /><div className="reveal-creature"><div className="wool-half wool-left"><img src={`${ART}/sheep.png`} alt="" /></div><div className="wool-half wool-right"><img src={`${ART}/sheep.png`} alt="" /></div>{Array.from({ length: 12 }, (_, i) => <i className="wool-particle" key={i} style={{ '--angle': `${i * 30}deg`, '--distance': `${140 + i % 3 * 45}px` }} />)}</div><span className="eyebrow">KẺ GIẢ DẠNG ĐÃ LỘ DIỆN</span><h2>Dưới lớp lông… là sói.</h2><p>Giữ trái tim trong khung. Bảo vệ đàn cừu.</p><button className="button secondary" onClick={() => dispatch({ type: 'COMBAT' })}>Vào trận<Icon name="arrow" /></button></div>;
}
