import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PlaceCard from '@/components/PlaceCard';
import TripPlanner from '@/components/TripPlanner';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

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

async function getFeaturedPlaces() {
  try {
    const res = await fetch("http://localhost:3000/api/places?sort=popular&limit=4", {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.places || [];
  } catch (error) {
    console.error('Failed to fetch featured places:', error);
    return [];
  }
}

async function getAllPlaces() {
  try {
    const res = await fetch("http://localhost:3000/api/places?limit=200", {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.places || [];
  } catch (error) {
    console.error('Failed to fetch all places:', error);
    return [];
  }
}

export default async function HomePage() {
  const [categories, featuredPlaces, allPlaces] = await Promise.all([
    getCategories(),
    getFeaturedPlaces(),
    getAllPlaces()
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Navbar />
      <main className="flex-1">
        <TripPlanner categories={categories} allPlaces={allPlaces} />

        <section className="page-shell py-16 md:py-24" aria-labelledby="featured-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / เก็บจุดหมายไว้ในใจ</p>
              <h2 id="featured-title" className="mt-3 text-3xl md:text-4xl">หล่มสัก มีอะไรให้ค้นพบ</h2>
            </div>
            <Link href="/places" className="text-primary font-medium inline-flex items-center gap-2">
              ดูสถานที่ทั้งหมด <ArrowRight size={18} />
            </Link>
          </div>
          {featuredPlaces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredPlaces.map(place => <PlaceCard key={place.place_id} place={place} />)}
            </div>
          ) : (
            <div className="border-y border-border py-10 text-content-secondary">
              สำรวจธรรมชาติ วัฒนธรรม และวิถีท้องถิ่น แล้วเลือกจุดหมายสำหรับวันพักผ่อนของคุณ{' '}
              <Link href="/places" className="text-primary underline underline-offset-4">
                เริ่มค้นหาสถานที่
              </Link>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
