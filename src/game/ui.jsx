import { tr } from './i18n.js';
import './readableTheme.css';
import { useEffect, useRef } from 'react';
export const ART = '/assets/art';
export function Icon({ name, size = 20 }) {
  const paths = {
    moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    heart: <path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z" />,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M12 6v12m3-10h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" /></>,
    sheep: <><path d="M6 8a3 3 0 0 1 5-3 3 3 0 0 1 5 2 4 4 0 0 1 2 7 7 7 0 0 1-12 0 3 3 0 0 1 0-6Z" /><path d="M7 16v4m9-4v4m0-12 4 1v5l-3 1" /></>,
    lamp: <path d="m5 4 6 1 3 6-6 3-4-4ZM9 14l4 7 4-2-4-7m3-5 5-3m-3 7h4" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    book: <path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z" />,
    sound: <path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />,
    mute: <path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m-6 0 6-6" />,
    shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7Z" />,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    home: <path d="m2 11 10-9 10 9M5 9v12h14V9m-10 12v-7h6v7" />,
    check: <path d="m5 12 4 4L20 5" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tr(paths[name] || paths.sheep)}</svg>;
}
export function Animal({ animal, large = false }) {
  return <span className={`animal-art ${large ? 'large' : ''}`}><img src={`${ART}/sheep.png`} alt={tr("")} draggable="false" />
    {tr(animal?.wolf && animal.tell === 'eyes' && <i className="tell tell-eyes" />)}
    {tr(animal?.wolf && animal.tell === 'paws' && <i className="tell tell-paws"><b /><b /><b /></i>)}
    {tr(animal?.wolf && animal.tell === 'tail' && <i className="tell tell-tail" />)}
  </span>;
}
export function Modal({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const key = e => {
      if (e.key === 'Escape') closeRef.current?.();
      if (e.key === 'Tab') {
        const nodes = ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]');
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose?.()}><section className={`modal ${className}`} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={tr(title)}><div className="modal-heading"><span className="eyebrow">{tr(title)}</span>{tr(onClose && <button className="icon-button" aria-label="Đóng" onClick={onClose}><Icon name="close" /></button>)}</div>{tr(children)}</section></div>;
}
