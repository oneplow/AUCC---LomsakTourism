'use client';
import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

// คอมโพเนนต์กราฟ/รายงานที่ใช้ร่วมกันระหว่างหน้า admin และ staff

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];
export const THAI_MONTHS_FULL = [
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
export const CATEGORY_COLORS = [
  '#285943',
  '#b96545',
  '#b58a4a',
  '#3f6fa8',
  '#8c5aa8',
  '#397653',
  '#a63e39',
  '#4a7a8c',
];


export function niceScale(rawMax) {
  const max = Math.max(Number(rawMax) || 0, 1);
  const rough = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = 0; value <= top + step / 1000; value += step) ticks.push(Math.round(value));
  return { top, ticks };
}

export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('th-TH');
}

export function ChartLegend({ series }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-content-secondary">
      {series.map((item) => (
        <li key={item.name} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: item.color }}
          />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

export function ExportButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface-alt px-3.5 py-2 text-xs font-medium text-content-secondary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}

export function ChartCard({ title, subtitle, icon: Icon, onExport, exportDisabled, children }) {
  return (
    <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border-light pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-content-muted">{subtitle}</p>}
          </div>
        </div>
        {onExport && <ExportButton onClick={onExport} disabled={exportDisabled} />}
      </div>
      {children}
    </section>
  );
}

export function EmptyChart() {
  return (
    <p className="py-16 text-center text-sm text-content-muted">ยังไม่มีข้อมูลสำหรับช่วงเวลานี้</p>
  );
}

const CHART_H = 260;
const PAD = { top: 16, right: 16, bottom: 34, left: 44 };
const AXIS_COLOR = '#d8d0c3';
const GRID_COLOR = '#e9e3da';
const LABEL_COLOR = '#8a908a';
const HOVER_BAND = '#f3efe8';
const MIN_LABEL_GAP = 30; // ระยะห่างขั้นต่ำ (px) ระหว่าง label แกน X

// วัดความกว้างจริงของกราฟ เพื่อวาด SVG ตามขนาดพิกเซลจริง
// (ตัวอักษรไม่เล็กลงเมื่อการ์ดแคบ และวาง tooltip ได้ตรงตำแหน่ง)
function useChartWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// คีย์บอร์ด: ←/→ เลื่อนจุด, Esc ปิด tooltip
function useKeyboardIndex(length, setActive) {
  return (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      setActive((current) => {
        if (current === null) return delta > 0 ? 0 : length - 1;
        return Math.min(Math.max(current + delta, 0), length - 1);
      });
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  };
}

function ChartTooltip({ x, y, width, title, rows, total }) {
  if (x === null || x === undefined) return null;
  const flip = x > width - 200; // ใกล้ขอบขวา → แสดงทางซ้ายของจุดแทน
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute z-10 min-w-[10rem] rounded-2xl border border-border bg-white/95 px-3.5 py-3 text-xs shadow-lg backdrop-blur-sm"
      style={{
        left: x,
        top: y,
        transform: `translateX(${flip ? 'calc(-100% - 14px)' : '14px'})`,
      }}
    >
      <p className="mb-2 font-medium text-content-secondary">{title}</p>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-content-secondary">
              <span
                aria-hidden="true"
                className="h-0.5 w-3 rounded-full"
                style={{ background: row.color }}
              />
              {row.name}
            </span>
            <span className="text-sm font-semibold text-content">{formatNumber(row.value)}</span>
          </li>
        ))}
      </ul>
      {total && (
        <p className="mt-2 border-t border-border-light pt-2 text-content-muted">{total}</p>
      )}
    </div>
  );
}

function YGrid({ ticks, yAt, width }) {
  return (
    <>
      {ticks.map((tick) => (
        <g key={`tick-${tick}`}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={yAt(tick)}
            y2={yAt(tick)}
            stroke={GRID_COLOR}
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <text
            x={PAD.left - 10}
            y={yAt(tick) + 4}
            textAnchor="end"
            fontSize="11"
            fill={LABEL_COLOR}
          >
            {formatNumber(tick)}
          </text>
        </g>
      ))}
      <line
        x1={PAD.left}
        x2={width - PAD.right}
        y1={yAt(0)}
        y2={yAt(0)}
        stroke={AXIS_COLOR}
        strokeWidth="1.5"
      />
    </>
  );
}

/**
 * กราฟเส้น + crosshair: ชี้ตรงไหนก็ได้ ระบบจับจุดที่ใกล้ที่สุดบนแกน X
 * แล้วแสดงค่าของทุกเส้นใน tooltip เดียว
 * @param formatLabel (index) => หัวข้อใน tooltip เช่น "18 ตุลาคม 2569"
 */
export function LineChart({ labels, series, formatLabel, ariaLabel = 'กราฟแนวโน้มผู้เข้าชม' }) {
  const [ref, width] = useChartWidth();
  const [active, setActive] = useState(null);
  const onKeyDown = useKeyboardIndex(labels.length, setActive);
  const { top, ticks } = niceScale(Math.max(...series.flatMap((item) => item.values), 0));
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;
  const xAt = (index) => PAD.left + index * stepX;
  const yAt = (value) => PAD.top + innerH - (value / top) * innerH;
  const labelStep = Math.max(1, Math.ceil(MIN_LABEL_GAP / Math.max(stepX, 1)));

  const handleMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const index = stepX ? Math.round((x - PAD.left) / stepX) : 0;
    setActive(Math.min(Math.max(index, 0), labels.length - 1));
  };

  // tooltip ชิดบนสุดของกราฟ ข้างเส้น crosshair เพื่อไม่บังข้อมูล
  const tooltipY = PAD.top;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={CHART_H}
          viewBox={`0 0 ${width} ${CHART_H}`}
          className="block touch-pan-y outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30"
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerMove={handleMove}
          onPointerDown={handleMove}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          <YGrid ticks={ticks} yAt={yAt} width={width} />
          {labels.map(
            (label, index) =>
              (index % labelStep === 0 || index === labels.length - 1) && (
                <text
                  key={`x-${label}`}
                  x={xAt(index)}
                  y={CHART_H - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={index === active ? 600 : 400}
                  fill={index === active ? '#2f3a33' : LABEL_COLOR}
                >
                  {label}
                </text>
              )
          )}
          {active !== null && (
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={PAD.top}
              y2={yAt(0)}
              stroke={AXIS_COLOR}
              strokeWidth="1"
            />
          )}
          {series.map((item) => (
            <g key={item.name}>
              <polyline
                points={item.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ')}
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {item.values.map((value, index) => (
                <circle
                  key={`${item.name}-${index}`}
                  cx={xAt(index)}
                  cy={yAt(value)}
                  r={index === active ? 6 : stepX < 14 ? 2.5 : 4}
                  fill={index === active ? item.color : '#fff'}
                  stroke={index === active ? '#fff' : item.color}
                  strokeWidth={index === active ? 2 : 2.5}
                />
              ))}
            </g>
          ))}
          {/* พื้นที่รับ pointer ทั้งกราฟ (ใหญ่กว่าเส้น) */}
          <rect
            x={PAD.left - stepX / 2}
            y={0}
            width={innerW + stepX}
            height={CHART_H}
            fill="transparent"
          />
        </svg>
      )}
      {width === 0 && <div style={{ height: CHART_H }} />}
      <ChartTooltip
        x={active === null ? null : xAt(active)}
        y={tooltipY}
        width={width}
        title={active === null ? '' : formatLabel ? formatLabel(active) : labels[active]}
        rows={
          active === null
            ? []
            : series.map((item) => ({
                name: item.name,
                color: item.color,
                value: item.values[active] || 0,
              }))
        }
      />
    </div>
  );
}

/**
 * กราฟแท่ง: แต่ละกลุ่มแท่งมีพื้นที่ hover เต็มความสูงคอลัมน์
 * แท่งที่ชี้จะเด่นขึ้น แท่งอื่นจางลง และ tooltip แสดงทุก series ของกลุ่มนั้น
 */
export function BarChart({ labels, series, formatLabel, ariaLabel = 'กราฟแท่งเปรียบเทียบข้อมูล' }) {
  const [ref, width] = useChartWidth();
  const [active, setActive] = useState(null);
  const onKeyDown = useKeyboardIndex(labels.length, setActive);
  const { top, ticks } = niceScale(Math.max(...series.flatMap((item) => item.values), 0));
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const groupW = innerW / Math.max(labels.length, 1);
  const barW =
    series.length > 1 ? Math.min((groupW * 0.7) / series.length, 22) : Math.min(groupW * 0.55, 26);
  const yAt = (value) => PAD.top + innerH - (value / top) * innerH;
  const barH = (value) => Math.max((value / top) * innerH, value > 0 ? 2 : 0);
  const centerAt = (index) => PAD.left + groupW * index + groupW / 2;
  const labelStep = Math.max(1, Math.ceil(MIN_LABEL_GAP / Math.max(groupW, 1)));

  const tooltipY = PAD.top;
  const groupTotal =
    active === null ? 0 : series.reduce((sum, item) => sum + (item.values[active] || 0), 0);

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={CHART_H}
          viewBox={`0 0 ${width} ${CHART_H}`}
          className="block touch-pan-y outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30"
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {active !== null && (
            <rect
              x={PAD.left + groupW * active + 2}
              y={PAD.top}
              width={Math.max(groupW - 4, 1)}
              height={innerH}
              rx="8"
              fill={HOVER_BAND}
            />
          )}
          <YGrid ticks={ticks} yAt={yAt} width={width} />
          {labels.map((label, index) => {
            const groupCenter = centerAt(index);
            const seriesW = barW * series.length;
            const dim = active !== null && active !== index;
            return (
              <g key={`group-${label}`}>
                {series.map((item, seriesIndex) => {
                  const value = item.values[index] || 0;
                  const x = groupCenter - seriesW / 2 + seriesIndex * barW;
                  return (
                    <rect
                      key={`${item.name}-${index}`}
                      x={x + (series.length > 1 ? 1 : 0)}
                      y={yAt(value)}
                      width={Math.max(barW - (series.length > 1 ? 2 : 0), 1)}
                      height={barH(value)}
                      rx="3"
                      fill={item.color}
                      opacity={dim ? 0.45 : 1}
                      style={{ transition: 'opacity 120ms ease' }}
                    />
                  );
                })}
                {(index % labelStep === 0 || index === labels.length - 1) && (
                  <text
                    x={groupCenter}
                    y={CHART_H - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={index === active ? 600 : 400}
                    fill={index === active ? '#2f3a33' : LABEL_COLOR}
                  >
                    {label}
                  </text>
                )}
                {/* พื้นที่ hover ทั้งคอลัมน์ ไม่ต้องเล็งให้โดนแท่ง */}
                <rect
                  x={PAD.left + groupW * index}
                  y={0}
                  width={groupW}
                  height={CHART_H}
                  fill="transparent"
                  onPointerEnter={() => setActive(index)}
                  onPointerDown={() => setActive(index)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {width === 0 && <div style={{ height: CHART_H }} />}
      <ChartTooltip
        x={active === null ? null : centerAt(active) + (series.length * barW) / 2}
        y={tooltipY}
        width={width}
        title={active === null ? '' : formatLabel ? formatLabel(active) : labels[active]}
        rows={
          active === null
            ? []
            : series.map((item) => ({
                name: item.name,
                color: item.color,
                value: item.values[active] || 0,
              }))
        }
        total={series.length > 1 ? `รวม ${formatNumber(groupTotal)}` : null}
      />
    </div>
  );
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  // มุมเป็นเรเดียน เริ่มที่ 12 นาฬิกา ตามเข็ม
  const point = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  const [x1, y1] = point(rOuter, startAngle);
  const [x2, y2] = point(rOuter, endAngle);
  const [x3, y3] = point(rInner, endAngle);
  const [x4, y4] = point(rInner, startAngle);
  return `M${x1} ${y1} A${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

/**
 * โดนัท: ชี้ที่ชิ้นไหน ชิ้นนั้นขยายออก และตรงกลางเปลี่ยนเป็นชื่อ / จำนวน / % ของชิ้นนั้น
 * ส่ง activeIndex + onActiveChange เพื่อเชื่อมกับรายการ legend ด้านข้างได้
 */
export function DonutChart({ items, total, activeIndex, onActiveChange }) {
  const [localActive, setLocalActive] = useState(null);
  const active = activeIndex !== undefined ? activeIndex : localActive;
  const setActive = (value) => {
    setLocalActive(value);
    onActiveChange?.(value);
  };
  const size = 208;
  const c = size / 2;
  const rOuter = 96;
  const rInner = 58;
  let cursor = 0;
  const segments = items.map((item, index) => {
    const start = cursor;
    const end = start + (item.value / total) * Math.PI * 2;
    cursor = end;
    return { ...item, index, start, end, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] };
  });
  const current = active !== null && active !== undefined ? segments[active] : null;

  return (
    <div className="relative mx-auto h-52 w-52 shrink-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`สัดส่วนทั้งหมด ${formatNumber(total)} ครั้ง`}
        onPointerLeave={() => setActive(null)}
      >
        {segments.map((seg) => {
          const isActive = seg.index === active;
          const full = items.length === 1;
          return (
            <path
              key={seg.label}
              d={
                full
                  ? `M${c} ${c - rOuter} A${rOuter} ${rOuter} 0 1 1 ${c - 0.01} ${c - rOuter} L${c - 0.01} ${c - rInner} A${rInner} ${rInner} 0 1 0 ${c} ${c - rInner} Z`
                  : arcPath(c, c, isActive ? rOuter + 6 : rOuter, rInner, seg.start, seg.end)
              }
              fill={seg.color}
              stroke="#fff"
              strokeWidth={full ? 0 : 2}
              opacity={active !== null && active !== undefined && !isActive ? 0.55 : 1}
              style={{ transition: 'opacity 120ms ease', cursor: 'pointer' }}
              tabIndex={0}
              aria-label={`${seg.label} ${formatNumber(seg.value)} ครั้ง (${Math.round((seg.value / total) * 100)}%)`}
              onPointerEnter={() => setActive(seg.index)}
              onPointerDown={() => setActive(seg.index)}
              onFocus={() => setActive(seg.index)}
              onBlur={() => setActive(null)}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-[24%] flex flex-col items-center justify-center text-center">
        {current ? (
          <>
            <span className="text-xl font-semibold leading-tight">
              {Math.round((current.value / total) * 100)}%
            </span>
            <span className="mt-0.5 text-xs font-medium text-content-secondary">
              {formatNumber(current.value)} ครั้ง
            </span>
            <span className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-content-muted">
              {current.label}
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold">{formatNumber(total)}</span>
            <span className="mt-1 text-xs text-content-muted">ครั้งทั้งหมด</span>
          </>
        )}
      </div>
    </div>
  );
}

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
