import { useEffect, useState } from 'react';
import { CHARMS, MIN_OFFERING, MAX_OFFERING, DEFAULT_OFFERING, charmOdds, balanceOdds, charmGrade } from './charms.js';
import { merchantAvailable, nextMerchantDay } from './rules.js';
import ItemArt from './ItemArt.jsx';
import { sound, unlockAudio } from './audio.js';
import './mystic.css';

export default function MysticBalance({ state, dispatch }) {
  const ritual = state.magic?.ritual?.day === state.day ? state.magic.ritual : null;
  const [stage, setStage] = useState(ritual?.claimed ? 'done' : 'idle');
  const [offering, setOffering] = useState(DEFAULT_OFFERING);
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
  const spent = state.magic?.lastWeighedDay === state.day;
  const available = merchantAvailable(state);
  const coins = ritual?.coins || offering, odds = balanceOdds(state.day, coins), tilt = Math.max(-16, Math.min(16, (ritual?.delta || 0) * 9));
  const title = stage === 'weighing' ? `${coins} Xu. Một lá bùa chưa có tên.` : stage === 'settled' ? ritual.balanced ? 'Cán cân đứng yên… nó đã chọn bạn.' : `Cán cân nghiêng. Sương mù giữ lại ${coins} Xu.` : stage === 'reveal' ? 'Ấn phép đang hiện ra.' : stage === 'burn' ? 'Giấy hóa tro. Phép thuật ở lại.' : ritual ? ritual.balanced ? CHARMS[ritual.item].name : 'Không có lá bùa nào đáp lại.' : 'Đặt cược với màn sương.';
  function weigh() { unlockAudio(); dispatch({ type: 'WEIGH_CHARM', coins: offering, balanceRoll: Math.random(), charmRoll: Math.random() }); }
  return <section className={`mystic-balance stage-${stage} ${ritual ? ritual.balanced ? 'is-balanced' : 'is-failed' : ''}`} style={{ '--failure-tilt': `${tilt}deg`, '--failure-counter': `${-tilt}deg`, '--failed-card-top': tilt > 0 ? '62%' : '36%' }} aria-label="Cân bùa của thương nhân bí ẩn">
    <header><span className="eyebrow">THƯƠNG NHÂN BÍ ẨN · {state.gold} XU</span><h2>Cán cân sương mù</h2><p>“Vàng có trọng lượng. May mắn cũng vậy.”</p></header>
    <div className="mystic-stage" aria-label={ritual ? ritual.balanced ? 'Cân đang giữ thăng bằng' : 'Cân bị lệch' : 'Đĩa trái để trống, lá bùa dấu hỏi ở đĩa phải'}>
      <div className="mystic-halo" />
      <svg className="mystic-scale" viewBox="0 0 600 350" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="scaleGold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e3c888"/><stop offset=".5" stopColor="#957449"/><stop offset="1" stopColor="#d7b677"/></linearGradient></defs>
        <ellipse cx="300" cy="322" rx="205" ry="17" fill="#061c19" opacity=".65" />
        <path d="M245 313h110l-15-13h-80Z" fill="url(#scaleGold)"/><path d="M295 299V114l5-18 5 18v185" fill="url(#scaleGold)"/><circle cx="300" cy="126" r="13" fill="#bda477"/><circle cx="300" cy="126" r="5" fill="#b7cfbf" />
        <g className="scale-beam"><path d="M119 137q79-37 181-12 102-25 181 12" stroke="url(#scaleGold)" strokeWidth="9" fill="none" strokeLinecap="round"/>
          {[135,465].map((x,i) => <g className={`scale-pan pan-${i}`} key={x} style={{ '--pan-x': `${x}px` }}><path d={`M${x} 137l-49 124m49-124 49 124`} stroke="#bda477" strokeWidth="2"/><path d={`M${x-56} 261q56 55 112 0Z`} fill="url(#scaleGold)"/><path d={`M${x-56} 261h112`} stroke="#e6d2a0" strokeWidth="3"/>
            {i === 0 && ritual && Array.from({length:coins},(_,coin) => <g className="scale-coin" style={{animationDelay:`${coin*.06}s`}} key={coin}><ellipse cx={x-19+coin%3*19} cy={252-Math.floor(coin/3)*7} rx="14" ry="5" fill="#c6944f"/><ellipse cx={x-19+coin%3*19} cy={248-Math.floor(coin/3)*7} rx="14" ry="5" fill="#e9cd82"/><path d={`M${x-23+coin%3*19} ${248-Math.floor(coin/3)*7}h8`} stroke="#9e7448" strokeWidth="2"/></g>)}
          </g>)}
        </g>
      </svg>
      <div className="scale-card-wrap"><div className="charm-paper">{shown ? <ItemArt item={ritual.item} size={124}/> : <div className="unknown-charm"><span>?</span><i>✧</i></div>}</div>{stage === 'burn' && <><div className="charm-flame"/>{Array.from({length:18},(_,i)=><i className="charm-ember" key={i} style={{'--drift':`${Math.sin(i*2.399)*85}px`,'--delay':`${i*.055}s`}}/>)}</>}</div>
    </div>
    <div className="mystic-result" role="status" aria-live="polite"><h3>{title}</h3><p>{definition ? definition.description : !ritual ? 'Nhiều Xu gọi bùa quý hơn, nhưng khiến cán cân khó đứng yên hơn. Cân lệch sẽ mất toàn bộ số Xu đã đặt.' : stage === 'done' && !ritual.balanced ? 'Có thể cân lại vào lần ghé tiếp theo.' : 'Mỗi lần ghé chỉ được thử một lần.'}</p>{stage === 'done' && ritual?.balanced && <small>{ritual.item === 'hungerCurse' ? 'Lời nguyền đã kích hoạt.' : 'Ấn phép đã vào túi đồ I. Dùng vật phẩm để kích hoạt.'}</small>}</div>
    <div className="charm-offering"><label htmlFor="charm-coins">Số Xu đặt lên cân <strong>{coins} Xu</strong></label><input id="charm-coins" aria-label="Số Xu đặt lên cân" type="range" min={MIN_OFFERING} max={MAX_OFFERING} step="1" value={coins} disabled={!!busy || !!ritual} onChange={e => setOffering(Number(e.target.value))}/><div className="charm-estimates"><span>Giữ cân <b>{odds.balanced.toFixed(1)}%</b></span><span>Thực nhận bùa VIP <b>{odds.vip.toFixed(1)}%</b></span></div></div>
    <button className="button primary full mystic-stake" disabled={!available || spent || !!busy || state.gold < offering} onClick={weigh}>{busy ? 'Đang cân số phận…' : spent ? `Lần cân tới: ngày ${nextMerchantDay(state.day)}` : `Đặt ${offering} Xu lên cân`}</button>
    {!available && <p className="mystic-note">Thương nhân chỉ ghé ban ngày của ngày 1, 3, 5…</p>}
    <p className="mystic-note">Lệch: {(100-odds.balanced).toFixed(1)}% · Kết quả và số Xu được lưu ngay khi đặt.</p>
    <details className="charm-odds"><summary>Tỉ lệ nhận bùa và quy luật của cân</summary><p>Mỗi Xu tăng năng lượng gọi bùa: bùa hiếm được thêm trọng số 8%/Xu, bùa VIP thêm 35%/Xu so với mức đặt 1 Xu. Trọng số Bùa Lợi Tức giảm từ 8 xuống 2 theo số ngày sống sót.</p><p>Biên dao động = 1,25 + 0,055 × (Xu − 1) + 0,13 × độ hiếm (0/1/2). Cân rút độ lệch ngẫu nhiên đều trong ±biên; chỉ giữ được khi độ lệch không quá 1. Tỉ lệ thực nhận dưới đây đã tính cả nguy cơ cân lệch.</p><div>{charmOdds(state.day,coins).map(({id,receiveChance})=><article key={id}><ItemArt item={id} size={46}/><span><strong>{CHARMS[id].name}{charmGrade(id) === 2 ? ' · VIP' : ''}</strong><small>{CHARMS[id].description}</small></span><b>{receiveChance.toFixed(1)}%</b></article>)}</div></details>
  </section>;
}
