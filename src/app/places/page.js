import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PlacesClient from '@/components/PlacesClient';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

async function getPlaces() {
  try {
    const res = await fetch("http://localhost:3000/api/places?sort=newest&limit=50", {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.places || [];
  } catch (error) {
    console.error('Failed to fetch places:', error);
    return [];
  }
}

async function getCategories() {
  try {
    const res = await fetch("http://localhost:3000/api/categories", {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

export default async function PlacesPage() {
  const [places, categories] = await Promise.all([
    getPlaces(),
    getCategories()
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Navbar />
      <main className="flex-1">
        <header className="border-b border-border bg-surface-alt py-6 sm:py-10">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-12">
            <div className="pt-3">
              <p className="eyebrow">คู่มือการเดินทาง / หล่มสัก</p>
              <h1 className="mt-4 text-2xl leading-snug lg:text-4xl xl:text-5xl">
                จุดหมายใหม่<br className="hidden lg:block" />
                <span className="text-primary">เรื่องราวที่รอคุณอยู่</span>
              </h1>
            </div>
            <div className="lg:pt-3">
              <p className="leading-8 text-content-secondary">
                จากธรรมชาติอันเงียบสงบ สู่เสน่ห์ของชุมชน เลือกสถานที่ที่อยากไป แล้วเก็บเป็นแรงบันดาลใจให้ทริปถัดไป
              </p>
              <Link href="/#planner" className="mt-5 inline-flex items-center gap-2 font-medium text-primary">
                นำไอเดียไปวางแผนทริป <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </header>
        <section className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 md:pb-24" aria-label="ค้นหาสถานที่ท่องเที่ยว">
          <PlacesClient initialPlaces={places} initialCategories={categories} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
