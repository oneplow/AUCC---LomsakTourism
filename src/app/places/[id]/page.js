'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MapView from '@/components/MapView';
import { useFavorite } from '@/hooks/useFavorites';
import { formatOpenDays } from '@/lib/openDays';
import { Heart, Share2, Eye, MapPin, Clock, Phone, Navigation, ChevronRight } from 'lucide-react';

export default function PlaceDetailPage() {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const visitedRef = useRef(false);
  const { isFavorite: isFav, toggleFavorite: toggleFav } = useFavorite(place?.place_id);
  useEffect(() => {
    if (id) {
      fetchPlace();
      if (!visitedRef.current) {
        visitedRef.current = true;
        recordVisit();
      }
    }
  }, [id]);
  const fetchPlace = async () => {
    try {
      const res = await fetch(`/api/places/${id}`);
      const data = await res.json();
      setPlace(data.place);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const recordVisit = async () => {
    try {
      await fetch(`/api/places/${id}/visit`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };
  if (loading)
    return (
      <div className="min-h-screen bg-[#f6f4ed]">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pt-28">
          <div className="h-8 w-1/3 animate-pulse rounded bg-[#e6eadd]" />
          <div className="mt-6 aspect-video animate-pulse rounded-2xl bg-[#e6eadd]" />
        </main>
      </div>
    );
  if (!place)
    return (
      <div className="min-h-screen bg-[#f6f4ed]">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pt-28 text-center">
          <h1 className="text-2xl font-semibold">ไม่พบสถานที่</h1>
          <Link href="/" className="mt-4 inline-block text-[#2f6b4f]">
            ← กลับหน้าแรก
          </Link>
        </main>
      </div>
    );
  const images = place.images || [];
  return (
    <div className="min-h-screen bg-[#f6f4ed] text-[#20352b]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <div className="mb-7 flex items-center gap-1.5 text-sm text-[#68766d]">
          <Link href="/" className="hover:text-[#2f6b4f]">
            หน้าแรก
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/places" className="hover:text-[#2f6b4f]">
            สถานที่ท่องเที่ยว
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate text-[#20352b]">{place.name}</span>
        </div>
        <div className="mb-9 flex flex-col gap-5 border-b border-[#dfe3d9] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              {place.category_name && (
                <span className="rounded-lg bg-[#e7efe6] px-3 py-1 text-sm font-semibold text-[#2f6b4f]">
                  {place.category_name}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-[#68766d]">
                <Eye className="h-4 w-4" />
                {place.visit_count || 0} เข้าชม
              </span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{place.name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleFav}
              aria-label="บันทึกรายการโปรด"
              className={`rounded-xl border border-[#ccd7cb] bg-white p-3 transition hover:border-[#2f6b4f] ${isFav ? 'text-red-600' : 'text-[#526258]'}`}
            >
              <Heart className="h-5 w-5" fill={isFav ? 'currentColor' : 'none'} />
            </button>
            <Link
              href={`/share/${place.place_id}`}
              aria-label="แชร์สถานที่"
              className="rounded-xl border border-[#ccd7cb] bg-white p-3 text-[#526258] transition hover:border-[#2f6b4f]"
            >
              <Share2 className="h-5 w-5" />
            </Link>
          </div>
        </div>
        {images.length > 0 && (
          <div className="mb-10 grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-[#e6eadd] relative">
              <Image
                src={images[activeImage]?.image_url}
                alt={place.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
                className="object-cover"
                priority
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto md:flex-col">
                {images.map((img, idx) => (
                  <button
                    key={img.image_id}
                    onClick={() => setActiveImage(idx)}
                    className={`h-20 shrink-0 overflow-hidden rounded-xl border-2 md:h-auto md:flex-1 relative ${idx === activeImage ? 'border-[#2f6b4f]' : 'border-transparent opacity-65'}`}
                  >
                    <Image src={img.image_url} alt="" fill sizes="180px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {place.description && (
              <section className="rounded-2xl border border-[#dfe3d9] bg-white p-6 sm:p-7">
                <h2 className="mb-3 text-xl font-semibold">เกี่ยวกับสถานที่</h2>
                <p className="leading-7 text-[#68766d]">{place.description}</p>
              </section>
            )}
            {place.history && (
              <section className="rounded-2xl border border-[#dfe3d9] bg-white p-6 sm:p-7">
                <h2 className="mb-3 text-xl font-semibold">ประวัติ</h2>
                <p className="leading-7 text-[#68766d]">{place.history}</p>
              </section>
            )}
            <section className="rounded-2xl border border-[#dfe3d9] bg-white p-6 sm:p-7">
              <h2 className="mb-4 text-xl font-semibold">แผนที่</h2>
              <div className="overflow-hidden rounded-xl">
                <MapView
                  latitude={parseFloat(place.latitude)}
                  longitude={parseFloat(place.longitude)}
                  name={place.name}
                  className="h-[350px]"
                />
              </div>
              {place.latitude && place.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2f6b4f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24563f]"
                >
                  <Navigation className="h-4 w-4" />
                  นำทาง Google Maps
                </a>
              )}
            </section>
          </div>
          <aside className="h-fit rounded-2xl border border-[#dfe3d9] bg-white p-6 lg:sticky lg:top-24">
            <h2 className="mb-5 text-lg font-semibold">ข้อมูลสถานที่</h2>
            <div className="space-y-5">
              {place.address && (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6b4f]" />
                  <div>
                    <p className="text-xs text-[#8a968d]">ที่อยู่</p>
                    <p className="mt-1 text-sm leading-6">{place.address}</p>
                  </div>
                </div>
              )}
              {(place.open_time || place.close_time) && (
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6b4f]" />
                  <div>
                    <p className="text-xs text-[#8a968d]">เวลาเปิด-ปิด</p>
                    <p className="mt-1 text-sm">
                      {place.open_time} - {place.close_time}
                    </p>
                    <p className="mt-0.5 text-sm text-[#68766d]">
                      {formatOpenDays(place.open_days)}
                    </p>
                  </div>
                </div>
              )}
              {place.phone && (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6b4f]" />
                  <div>
                    <p className="text-xs text-[#8a968d]">โทรศัพท์</p>
                    <p className="mt-1 text-sm">{place.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
