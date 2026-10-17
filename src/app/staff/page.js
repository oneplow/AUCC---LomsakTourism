'use client';
import { useState, useEffect } from 'react';
import { MapPin, Eye, BarChart3 } from 'lucide-react';
export default function StaffDashboard() {
  const [places, setPlaces] = useState([]);
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const me = await (await fetch('/api/auth/me')).json();
      if (!me.user) return;
      setUser(me.user);
      const perms = await (await fetch(`/api/staff-permissions?user_id=${me.user.user_id}`)).json();
      const details = await Promise.all(
        (perms.permissions || []).map(
          async (p) => (await (await fetch(`/api/places/${p.place_id}`)).json()).place
        )
      );
      setPlaces(details.filter(Boolean));
    } catch (err) {
      console.error(err);
    }
  };
  const total = places.reduce((s, p) => s + (p.visit_count || 0), 0);
  const max = Math.max(...places.map((p) => p.visit_count || 0), 1);
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-sm font-medium text-primary">พื้นที่รับผิดชอบ</p>
        <h2 className="text-2xl font-semibold">สวัสดี, {user?.full_name || 'เจ้าหน้าที่'}</h2>
        <p className="mt-2 text-sm text-content-secondary">
          ติดตามสถานที่ที่ได้รับมอบหมายและจำนวนผู้เข้าชมจากหน้านี้
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <p className="text-sm text-content-secondary">สถานที่ที่ดูแล</p>
          <p className="mt-1 text-2xl font-semibold">{places.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Eye className="h-5 w-5" />
          </div>
          <p className="text-sm text-content-secondary">ผู้เข้าชมทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold">{total.toLocaleString()}</p>
        </div>
      </div>
      <section className="rounded-2xl border border-border bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" />
          อันดับสถานที่ที่ดูแล
        </h3>
        <div className="mt-5 space-y-4">
          {[...places]
            .sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0))
            .map((p, i) => (
              <div key={p.place_id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between gap-3">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <span className="text-sm text-content-secondary">{p.visit_count || 0}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-alt">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(((p.visit_count || 0) / max) * 100, 4)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          {!places.length && (
            <div className="py-8 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-content-muted" />
              <p className="text-sm text-content-secondary">ยังไม่มีสถานที่ที่ได้รับมอบหมาย</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
