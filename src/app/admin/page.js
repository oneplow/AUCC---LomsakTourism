'use client';
import {
  Eye,
  CalendarDays,
  CalendarRange,
  Bot,
  TrendingUp,
  MapPin,
  Tag,
  Users,
  Plus,
  BarChart3,
  Zap,
} from 'lucide-react';
import { LineChart, ChartLegend, EmptyChart, formatNumber } from '@/components/reports/ReportCharts';
import {
  useDashboard,
  buildLast30,
  thaiToday,
  KpiCard,
  KpiSkeleton,
  Panel,
  TextLink,
  TopPlaces,
  TopPlacesTitle,
  QuickActions,
  DashboardError,
} from '@/components/dashboard/DashboardParts';

// แดชบอร์ด admin: ดูแวบเดียวว่าช่วงนี้เป็นอย่างไร — รายละเอียด/ย้อนหลัง/export อยู่ที่ /admin/reports

const VISIT_COLOR = '#b96545';
const TRIP_COLOR = '#3f6fa8';

export default function AdminDashboard() {
  const { data, loading, error } = useDashboard();

  const v = data?.visits || {};
  const t = data?.trips || {};
  const c = data?.counts || {};
  const trend = buildLast30(v.today_date, data?.daily, data?.tripDaily);
  const [visits30, trips30] = trend.values;
  const hasTrend = visits30.some((x) => x > 0) || trips30.some((x) => x > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">
            {data ? thaiToday(v.today_date) : 'ภาพรวมระบบ'}
          </p>
          <h1 className="text-2xl font-semibold">
            สวัสดี{data?.full_name ? `, ${data.full_name}` : ''}
          </h1>
          <p className="mt-2 text-sm text-content-secondary">
            สรุปผู้เข้าชมและการใช้งานระบบล่าสุด เทียบกับช่วงก่อนหน้า
          </p>
        </div>
        <TextLink href="/admin/reports">ดูรายงานเต็ม</TextLink>
      </div>

      {error ? (
        <DashboardError />
      ) : loading ? (
        <KpiSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              highlight
              icon={Eye}
              label="ผู้เข้าชมวันนี้"
              value={Number(v.today) || 0}
              previous={Number(v.yesterday) || 0}
              compareLabel="เมื่อวาน"
            />
            <KpiCard
              icon={CalendarDays}
              label="7 วันล่าสุด"
              value={Number(v.last7) || 0}
              previous={Number(v.prev7) || 0}
              compareLabel="7 วันก่อนหน้า"
            />
            <KpiCard
              icon={CalendarRange}
              label="เดือนนี้"
              value={Number(v.month) || 0}
              previous={Number(v.prev_month) || 0}
              compareLabel="ช่วงเดียวกันเดือนก่อน"
            />
            <KpiCard
              icon={Bot}
              label="แผนทริป AI · 7 วัน"
              value={Number(t.last7) || 0}
              previous={Number(t.prev7) || 0}
              compareLabel="7 วันก่อนหน้า"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              icon={TrendingUp}
              title="แนวโน้ม 30 วันล่าสุด"
              subtitle={`${trend.fullLabels[0]} – ${trend.fullLabels[29]}`}
            >
              {hasTrend ? (
                <div className="space-y-3">
                  <LineChart
                    labels={trend.labels}
                    formatLabel={(i) => trend.fullLabels[i]}
                    minLabelGap={46}
                    series={[
                      { name: 'ผู้เข้าชม', color: VISIT_COLOR, values: visits30 },
                      { name: 'แผนทริป AI', color: TRIP_COLOR, values: trips30 },
                    ]}
                  />
                  <ChartLegend
                    series={[
                      { name: 'ผู้เข้าชม', color: VISIT_COLOR },
                      { name: 'แผนทริป AI', color: TRIP_COLOR },
                    ]}
                  />
                </div>
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <Panel title={<TopPlacesTitle />} subtitle="ผู้เข้าชมสูงสุดใน 30 วันล่าสุด">
              <TopPlaces items={data?.top} />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              icon={BarChart3}
              title="ข้อมูลในระบบ"
              subtitle="จำนวนรวมทั้งหมด ณ ตอนนี้"
            >
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'สถานที่', value: c.places, icon: MapPin },
                  { label: 'หมวดหมู่', value: c.categories, icon: Tag },
                  { label: 'ผู้ใช้งาน', value: c.users, icon: Users },
                  { label: 'แผนทริป AI', value: t.total, icon: Bot },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl bg-surface-alt/60 p-4">
                    <dt className="flex items-center gap-2 text-xs text-content-secondary">
                      <Icon className="h-4 w-4 text-primary" />
                      {label}
                    </dt>
                    <dd className="mt-2 text-2xl font-semibold">{formatNumber(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-content-muted">
                ผู้เข้าชมสะสมทั้งหมด {formatNumber(v.total)} ครั้ง
              </p>
            </Panel>

            <Panel icon={Zap} title="ทางลัด">
              <QuickActions
                actions={[
                  {
                    href: '/admin/places?new=1',
                    label: 'เพิ่มสถานที่',
                    description: 'สร้างสถานที่ท่องเที่ยวใหม่',
                    icon: Plus,
                    primary: true,
                  },
                  {
                    href: '/admin/users',
                    label: 'จัดการผู้ใช้',
                    description: 'เพิ่ม staff และกำหนดสิทธิ์',
                    icon: Users,
                  },
                  {
                    href: '/admin/reports',
                    label: 'รายงานและสถิติ',
                    description: 'ดูย้อนหลังและ export CSV',
                    icon: BarChart3,
                  },
                ]}
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
