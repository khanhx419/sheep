/* ============================================================
 * ShopScreen.jsx — Cửa hàng cơ bản + Thương nhân lang thang
 * ============================================================ */

import { useGameState, useGameDispatch } from '../context/GameContext.jsx';
import { ITEMS, getShopItems } from '../data/items.js';

export default function ShopScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const basicItems = getShopItems('basic');

  // Merchant items (nếu có mặt)
  const merchantItems = state.merchant.present
    ? state.merchant.stock.map(s => ({
        ...ITEMS[s.itemId],
        stock: s.stock,
      })).filter(Boolean)
    : [];

  const handleBuy = (item) => {
    if (state.gold < item.price) return;

    // Nếu là giáp → equip luôn
    if (item.maxDurability) {
      dispatch({ type: 'BUY_ITEM', payload: { itemId: item.id, price: item.price } });
      dispatch({ type: 'EQUIP_ARMOR', payload: { itemId: item.id, maxDurability: item.maxDurability } });
      return;
    }

    // Nếu là đạn → reducer BUY_ITEM đã xử lý: trừ tiền + cộng player.ammo
    if (item.id === 'ammo') {
      dispatch({ type: 'BUY_ITEM', payload: { itemId: item.id, price: item.price } });
      return;
    }

    dispatch({ type: 'BUY_ITEM', payload: { itemId: item.id, price: item.price } });
  };

  const handleClose = () => {
    dispatch({ type: 'CLOSE_SHOP' });
  };

  const getItemCount = (itemId) => {
    const inv = state.inventory.find(i => i.itemId === itemId);
    return inv ? inv.quantity : 0;
  };

  return (
    <div>
      {/* HUD */}
      <div className="hud">
        <div className="hud-stat">
          <span className="icon">💰</span>
          <span className="text-gold">{state.gold} Xu</span>
        </div>
        <div className="hud-stat">
          <span className="icon">📅</span>
          <span>Ngày {state.day}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={handleClose}>
          ← Quay lại
        </button>
      </div>

      <div style={{ padding: 'var(--space-xl)', maxWidth: '900px', margin: '0 auto' }}>
        {/* Basic Shop */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-lg)' }}>
            🏪 Cửa Hàng Trang Trại
          </h2>
          <div className="shop-grid">
            {basicItems.map(item => (
              <div className="shop-item" key={item.id}>
                <div className="shop-item-name">{item.name}</div>
                <div className="shop-item-desc">{item.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span className="shop-item-price">💰 {item.price} Xu</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Có: {getItemCount(item.id)}
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '13px', padding: '6px 16px' }}
                  onClick={() => handleBuy(item)}
                  disabled={state.gold < item.price}
                >
                  Mua
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Merchant */}
        {state.merchant.present && (
          <div className="animate-slide-up">
            <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-md)', color: 'var(--accent-purple)' }}>
              🧙 Thương Nhân Bí Ẩn
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontStyle: 'italic' }}>
              "Ta có những thứ ngươi cần... với cái giá phải chăng."
            </p>
            <div className="shop-grid">
              {merchantItems.map(item => (
                <div className="shop-item" key={item.id} style={{ borderColor: 'rgba(177, 151, 252, 0.2)' }}>
                  <div className="shop-item-name" style={{ color: 'var(--accent-purple)' }}>{item.name}</div>
                  <div className="shop-item-desc">{item.description}</div>
                  {item.maxDurability && (
                    <div style={{ fontSize: '11px', color: 'var(--accent-blue)' }}>
                      🛡️ Độ bền: {item.maxDurability}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span className="shop-item-price">💰 {item.price} Xu</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Còn: {item.stock}
                    </span>
                  </div>
                  <button
                    className="btn btn-warning"
                    style={{ fontSize: '13px', padding: '6px 16px' }}
                    onClick={() => handleBuy(item)}
                    disabled={state.gold < item.price || item.stock <= 0}
                  >
                    Mua
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory */}
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: 'var(--space-md)' }}>🎒 Trang Bị Hiện Tại</h3>
          <div className="card">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>⚔️ Vũ khí: {state.player.weapon === 'gun' ? `Súng (${state.player.ammo} đạn)` : 'Nông cụ'}</div>
              <div>🛡️ Giáp: {state.player.armor
                ? `${ITEMS[state.player.armor.itemId]?.name || 'Giáp'} — ${state.player.armor.durability}/${state.player.armor.maxDurability}`
                : 'Không có'}</div>
              <div>❤️ HP: {state.player.hp}/{state.player.maxHp}</div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
              {state.inventory.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Túi đồ trống</div>
              ) : (
                state.inventory.map(inv => (
                  <div key={inv.itemId}>
                    📦 {ITEMS[inv.itemId]?.name || inv.itemId} × {inv.quantity}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sell Farm (Win condition) */}
        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
          <button
            className="btn btn-success btn-lg"
            onClick={() => dispatch({ type: 'SELL_FARM' })}
            disabled={state.gold < state.targetGold}
            style={{ width: '100%', maxWidth: '320px' }}
          >
            💰 Bán trang trại ({state.targetGold} Xu)
          </button>
          {state.gold < state.targetGold && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Cần thêm {state.targetGold - state.gold} Xu để bán trang trại
            </p>
          )}
          {state.gold >= state.targetGold && (
            <p style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '8px' }} className="animate-pulse">
              ✨ Đủ tiền rồi! Bán trang trại để chiến thắng!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
