import React, { useId, useRef, useState } from 'react';

export default function TeamOptions({ name, pinned, canMoveUp, canMoveDown, onMove, onPin }) {
  const id = useId();
  const trigger = useRef(null);
  const popup = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const act = callback => { callback(); popup.current?.hidePopover(); trigger.current?.focus(); };
  return <>
    <button type="button" ref={trigger} className="team-options-trigger" aria-label={`Options for ${name}`} aria-haspopup="dialog" popoverTarget={id} onClick={() => {
      const rect = trigger.current.getBoundingClientRect();
      setPosition({ top: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 150)), left: Math.max(8, Math.min(rect.left, window.innerWidth - 184)) });
    }}><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
    <div popover="auto" id={id} ref={popup} role="dialog" aria-label={`Arrange ${name}`} className="team-options-popup" style={position} onToggle={event => { if (event.newState === 'open') popup.current?.querySelector('button:not(:disabled)')?.focus(); }} onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); popup.current?.hidePopover(); trigger.current?.focus(); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const buttons = [...popup.current.querySelectorAll('button:not(:disabled)')];
        const index = buttons.indexOf(document.activeElement);
        buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
    }}>
      <button type="button" disabled={!canMoveUp} onClick={() => act(() => onMove(-1))}><span aria-hidden="true">↑</span>Move up</button>
      <button type="button" disabled={!canMoveDown} onClick={() => act(() => onMove(1))}><span aria-hidden="true">↓</span>Move down</button>
      <button type="button" onClick={() => act(onPin)}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m8 3 8 0-1 7 4 4H5l4-4-1-7ZM12 14v7"/></svg>{pinned ? 'Unpin' : 'Pin'}</button>
    </div>
  </>;
}
