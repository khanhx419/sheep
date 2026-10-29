import LanguageSelect from './LanguageSelect.jsx';
import { tr, useLanguage, setLanguage } from './i18n.js';
import { flushSync } from 'react-dom';
import { useEffect, useReducer, useRef, useState } from 'react';
import { gameReducer, newGame, readSave, SAVE_KEY, dogAvailable, farmAnimals, merchantAvailable } from './rules.js';
import { ambience, setMuted, unlockAudio } from './audio.js';
import { Animal, Modal } from './ui.jsx';
import FirstPersonScene, { FieldInspection } from './FirstPersonScene.jsx';
import { Reveal } from './Encounter.jsx';
import PveCombat from './PveCombat.jsx';
import { FarmDayPhase, Inventory, NightInvestigation } from './PhasePanels.jsx';
import FarmActivities from './FarmActivities.jsx';
import InGameHUD from './InGameHUD.jsx';
import MysticBalance from './MysticBalance.jsx';
import './game.css';
import './gdd.css';
import './immersive.css';
import './visualUpgrade.css';
import './quietFarm.css';

export default function GameApp() {
  const language = useLanguage();
  useEffect(() => { setLanguage(language); }, [language]);
  const [state, dispatch] = useReducer(gameReducer, null, () => readSave() || newGame());
  const [started, setStarted] = useState(false), [panel, setPanel] = useState(null), [selected, select] = useState(null), [part, setPart] = useState(null);
  const [muted, changeMuted] = useState(false), [sensitivity, setSensitivity] = useState(1), [saveError, setSaveError] = useState(false);
  const root = useRef(null), controls = useRef(null);
  const night = ['night', 'reveal', 'combat'].includes(state.phase), busy = ['reveal', 'combat'].includes(state.phase), terminal = ['win', 'lose'].includes(state.phase);
  useEffect(() => { if (!started) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); setSaveError(false); } catch { setSaveError(true); } }, [state, started]);
  useEffect(() => { setMuted(muted); }, [muted]);
  useEffect(() => { if (started) ambience(night); return () => ambience(false); }, [started, night]);
  useEffect(() => { select(null); setPart(null); setPanel(null); }, [state.phase, state.day]);
  useEffect(() => { if (!started || state.phase !== 'day' || panel) return; const timer = setInterval(() => { if (!document.hidden) dispatch({ type: 'GRAZE' }); }, 1000); return () => clearInterval(timer); }, [started, state.phase, panel]);
  function fullscreen() { root.current?.requestFullscreen?.()?.catch(() => {}); }
  function begin(fresh) { fullscreen(); unlockAudio(); flushSync(() => { if (fresh) dispatch({ type: 'NEW' }); setStarted(true); setPanel(null); }); controls.current?.lock(); }
  function close() { flushSync(() => { setPanel(null); select(null); }); controls.current?.lock(); }
  function open(value) { if (['shop', 'mystic'].includes(value) && !merchantAvailable(state)) return; setPanel(value); }
  const animals = farmAnimals(state);
  const animal = animals.find(a => a.id === selected);
  return <div className={`game-app immersive quiet-farm ${started ? 'is-playing' : ''} ${night ? 'night-mode' : 'day-mode'}`} ref={root}>
    {tr(!started ? <main className="landing"><div className="landing-art" /><div className="landing-shade" /><div className="landing-copy"><span className="eyebrow">TRẠI SƯƠNG</span><h1>Kiếm tiền.<br />Đếm cừu.<br /><em>Đừng tin sói.</em></h1><p>Một trang trại sát rừng. Một lời hứa trở về.</p><LanguageSelect compact/><div className="landing-buttons"><button className="button primary" onClick={() => begin(!readSave())}>{readSave() ? 'Tiếp tục câu chuyện' : 'Nhận chìa khóa trang trại'}</button>{readSave() && <button className="button secondary" onClick={() => setPanel('new')}>Chơi lại</button>}</div></div><div className="landing-sheep"><Animal large /></div></main> : <main className="game-viewport"><div className="barn-scene fp-container">
      <FirstPersonScene animals={animals} night={night} difficulty={state.difficulty} suspended={busy} onAction={(type, details = {}) => dispatch({ type, ...details })} controlsRef={controls} sensitivity={sensitivity} movementMultiplier={state.player.speedBuff} onSettings={() => open('settings')} onMenu={open} paused={!!panel || terminal || busy} selectedId={selected} inspectionPart={part} onSelect={id => { select(id); setPart(null); }} farm={{ ...state.farm, dogReady: dogAvailable(state), dogScan: state.dog.lastScan }} deityStage={state.deityStage} dogSignals={[]} fullMoon={state.fullMoon} merchantPresent={state.merchant.present} onMerchant={() => open('mystic')}>
        {animal && !busy && <FieldInspection key={animal.id} animal={animal} state={state} dispatch={dispatch} part={part} onPart={setPart} onClose={close} />}
        {state.phase === 'reveal' && <Reveal dispatch={dispatch} wolf={state.residents.find(s => s.id === state.activeId)} />}
        {state.phase === 'combat' && <PveCombat state={state} dispatch={dispatch} />}
      </FirstPersonScene></div><InGameHUD state={state} night={night} busy={busy || terminal} onSettings={() => open('settings')} />
    </main>)}
    {tr(panel === 'shop' && <Modal title="Quầy nông trại" className="camp-menu shop-modal" onClose={close}><FarmDayPhase state={state} dispatch={dispatch} /></Modal>)}
    {tr(panel === 'mystic' && <Modal title="Thương nhân bí ẩn" className="camp-menu charm-modal" onClose={close}><MysticBalance state={state} dispatch={dispatch} /></Modal>)}
    {tr(panel === 'inventory' && <Modal title="Túi đồ" className="camp-menu" onClose={close}><Inventory state={state} dispatch={dispatch} /></Modal>)}
    {tr(['home', 'farm'].includes(panel) && <Modal title={panel === 'home' ? 'Nhà chủ trại · Giường nghỉ' : 'Sinh hoạt trang trại'} className="camp-menu" onClose={close}><FarmActivities state={state} dispatch={dispatch} />{night && <NightInvestigation state={state} dispatch={dispatch} penId={0} />}<button className="button primary full" onClick={() => dispatch({ type: night ? 'DAWN' : 'NIGHT' })}>{night ? 'Kết thúc ca gác · Đón bình minh' : 'Nghỉ đến tối · Bắt đầu canh gác'}</button>{night && <p className="modal-copy">Bỏ qua ca gác vẫn tính sói ăn cừu.</p>}{!night && <button className="button secondary full" disabled={state.gold < state.targetGold} onClick={() => dispatch({ type: 'SELL' })}>Bán trang trại · {state.gold}/{state.targetGold}</button>}</Modal>)}
    {tr(panel === 'guide' && <Modal title="Biển hướng dẫn Trại Sương" className="camp-menu" onClose={close}><h2>Chăm đàn ban ngày. Canh sói ban đêm.</h2><div className="guide-copy"><p>WASD đi lại · chuột nhìn · E tương tác ở gần · F đèn pin · Ctrl phải mở chuột · Esc cài đặt.</p><p>Mở cửa cho cừu ra bãi khi trời nắng. Độ no tăng khi chúng gặm cỏ. Ngày mưa cần cỏ khô trong kho hoặc mua từ người bán.</p><p>Đi tới bãi cỏ riêng phía đông, bước vào luống và nhấn E để cắt. Mỗi ngày nắng có 2 luống, mỗi luống được 2 bó cỏ khô; cỏ mọc lại sáng hôm sau. Mỗi ngày có 25% khả năng mưa, độc lập với những ngày trước.</p><p>Giường ở nhà: nghỉ đến tối hoặc ngủ đến sáng. Thương nhân ghé ban ngày của ngày 1, 3, 5…; ngày nghỉ sẽ không có gian hàng. Tab mở sinh hoạt, I mở túi đồ.</p><p>Đánh sói: WASD di chuyển, J tấn công, K đỡ, Space né. Bùa nổ: R, dịch chuyển: Q khi có bùa trong túi. Thương nhân bí ẩn có cân bùa: chọn Thấp (3–11), Giữa (12) hoặc Cao (13–18), tung ba xúc xắc giá 5 Xu rồi kéo bát trong popup để xem; đúng ×2 may mắn, trượt ×1. Chọn 1–12 Xu đặt lên cân, cân được nhiều lần mỗi ngày. Đĩa Xu cân bằng hoặc nặng hơn sẽ nhận bùa ngẫu nhiên; VIP rất hiếm. Canh lúc sói hồi chiêu để phản đòn; đỡ đúng lúc tránh toàn bộ sát thương.</p><p>H gọi Shiba kiểm tra chuồng. Chó nghỉ hết đêm đó và sáng mai hồi phục; khi không kiểm tra sẽ tự hỗ trợ chiến đấu.</p><p>Tông đơ an toàn 2 lần đầu; từ lần 3 có xác suất hỏng tăng dần. Mỗi lần cạo vẫn dùng một pin.</p></div></Modal>)}
    {tr(panel === 'settings' && <Modal title="Cài đặt" onClose={close}><h2>Tạm nghỉ.</h2><LanguageSelect/><label className="settings-field">Độ khó<select aria-label="Độ khó" value={state.difficulty} onChange={e => dispatch({ type: 'DIFFICULTY', value: e.target.value })}><option value="easy">Dễ · Cừu miễn sát thương trong trận</option><option value="normal">Thường · Cừu chịu nhiều đòn mới chết</option><option value="hard">Khó · Sói gây sát thương cao hơn</option></select></label><label className="settings-field">Độ nhạy chuột · {sensitivity.toFixed(1)}<input aria-label="Độ nhạy chuột" type="range" min=".2" max="2" step=".1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} /></label><div className="settings-links"><button className="button secondary" onClick={() => open('farm')}>Sinh hoạt</button><button className="button secondary" onClick={() => open('inventory')}>Túi đồ</button><button className="button secondary" onClick={() => open('guide')}>Biển hướng dẫn</button><button className="button secondary" onClick={fullscreen}>Toàn màn hình</button><button className="button secondary" onClick={() => changeMuted(v => !v)}>{muted ? 'Bật âm thanh' : 'Tắt âm thanh'}</button><button className="button secondary" onClick={() => { setPanel(null); setStarted(false); }}>Màn hình chính</button></div>{saveError && <p>Không thể lưu tiến trình trong trình duyệt này.</p>}<button className="button primary full" onClick={close}>Tiếp tục chơi</button></Modal>)}
    {tr(panel === 'new' && <Modal title="Chơi lại" onClose={() => setPanel(null)}><p className="modal-copy">Thay bản lưu hiện tại bằng trang trại mới?</p><button className="button primary full" onClick={() => begin(true)}>Bắt đầu lại</button></Modal>)}
    {tr(terminal && started && <Modal title={state.phase === 'win' ? 'Ngày trở về' : 'Mất trang trại'}><h2>{state.phase === 'win' ? 'Giữ được lời hứa.' : 'Sương đã nuốt mất trại.'}</h2><p className="modal-copy">{state.report}</p><button className="button primary full" onClick={() => begin(true)}>Một câu chuyện mới</button><button className="button secondary full" onClick={() => setStarted(false)}>Màn hình chính</button></Modal>)}
  </div>;
}
