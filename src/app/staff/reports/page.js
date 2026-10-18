'use client';
import { useState, useEffect } from 'react';
import Select from '@/components/Select';
import {
  TrendingUp,
  BarChart3,
  CalendarDays,
  PieChart,
  MapPin,
  Eye,
  CalendarRange,
  Trophy,
  ListOrdered,
} from 'lucide-react';
import {
  THAI_MONTHS_SHORT,
  THAI_MONTHS_FULL,
  CATEGORY_COLORS,
  formatNumber,
  ChartLegend,
  ChartCard,
  EmptyChart,
  LineChart,
  BarChart,
  DonutChart,
  downloadCsv,
} from '@/components/reports/ReportCharts';

// รายงานของ staff: หน้าตาเหมือนหน้า admin แต่ข้อมูลทั้งหมดเป็นของสถานที่ที่ตัวเองดูแล
// (API /api/reports กรองตาม staff_permissions ให้จาก token อยู่แล้ว)

function useReport(url) {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    fetch(url)
      .then((res) => res.json())
      .then((data) => active && setState({ data, loading: false }))
      .catch((err) => {
        console.error(err);
        if (active) setState({ data: null, loading: false });
      });
    return () => {
      active = false;
    };
  }, [url]);
  return state;
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-5">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm text-content-secondary">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-content-muted">{hint}</p>}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export default function StaffReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activePlace, setActivePlace] = useState(null);

  const daily = useReport(`/api/reports?type=daily_visits&year=${year}&month=${month}`);
  const monthly = useReport(`/api/reports?type=monthly_visits&year=${year}`);
  const breakdown = useReport(`/api/reports?type=place_breakdown&year=${year}&month=${month}`);

  // ---- รายวัน ----
  const daysInMonth = new Date(year, month, 0).getDate();
  const visitByDay = new Map(
    (daily.data?.data || []).map((row) => [Number(row.day), Number(row.total)])
  );
  const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const dailyVisits = Array.from({ length: daysInMonth }, (_, i) => visitByDay.get(i + 1) || 0);
  const hasDaily = dailyVisits.some((v) => v > 0);

  // ---- รายเดือน ----
  const visitByMonth = new Map(
    (monthly.data?.data || []).map((row) => [Number(row.month), Number(row.total)])
  );
  const monthlyVisits = Array.from({ length: 12 }, (_, i) => visitByMonth.get(i + 1) || 0);
  const hasMonthly = monthlyVisits.some((v) => v > 0);

  // ---- แยกรายสถานที่ ----
  const places = (breakdown.data?.data || []).map((p) => ({
    ...p,
    total_visits: Number(p.total_visits) || 0,
    year_visits: Number(p.year_visits) || 0,
    month_visits: Number(p.month_visits) || 0,
  }));
  const sumMonth = places.reduce((s, p) => s + p.month_visits, 0);
  const sumYear = places.reduce((s, p) => s + p.year_visits, 0);
  const sumTotal = places.reduce((s, p) => s + p.total_visits, 0);
  const topPlace = places.find((p) => p.month_visits > 0);
  const maxMonth = Math.max(...places.map((p) => p.month_visits), 1);
  const placeShare = places
    .filter((p) => p.year_visits > 0)
    .sort((a, b) => b.year_visits - a.year_visits)
    .map((p) => ({ label: p.name, value: p.year_visits }));

  const monthLabel = `${THAI_MONTHS_FULL[month - 1]} ${year + 543}`;
  const loadingStats = breakdown.loading && !breakdown.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">รายงานและสถิติ</h1>
          <p className="mt-2 text-sm text-content-secondary">
            ภาพรวมผู้เข้าชมของสถานที่ที่คุณดูแล
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

      {/* การ์ดสรุป */}
      {loadingStats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl bg-surface-alt" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={MapPin}
            label="สถานที่ที่ดูแล"
            value={formatNumber(places.length)}
            hint={`ผู้เข้าชมสะสม ${formatNumber(sumTotal)} ครั้ง`}
          />
          <StatCard
            icon={Eye}
            label={`ผู้เข้าชม ${monthLabel}`}
            value={formatNumber(sumMonth)}
            hint={
              places.length
                ? `เฉลี่ย ${formatNumber(Math.round(sumMonth / places.length))} ครั้ง/สถานที่`
                : undefined
            }
          />
          <StatCard
            icon={CalendarRange}
            label={`ผู้เข้าชมปี พ.ศ. ${year + 543}`}
            value={formatNumber(sumYear)}
          />
          <StatCard
            icon={Trophy}
            label="ยอดนิยมเดือนนี้"
            value={topPlace ? topPlace.name : '-'}
            hint={topPlace ? `${formatNumber(topPlace.month_visits)} ครั้ง` : 'ยังไม่มีผู้เข้าชม'}
          />
        </div>
      )}

      <ChartCard
        title="แนวโน้มผู้เข้าชมรายวัน"
        subtitle={monthLabel}
        icon={TrendingUp}
        onExport={() =>
          downloadCsv(`my-visits-daily-${year}-${month}.csv`, [
            ['วันที่', 'ผู้เข้าชม'],
            ...dailyLabels.map((label, i) => [label, dailyVisits[i]]),
          ])
        }
        exportDisabled={!hasDaily}
      >
        {daily.loading ? (
          <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
        ) : hasDaily ? (
          <div className="space-y-4">
            <LineChart
              labels={dailyLabels}
              formatLabel={(i) => `${i + 1} ${monthLabel}`}
              series={[{ name: 'ผู้เข้าชม', color: '#b96545', values: dailyVisits }]}
            />
            <ChartLegend series={[{ name: 'ผู้เข้าชม', color: '#b96545' }]} />
          </div>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title={`เปรียบเทียบรายเดือนของปี พ.ศ. ${year + 543}`}
          subtitle="ผู้เข้าชมสถานที่ที่คุณดูแลในแต่ละเดือน"
          icon={BarChart3}
          onExport={() =>
            downloadCsv(`my-visits-monthly-${year}.csv`, [
              ['เดือน', 'ผู้เข้าชม'],
              ...THAI_MONTHS_SHORT.map((label, i) => [label, monthlyVisits[i]]),
            ])
          }
          exportDisabled={!hasMonthly}
        >
          {monthly.loading ? (
            <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
          ) : hasMonthly ? (
            <BarChart
              labels={THAI_MONTHS_SHORT}
              formatLabel={(i) => `${THAI_MONTHS_FULL[i]} ${year + 543}`}
              series={[{ name: 'ผู้เข้าชม', color: '#285943', values: monthlyVisits }]}
            />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          title="สัดส่วนผู้เข้าชมแยกตามสถานที่"
          subtitle={`ปี พ.ศ. ${year + 543}`}
          icon={PieChart}
          onExport={() =>
            downloadCsv(`my-visits-by-place-${year}.csv`, [
              ['สถานที่', 'จำนวนเข้าชม', 'สัดส่วน (%)'],
              ...placeShare.map((item) => [
                item.label,
                item.value,
                sumYear ? Math.round((item.value / sumYear) * 100) : 0,
              ]),
            ])
          }
          exportDisabled={!placeShare.length}
        >
          {breakdown.loading ? (
            <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
          ) : placeShare.length ? (
            <div className="grid gap-6 sm:grid-cols-[minmax(0,208px)_minmax(0,1fr)] sm:items-center">
              <DonutChart
                items={placeShare}
                total={sumYear}
                activeIndex={activePlace}
                onActiveChange={setActivePlace}
              />
              <ul className="space-y-1 text-sm">
                {placeShare.map((item, index) => (
                  <li
                    key={item.label}
                    onPointerEnter={() => setActivePlace(index)}
                    onPointerLeave={() => setActivePlace(null)}
                    className={`-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors ${activePlace === index ? 'bg-surface-alt' : ''}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="whitespace-nowrap text-content-secondary">
                      {Math.round((item.value / sumYear) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="สถิติผู้เข้าชมรายวันภายในเดือน"
        subtitle={monthLabel}
        icon={CalendarDays}
      >
        {daily.loading ? (
          <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
        ) : hasDaily ? (
          <BarChart
            labels={dailyLabels}
            formatLabel={(i) => `${i + 1} ${monthLabel}`}
            series={[{ name: 'ผู้เข้าชม', color: '#b96545', values: dailyVisits }]}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="อันดับสถานที่ที่ดูแล"
        subtitle={`เรียงตามผู้เข้าชม ${monthLabel}`}
        icon={ListOrdered}
        onExport={() =>
          downloadCsv(`my-places-${year}-${month}.csv`, [
            ['อันดับ', 'สถานที่', 'หมวดหมู่', monthLabel, `ปี ${year + 543}`, 'สะสม', 'เข้าชมล่าสุด'],
            ...places.map((p, i) => [
              i + 1,
              p.name,
              p.category_name || '-',
              p.month_visits,
              p.year_visits,
              p.total_visits,
              formatDate(p.last_visit),
            ]),
          ])
        }
        exportDisabled={!places.length}
      >
        {breakdown.loading ? (
          <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
        ) : places.length ? (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-alt text-xs text-content-secondary">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3 text-left font-semibold">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    สถานที่
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    {THAI_MONTHS_SHORT[month - 1]} {year + 543}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    ทั้งปี
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    สะสม
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    เข้าชมล่าสุด
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {places.map((p, i) => (
                  <tr key={p.place_id}>
                    <td className="px-4 py-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-alt text-xs font-semibold">
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-content-muted">{p.category_name || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 shrink-0 rounded-full bg-surface-alt">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{
                              width: `${p.month_visits ? Math.max((p.month_visits / maxMonth) * 100, 6) : 0}%`,
                            }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-content-secondary">
                          {formatNumber(p.month_visits)}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-content-secondary">
                      {formatNumber(p.year_visits)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-content-secondary">
                      {formatNumber(p.total_visits)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-content-muted">
                      {formatDate(p.last_visit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-content-muted">
            ยังไม่มีสถานที่ที่ได้รับมอบหมาย
          </p>
        )}
      </ChartCard>
    </div>
  );
}
