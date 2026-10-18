'use client';
import { useState, useEffect, useCallback } from 'react';
import Select from '@/components/Select';
import { TrendingUp, BarChart3, CalendarDays, PieChart } from 'lucide-react';
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
  const [activeCat, setActiveCat] = useState(null);

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
              formatLabel={(i) => `${i + 1} ${monthLabel}`}
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
            formatLabel={(i) => `${i + 1} ${monthLabel}`}
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
              formatLabel={(i) => `${THAI_MONTHS_FULL[i]} ${year + 543}`}
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
            <DonutChart
              items={categoryItems}
              total={categoryTotal}
              activeIndex={activeCat}
              onActiveChange={setActiveCat}
            />
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
                    <tr
                      key={item.label}
                      onPointerEnter={() => setActiveCat(index)}
                      onPointerLeave={() => setActiveCat(null)}
                      className={`transition-colors ${activeCat === index ? 'bg-surface-alt' : ''}`}
                    >
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
