'use client';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

const SIZES = {
  sm: 'min-h-10 rounded-xl px-3 py-2 text-sm',
  md: 'min-h-11 rounded-xl px-3.5 py-2.5 text-sm',
};

const TRIGGER_BASE =
  'inline-flex w-full items-center justify-between gap-2 border border-border bg-white text-content transition hover:border-primary focus:outline-none focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60';

export default function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'เลือก',
  label,
  className = '',
  containerClassName = 'relative',
  size = 'md',
  searchable = false,
  searchPlaceholder = 'ค้นหา…',
  emptyMessage = 'ไม่พบตัวเลือก',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [highlight, setHighlight] = useState(-1);
  const [term, setTerm] = useState('');
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const reactId = useId();
  const listId = `${id || reactId}-listbox`;
  const selected = options.find(option => String(option.value) === String(value)) || null;
  const filtered = useMemo(() => {
    if (!searchable || !term.trim()) return options;
    const keyword = term.trim().toLowerCase();
    return options.filter(option => String(option.label).toLowerCase().includes(keyword));
  }, [options, searchable, term]);
  const activeId = open && filtered[highlight] ? `${listId}-option-${highlight}` : undefined;

  const openPanel = () => {
    setTerm('');
    const index = options.findIndex(option => String(option.value) === String(value));
    setHighlight(index >= 0 ? index : 0);
    setOpen(true);
  };

  const commit = option => {
    onChange?.(String(option.value));
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const isInside = target => rootRef.current?.contains(target) || panelRef.current?.contains(target);
    const handleOutside = event => {
      if (!isInside(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('focusin', handleOutside);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('focusin', handleOutside);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft || 0) + 8;
      const topEdge = (viewport?.offsetTop || 0) + 8;
      const rightEdge = leftEdge + (viewport?.width || window.innerWidth) - 16;
      const bottomEdge = topEdge + (viewport?.height || window.innerHeight) - 16;
      const below = Math.max(0, bottomEdge - rect.bottom - 8);
      const above = Math.max(0, rect.top - topEdge - 8);
      const dropUp = below < 300 && above > below;
      const width = Math.min(Math.max(rect.width, 176), rightEdge - leftEdge);
      setPosition({
        left: Math.max(leftEdge, Math.min(rect.left, rightEdge - width)),
        width,
        maxHeight: Math.min(320, dropUp ? above : below),
        ...(dropUp ? { bottom: window.innerHeight - rect.top + 8 } : { top: Math.max(topEdge, rect.bottom + 8) }),
      });
    };
    updatePosition();
    if (searchable) searchRef.current?.focus({ preventScroll: true });
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (!open || highlight < 0) return;
    const list = listRef.current;
    const option = document.getElementById(`${listId}-option-${highlight}`);
    if (!list || !option) return;
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.top < listRect.top) list.scrollTop -= listRect.top - optionRect.top;
    else if (optionRect.bottom > listRect.bottom) list.scrollTop += optionRect.bottom - listRect.bottom;
  }, [open, highlight, listId, filtered]);

  const handleKeyDown = event => {
    if (disabled || event.nativeEvent.isComposing) return;
    const editing = event.target === searchRef.current;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight(current => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(current => Math.max(current - 1, 0));
    } else if (event.key === 'Home' && !editing) {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === 'End' && !editing) {
      event.preventDefault();
      setHighlight(filtered.length - 1);
    } else if (event.key === 'Enter' || (event.key === ' ' && !editing)) {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) commit(option);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === 'Tab') {
      buttonRef.current?.focus();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={containerClassName} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={!searchable ? activeId : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`${TRIGGER_BASE} ${SIZES[size]} ${className}`}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-content-muted'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-content-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div ref={panelRef} className="select-panel fixed z-[100] flex flex-col" style={position || undefined}>
          {searchable && (
            <div className="relative shrink-0 border-b border-border-light p-2">
              <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
              <input
                ref={searchRef}
                type="search"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                value={term}
                onChange={event => {
                  setTerm(event.target.value);
                  setHighlight(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={`ค้นหา${label || 'ตัวเลือก'}`}
                className="w-full rounded-lg bg-surface-alt py-2 pl-9 pr-3 text-sm text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          )}
          {!filtered.length && <p role="status" className="overflow-y-auto px-3 py-6 text-center text-sm text-content-muted">{emptyMessage}</p>}
          <ul id={listId} ref={listRef} role="listbox" aria-label={label} className="min-h-0 overflow-y-auto overscroll-contain p-1.5">
            {filtered.map((option, index) => {
              const isSelected = String(option.value) === String(value);
              const isHighlighted = index === highlight;
              return (
                <li
                  key={String(option.value)}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => commit(option)}
                  onMouseEnter={() => setHighlight(index)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isHighlighted ? 'bg-surface-alt text-primary' : 'text-content'
                  } ${isSelected ? 'font-semibold' : ''}`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
