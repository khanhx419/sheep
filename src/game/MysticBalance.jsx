import { tr } from './i18n.js';
import { useEffect, useState } from 'react';
import { CHARMS, MIN_OFFERING, MAX_OFFERING, DICE_COST, offeringOdds, charmGrade } from './charms.js';
import { merchantAvailable } from './rules.js';
import DiceCup from './DiceCup.jsx';
import ItemArt from './ItemArt.jsx';
import { sound, unlockAudio } from './audio.js';
import './mystic.css';

export default function MysticBalance({ state, dispatch }) {
  const ritual = state.magic?.ritual?.day === state.day ? state.magic.ritual : null;
  const [stage, setStage] = useState(ritual?.claimed ? 'done' : 'idle');
  const [stake, setStake] = useState(3);
  const [choice, setChoice] = useState('low');
  const [rolling, setRolling] = useState(false);
  useEffect(() => { if (!rolling) return; const timer = setTimeout(() => setRolling(false), 1600); return () => clearTimeout(timer); }, [rolling]);
  useEffect(() => {
    if (!ritual) { setStage('idle'); return; }
    if (ritual.claimed) { setStage('done'); return; }
    setStage('weighing'); sound('scale');
    const timers = [setTimeout(() => { setStage('settled'); sound(ritual.balanced ? 'charmBalance' : 'charmFail'); }, 2400)];
    if (ritual.balanced) {
      timers.push(setTimeout(() => { setStage('reveal'); sound('charmReveal'); }, 3250));
      timers.push(setTimeout(() => { setStage('burn'); sound('charmBurn'); }, 4650));
    }
    timers.push(setTimeout(() => dispatch({ type: 'RESOLVE_CHARM', id: ritual.id }), ritual.balanced ? 6400 : 3400));
    return () => timers.forEach(clearTimeout);
  }, [ritual?.id, ritual?.claimed, dispatch]);
  const busy = ritual && !ritual.claimed, shown = ritual?.balanced && ['reveal', 'burn', 'done'].includes(stage);
  const definition = shown ? CHARMS[ritual.item] : null;
  const available = merchantAvailable(state);
  const luckResult = state.magic?.luck?.day === state.day ? state.magic.luck : null;
  const hiddenLuck = luckResult?.revealed === false;
  const luck = ritual?.luck || (!hiddenLuck && !luckResult?.consumed && luckResult?.multiplier) || 1, coins = ritual?.coins || stake;
  const odds = offeringOdds(state.day, coins, luck), chance = odds.reduce((sum, row) => sum + row.awarded, 0);
  const tilt = Math.max(-16, Math.min(16, (ritual?.delta || 0) * 9));
  const title = stage === 'weighing' ? 'Xu đang đối trọng với lá bùa bí ẩn…' : stage === 'settled' ? ritual.balanced ? 'Đĩa Xu đủ nặng. Lá bùa thuộc về bạn.' : `Đĩa bùa nặng hơn. Màn sương giữ ${coins} Xu.` : stage === 'reveal' ? 'Ấn phép đang hiện ra.' : stage === 'burn' ? 'Giấy hóa tro. Phép thuật ở lại.' : ritual ? (ritual.balanced ? CHARMS[ritual.item].name : 'Lá bùa chưa đáp lại.') : 'Lắc vận may, rồi đặt Xu lên cân.';
  function weigh() { if (ritual?.claimed) { dispatch({ type: 'PREPARE_CHARM' }); return; } unlockAudio(); dispatch({ type: 'WEIGH_CHARM', coins: stake, prizeRoll: Math.random(), balanceRoll: Math.random() }); }
  function dice() { unlockAudio(); sound('scale'); setRolling(true); dispatch({ type: 'ROLL_LUCK', choice, rolls: [Math.random(), Math.random(), Math.random()] }); }
  return <section className={`mystic-balance stage-${stage} ${ritual?.model === 'luck-v2' ? 'weighted-scale' : ''} ${ritual ? ritual.balanced ? 'is-balanced' : 'is-failed' : ''}`} style={{ '--failure-tilt': `${tilt}deg`, '--failure-counter': `${-tilt}deg`, '--failed-card-top': tilt > 0 ? '62%' : '36%' }} aria-label={tr("Cân bùa của thương nhân bí ẩn")}>
    <header><span className="eyebrow">{tr("THƯƠNG NHÂN BÍ ẨN · ")}{tr(state.gold)}{tr(" XU")}</span><h2>{tr("Cán cân sương mù")}</h2><p>{tr("“Vàng có trọng lượng. May mắn cũng vậy.”")}</p></header>
    <div className="mystic-stage" aria-label={tr(ritual ? ritual.balanced ? 'Cân đang giữ thăng bằng' : 'Cân bị lệch' : 'Đĩa trái để trống, lá bùa dấu hỏi ở đĩa phải')}>
      <div className="mystic-halo" />
      <svg className="mystic-scale" viewBox="0 0 600 350" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="scaleGold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e3c888"/><stop offset=".5" stopColor="#957449"/><stop offset="1" stopColor="#d7b677"/></linearGradient></defs>
        <ellipse cx="300" cy="322" rx="205" ry="17" fill="#061c19" opacity=".65" />
        <path d="M245 313h110l-15-13h-80Z" fill="url(#scaleGold)"/><path d="M295 299V114l5-18 5 18v185" fill="url(#scaleGold)"/><circle cx="300" cy="126" r="13" fill="#bda477"/><circle cx="300" cy="126" r="5" fill="#b7cfbf" />
        <g className="scale-beam"><path d="M119 137q79-37 181-12 102-25 181 12" stroke="url(#scaleGold)" strokeWidth="9" fill="none" strokeLinecap="round"/>
          {tr([135,465].map((x,i) => <g className={`scale-pan pan-${i}`} key={x} style={{ '--pan-x': `${x}px` }}><path d={`M${x} 137l-49 124m49-124 49 124`} stroke="#bda477" strokeWidth="2"/><path d={`M${x-56} 261q56 55 112 0Z`} fill="url(#scaleGold)"/><path d={`M${x-56} 261h112`} stroke="#e6d2a0" strokeWidth="3"/>
            {i === 0 && ritual && Array.from({length:coins},(_,coin) => <g className="scale-coin" style={{animationDelay:`${coin*.06}s`}} key={coin}><ellipse cx={x-19+coin%3*19} cy={252-Math.floor(coin/3)*7} rx="14" ry="5" fill="#c6944f"/><ellipse cx={x-19+coin%3*19} cy={248-Math.floor(coin/3)*7} rx="14" ry="5" fill="#e9cd82"/><path d={`M${x-23+coin%3*19} ${248-Math.floor(coin/3)*7}h8`} stroke="#9e7448" strokeWidth="2"/></g>)}
          </g>))}
        </g>
      </svg>
      <div className="scale-card-wrap"><div className="charm-paper">{tr(shown ? <ItemArt item={ritual.item} size={124}/> : <div className="unknown-charm"><span>?</span><i>✧</i></div>)}</div>{tr(stage === 'burn' && <><div className="charm-flame"/>{Array.from({length:18},(_,i)=><i className="charm-ember" key={i} style={{'--drift':`${Math.sin(i*2.399)*85}px`,'--delay':`${i*.055}s`}}/>)}</>)}</div>
    </div>
    <div className="mystic-result" role="status" aria-live="polite"><h3>{tr(title)}</h3><p>{tr(definition ? definition.description : !ritual ? 'Đĩa trái cân bằng hoặc nặng hơn đĩa bùa: nhận một bùa ngẫu nhiên.' : stage === 'done' && !ritual.balanced ? 'Có thể đặt Xu cho lượt cân tiếp theo.' : 'Lá bùa đang được mở niêm phong.')}</p>{tr(stage === 'done' && ritual?.balanced && <small>{['hungerCurse','goldCharm','debtCharm'].includes(ritual.item) ? 'Hiệu ứng đã tự kích hoạt.' : 'Ấn phép đã vào túi đồ I. Dùng vật phẩm để kích hoạt.'}</small>)}</div>
    <DiceCup onReveal={() => dispatch({ type: 'REVEAL_LUCK', id: luckResult?.id })} choice={choice} onChoice={setChoice} result={luckResult} rolling={rolling} disabled={!available || !!busy || hiddenLuck || rolling || state.gold < DICE_COST} onRoll={dice} />
    <div className="charm-offering"><label htmlFor="charm-coins">{tr("Xu đặt bên trái ")}<strong>{tr(coins)}{tr(" Xu")}</strong></label><input id="charm-coins" aria-label={tr("Số Xu đặt lên cân")} type="range" min={MIN_OFFERING} max={MAX_OFFERING} step="1" value={coins} disabled={!!ritual || rolling || hiddenLuck} onChange={e => setStake(Number(e.target.value))}/><div className="charm-estimates"><span>{tr("Cơ hội nhận bùa ")}<b>{tr((chance*100).toFixed(1))}{tr("%")}</b></span><span>{tr("May mắn ")}<b>{tr("×")}{tr(luck)}</b></span></div></div>
    <button className="button primary full mystic-stake" disabled={!available || !!busy || rolling || hiddenLuck || (!ritual && state.gold < stake)} onClick={ritual?.claimed ? () => dispatch({type:'PREPARE_CHARM'}) : weigh}>{tr(busy ? 'Đang cân số phận…' : ritual?.claimed ? 'Cân tiếp · Chọn lượng Xu mới' : `Đặt ${coins} Xu · Cân bùa ngẫu nhiên`)}</button>
    {tr(!available && <p className="mystic-note">Thương nhân chỉ ghé ban ngày của ngày 1, 3, 5…</p>)}
    <p className="mystic-note">{tr("Giá là phí thử vận may. Cân lệch sẽ mất ")}{tr(coins)}{tr(" Xu. Kết quả được lưu ngay khi trả Xu.")}</p>
    <details className="charm-odds"><summary>{tr("Luật chơi và các lá bùa")}</summary><p>{tr("Có thể cân nhiều lần trong ngày khi thương nhân còn ở trại. Mỗi lần lắc 5 Xu cho ba xúc xắc; may mắn dùng một lượt cân rồi hết. Không lắc vẫn cân được với ×1. Có thể tung lại sau khi mở bát; mỗi lượt tốn 5 Xu và kết quả mới thay may mắn trước, không cộng dồn.")}</p><p>{tr("Thấp: tổng 3–11. Giữa: đúng 12. Cao: tổng 13–18. Đoán đúng nhận ×2 may mắn cho lượt cân tiếp theo; đoán trượt giữ ×1.")}</p><p>{tr("Nhiều Xu và may mắn cao giúp đĩa trái nặng hơn. Bùa VIP hiếm và khó cân hơn; Lợi Tức hiếm dần theo ngày. Bùa Tụ Tài +12 Xu và Hao Tài −8 Xu tự kích hoạt. ")}</p><div>{tr(odds.map(({id,awarded})=><article key={id}><ItemArt item={id} size={46}/><span><strong>{CHARMS[id].name}{charmGrade(id) === 2 ? ' · VIP' : ''}</strong><small>{CHARMS[id].description}</small></span><b>{(awarded*100).toFixed(2)}% nhận</b></article>))}</div><p>{tr("Các tỉ lệ trên tính cả bước rút bùa lẫn cân; phần còn lại là mất Xu đặt cân.")}</p></details>
  </section>;
}
