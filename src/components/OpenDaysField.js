'use client';
import { DAY_NAMES, DAY_SHORT, WEEK_ORDER, parseOpenDays, serializeOpenDays } from '@/lib/openDays';

// เลือกวันเปิดของสถานที่ (ไม่ติ๊กเลย = เปิดทุกวัน)
export default function OpenDaysField({ value, onChange, className = '' }) {
  const selected = parseOpenDays(value) || [];
  const toggle = (d) => {
    const next = selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d];
    onChange(serializeOpenDays(next) || '');
  };
  return (
    <fieldset className={`text-sm text-content-secondary ${className}`}>
      <legend>วันเปิด</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {WEEK_ORDER.map((d) => {
          const checked = selected.includes(d);
          return (
            <label
              key={d}
              className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium focus-within:ring-2 focus-within:ring-primary/30 ${
                checked
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-content'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggle(d)}
                aria-label={`วัน${DAY_NAMES[d]}`}
              />
              {DAY_SHORT[d]}
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-content-muted">
        ไม่เลือกวันใดเลย = เปิดทุกวัน (เช่น ถนนคนเดินให้เลือกเฉพาะ ส.)
      </p>
    </fieldset>
  );
}
