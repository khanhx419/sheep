import { Icon } from './ui.jsx';
import { visibleHerdCount } from './rules.js';

export default function InGameHUD({ state, night, busy, saveError, onMenu, onSettings }) {
  return <div className={`ingame-hud ${busy ? 'hud-busy' : ''}`}>
    <div key={`${state.day}-${night}`} className="phase-curtain" aria-hidden="true">{night ? 'Đêm xuống · Giờ canh gác' : `Bình minh · Ngày ${state.day}`}<small>{night ? 'Đàn trở về chuồng. Đã đến giờ canh gác.' : `${state.farm.weather === 'rainy' ? 'Trời mưa · Dùng cỏ khô trong kho' : 'Trời nắng · Có thể phơi cỏ dự trữ'}`}</small></div>
    <div className="hud-status"><span className="hud-title">DƯỚI LỚP LÔNG</span><strong>{night ? 'Đêm' : 'Ngày'} {String(state.day).padStart(2, '0')} <span>· {state.fullMoon && night ? 'Trăng tròn' : state.farm.weather === 'rainy' ? 'Mưa' : 'Trại Sương'}</span></strong><div className="hud-health"><Icon name="heart" size={16} /><div><i style={{ width: `${state.hp}%` }} /></div><b>{state.hp}</b></div><small>Giáp {state.player.armor?.durability || 0} · Năng lượng {state.energy}/2</small></div>
    <div className="hud-wallet"><span><Icon name="coin" size={17} />{state.gold}<small>/ {state.targetGold} xu</small></span><span><Icon name="sheep" size={17} />{visibleHerdCount(state)}<small>con</small></span><div className="hud-money-track"><i style={{ width: `${Math.min(100, state.gold / state.targetGold * 100)}%` }} /></div></div>
    {!busy && <button className="quiet-settings" aria-label="Cài đặt" onClick={onSettings}>☰</button>}
  </div>;
}
