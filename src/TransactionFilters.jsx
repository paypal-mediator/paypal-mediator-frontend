import React, { useLayoutEffect, useRef, useState } from 'react';
export default function TransactionFilters({ value, onChange }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = () => {
      const selected = container.querySelector('[aria-pressed="true"]');
      if (selected) setPosition({ left: selected.offsetLeft, top: selected.offsetTop, width: selected.offsetWidth, height: selected.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    Array.from(container.querySelectorAll('button')).forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [value]);
  return <div className="tabs transaction-filters" ref={containerRef} role="group" aria-label="Filter transactions">
    {position && <span className="filter-highlight" style={position} aria-hidden="true" />}
    {['All transactions', 'Incomplete', 'Needs review'].map(tab => <button className={value === tab ? 'selected' : ''} aria-pressed={value === tab} onClick={event => { onChange(tab); event.currentTarget.focus(); }} onKeyDown={event => {
      const tabs = ['All transactions', 'Incomplete', 'Needs review'];
      const index = tabs.indexOf(value);
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'ArrowDown') {
        event.preventDefault();
        document.querySelector('.transactions-table tbody tr')?.focus();
        return;
      } else return;
      event.preventDefault();
      onChange(tabs[next]);
      containerRef.current.querySelectorAll('button')[next]?.focus();
    }} key={tab}>{tab}</button>)}
  </div>;
}
