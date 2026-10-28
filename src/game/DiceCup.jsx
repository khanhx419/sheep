import DiceCupScene from './DiceCupScene.jsx';
import { useEffect, useRef, useState } from 'react';
const CHOICES = [['low','Thấp · 3–11'],['middle','Giữa · 12'],['high','Cao · 13–18']];
export default function DiceCup({ result, rolling, disabled, onRoll, choice, onChoice, onReveal }) {
  const faces = result?.dice || [1,1,1], ready = result && !result.consumed;
  const hidden = result?.revealed === false;
  const [popup, setPopup] = useState(hidden);
  const [offset, setOffset] = useState({x:0,y:0});
  const pointer = useRef(null), position = useRef({x:0,y:0}), dialog = useRef(null), returnFocus = useRef(null);
  useEffect(() => { if (!popup) return; returnFocus.current = document.activeElement; dialog.current?.focus(); return () => returnFocus.current?.focus?.(); }, [popup]);
  useEffect(() => { position.current={x:0,y:0}; setOffset({x:0,y:0}); }, [result?.id]);
  function move(x,y) { const next={x:Math.max(-260,Math.min(260,x)),y:Math.max(-220,Math.min(220,y))}; position.current=next; setOffset(next); }
  function reveal() { if (!rolling && hidden) onReveal(); }
  function down(e) {
    if (rolling || e.button !== 0) return;
    pointer.current={id:e.pointerId,x:e.clientX-position.current.x,y:e.clientY-position.current.y};
    e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault();
  }
  function drag(e) { if (pointer.current?.id===e.pointerId) move(e.clientX-pointer.current.x,e.clientY-pointer.current.y); }
  function up(e) {
    if(pointer.current?.id!==e.pointerId) return;
    pointer.current=null;
    if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if(e.type==='pointerup') { if(hidden) {if(Math.hypot(position.current.x,position.current.y)>=85) reveal(); else move(0,0);} } else if(hidden) move(0,0);
  }
  function keys(e) {
    if(rolling) return;
    const steps={ArrowLeft:[-35,0],ArrowRight:[35,0],ArrowUp:[0,-35],ArrowDown:[0,35]};
    if(steps[e.key]) { e.preventDefault();move(position.current.x+steps[e.key][0],position.current.y+steps[e.key][1]);if(Math.hypot(position.current.x,position.current.y)>=85) reveal(); }
    if(e.key==='Enter' || e.key===' ') {e.preventDefault();move(130,-70);reveal();}
  }
  function scene(interactive=false) {
    const covered = !result || hidden || rolling;
    return <div className={`dice-table ${interactive ? 'interactive-dice' : ''}`} role={interactive ? undefined : 'img'} aria-label={covered ? 'Ba xúc xắc đang úp kín dưới bát' : `Ba xúc xắc ${faces.join(', ')}, tổng ${result.total}`}>
      <DiceCupScene faces={faces} offset={interactive ? offset : {x:0,y:0}} rolling={interactive && rolling} covered={interactive || covered}/>
      {interactive && <button type="button" className="bowl-hit-target" aria-label="Kéo bát để xem xúc xắc" disabled={rolling} onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={()=>{pointer.current=null;}} onKeyDown={keys} style={{transform:`translate(${offset.x}px,${offset.y}px)`}}/>}
    </div>;
  }
  return <>
    <div className={`dice-ritual ${!hidden && result ? 'is-open' : 'is-covered'}`}>
      {scene()}
      <div className="dice-copy"><strong>{hidden || rolling ? 'Bát vẫn đang úp kín' : ready ? `${result.won === true ? 'Đoán đúng · ' : result.won === false ? 'Đoán trượt · ' : ''}May mắn ×${result.multiplier}` : 'Ba viên xúc xắc'}</strong><small>{hidden ? 'Kéo bát trong cửa sổ để xem kết quả' : ready ? result.dice ? `${faces.join(' + ')} = ${result.total} · Dùng cho một lần cân` : 'May mắn từ bản lưu' : 'Chọn Thấp, Giữa hoặc Cao rồi tung xúc xắc'}</small>
      <div className="dice-choices" role="group" aria-label="Dự đoán Thấp Giữa Cao">{CHOICES.map(([id,label])=><button key={id} type="button" aria-pressed={choice===id} disabled={disabled} onClick={()=>onChoice(id)}>{label}</button>)}</div>
      {hidden ? <button className="button dice-roll-button" onClick={()=>setPopup(true)}>Mở cửa sổ · Kéo bát</button> : <button className="button dice-roll-button" disabled={disabled} onClick={()=>{move(0,0);setPopup(true);onRoll();}}>{ready ? `Đã mở · ×${result.multiplier}` : 'Tung xúc xắc · 5 Xu'}</button>}
      </div>
    </div>
    {popup && <div className="dice-popup-backdrop" onKeyDown={e=>{
      if(e.key==='Escape') {e.stopPropagation(); if(!rolling) setPopup(false);}
      if(e.key==='Tab') {e.stopPropagation(); const nodes=dialog.current.querySelectorAll('button:not(:disabled)');const first=nodes[0],last=nodes[nodes.length-1]; if(!first){e.preventDefault();return;} if(e.shiftKey && (document.activeElement===first || document.activeElement===dialog.current)){e.preventDefault();last.focus();} else if(!e.shiftKey && (document.activeElement===last || document.activeElement===dialog.current)){e.preventDefault();first.focus();}}
    }}><section className={`dice-popup ${rolling ? 'is-shaking' : 'manual-cup'} ${hidden ? 'cup-hidden' : 'cup-revealed'}`} ref={dialog} role="dialog" aria-modal="true" aria-label="Mở bát xúc xắc" tabIndex={-1}>
      <span className="eyebrow">BA VIÊN XÚC XẮC</span><h2>{rolling ? 'Đang tung…' : hidden ? 'Tự tay mở vận may' : `${faces.join(' + ')} = ${result?.total}`}</h2>
      <p>{rolling ? 'Bát đang lắc. Chờ một chút…' : hidden ? 'Giữ và kéo bát theo hướng bất kỳ để xem.' : `${result?.won ? 'Đoán đúng' : 'Đoán trượt'} · May mắn ×${result?.multiplier}`}</p>
      {scene(true)}
      <small>{hidden ? 'Bàn phím: chọn bát, dùng phím mũi tên hoặc Enter để mở.' : 'May mắn dùng cho một lượt cân tiếp theo.'}</small>
      <button className="button primary full" disabled={rolling} onClick={()=>setPopup(false)}>{hidden ? 'Để nguyên bát · Quay lại' : 'Tiếp tục cân bùa'}</button>
    </section></div>}
  </>;
}
