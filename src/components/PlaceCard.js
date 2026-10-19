'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Heart, MapPin, Eye, ArrowUpRight } from 'lucide-react';
import { useFavorite } from '@/hooks/useFavorites';

export default function PlaceCard({ place }) {
  const { isFavorite, toggleFavorite } = useFavorite(place.place_id);
  const [failedImage, setFailedImage] = useState(null);
  const imageUrl = place.image_url?.trim();
  const hasImage = imageUrl && failedImage !== imageUrl;
  return (
    <article className="place-card group">
      <Link
        href={`/places/${place.place_id}`}
        className="block"
        aria-label={`ดูรายละเอียด ${place.name}`}
      >
        <div className="aspect-[4/3] overflow-hidden bg-surface-alt relative">
          {hasImage ? (
            <Image
              key={imageUrl}
              src={imageUrl}
              alt={place.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setFailedImage(imageUrl)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden bg-surface-alt px-6 py-8 text-center"
              role="img"
              aria-label={`ไม่มีภาพสำหรับ ${place.name}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full border border-primary/10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full border border-primary/10"
              />
              <div
                aria-hidden="true"
                className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-bg text-primary"
              >
                <MapPin size={28} strokeWidth={1.3} />
              </div>
              <div className="relative">
                <p className="text-sm font-medium text-primary">หล่มสักจัดทริป AI</p>
                <p className="mt-1 text-xs leading-5 text-content-secondary">ยังไม่มีภาพให้แสดง</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-xs text-accent font-medium mb-2">
            {place.category_name || 'สถานที่ท่องเที่ยว'}
          </p>
          <h3 className="text-lg leading-7 line-clamp-2 group-hover:text-primary">{place.name}</h3>
          {place.address && (
            <p className="text-sm text-content-secondary mt-2 line-clamp-2 leading-6">
              {place.address}
            </p>
          )}
          <div className="mt-5 pt-4 border-t border-border-light flex items-center justify-between gap-2">
            <span className="text-xs text-content-secondary flex items-center gap-1.5">
              <Eye size={14} /> {place.visit_count || 0} เข้าชม
            </span>
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              สำรวจ <ArrowUpRight size={17} />
            </span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={toggleFavorite}
        aria-pressed={isFavorite}
        aria-label={`${isFavorite ? 'นำออกจาก' : 'เพิ่มใน'}รายการโปรด: ${place.name}`}
        className="favorite-button"
      >
        <Heart size={19} className={isFavorite ? 'text-accent fill-accent' : 'text-primary-dark'} />
      </button>
    </article>
  );
}
