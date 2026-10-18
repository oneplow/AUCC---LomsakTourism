'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus, MapPin, Trophy } from 'lucide-react';
import { THAI_MONTHS_SHORT, THAI_MONTHS_FULL, formatNumber } from '@/components/reports/ReportCharts';

// ชิ้นส่วนหน้าแดชบอร์ดที่ใช้ร่วมกันระหว่าง admin และ staff
// ข้อมูลทั้งหมดมาจาก GET /api/reports?type=dashboard (คำขอเดียว)

export function useDashboard() {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  useEffect(() => {
    let active = true;
    fetch('/api/reports?type=dashboard')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => active && setState({ data, loading: false, error: false }))
      .catch((err) => {
        console.error(err);
        if (active) setState({ data: null, loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}

function parseDate(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function ymd(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** สร้างแกน 30 วันล่าสุด (อิงวันที่ของฐานข้อมูล) แล้วเติม 0 ในวันที่ไม่มีข้อมูล */
export function buildLast30(todayYmd, ...seriesRows) {
  const today = todayYmd ? parseDate(todayYmd) : new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d;
  });
  return {
    labels: days.map((d) => `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`),
    fullLabels: days.map(
      (d) => `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`
    ),
    values: seriesRows.map((rows) => {
      const map = new Map((rows || []).map((r) => [r.d, Number(r.total) || 0]));
      return days.map((d) => map.get(ymd(d)) || 0);
    }),
  };
}

export function thaiToday(todayYmd) {
  const d = todayYmd ? parseDate(todayYmd) : new Date();
  return d.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** เปลี่ยนแปลงเทียบช่วงก่อนหน้า: ลูกศร + ข้อความ (ไม่สื่อด้วยสีอย่างเดียว) */
export function Delta({ current, previous, compareLabel, inverted = false }) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  let tone = 'neutral';
  let text = 'เท่าเดิม';
  let Icon = Minus;
  if (prev === 0 && cur > 0) {
    tone = 'up';
    text = `+${formatNumber(cur)}`;
    Icon = ArrowUpRight;
  } else if (prev > 0 && cur !== prev) {
    const pct = Math.round(((cur - prev) / prev) * 100);
    tone = cur > prev ? 'up' : 'down';
    text = `${pct > 0 ? '+' : ''}${pct}%`;
    Icon = cur > prev ? ArrowUpRight : ArrowDownRight;
  } else if (prev === 0 && cur === 0) {
    text = 'ยังไม่มีข้อมูล';
  }
  const toneClass = inverted
    ? 'bg-white/15 text-white'
    : tone === 'up'
      ? 'bg-success/10 text-success'
      : tone === 'down'
        ? 'bg-danger/10 text-danger'
        : 'bg-surface-alt text-content-muted';
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${toneClass}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {text}
      </span>
      <span className={inverted ? 'text-white/70' : 'text-content-muted'}>
        {compareLabel} ({formatNumber(prev)})
      </span>
    </p>
  );
}

export function KpiCard({ icon: Icon, label, value, previous, compareLabel, highlight = false }) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        highlight ? 'border-primary bg-primary text-white' : 'border-border bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm ${highlight ? 'text-white/80' : 'text-content-secondary'}`}>
          {label}
        </p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            highlight ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{formatNumber(value)}</p>
      {previous !== undefined && (
        <Delta
          current={value}
          previous={previous}
          compareLabel={compareLabel}
          inverted={highlight}
        />
      )}
    </div>
  );
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-[150px] animate-pulse rounded-3xl bg-surface-alt" />
      ))}
    </div>
  );
}

export function Panel({ title, subtitle, icon: Icon, action, className = '', children }) {
  return (
    <section className={`rounded-3xl border border-border bg-white p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-content-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TextLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

const MEDALS = ['#b58a4a', '#8a908a', '#79563f'];

export function TopPlaces({ items, emptyText = 'ยังไม่มีผู้เข้าชมใน 30 วันล่าสุด' }) {
  if (!items?.length) {
    return <p className="py-10 text-center text-sm text-content-muted">{emptyText}</p>;
  }
  const max = Math.max(...items.map((p) => Number(p.visits) || 0), 1);
  return (
    <ol className="space-y-3">
      {items.map((p, i) => {
        const visits = Number(p.visits) || 0;
        return (
          <li key={p.place_id}>
            <Link
              href={`/places/${p.place_id}`}
              target="_blank"
              className="group flex items-center gap-3 rounded-2xl border border-border-light p-2.5 transition hover:border-border hover:bg-surface-alt/50"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-alt">
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <MapPin className="absolute inset-0 m-auto h-5 w-5 text-content-muted" />
                )}
                <span
                  className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: MEDALS[i] || MEDALS[2] }}
                >
                  {i + 1}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium group-hover:text-primary">
                  {p.name}
                </span>
                <span className="block truncate text-xs text-content-muted">
                  {p.category_name || 'ไม่มีหมวดหมู่'}
                </span>
                <span className="mt-1.5 block h-1.5 rounded-full bg-surface-alt">
                  <span
                    className="block h-1.5 rounded-full bg-primary"
                    style={{ width: `${Math.max((visits / max) * 100, 6)}%` }}
                  />
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-base font-semibold">{formatNumber(visits)}</span>
                <span className="block text-[11px] text-content-muted">ครั้ง</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function TopPlacesTitle() {
  return (
    <span className="flex items-center gap-2">
      <Trophy className="h-4 w-4 text-gold" />
      ยอดนิยม 3 อันดับ
    </span>
  );
}

export function QuickActions({ actions }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {actions.map(({ href, label, description, icon: Icon, primary }) => (
        <Link
          key={href}
          href={href}
          className={`group flex items-center gap-3 rounded-2xl border p-3.5 transition ${
            primary
              ? 'border-primary bg-primary text-white hover:bg-primary-dark'
              : 'border-border-light hover:border-border hover:bg-surface-alt/50'
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              primary ? 'bg-white/15' : 'bg-primary/10 text-primary'
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{label}</span>
            {description && (
              <span
                className={`block truncate text-xs ${primary ? 'text-white/75' : 'text-content-muted'}`}
              >
                {description}
              </span>
            )}
          </span>
          <ArrowRight
            className={`h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${
              primary ? 'text-white/80' : 'text-content-muted'
            }`}
          />
        </Link>
      ))}
    </div>
  );
}

export function DashboardError() {
  return (
    <div className="rounded-3xl border border-border bg-white p-10 text-center">
      <p className="font-medium">โหลดข้อมูลแดชบอร์ดไม่สำเร็จ</p>
      <p className="mt-1 text-sm text-content-muted">ลองรีเฟรชหน้านี้อีกครั้ง</p>
    </div>
  );
}
