import { flushSync } from 'react-dom';
import { useEffect, useReducer, useRef, useState } from 'react';
import { gameReducer, newGame, readSave, SAVE_KEY, makeResidents, dogAvailable, SHEEP_NAMES } from './game/rules.js';
import { ambience, setMuted, sound, unlockAudio } from './game/audio.js';
import { Animal, Icon, Modal } from './game/ui.jsx';
import { Reveal } from './game/Encounter.jsx';
import CombatPhase from './game/BulletCombat.jsx';
import FirstPersonScene, { FieldInspection } from './game/FirstPersonScene.jsx';
import { FarmDayPhase, NightInvestigation, Inventory, OwnerNotebook } from './game/PhasePanels.jsx';
import './game/game.css';
import './game/gdd.css';
import './game/immersive.css';
import './game/visualUpgrade.css';
import InGameHUD from './game/InGameHUD.jsx';
import FarmActivities from './game/FarmActivities.jsx';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, () => readSave() || newGame());
  const [started, setStarted] = useState(false), [hasSave, setHasSave] = useState(() => !!readSave());
  const [muted, changeMuted] = useState(false), [guide, setGuide] = useState(false), [journal, setJournal] = useState(false);
  const [selected, select] = useState(null), [part, setPart] = useState(null), [penId, setPen] = useState(0);
  const [finish, setFinish] = useState(false), [newConfirm, setNewConfirm] = useState(false), [saveError, setSaveError] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false), [menu, setMenu] = useState(null);
  const gameRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  function enterFullscreen() { const result = gameRef.current?.requestFullscreen?.(); result?.catch(() => {}); }
  useEffect(() => { const update = () => setFullscreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update); }, []);
  function closeMenu() { flushSync(() => { setMenu(null); setGuide(false); setJournal(false); setMerchantOpen(false); }); controlsRef.current?.lock(); }
  const sceneRef = useRef(null), controlsRef = useRef(null);
  const [settings, setSettings] = useState(false), [sensitivity, setSensitivity] = useState(1);
  function resumeGame() { flushSync(() => setSettings(false)); controlsRef.current?.lock(); }
  const night = ['night', 'reveal', 'combat'].includes(state.phase), terminal = ['win', 'lose'].includes(state.phase);
  useEffect(() => {
    if (!started) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); setHasSave(true); setSaveError(false); } catch { setSaveError(true); }
  }, [state, started]);
  useEffect(() => { setMuted(muted); }, [muted]);
  useEffect(() => { if (started) ambience(night); return () => ambience(false); }, [started, night]);
  useEffect(() => { select(null); setPart(null); setMenu(null); setFinish(false); }, [state.phase, state.day]);
  useEffect(() => {
    if (!started) return;
    if (['combat', 'reveal'].includes(state.phase)) sceneRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.phase, started]);
  function begin(fresh) { enterFullscreen(); unlockAudio(); sound('click'); flushSync(() => { if (fresh) dispatch({ type: 'NEW' }); setStarted(true); setNewConfirm(false); if (!hasSave || fresh) setGuide(true); }); controlsRef.current?.lock(); }
  function startNight() { dispatch({ type: 'NIGHT', residents: makeResidents(state.day, state.flock, Math.random, { wolves: state.wolves, divided: state.farm.divided }) }); }
  const animals = night ? state.residents.filter(a => !a.defeated) : state.flock.map((a, i) => ({ ...a, name: SHEEP_NAMES[i % SHEEP_NAMES.length], wolf: false, checked: [] }));
  const animal = animals.find(a => a.id === selected);
  const dogSignals = [0, 1].map(pen => night && dogAvailable(state) && state.residents.some(a => a.wolf && !a.defeated && a.dogDetect && a.penId === pen));
  const busy = ['reveal', 'combat'].includes(state.phase);

  return <div ref={gameRef} className={`game-app immersive ${started ? 'is-playing' : ''} ${night ? 'night-mode' : 'day-mode'}`}>
    {!started && <header className="topbar"><button className="brand" onClick={() => setStarted(false)} aria-label="Về màn hình chính"><span className="brand-mark"><Icon name="sheep" size={27} /></span><span>DƯỚI LỚP LÔNG<small>TRẠI SƯƠNG · LỜI HỨA NGÀY TRỞ VỀ</small></span></button><div className="topbar-right"><span className="chapter-label">KIẾM TIỀN CƯỚI VỢ. GIỮ TRẠI QUA ĐÊM.</span><button className="icon-button" disabled={started && busy} onClick={() => setGuide(true)} aria-label="Sổ tay chủ cũ"><Icon name="book" /></button><button className="icon-button" onClick={() => { unlockAudio(); changeMuted(v => !v); }} aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}><Icon name={muted ? 'mute' : 'sound'} /></button></div></header>}
    {!started ? <main className="landing"><div className="landing-art" /><div className="landing-shade" /><div className="landing-copy"><span className="eyebrow"><i className="live-dot" />TRẠI NHỎ. MỘT LỜI HỨA LỚN.</span><h1>Kiếm tiền.<br />Đếm cừu.<br /><em>Đừng tin sói.</em></h1><p>Bạn mua trang trại để dành tiền cưới vợ.<br />Bầy sói đã học cách khoác lông cừu.<br />Trong rừng, một vị thần đang dần thức giấc.</p><div className="landing-buttons"><button className="button primary" onClick={() => begin(!hasSave)}>{hasSave ? 'Tiếp tục câu chuyện' : 'Nhận chìa khóa trang trại'}<Icon name="arrow" /></button>{hasSave && <button className="button secondary" onClick={() => setNewConfirm(true)}>Chơi lại từ đầu</button>}</div><span className="landing-caption">TÍCH 200 XU RỒI BÁN TRẠI <span>✦</span> GÓC NHÌN THỨ NHẤT</span></div><div className="landing-sheep"><Animal large /><span>Bộ lông không kể hết mọi chuyện.</span></div><div className="landing-bottom"><span>SÓI ĐÃ HỌC CÁCH NGHĨ. BẠN PHẢI HỌC CÁCH NHÌN.</span><button onClick={() => setGuide(true)}>Sổ tay chủ cũ<Icon name="book" size={16} /></button></div></main> : <>
      <main className="game-viewport"><div className="barn-scene fp-container" ref={sceneRef}>
        <FirstPersonScene animals={animals} night={night} suspended={busy} onAction={type => dispatch({ type })} controlsRef={controlsRef} sensitivity={sensitivity} onSettings={() => setSettings(true)} onMenu={setMenu} paused={!!menu || settings || guide || journal || finish || newConfirm || merchantOpen || terminal || busy} selectedId={selected} inspectionPart={part} onSelect={id => { select(id); setPart(null); }} farm={state.farm} deityStage={state.deityStage} dogSignals={dogSignals} fullMoon={state.fullMoon} onPenChange={setPen} merchantPresent={state.merchant.present} onMerchant={() => setMerchantOpen(true)}>
          {animal && ['day', 'night'].includes(state.phase) && <FieldInspection key={animal.id} animal={animal} state={state} dispatch={dispatch} part={part} onPart={setPart} onClose={() => { flushSync(() => select(null)); controlsRef.current?.lock(); }} />}
          {state.phase === 'reveal' && <Reveal dispatch={dispatch} wolf={state.residents.find(a => a.id === state.activeId)} />}
          {state.phase === 'combat' && <CombatPhase state={state} dispatch={dispatch} />}
        </FirstPersonScene>
      </div><InGameHUD state={state} night={night} busy={busy || terminal} saveError={saveError} onMenu={setMenu} onSettings={() => setSettings(true)} />
      </main>
    </>}
    {!started && <footer className="footer"><span>DƯỚI LỚP LÔNG <i>·</i> TRẠI SƯƠNG</span><span>Còn một lời hứa đợi ngày trở về.</span></footer>}
    {menu && <Modal title={menu === 'inventory' ? 'Túi đồ' : 'Quản lý trang trại'} onClose={closeMenu} className="camp-menu"><div className="shop-tabs"><button className={menu === 'farm' ? 'active' : ''} onClick={() => setMenu('farm')}>Trang trại · Tab</button><button className={menu === 'inventory' ? 'active' : ''} onClick={() => setMenu('inventory')}>Túi đồ · I</button></div>{menu === 'inventory' ? <Inventory state={state} dispatch={dispatch} /> : <>{night ? <NightInvestigation state={state} dispatch={dispatch} penId={penId} /> : <FarmDayPhase state={state} dispatch={dispatch} />}<div className="sidebar-bottom"><button className="button primary full" disabled={busy || terminal} onClick={() => { setMenu(null); if (night) setFinish(true); else { startNight(); } }}>{night ? 'Chờ đến bình minh' : 'Thắp đèn · Bắt đầu đêm'}<Icon name={night ? 'sun' : 'moon'} size={18} /></button>{!night && <button className="button sell-button full" disabled={state.gold < state.targetGold || terminal} onClick={() => { setMenu(null); dispatch({ type: 'SELL' }); sound('win'); }}>Bán trang trại · {state.gold}/{state.targetGold} xu</button>}</div></>}<button className="button secondary full" onClick={closeMenu}>Trở lại trại</button></Modal>}
    {settings && <Modal title="Cài đặt" onClose={resumeGame}><h2>Tạm dừng trong trại.</h2><p className="modal-copy">Chuột luôn khóa khi chơi. Ctrl phải mở/khóa chuột. Esc mở cài đặt.</p><label className="modal-copy" style={{ display: 'block' }}>Độ nhạy chuột · {sensitivity.toFixed(1)}×<input aria-label="Độ nhạy chuột" type="range" min="0.2" max="2" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} style={{ display: 'block', width: '100%', margin: '16px 0' }} /></label><div className="settings-links"><button className="button secondary" onClick={() => { setSettings(false); setMenu('farm'); }}>Trang trại</button><button className="button secondary" onClick={() => { setSettings(false); setMenu('inventory'); }}>Túi đồ</button><button className="button secondary" onClick={() => { setSettings(false); setGuide(true); }}>Sổ tay</button><button className="button secondary" onClick={() => { setSettings(false); setJournal(true); }}>Nhật ký</button><button className="button secondary" onClick={enterFullscreen}>{fullscreen ? 'Đang toàn màn hình' : 'Toàn màn hình'}</button><button className="button secondary" onClick={() => { setSettings(false); setStarted(false); }}>Màn hình chính</button></div><div className="inspect-actions"><button className="button secondary" onClick={() => changeMuted(v => !v)}>{muted ? 'Bật âm thanh' : 'Tắt âm thanh'}</button><button className="button primary" onClick={resumeGame}>Tiếp tục chơi</button></div></Modal>}
    {guide && <OwnerNotebook onClose={closeMenu} />}
    {merchantOpen && <Modal title="Người khách trong sương" onClose={closeMenu}><h2>Chuẩn bị cho đêm dài.</h2><p className="modal-copy">Bạn có {state.gold} xu. Mua giáp, đạn hoặc vật phẩm sinh tồn.</p><FarmDayPhase key="merchant-visit" state={state} dispatch={dispatch} initialShop="merchant" /></Modal>}
    {journal && <Modal title="Nhật ký chủ trại" onClose={closeMenu}><h2>Trong sương có ai đang nhìn?</h2><p className="modal-copy">Ngày {state.day} · Tiến hóa bậc {Math.floor((state.day - 1) / 3)} · Đã đuổi {state.defeated} sói.<br />{state.deityStage < 0.2 ? 'Sương trong rừng chỉ mới có hình thù mơ hồ.' : state.deityStage < 0.6 ? 'Đôi tai và đôi mắt của một thực thể đang hiện ra sau màn sương.' : 'Vị Thần Sói đã hiện rõ. Bầy sói không còn săn một cách tình cờ.'}</p><div className="journal-entries">{state.log.length ? state.log.map((line, i) => <p key={i}>{line}</p>) : <p>Chưa có đêm nào trôi qua.</p>}</div></Modal>}
    {finish && <Modal title="Kết thúc ca gác" onClose={() => setFinish(false)}><h2>Đợi trời sáng?</h2><p className="modal-copy">Sói bỏ sót ở lại trại và tiếp tục ăn cừu. Khi số sói vượt quá một nửa số cừu thật, bạn mất trang trại. Nâng cấp hàng rào không tự đuổi sói đang ẩn trong đàn.</p><div className="inspect-actions"><button className="button secondary" onClick={() => setFinish(false)}>Kiểm tra tiếp</button><button className="button primary" onClick={() => { select(null); setFinish(false); dispatch({ type: 'DAWN' }); sound('buy'); }}>Đón bình minh<Icon name="sun" /></button></div></Modal>}
    {newConfirm && <Modal title="Một câu chuyện mới" onClose={() => setNewConfirm(false)}><h2>Nhận lại trại từ đầu?</h2><p className="modal-copy">Bản lưu hiện tại sẽ được thay bằng một trang trại mới.</p><div className="inspect-actions"><button className="button secondary" onClick={() => setNewConfirm(false)}>Giữ tiến trình</button><button className="button primary" onClick={() => begin(true)}>Chơi lại</button></div></Modal>}
    {terminal && started && <Modal title={state.phase === 'win' ? 'Ngày trở về' : 'Mất trang trại'} className="ending"><div className="ending-icon"><Icon name={state.phase === 'win' ? 'sun' : 'moon'} size={48} /></div><h2>{state.phase === 'win' ? 'Giữ được lời hứa.' : 'Sương đã nuốt mất trại.'}</h2><p className="modal-copy">{state.report}</p><div className="ending-stats"><span>{state.day}<small>NGÀY SINH TỒN</small></span><span>{state.defeated}<small>SÓI ĐÃ ĐUỔI</small></span><span>{state.gold}<small>XU MANG VỀ</small></span></div><button className="button primary full" onClick={() => begin(true)}>Một câu chuyện mới<Icon name="arrow" /></button><button className="journal-button" onClick={() => setStarted(false)}>Về màn hình chính</button></Modal>}
  </div>;
}
