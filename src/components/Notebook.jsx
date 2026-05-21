/* ============================================================
 * Notebook.jsx — Sổ Tay Chủ Cũ (Wolf Lore Book)
 * 
 * Modal hiển thị thông tin các loại sói đã phát hiện.
 * Đọc từ state.notebookUnlocked, map với WOLF_TYPES.
 * ============================================================ */

import { useGameState } from '../context/GameContext.jsx';
import { WOLF_TYPES } from '../data/wolfTypes.js';

export default function Notebook({ onClose }) {
  const state = useGameState();

  const unlockedWolves = state.notebookUnlocked
    .map(id => WOLF_TYPES[id])
    .filter(Boolean);

  // Tổng số loài sói trong game
  const totalWolfTypes = Object.keys(WOLF_TYPES).length;

  // Map phương pháp phát hiện
  const tellLabels = {
    paws: '🐾 Chân to bất thường',
    red_eyes: '👀 Mắt đỏ ngầu',
    drool: '🤤 Chảy dãi',
    teeth: '🦷 Răng nhọn',
    ribs: '🦴 Xương sườn lộ',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal notebook-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📖 Sổ Tay Chủ Cũ
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {unlockedWolves.length}/{totalWolfTypes} loài
            </span>
            <button
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: '4px 12px', fontSize: '13px' }}
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* Intro */}
        <div style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          marginBottom: 'var(--space-lg)',
          lineHeight: 1.6,
          padding: 'var(--space-md)',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '3px solid var(--accent-purple)',
        }}>
          "Ghi chép của người chủ cũ... Những gì ta biết về bầy sói quỷ quyệt
          này đều nằm trong cuốn sổ tay cũ kỹ, ố vàng. Mỗi loài sói đều có
          điểm yếu — hãy tìm ra chúng."
        </div>

        {/* Wolf entries */}
        {unlockedWolves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
            Chưa phát hiện loài sói nào. Hãy điều tra trong đêm!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {unlockedWolves.map((wolf, index) => (
              <div
                key={wolf.id}
                className="card animate-slide-up"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  borderLeft: `3px solid ${wolf.color}`,
                  background: 'var(--bg-card)',
                }}
              >
                {/* Wolf header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {/* Color indicator */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: wolf.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: `0 0 12px ${wolf.color}40`,
                    }}>
                      🐺
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{wolf.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Xuất hiện từ đêm {wolf.minNight}
                      </div>
                    </div>
                  </div>
                  {wolf.statusEffect && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 107, 107, 0.15)',
                      color: 'var(--accent-red)',
                      fontWeight: 600,
                    }}>
                      ⚠️ {wolf.statusEffect === 'bleed' ? 'Gây chảy máu' : wolf.statusEffect}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
                  {wolf.description}
                </p>

                {/* Stats grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-md)',
                }}>
                  <div className="notebook-stat">
                    <span className="notebook-stat-label">❤️ HP</span>
                    <span className="notebook-stat-value">{wolf.hp}</span>
                  </div>
                  <div className="notebook-stat">
                    <span className="notebook-stat-label">⚔️ DMG</span>
                    <span className="notebook-stat-value">{wolf.damage}</span>
                  </div>
                  <div className="notebook-stat">
                    <span className="notebook-stat-label">💨 Tốc độ</span>
                    <span className="notebook-stat-value">×{wolf.speed}</span>
                  </div>
                  <div className="notebook-stat">
                    <span className="notebook-stat-label">🎯 Né</span>
                    <span className="notebook-stat-value">{Math.round(wolf.evasion * 100)}%</span>
                  </div>
                </div>

                {/* Tells & Disguise */}
                <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Ngụy trang: </span>
                    <span style={{ color: 'var(--accent-yellow)' }}>
                      {wolf.disguise === 'adult' ? '🐑 Cừu lớn' :
                       wolf.disguise === 'baby' ? '🐣 Cừu con' :
                       wolf.disguise === 'sheared' ? '✂️ Cừu cạo lông' : wolf.disguise}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Manh mối: </span>
                    <span style={{ color: 'var(--accent-green)' }}>
                      {wolf.tells.map(t => tellLabels[t] || t).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Dog detection */}
                <div style={{ fontSize: '12px', marginTop: 'var(--space-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chó phát hiện: </span>
                  <span style={{ color: wolf.dogDetect ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {wolf.dogDetect ? '✅ Có' : '❌ Không'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Locked entries */}
        {unlockedWolves.length < totalWolfTypes && (
          <div style={{
            marginTop: 'var(--space-lg)',
            padding: 'var(--space-md)',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              🔒 Còn {totalWolfTypes - unlockedWolves.length} loài sói chưa được khám phá...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
