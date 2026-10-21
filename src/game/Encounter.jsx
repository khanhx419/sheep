import { useEffect, useRef } from 'react';
import { ART, Icon } from './ui.jsx';
import { sound } from './audio.js';

export function Reveal({ dispatch }) {
  const played = useRef(false);
  useEffect(() => {
    if (!played.current) { sound('reveal'); played.current = true; }
    const timer = setTimeout(() => dispatch({ type: 'COMBAT' }), 3400);
    return () => clearTimeout(timer);
  }, [dispatch]);
  return <div className="reveal-screen" role="alert"><div className="reveal-rays" /><div className="reveal-creature"><img className="revealed-wolf" src={`${ART}/wolf.png`} alt="Sói xé lớp lông cừu và hiện hình" /><div className="wool-half wool-left"><img src={`${ART}/sheep.png`} alt="" /></div><div className="wool-half wool-right"><img src={`${ART}/sheep.png`} alt="" /></div>{Array.from({ length: 12 }, (_, i) => <i className="wool-particle" key={i} style={{ '--angle': `${i * 30}deg`, '--distance': `${140 + i % 3 * 45}px` }} />)}</div><span className="eyebrow">KẺ GIẢ DẠNG ĐÃ LỘ DIỆN</span><h2>Dưới lớp lông… là sói.</h2><p>Giữ trái tim trong khung. Bảo vệ đàn cừu.</p><button className="button secondary" onClick={() => dispatch({ type: 'COMBAT' })}>Vào trận<Icon name="arrow" /></button></div>;
}
