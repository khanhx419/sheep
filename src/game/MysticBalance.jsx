import { useEffect, useState } from 'react';
import { CHARMS, charmOffer, charmOffers, ritualChance, charmGrade } from './charms.js';
import { merchantAvailable, nextMerchantDay } from './rules.js';
import ItemArt from './ItemArt.jsx';
import { sound, unlockAudio } from './audio.js';
import './mystic.css';

export default function MysticBalance({ state, dispatch }) {
  const ritual = state.magic?.ritual?.day === state.day ? state.magic.ritual : null;
  const [stage, setStage] = useState(ritual?.claimed ? 'done' : 'idle');
  const [selected, setSelected] = useState('forageCharm');
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
  const target = ritual?.item || selected, offer = charmOffer(state.day, target), coins = ritual?.coins || offer.price;
  const chance = ritual ? ritualChance(ritual) : offer.chance, tilt = Math.max(-16, Math.min(16, (ritual?.delta || 0) * 9));
  const title = stage === 'weighing' ? `${CHARMS[target].name} đã được niêm phong.` : stage === 'settled' ? ritual.balanced ? 'Cán cân đứng yên… nó đã chọn bạn.' : `Cán cân nghiêng. Sương mù giữ lại ${coins} Xu.` : stage === 'reveal' ? 'Ấn phép đang hiện ra.' : stage === 'burn' ? 'Giấy hóa tro. Phép thuật ở lại.' : ritual ? (ritual.balanced ? CHARMS[ritual.item].name : 'Lá bùa chưa đáp lại.') : 'Chọn lá bùa bạn muốn thử.';
  function weigh() { unlockAudio(); dispatch({ type: 'WEIGH_CHARM', item: selected, balanceRoll: Math.random() }); }
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
    <div className="mystic-result" role="status" aria-live="polite"><h3>{title}</h3><p>{definition ? definition.description : !ritual ? CHARMS[target].description : stage === 'done' && !ritual.balanced ? 'Có thể cân lại vào lần ghé tiếp theo.' : 'Mỗi lần ghé chỉ được thử một lần.'}</p>{stage === 'done' && ritual?.balanced && <small>{ritual.item === 'hungerCurse' ? 'Lời nguyền đã kích hoạt.' : 'Ấn phép đã vào túi đồ I. Dùng vật phẩm để kích hoạt.'}</small>}</div>
    <div className="charm-offering"><label htmlFor="charm-target">Chọn loại vé bùa <strong>{coins} Xu / lượt</strong></label>{offer ? <select id="charm-target" aria-label="Loại bùa muốn thử" value={target} disabled={!!busy || !!ritual} onChange={e => setSelected(e.target.value)}>{charmOffers(state.day).map(row => <option key={row.id} value={row.id}>{CHARMS[row.id].name}{charmGrade(row.id) === 2 ? ' · VIP' : ''} — {row.price} Xu · {(row.chance * 100).toFixed(0)}% nhận</option>)}</select> : <p>Lượt cân cũ đang được hoàn tất.</p>}<div className="charm-estimates"><span>Nhận đúng bùa đã chọn <b>{(chance*100).toFixed(0)}%</b></span><span>Cân lệch <b>{((1-chance)*100).toFixed(0)}%</b></span></div></div>
    <button className="button primary full mystic-stake" disabled={!available || spent || !!busy || !offer || state.gold < offer.price} onClick={weigh}>{busy ? 'Đang cân số phận…' : spent ? `Lần cân tới: ngày ${nextMerchantDay(state.day)}` : `Thử ${CHARMS[target].name} · ${coins} Xu`}</button>
    {!available && <p className="mystic-note">Thương nhân chỉ ghé ban ngày của ngày 1, 3, 5…</p>}
    <p className="mystic-note">Giá là phí thử vận may. Cân lệch sẽ mất {coins} Xu. Kết quả được lưu ngay khi trả Xu.</p>
    <details className="charm-odds"><summary>Giá vé bùa và quy luật của cân</summary><p>Bùa thường có vé rẻ và tỉ lệ nhận cao. Bùa VIP có vé đắt hơn và khó nhận hơn. Thành công sẽ nhận đúng loại đã chọn.</p><p>Cân rút độ lệch đều trong ±(1 / tỉ lệ nhận). Chỉ giữ được khi |độ lệch| ≤ 1. Lợi Tức giảm 2 điểm phần trăm sau mỗi 5 ngày, tối thiểu 8%.</p><div>{charmOffers(state.day).map(({id,price,chance:rate})=><article key={id}><ItemArt item={id} size={46}/><span><strong>{CHARMS[id].name}{charmGrade(id) === 2 ? ' · VIP' : ''}</strong><small>{price} Xu / lượt · {CHARMS[id].description}</small></span><b>{(rate*100).toFixed(0)}%</b></article>)}</div></details>
  </section>;
}
