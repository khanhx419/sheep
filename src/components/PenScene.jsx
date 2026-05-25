const IMAGE_BASE = '/assets/images';

const TELL_SIGNAL_MAP = {
  paws: 'signal-paws',
  red_eyes: 'signal-red-eyes',
  ribs: 'signal-ribs',
  teeth: 'signal-teeth',
  drool: 'signal-drool',
};

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizeSeed(seed, salt = 0) {
  const hashed = (seed ^ (salt * 2654435761)) >>> 0;
  return (hashed % 1000) / 1000;
}

function getResidentSprite(resident) {
  if (resident.age === 'baby') {
    return `${IMAGE_BASE}/sheep_baby.svg`;
  }
  if (resident.isSheared) {
    return `${IMAGE_BASE}/sheep_sheared.svg`;
  }
  return `${IMAGE_BASE}/sheep_adult.svg`;
}

function getResidentPlacement(resident, penId, index, total) {
  const seed = hashString(`${resident.id}-${penId}-${resident.fakeSheepId || ''}`);
  const columns = total >= 6 ? 4 : 3;
  const row = Math.floor(index / columns);
  const col = index % columns;
  const baseX = 18 + (col / Math.max(columns - 1, 1)) * 64;
  const baseY = 32 + row * 24;

  return {
    x: Math.min(86, baseX + normalizeSeed(seed, 1) * 10 - 5),
    y: Math.min(82, baseY + normalizeSeed(seed, 2) * 12 - 6),
    wanderX: `${Math.round(normalizeSeed(seed, 3) * 20 - 10)}px`,
    wanderY: `${Math.round(normalizeSeed(seed, 4) * 10 - 5)}px`,
    scale: resident.age === 'baby' ? 0.82 : resident.isSheared ? 0.94 : 1,
    delay: `${(normalizeSeed(seed, 5) * 3.6).toFixed(2)}s`,
    wanderDuration: `${(6 + normalizeSeed(seed, 6) * 5).toFixed(2)}s`,
    grazeDuration: `${(2.3 + normalizeSeed(seed, 7) * 2.4).toFixed(2)}s`,
    shadowScale: resident.tells?.includes('paws') ? 1.35 : 1,
    zIndex: 10 + Math.round(baseY),
  };
}

function getResidentSignals(resident) {
  if (!resident._isWolf || !resident.tells?.length) return [];
  return resident.tells.map((tell) => TELL_SIGNAL_MAP[tell]).filter(Boolean);
}

function getResidentLabel(resident) {
  if (!resident._isWolf) {
    if (resident.age === 'baby') return 'Cuu con';
    if (resident.isSheared) return 'Cuu da cat long';
    return 'Cuu truong thanh';
  }

  const clues = [];
  if (resident.tells?.includes('paws')) clues.push('chan nang');
  if (resident.tells?.includes('red_eyes')) clues.push('mat do');
  if (resident.tells?.includes('ribs')) clues.push('lo xuong');
  if (resident.tells?.includes('teeth')) clues.push('rang nhon');
  if (resident.tells?.includes('drool')) clues.push('chay dai');

  return clues.length > 0 ? `Con vat kha la: ${clues.join(', ')}` : 'Con vat kha la';
}

export default function PenScene({
  residents,
  backgroundImage,
  interactive = false,
  selectedId = null,
  onSelect = null,
  emptyLabel = 'Chuong trong',
  className = '',
}) {
  return (
    <div
      className={`pen-scene ${interactive ? 'pen-scene-interactive' : ''} ${className}`.trim()}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {residents.length === 0 && <span className="pen-empty-label">{emptyLabel}</span>}

      {residents.map((resident, index) => {
        const placement = getResidentPlacement(
          resident,
          resident.penId ?? 'pen',
          index,
          residents.length
        );
        const signals = getResidentSignals(resident);
        const classes = [
          'pen-resident',
          resident.age === 'baby' ? 'resident-baby' : 'resident-adult',
          resident.isSheared ? 'resident-sheared' : '',
          resident._isWolf ? 'resident-suspect' : '',
          selectedId === resident.id ? 'is-selected' : '',
        ].filter(Boolean).join(' ');

        const content = (
          <>
            <span className="resident-shadow" />
            <img className="resident-sprite" src={getResidentSprite(resident)} alt="" draggable="false" />
            {signals.map((signal) => (
              <span key={`${resident.id}-${signal}`} className={`resident-signal ${signal}`} />
            ))}
          </>
        );

        const style = {
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          zIndex: placement.zIndex,
          '--wander-x': placement.wanderX,
          '--wander-y': placement.wanderY,
          '--resident-scale': placement.scale,
          '--wander-duration': placement.wanderDuration,
          '--graze-duration': placement.grazeDuration,
          '--delay': placement.delay,
          '--shadow-scale': placement.shadowScale,
        };

        if (interactive) {
          return (
            <button
              key={resident.id}
              type="button"
              className={classes}
              style={style}
              onClick={() => onSelect?.(resident)}
              title={getResidentLabel(resident)}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={resident.id}
            className={classes}
            style={style}
            title={getResidentLabel(resident)}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
