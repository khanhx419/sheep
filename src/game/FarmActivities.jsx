import { useState } from 'react';
import { visibleHerdCount } from './rules.js';
export default function FarmActivities({ state, dispatch }) {
  const [confirm, setConfirm] = useState(false), f = state.farm, day = state.phase === 'day';
  const satiety = Math.round(state.flock.reduce((sum, s) => sum + (s.hunger ?? 100), 0) / Math.max(1, state.flock.length));
  return <div className="farm-activities"><h2>{day ? 'Một ngày ở Trại Sương' : 'Nhà của chủ trại'}</h2><p className="modal-copy">{day ? 'Sáng chăm trại → tối kiểm tra sói → ngủ đến bình minh. Chủ động kết thúc ngày khi đã làm xong việc.' : 'Ngủ sẽ bỏ qua phần canh gác còn lại. Sói chưa tìm ra vẫn ăn cừu.'}</p><div className="activity-grid">
    <button disabled={!day || !state.inventory.hay || satiety === 100} onClick={() => dispatch({ type: 'FEED' })}>Cho ăn cỏ khô · 1 bó<small>Độ no đàn: {satiety}% · Kho: {state.inventory.hay} bó</small></button>
    <button disabled={!day || f.upgradedDay === state.day || f.fenceLevel >= 3 || state.gold < 4 + f.fenceLevel * 4} onClick={() => dispatch({ type: 'UPGRADE_FARM', item: 'fence' })}>Gia cố hàng rào · {4 + f.fenceLevel * 4} xu<small>Cấp {f.fenceLevel}/3 · từ rào tạm đến rào kiên cố</small></button>
    <button disabled={!day || f.upgradedDay === state.day || f.expansion >= 2 || state.gold < 6 + f.expansion * 6} onClick={() => dispatch({ type: 'UPGRADE_FARM', item: 'expand' })}>Mở rộng chuồng · {6 + f.expansion * 6} xu<small>Sức chứa {f.capacity} → {Math.min(16, f.capacity + 4)} cừu</small></button>
    <button disabled={!day || f.upgradedDay === state.day || f.roof || state.gold < 8} onClick={() => dispatch({ type: 'UPGRADE_FARM', item: 'roof' })}>Lắp mái che · 8 xu<small>{f.roof ? 'Đã hoàn thành' : 'Giữ chuồng khô khi mưa'}</small></button>
    <p className="modal-copy">{f.upgradedDay === state.day ? '✓ Đã hoàn thành việc xây dựng hôm nay.' : 'Nhiệm vụ đầu ngày: chọn một công trình nâng cấp.'} Một chuồng chung · {visibleHerdCount(state)}/{f.capacity} con.</p>
    <button disabled={!day} onClick={() => dispatch({ type: 'PASTURE' })}>{f.pastureOpen ? 'Gọi cừu về chuồng' : 'Mở cửa cho cừu ra đồng'}<small>{f.pastureOpen ? 'Đàn đang ở bãi phía tây' : 'Đàn đang ở trong chuồng'}</small></button>
    </div><p className="modal-copy">Cắt cỏ: đi tới bãi cỏ riêng phía đông, bước vào từng luống rồi nhấn E. Mỗi luống cho 2 bó, tối đa 2 luống/ngày nắng. Đã cắt {f.grassCut}/2 luống hôm nay.</p><p className="modal-copy">Kho: {state.inventory.hay}/12 bó cỏ khô · {state.inventory.battery} pin · {state.inventory.clipper} tông đơ.<br />Thời tiết mai: {f.nextSunny ? 'Nắng (búp bê)' : '25% mưa · xác suất độc lập mỗi ngày'}</p>
    {!confirm ? <button className="button secondary full" onClick={() => setConfirm(true)}>Nằm lên giường · Ngủ đến sáng</button> : <div><p className="modal-copy">Bỏ qua {day ? 'cả đêm sắp tới' : 'phần đêm còn lại'}? Sói vẫn xuất hiện, ăn cừu và có thể khiến bạn mất trại.</p><div className="inspect-actions"><button className="button secondary" onClick={() => setConfirm(false)}>Ở lại</button><button className="button primary" onClick={() => { dispatch({ type: 'SLEEP' }); setConfirm(false); }}>Ngủ đến sáng mai</button></div></div>}
  </div>;
}
