'use client';
import { useState, useEffect } from 'react';
import { MapPin, Eye, Bot, Users, BarChart3, Layers } from 'lucide-react';
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [topVisited, setTopVisited] = useState([]);
  const [tripUsage, setTripUsage] = useState(null);
  const [popularCats, setPopularCats] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all(
      [
        '/api/reports?type=summary',
        '/api/reports?type=top_visited',
        '/api/reports?type=trip_usage',
        '/api/reports?type=popular_categories',
      ].map((url) => fetch(url).then((r) => r.json()))
    )
      .then(([s, v, t, c]) => {
        setStats(s.data);
        setTopVisited(v.data || []);
        setTripUsage(t.data);
        setPopularCats(c.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-white" />
        ))}
      </div>
    );
  const cards = [
    { label: 'สถานที่ทั้งหมด', value: stats?.places || 0, icon: MapPin },
    { label: 'เข้าชมทั้งหมด', value: stats?.visits || 0, icon: Eye },
    { label: 'แผนทริปที่สร้าง', value: stats?.trips || 0, icon: Bot },
    { label: 'ผู้ใช้งานระบบ', value: stats?.users || 0, icon: Users },
  ];
  const max = Math.max(...topVisited.map((p) => p.visit_count || 0), 1);
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-sm font-medium text-primary">ภาพรวมระบบ</p>
        <h2 className="text-2xl font-semibold">ยินดีต้อนรับกลับมา</h2>
        <p className="mt-2 text-sm text-content-secondary">
          ติดตามข้อมูลสถานที่ ผู้ใช้งาน และการใช้งานระบบจากหน้านี้
        </p>
      </div>
      <section>
        <h3 className="mb-3 text-sm font-semibold">สรุปข้อมูลสำคัญ</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-white p-5">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-content-secondary">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-white p-5 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <BarChart3 className="h-5 w-5 text-primary" />
                สถานที่ยอดนิยม
              </h3>
              <p className="mt-1 text-sm text-content-muted">เรียงตามจำนวนการเข้าชม</p>
            </div>
            <span className="text-xs text-content-muted">Top {topVisited.length}</span>
          </div>
          <div className="space-y-4">
            {topVisited.map((p, i) => (
              <div key={p.place_id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between gap-3">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <span className="text-sm text-content-secondary">{p.visit_count} ครั้ง</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-alt">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max((p.visit_count / max) * 100, 4)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!topVisited.length && (
              <p className="py-8 text-center text-sm text-content-muted">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </section>
        <div className="space-y-6">
          {tripUsage && (
            <section className="rounded-2xl border border-border bg-white p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Bot className="h-5 w-5 text-primary" />
                การใช้งาน AI
              </h3>
              <p className="text-sm text-content-secondary">แผนทริปที่สร้างทั้งหมด</p>
              <p className="mt-1 text-3xl font-semibold">{tripUsage.total_trips}</p>
              <p className="mt-4 border-t border-border pt-3 text-xs text-content-muted">
                อัปเดตล่าสุด:{' '}
                {tripUsage.last_trip
                  ? new Date(tripUsage.last_trip).toLocaleDateString('th-TH')
                  : '-'}
              </p>
            </section>
          )}
          <section className="rounded-2xl border border-border bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Layers className="h-5 w-5 text-primary" />
              หมวดหมู่ยอดนิยม
            </h3>
            <div className="space-y-2">
              {popularCats.map((c) => (
                <div
                  key={c.category_id}
                  className="flex justify-between rounded-lg bg-surface-alt px-3 py-2 text-sm"
                >
                  <span>{c.name}</span>
                  <span className="text-content-secondary">{c.visit_count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
