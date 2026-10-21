import { Icon } from './ui.jsx';

export default function InGameHUD({ state, night, busy, saveError, onMenu, onSettings }) {
  return <div className={`ingame-hud ${busy ? 'hud-busy' : ''}`}>
    <div className="hud-status"><span className="hud-title">DƯỚI LỚP LÔNG</span><strong>{night ? 'Đêm' : 'Ngày'} {String(state.day).padStart(2, '0')} <span>· {state.fullMoon && night ? 'Trăng tròn' : state.farm.weather === 'rainy' ? 'Mưa' : 'Trại Sương'}</span></strong><div className="hud-health"><Icon name="heart" size={16} /><div><i style={{ width: `${state.hp}%` }} /></div><b>{state.hp}</b></div><small>Giáp {state.player.armor?.durability || 0} · Năng lượng {state.energy}/2</small></div>
    <div className="hud-wallet"><span><Icon name="coin" size={17} />{state.gold}<small>/ {state.targetGold} xu</small></span><span><Icon name="sheep" size={17} />{state.sheep}<small>cừu</small></span><div className="hud-money-track"><i style={{ width: `${Math.min(100, state.gold / state.targetGold * 100)}%` }} /></div></div>
    {!busy && <nav className="hud-nav" aria-label="Menu trong game"><button onClick={() => onMenu('farm')}><Icon name="home" size={17} />Trang trại<kbd>Tab</kbd></button><button onClick={() => onMenu('inventory')}><Icon name="shield" size={17} />Túi đồ<kbd>I</kbd></button><button onClick={onSettings}>Cài đặt<kbd>Esc</kbd></button></nav>}
    <div className="hud-report" role="status">{state.report}<small>{saveError ? 'Không thể lưu tiến trình' : '● Đã tự lưu'}</small></div>
  </div>;
}
