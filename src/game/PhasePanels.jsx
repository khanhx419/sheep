import { useState } from 'react';
import { ITEMS, WOLVES } from './catalog.js';
import { dogAvailable } from './rules.js';
import { Icon, Modal } from './ui.jsx';
import { sound } from './audio.js';

export function FarmDayPhase({ state, dispatch, initialShop = 'basic' }) {
  const [shop, setShop] = useState(initialShop);
  return <div className="gdd-day-panel"><div className="section-heading"><span>CỬA HÀNG BAN NGÀY</span><Icon name="sun" size={16} /></div>
    <div className="shop-tabs"><button className={shop === 'basic' ? 'active' : ''} onClick={() => setShop('basic')}>Nông trại</button><button className={shop === 'merchant' ? 'active' : ''} onClick={() => setShop('merchant')}>Thương nhân {state.merchant.present ? '●' : '—'}</button></div>
    {shop === 'merchant' && !state.merchant.present ? <div className="field-note"><p>Người khách trong màn sương hôm nay không đến.</p><small>Ông ta xuất hiện ngẫu nhiên vào một số buổi sáng.</small></div> : <div className="shop-scroll">{Object.values(ITEMS).filter(i => i.shop === shop).map(item => {
      const done = item.id === 'fence' && state.farm.divided || item.id === 'roof' && state.farm.roof || ['sheep', 'lamb'].includes(item.id) && state.sheep >= 16;
      return <button className="upgrade" key={item.id} disabled={done || state.gold < item.price} title={item.description} onClick={() => { dispatch({ type: 'BUY', item: item.id }); sound('buy'); }}><span><strong>{item.name}</strong><small>{item.description}</small></span><b>{done ? '✓' : <>{item.price}<Icon name="coin" size={12} /></>}</b></button>;
    })}</div>}
    <div className="gdd-daily"><p>{state.farm.weather === 'rainy' ? 'Trời mưa' : 'Trời nắng'} · {state.farm.fed ? 'Đàn đã đủ thức ăn' : 'Đàn đang đói'}</p><button className="button secondary full" disabled={state.farm.fed || !state.inventory.hay} onClick={() => dispatch({ type: 'FEED' })}>Cho ăn cỏ khô<span>{state.inventory.hay} bó</span></button><small>{state.flock.filter(s => s.age === 'adult').length} cừu lớn · {state.flock.filter(s => s.age === 'baby').length} cừu con · 1 xu/cừu lớn/ngày</small></div>
  </div>;
}

export function Inventory({ state, dispatch }) {
  return <div className="gdd-inventory"><div className="section-heading"><span>TÚI ĐỒ</span><span>{state.player.ammo} viên đạn</span></div><div className="inventory-use">{['battery', 'hay', 'beer', 'medicine', 'repairKit', 'strengthPotion', 'sunDoll'].map(id => {
    const usable = ['beer', 'medicine', 'repairKit', 'strengthPotion', 'sunDoll'].includes(id);
    const disabled = !usable || !state.inventory[id] || id === 'beer' && (state.player.energy >= 2 || state.phase === 'combat') || id === 'medicine' && state.player.hp >= 100 || id === 'repairKit' && (!state.player.armor || state.player.armor.durability === state.player.armor.maxDurability) || id === 'sunDoll' && (state.phase !== 'day' || state.farm.nextSunny) || id === 'strengthPotion' && state.player.damageBuff > 1;
    return <button key={id} disabled={disabled} onClick={() => { dispatch({ type: 'USE', item: id }); sound('click'); }} title={ITEMS[id].description}>{ITEMS[id].name}<strong>×{state.inventory[id]}</strong></button>;
  })}</div></div>;
}

export function NightInvestigation({ state, dispatch, penId }) {
  const available = dogAvailable(state);
  return <div className="night-tools"><div className="section-heading"><span>NĂNG LƯỢNG ĐIỀU TRA</span><strong>{state.energy}/2</strong></div><div className="energy-pips">{[0, 1].map(i => <span key={i} className={i < state.energy ? 'filled' : ''} />)}</div><p>Kiểm tra một bộ phận: −1. Cạo lông: −1 và một pin tông đơ. Mua pin với giá 2 xu/lần cạo.</p><button className="button secondary full" disabled={!available || state.phase !== 'night'} onClick={() => { dispatch({ type: 'DOG_SCAN', penId }); if (state.residents.some(a => a.wolf && !a.defeated && a.dogDetect && a.penId === penId)) sound('bark'); }}>Chó kiểm tra chuồng {penId === 0 ? 'A' : 'B'}<Icon name="eye" size={16} /></button><p className="small-note">{available ? 'Chó im lặng không bảo đảm an toàn: sói con không bị phát hiện.' : `Chó kiệt sức đến hết đêm ${state.dog.exhaustedThroughNight}.`}</p><div className="field-note"><span className="eyebrow">{state.fullMoon ? 'TRĂNG TRÒN' : 'GHI NHỚ CHỦ CŨ'}</span><p>{state.fullMoon ? 'Mọi sơ hở đều biến mất. Chỉ còn tiếng hú. Hãy cạo lớp lông.' : 'Chân quá to. Mắt đỏ. Răng nanh. Xương sườn. Chiếc bụng khác lạ.'}</p><small>Đã đuổi {state.defeated} sói · Đọc sổ tay để biết cả 6 loại</small></div></div>;
}

export function OwnerNotebook({ onClose }) {
  const [page, setPage] = useState('wolves');
  return <Modal title="Sổ tay chủ cũ · Có sẵn từ đầu" onClose={onClose} className="owner-book"><h2>Đừng tin một bộ lông trắng.</h2><div className="shop-tabs"><button className={page === 'wolves' ? 'active' : ''} onClick={() => setPage('wolves')}>Sáu loài sói</button><button className={page === 'rules' ? 'active' : ''} onClick={() => setPage('rules')}>Cách sống sót</button><button className={page === 'lore' ? 'active' : ''} onClick={() => setPage('lore')}>Lời người cũ</button></div>
    {page === 'wolves' && <div className="wolf-pages">{Object.values(WOLVES).map(w => <article key={w.id}><span className="eyebrow">TỪ ĐÊM {w.minNight}</span><h3>{w.name}</h3><p>{w.clue}</p><small>{w.mechanic}</small></article>)}<p className="guide-note">Trăng tròn mỗi 7 đêm: tất cả sói giấu hoàn toàn sơ hở và chỉ hú. Cạo lông vẫn xác định được chúng.</p></div>}
    {page === 'rules' && <div className="gdd-book-copy"><h3>Đi trong trại</h3><p>Bấm cảnh để khóa chuột, WASD đi, rê chuột để nhìn; Esc mở cài đặt, C cúi, F đèn pin. Điện thoại kéo cảnh để nhìn. Đến gần và nhấn E; Esc đứng dậy. Nút E trên màn hình cũng tương tác được. Ban ngày có thể xem cừu, ban đêm mới điều tra tốn năng lượng.</p><h3>Tiền cưới vợ</h3><p>Mỗi cừu lớn tạo 1 xu/ngày. Cừu con lớn sau 2 ngày. Ngày mưa cần cỏ khô hoặc mái che, nếu không sẽ không có thu nhập. Tích 200 xu rồi nhấn Bán trang trại để thắng.</p><h3>Hai điểm mỗi đêm</h3><p>Kiểm tra răng/chân/mắt/thân hoặc cạo lông tốn 1 năng lượng. Cạo cần một pin 2 xu. Bia hồi 2 năng lượng. Chó báo theo chuồng nhưng không phát hiện sói con.</p><h3>Attack · Items · Call Dog</h3><p>Canh thanh Attack. Nông cụ dùng vô hạn, cửa Critical hẹp; súng mạnh và dễ Critical nhưng tốn một viên mỗi phát. Khi sói đánh, di chuyển trái tim trong khung vuông bằng WASD/mũi tên hoặc kéo trên Canvas. Giáp mất độ bền trước HP, có bộ sửa giáp.</p><p>Call Dog: chó đỡ một đòn và tăng 20% sát thương trận đó. Đêm sau nó kiệt sức, không giúp tìm sói. Sói dại gây chảy máu; sói trắng che màn hình bằng sương từ giữa ra ngoài.</p><h3>Khi nào mất trại?</h3><p>Thua khi sói còn trong trại vượt quá 50% số cừu thật, hoặc khi bạn hết HP. Sói sống sót tích lũy sang đêm sau và tiếp tục ăn cừu. Chúng mạnh thêm mỗi 3 đêm.</p></div>}
    {page === 'lore' && <div className="gdd-book-copy"><p>“Tôi bán lại nơi này vì không còn phân biệt được tiếng cừu với tiếng sói.”</p><p>Bạn mua Trại Sương để kiếm tiền cưới vợ. Người dân bảo bầy sói trong rừng đã học cách giả làm cừu, chọn thời điểm và phối hợp săn mồi.</p><p>Ẩn dưới ánh trăng là Vị Thần Sói — một thực thể của sương mù. Chính nó ban nhận thức và khả năng ngụy trang cho bầy sói. Càng ở lâu, hình bóng ấy càng hiện rõ ở rìa rừng.</p><p>“Khi trăng tròn, đừng tìm mắt đỏ hay móng nhọn nữa. Hãy nghe tiếng hú, và giữ pin tông đơ.”</p></div>}
    <button className="button primary full" onClick={onClose}>Khép sổ<Icon name="book" /></button></Modal>;
}
