'use client';
import { useState, useEffect } from 'react';
import { BarChart3, Eye, MapPin } from 'lucide-react';
export default function StaffReportsPage() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const me = await (await fetch('/api/auth/me')).json();
      if (!me.user) return;
      const perms = await (await fetch(`/api/staff-permissions?user_id=${me.user.user_id}`)).json();
      const details = await Promise.all(
        (perms.permissions || []).map(
          async (p) => (await (await fetch(`/api/places/${p.place_id}`)).json()).place
        )
      );
      setPlaces(
        details.filter(Boolean).sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const total = places.reduce((s, p) => s + (p.visit_count || 0), 0);
  const max = Math.max(...places.map((p) => p.visit_count || 0), 1);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">รายงานสถานที่</h2>
        <p className="mt-2 text-sm text-content-secondary">
          เปรียบเทียบจำนวนผู้เข้าชมของสถานที่ที่คุณดูแล
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5">
          <MapPin className="mb-5 h-5 w-5 text-primary" />
          <p className="text-sm text-content-secondary">สถานที่ที่ดูแล</p>
          <p className="mt-1 text-2xl font-semibold">{places.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <Eye className="mb-5 h-5 w-5 text-primary" />
          <p className="text-sm text-content-secondary">ผู้เข้าชมรวม</p>
          <p className="mt-1 text-2xl font-semibold">{total.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <BarChart3 className="mb-5 h-5 w-5 text-primary" />
          <p className="text-sm text-content-secondary">เฉลี่ยต่อสถานที่</p>
          <p className="mt-1 text-2xl font-semibold">
            {places.length ? Math.round(total / places.length).toLocaleString() : 0}
          </p>
        </div>
      </div>
      <section className="rounded-2xl border border-border bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" />
          อันดับจำนวนผู้เข้าชม
        </h3>
        <div className="mt-5 space-y-5">
          {places.map((p, i) => (
            <div key={p.place_id} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-xs font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-content-muted">{p.category_name || '-'}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm text-content-secondary">
                    {(p.visit_count || 0).toLocaleString()} ครั้ง
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-alt">
                  <div
                    className="h-2.5 rounded-full bg-primary"
                    style={{ width: `${Math.max(((p.visit_count || 0) / max) * 100, 4)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <p className="py-8 text-center text-sm text-content-muted">กำลังโหลดข้อมูล...</p>
          )}
          {!loading && !places.length && (
            <p className="py-8 text-center text-sm text-content-muted">
              ยังไม่มีสถานที่ที่ได้รับมอบหมาย
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
