'use client';
import { useState, useEffect, useCallback } from 'react';
import Select from '@/components/Select';
import { Download, TrendingUp, BarChart3, CalendarDays, PieChart } from 'lucide-react';

const THAI_MONTHS_SHORT = [
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
const THAI_MONTHS_FULL = [
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
const CATEGORY_COLORS = [
  '#285943',
  '#b96545',
  '#b58a4a',
  '#3f6fa8',
  '#8c5aa8',
  '#397653',
  '#a63e39',
  '#4a7a8c',
];

const CHART_W = 1000;
const CHART_H = 260;
const PAD = { top: 16, right: 16, bottom: 34, left: 44 };
const AXIS_COLOR = '#d8d0c3';
const GRID_COLOR = '#e9e3da';
const LABEL_COLOR = '#8a908a';

function niceScale(rawMax) {
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

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('th-TH');
}

function ChartLegend({ series }) {
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

function ExportButton({ onClick, disabled }) {
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

function ChartCard({ title, subtitle, icon: Icon, onExport, exportDisabled, children }) {
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

function EmptyChart() {
  return (
    <p className="py-16 text-center text-sm text-content-muted">ยังไม่มีข้อมูลสำหรับช่วงเวลานี้</p>
  );
}

function LineChart({ labels, series }) {
  const { top, ticks } = niceScale(Math.max(...series.flatMap((item) => item.values), 0));
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;
  const xAt = (index) => PAD.left + index * stepX;
  const yAt = (value) => PAD.top + innerH - (value / top) * innerH;
  const labelStep = labels.length > 16 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      role="img"
      aria-label="กราฟแนวโน้มผู้เข้าชม"
    >
      {ticks.map((tick) => (
        <g key={`tick-${tick}`}>
          <line
            x1={PAD.left}
            x2={CHART_W - PAD.right}
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
            {tick}
          </text>
        </g>
      ))}
      <line
        x1={PAD.left}
        x2={CHART_W - PAD.right}
        y1={yAt(0)}
        y2={yAt(0)}
        stroke={AXIS_COLOR}
        strokeWidth="1.5"
      />
      {labels.map(
        (label, index) =>
          (index % labelStep === 0 || index === labels.length - 1) && (
            <text
              key={`x-${label}`}
              x={xAt(index)}
              y={CHART_H - 12}
              textAnchor="middle"
              fontSize="11"
              fill={LABEL_COLOR}
            >
              {label}
            </text>
          )
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
              r="4"
              fill="#fff"
              stroke={item.color}
              strokeWidth="2.5"
            >
              <title>{`${labels[index]} · ${item.name} ${formatNumber(value)}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}

function BarChart({ labels, series }) {
  const { top, ticks } = niceScale(Math.max(...series.flatMap((item) => item.values), 0));
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const groupW = innerW / Math.max(labels.length, 1);
  const barW =
    series.length > 1 ? Math.min((groupW * 0.7) / series.length, 22) : Math.min(groupW * 0.55, 26);
  const yAt = (value) => PAD.top + innerH - (value / top) * innerH;
  const barH = (value) => Math.max((value / top) * innerH, value > 0 ? 2 : 0);

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      role="img"
      aria-label="กราฟแท่งเปรียบเทียบข้อมูล"
    >
      {ticks.map((tick) => (
        <g key={`tick-${tick}`}>
          <line
            x1={PAD.left}
            x2={CHART_W - PAD.right}
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
            {tick}
          </text>
        </g>
      ))}
      <line
        x1={PAD.left}
        x2={CHART_W - PAD.right}
        y1={yAt(0)}
        y2={yAt(0)}
        stroke={AXIS_COLOR}
        strokeWidth="1.5"
      />
      {labels.map((label, index) => {
        const groupCenter = PAD.left + groupW * index + groupW / 2;
        const seriesW = barW * series.length;
        return (
          <g key={`group-${label}`}>
            {series.map((item, seriesIndex) => {
              const value = item.values[index];
              const x = groupCenter - seriesW / 2 + seriesIndex * barW;
              return (
                <rect
                  key={`${item.name}-${index}`}
                  x={x}
                  y={yAt(value)}
                  width={barW}
                  height={barH(value)}
                  rx="3"
                  fill={item.color}
                  opacity={series.length > 1 && seriesIndex === 1 ? 0.92 : 1}
                >
                  <title>{`${label} · ${item.name} ${formatNumber(value)}`}</title>
                </rect>
              );
            })}
            <text
              x={groupCenter}
              y={CHART_H - 12}
              textAnchor="middle"
              fontSize="11"
              fill={LABEL_COLOR}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ items, total }) {
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    const end = start + (item.value / total) * 100;
    cursor = end;
    return `${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} ${start}% ${end}%`;
  });
  return (
    <div
      className="relative mx-auto h-52 w-52 shrink-0"
      role="img"
      aria-label={`สัดส่วนผู้เข้าชม ${formatNumber(total)} ครั้ง`}
    >
      <div
        className="h-full w-full rounded-full"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      />
      <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-semibold">{formatNumber(total)}</span>
        <span className="mt-1 text-xs text-content-muted">ครั้งทั้งหมด</span>
      </div>
    </div>
  );
}

function downloadCsv(filename, rows) {
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

export default function AdminReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [popularCats, setPopularCats] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);

  const loadDaily = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const res = await fetch(`/api/reports?type=daily_visits&year=${year}&month=${month}`);
      const data = await res.json();
      setDaily(data);
    } catch (err) {
      console.error(err);
      setDaily(null);
    } finally {
      setLoadingDaily(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  useEffect(() => {
    let active = true;
    setLoadingMonthly(true);
    fetch(`/api/reports?type=monthly_visits&year=${year}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) setMonthly(data);
      })
      .catch((err) => {
        console.error(err);
        if (active) setMonthly(null);
      })
      .finally(() => {
        if (active) setLoadingMonthly(false);
      });
    setLoadingCats(true);
    fetch('/api/reports?type=popular_categories')
      .then((res) => res.json())
      .then((data) => {
        if (active) setPopularCats(data.data || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (active) setLoadingCats(false);
      });
    return () => {
      active = false;
    };
  }, [year]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const visitByDay = new Map(
    (daily?.data || []).map((row) => [Number(row.day), Number(row.total)])
  );
  const tripByDay = new Map(
    (daily?.trips || []).map((row) => [Number(row.day), Number(row.total)])
  );
  const dailyLabels = Array.from({ length: daysInMonth }, (_, index) => String(index + 1));
  const dailyVisits = Array.from(
    { length: daysInMonth },
    (_, index) => visitByDay.get(index + 1) || 0
  );
  const dailyTrips = Array.from(
    { length: daysInMonth },
    (_, index) => tripByDay.get(index + 1) || 0
  );
  const hasDaily = dailyVisits.some((value) => value > 0) || dailyTrips.some((value) => value > 0);

  const visitByMonth = new Map(
    (monthly?.data || []).map((row) => [Number(row.month), Number(row.total)])
  );
  const tripByMonth = new Map(
    (monthly?.trips || []).map((row) => [Number(row.month), Number(row.total)])
  );
  const monthlyVisits = Array.from({ length: 12 }, (_, index) => visitByMonth.get(index + 1) || 0);
  const monthlyTrips = Array.from({ length: 12 }, (_, index) => tripByMonth.get(index + 1) || 0);
  const hasMonthly =
    monthlyVisits.some((value) => value > 0) || monthlyTrips.some((value) => value > 0);

  const categoryItems = popularCats
    .map((category) => ({ label: category.name, value: Number(category.visit_count) || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const categoryTotal = categoryItems.reduce((sum, item) => sum + item.value, 0);

  const monthLabel = `${THAI_MONTHS_FULL[month - 1]} ${year + 543}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">รายงานและสถิติ</h1>
          <p className="mt-2 text-sm text-content-secondary">
            ภาพรวมผู้เข้าชมสถานที่และการใช้งานแผนทริป AI
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-content-secondary">
            <span>เดือน</span>
            <Select
              label="เลือกเดือน"
              value={month}
              onChange={(value) => setMonth(Number(value))}
              className="w-auto min-w-[8rem]"
              options={THAI_MONTHS_FULL.map((name, index) => ({ value: index + 1, label: name }))}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-content-secondary">
            <span>ปี พ.ศ.</span>
            <Select
              label="เลือกปี พ.ศ."
              value={year}
              onChange={(value) => setYear(Number(value))}
              className="w-auto min-w-[7rem]"
              options={[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(
                (value) => ({ value, label: value + 543 })
              )}
            />
          </div>
        </div>
      </div>

      <ChartCard
        title="แนวโน้มผู้เข้าชมรายวัน"
        subtitle={monthLabel}
        icon={TrendingUp}
        onExport={() =>
          downloadCsv(`visits-daily-${year}-${month}.csv`, [
            ['วันที่', 'ผู้เข้าชม', 'แผนทริป AI'],
            ...dailyLabels.map((label, index) => [label, dailyVisits[index], dailyTrips[index]]),
          ])
        }
        exportDisabled={!hasDaily}
      >
        {loadingDaily ? (
          <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
        ) : hasDaily ? (
          <div className="space-y-4">
            <LineChart
              labels={dailyLabels}
              series={[
                { name: 'ผู้เข้าชม', color: '#b96545', values: dailyVisits },
                { name: 'แผนทริป AI', color: '#3f6fa8', values: dailyTrips },
              ]}
            />
            <ChartLegend
              series={[
                { name: 'ผู้เข้าชม', color: '#b96545' },
                { name: 'แผนทริป AI', color: '#3f6fa8' },
              ]}
            />
          </div>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="สถิติผู้เข้าชมรายวันภายในเดือน"
        subtitle={monthLabel}
        icon={CalendarDays}
        onExport={() =>
          downloadCsv(`visits-daily-bars-${year}-${month}.csv`, [
            ['วันที่', 'ผู้เข้าชม'],
            ...dailyLabels.map((label, index) => [label, dailyVisits[index]]),
          ])
        }
        exportDisabled={!hasDaily}
      >
        {loadingDaily ? (
          <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
        ) : dailyVisits.some((value) => value > 0) ? (
          <BarChart
            labels={dailyLabels}
            series={[{ name: 'ผู้เข้าชม', color: '#b96545', values: dailyVisits }]}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title={`เปรียบเทียบรายเดือนของปี พ.ศ. ${year + 543}`}
        subtitle="ผู้เข้าชมสถานที่และจำนวนแผนทริป AI ที่สร้างในแต่ละเดือน"
        icon={BarChart3}
        onExport={() =>
          downloadCsv(`visits-monthly-${year}.csv`, [
            ['เดือน', 'ผู้เข้าชม', 'แผนทริป AI'],
            ...THAI_MONTHS_SHORT.map((label, index) => [
              label,
              monthlyVisits[index],
              monthlyTrips[index],
            ]),
          ])
        }
        exportDisabled={!hasMonthly}
      >
        {loadingMonthly ? (
          <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
        ) : hasMonthly ? (
          <div className="space-y-4">
            <BarChart
              labels={THAI_MONTHS_SHORT}
              series={[
                { name: 'ผู้เข้าชม', color: '#285943', values: monthlyVisits },
                { name: 'แผนทริป AI', color: '#b96545', values: monthlyTrips },
              ]}
            />
            <ChartLegend
              series={[
                { name: 'ผู้เข้าชม', color: '#285943' },
                { name: 'แผนทริป AI', color: '#b96545' },
              ]}
            />
          </div>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="สัดส่วนผู้เข้าชมแยกตามหมวดหมู่"
        subtitle="รวมทุกช่วงเวลาที่มีข้อมูลในระบบ"
        icon={PieChart}
        onExport={() =>
          downloadCsv('visits-by-category.csv', [
            ['หมวดหมู่', 'จำนวนเข้าชม', 'สัดส่วน (%)'],
            ...categoryItems.map((item) => [
              item.label,
              item.value,
              categoryTotal ? Math.round((item.value / categoryTotal) * 100) : 0,
            ]),
          ])
        }
        exportDisabled={!categoryItems.length}
      >
        {loadingCats ? (
          <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
        ) : categoryItems.length ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:items-center">
            <DonutChart items={categoryItems} total={categoryTotal} />
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-xs text-content-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold">
                      หมวดหมู่
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      ยอดรวม
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-right font-semibold sm:table-cell"
                    >
                      สัดส่วน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {categoryItems.map((item, index) => (
                    <tr key={item.label}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                          />
                          {item.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-content-secondary">
                        {formatNumber(item.value)} ครั้ง
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-content-secondary sm:table-cell">
                        {Math.round((item.value / categoryTotal) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </div>
  );
}
