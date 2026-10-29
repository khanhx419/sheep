import { tr } from './i18n.js';
import { Icon } from './ui.jsx';
import { visibleHerdCount } from './rules.js';

export default function InGameHUD({ state, night, busy, saveError, onMenu, onSettings }) {
  return <div className={`ingame-hud ${busy ? 'hud-busy' : ''}`}>
    <div key={`${state.day}-${night}`} className="phase-curtain" aria-hidden="true">{tr(night ? 'Đêm xuống · Giờ canh gác' : `Bình minh · Ngày ${state.day}`)}<small>{tr(night ? 'Đàn trở về chuồng. Đã đến giờ canh gác.' : `${state.farm.weather === 'rainy' ? 'Trời mưa · Dùng cỏ khô trong kho' : 'Trời nắng · Có thể phơi cỏ dự trữ'}`)}</small></div>
    <div className="hud-status"><span className="hud-title">{tr("DƯỚI LỚP LÔNG")}</span><strong>{tr(night ? 'Đêm' : 'Ngày')} {tr(String(state.day).padStart(2, '0'))} <span>{tr("· ")}{tr(state.fullMoon && night ? 'Trăng tròn' : state.farm.weather === 'rainy' ? 'Mưa' : 'Trại Sương')}</span></strong><div className="hud-health"><Icon name="heart" size={16} /><div><i style={{ width: `${state.hp}%` }} /></div><b>{tr(state.hp)}</b></div><small>{tr("Giáp ")}{tr(state.player.armor?.durability || 0)}{tr(" · Năng lượng ")}{tr(state.energy)}{tr("/2")}</small></div>
    <div className="hud-wallet"><span><Icon name="coin" size={17} />{tr(state.gold)}<small>{tr("/ ")}{tr(state.targetGold)}{tr(" xu")}</small></span><span><Icon name="sheep" size={17} />{tr(visibleHerdCount(state))}<small>{tr("con")}</small></span><div className="hud-money-track"><i style={{ width: `${Math.min(100, state.gold / state.targetGold * 100)}%` }} /></div></div>
    {tr(!busy && <button className="quiet-settings" aria-label="Cài đặt" onClick={onSettings}>☰</button>)}
  </div>;
}
