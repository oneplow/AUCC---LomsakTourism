'use client';
import {
  Eye,
  CalendarDays,
  CalendarRange,
  MapPin,
  TrendingUp,
  PencilLine,
  BarChart3,
  UserCircle,
  Zap,
} from 'lucide-react';
import { LineChart, EmptyChart, formatNumber } from '@/components/reports/ReportCharts';
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

// แดชบอร์ด staff: ข้อมูลเฉพาะสถานที่ที่ได้รับมอบหมาย (API กรองจาก token)
// รายละเอียด/ย้อนหลัง/export อยู่ที่ /staff/reports

const VISIT_COLOR = '#b96545';

export default function StaffDashboard() {
  const { data, loading, error } = useDashboard();

  const v = data?.visits || {};
  const placeCount = Number(data?.counts?.places) || 0;
  const trend = buildLast30(v.today_date, data?.daily);
  const [visits30] = trend.values;
  const hasTrend = visits30.some((x) => x > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">
            {data ? thaiToday(v.today_date) : 'พื้นที่รับผิดชอบ'}
          </p>
          <h1 className="text-2xl font-semibold">
            สวัสดี, {data?.full_name || 'เจ้าหน้าที่'}
          </h1>
          <p className="mt-2 text-sm text-content-secondary">
            ผู้เข้าชมสถานที่ที่คุณดูแล เทียบกับช่วงก่อนหน้า
          </p>
        </div>
        <TextLink href="/staff/reports">ดูรายงานเต็ม</TextLink>
      </div>

      {error ? (
        <DashboardError />
      ) : loading ? (
        <KpiSkeleton />
      ) : placeCount === 0 ? (
        <div className="rounded-3xl border border-border bg-white p-10 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="font-semibold">ยังไม่มีสถานที่ที่ได้รับมอบหมาย</p>
          <p className="mt-1 text-sm text-content-muted">
            ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์จัดการสถานที่
          </p>
        </div>
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
            <div className="rounded-3xl border border-border bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-content-secondary">สถานที่ที่ดูแล</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-[18px] w-[18px]" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatNumber(placeCount)}
              </p>
              <p className="mt-3 text-xs text-content-muted">
                ผู้เข้าชมสะสม {formatNumber(v.total)} ครั้ง
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              icon={TrendingUp}
              title="ผู้เข้าชม 30 วันล่าสุด"
              subtitle={`${trend.fullLabels[0]} – ${trend.fullLabels[29]}`}
            >
              {hasTrend ? (
                <LineChart
                  labels={trend.labels}
                  formatLabel={(i) => trend.fullLabels[i]}
                  minLabelGap={46}
                  series={[{ name: 'ผู้เข้าชม', color: VISIT_COLOR, values: visits30 }]}
                />
              ) : (
                <EmptyChart />
              )}
            </Panel>

            <div className="space-y-6">
              <Panel title={<TopPlacesTitle />} subtitle="ในสถานที่ที่คุณดูแล · 30 วันล่าสุด">
                <TopPlaces items={data?.top} />
              </Panel>
              <Panel icon={Zap} title="ทางลัด">
                <QuickActions
                  actions={[
                    {
                      href: '/staff/places',
                      label: 'แก้ไขสถานที่',
                      description: 'อัปเดตข้อมูล เวลาเปิด และรูปภาพ',
                      icon: PencilLine,
                      primary: true,
                    },
                    {
                      href: '/staff/reports',
                      label: 'รายงานและสถิติ',
                      description: 'ดูย้อนหลังและ export CSV',
                      icon: BarChart3,
                    },
                    {
                      href: '/staff/profile',
                      label: 'ข้อมูลส่วนตัว',
                      description: 'แก้ไขชื่อ อีเมล รหัสผ่าน',
                      icon: UserCircle,
                    },
                  ]}
                />
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
