'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

// ตัวเลือกวันที่แบบไทย (วัน เดือน พ.ศ.) แทน <input type="date"> ที่แสดงตามภาษาของเบราว์เซอร์
// value / onChange ใช้รูปแบบ 'YYYY-MM-DD' (ค.ศ.) เหมือน input type="date" เดิม

const MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];
const WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const WEEKDAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => a && b && toISO(a) === toISO(b);

/** "จันทร์ที่ 19 ตุลาคม 2569" */
export function formatThaiDate(iso, { weekday = true } = {}) {
  const d = parseISO(iso);
  if (!d) return '';
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  return weekday ? `${WEEKDAYS_FULL[d.getDay()]}ที่ ${date}` : date;
}

export default function ThaiDatePicker({
  value,
  onChange,
  min,
  id,
  placeholder = 'เลือกวันที่',
  ariaDescribedBy,
  ariaLabelledBy,
}) {
  const reactId = useId();
  const baseId = id || reactId;
  const selected = parseISO(value);
  const minDate = parseISO(min);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || new Date()); // เดือนที่แสดง
  const [focusDate, setFocusDate] = useState(() => selected || new Date());
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const gridRef = useRef(null);
  const today = new Date();

  const isDisabled = (d) => (minDate ? toISO(d) < toISO(minDate) : false);

  const openPanel = () => {
    const start = selected || (minDate && today < minDate ? minDate : today);
    setView(start);
    setFocusDate(start);
    setPosition(null);
    setOpen(true);
  };

  const commit = (d) => {
    if (isDisabled(d)) return;
    onChange?.(toISO(d));
    setOpen(false);
    buttonRef.current?.focus();
  };

  // ปิดเมื่อคลิกนอก panel
  useEffect(() => {
    if (!open) return undefined;
    const handle = (e) => {
      if (!buttonRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [open]);

  // วาง panel ใต้ปุ่ม (หรือเหนือปุ่มถ้าพื้นที่ด้านล่างไม่พอ) — ใช้ portal กันโดนตัดจาก overflow ของ parent
  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 16);
      const panelH = panelRef.current?.offsetHeight || 380;
      const below = window.innerHeight - rect.bottom;
      const top = below < panelH + 12 && rect.top > panelH + 12 ? rect.top - panelH - 6 : rect.bottom + 6;
      const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8);
      setPosition({ top, left, width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  // ย้าย focus ไปที่วันที่กำลังเลือกด้วยคีย์บอร์ด
  // (รอให้ panel ถูกวางตำแหน่งก่อน เพราะ panel render หลังคำนวณ position)
  const panelReady = open && position !== null;
  useEffect(() => {
    if (!panelReady) return;
    const el = gridRef.current?.querySelector(`[data-date="${toISO(focusDate)}"]`);
    el?.focus({ preventScroll: true });
  }, [panelReady, focusDate, view]);

  const moveFocus = (d) => {
    setFocusDate(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(d);
  };

  const onGridKeyDown = (e) => {
    const map = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (map[e.key] !== undefined) {
      e.preventDefault();
      moveFocus(addDays(focusDate, map[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const delta = e.key === 'PageUp' ? -1 : 1;
      moveFocus(new Date(focusDate.getFullYear(), focusDate.getMonth() + delta, focusDate.getDate()));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      moveFocus(addDays(focusDate, e.key === 'Home' ? -focusDate.getDay() : 6 - focusDate.getDay()));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(focusDate);
    }
  };

  const onPanelKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const changeMonth = (delta) => {
    const next = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    setView(next);
    setFocusDate(next);
  };

  // ตาราง 6 สัปดาห์ เริ่มวันอาทิตย์
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const prevDisabled =
    minDate &&
    (view.getFullYear() < minDate.getFullYear() ||
      (view.getFullYear() === minDate.getFullYear() && view.getMonth() <= minDate.getMonth()));
  const tomorrow = addDays(today, 1);

  return (
    <>
      <button
        ref={buttonRef}
        id={baseId}
        type="button"
        className="nature-input thai-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={ariaLabelledBy ? `${ariaLabelledBy} ${baseId}` : undefined}
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            openPanel();
          }
        }}
      >
        <span className={selected ? '' : 'text-content-muted'}>
          {selected ? formatThaiDate(value) : placeholder}
        </span>
        <CalendarDays size={18} className="shrink-0 text-content-secondary" aria-hidden="true" />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label="เลือกวันที่เริ่มเดินทาง"
            className="select-panel thai-date-panel"
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            onKeyDown={onPanelKeyDown}
          >
            <div className="thai-date-head">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                disabled={prevDisabled}
                aria-label="เดือนก่อนหน้า"
              >
                <ChevronLeft size={18} />
              </button>
              <p aria-live="polite">
                {MONTHS[view.getMonth()]} {view.getFullYear() + 543}
              </p>
              <button type="button" onClick={() => changeMonth(1)} aria-label="เดือนถัดไป">
                <ChevronRight size={18} />
              </button>
            </div>

            <div role="grid" ref={gridRef} onKeyDown={onGridKeyDown} className="thai-date-grid">
              <div role="row" className="contents">
                {WEEKDAYS_SHORT.map((w, i) => (
                  <span
                    key={w + i}
                    role="columnheader"
                    aria-label={WEEKDAYS_FULL[i]}
                    className={`thai-date-dow ${i === 0 ? 'is-sunday' : ''}`}
                  >
                    {w}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, week) => (
                <div role="row" key={week} className="contents">
                  {cells.slice(week * 7, week * 7 + 7).map((d) => {
                    const outside = d.getMonth() !== view.getMonth();
                    const disabled = isDisabled(d);
                    const isSelected = sameDay(d, selected);
                    const isToday = sameDay(d, today);
                    const focused = sameDay(d, focusDate);
                    return (
                      <button
                        key={toISO(d)}
                        type="button"
                        role="gridcell"
                        data-date={toISO(d)}
                        tabIndex={focused ? 0 : -1}
                        disabled={disabled}
                        aria-selected={isSelected}
                        aria-current={isToday ? 'date' : undefined}
                        aria-label={formatThaiDate(toISO(d))}
                        onClick={() => commit(d)}
                        className={[
                          'thai-date-day',
                          outside && 'is-outside',
                          isSelected && 'is-selected',
                          isToday && 'is-today',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="thai-date-foot">
              {!isDisabled(today) && (
                <button type="button" onClick={() => commit(today)}>
                  วันนี้
                </button>
              )}
              <button type="button" onClick={() => commit(tomorrow)}>
                พรุ่งนี้
              </button>
              <span className="ml-auto text-xs text-content-muted">
                {selected ? formatThaiDate(value, { weekday: false }) : ''}
              </span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
