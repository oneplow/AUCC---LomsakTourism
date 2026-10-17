'use client';
import { useState, useEffect } from 'react';
import { Search, Heart, MapPin, SlidersHorizontal } from 'lucide-react';
import PlaceCard from '@/components/PlaceCard';
import Select from '@/components/Select';

export default function PlacesClient({ initialPlaces, initialCategories }) {
  const [places, setPlaces] = useState(initialPlaces);
  const [categories] = useState(initialCategories);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState([]);

  // Sync favorites from localStorage
  useEffect(() => {
    const sync = () => setFavorites(JSON.parse(localStorage.getItem('favorites') || '[]'));
    sync();
    window.addEventListener('favorites-changed', sync);
    return () => window.removeEventListener('favorites-changed', sync);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPlaces = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ sort, limit: '50' });
        if (query) params.set('search', query);
        if (selectedCategory) params.set('category', selectedCategory);
        const res = await fetch(`/api/places?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
        const data = await res.json();
        setPlaces(data.places || []);
      } catch (err) {
        if (err.name !== 'AbortError')
          setError('ไม่สามารถโหลดสถานที่ได้ในขณะนี้ กรุณาลองใหม่ภายหลัง');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPlaces();
    return () => controller.abort();
  }, [selectedCategory, sort, query]);

  const displayPlaces = showFavoritesOnly
    ? places.filter((p) => favorites.includes(p.place_id))
    : places;
  const resetFilters = () => {
    setSearch('');
    setQuery('');
    setSelectedCategory('');
    setShowFavoritesOnly(false);
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
        className="places-search"
      >
        <label htmlFor="place-search" className="sr-only">
          ค้นหาสถานที่ท่องเที่ยว
        </label>
        <Search size={22} className="text-primary shrink-0" />
        <input
          id="place-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="อยากไปที่ไหน? ค้นหาชื่อสถานที่"
          className="min-w-0 flex-1 bg-transparent py-3 text-content outline-none"
        />
        <button type="submit" className="nature-button">
          ค้นหา
        </button>
      </form>

      <div className="places-explorer">
        <aside className="places-filters" aria-label="ตัวกรองสถานที่">
          <h2 className="font-semibold text-base flex items-center gap-2 mb-5">
            <SlidersHorizontal size={17} /> เลือกสไตล์การเดินทาง
          </h2>
          <div className="category-list">
            <button
              type="button"
              aria-pressed={!selectedCategory}
              onClick={() => setSelectedCategory('')}
              className={`category-option ${!selectedCategory ? 'is-selected' : ''}`}
            >
              ทุกจุดหมาย
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.category_id}
                aria-pressed={selectedCategory === cat.category_id.toString()}
                onClick={() => setSelectedCategory(cat.category_id.toString())}
                className={`category-option ${selectedCategory === cat.category_id.toString() ? 'is-selected' : ''}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="border-t border-border mt-6 pt-6">
            <button
              type="button"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              aria-pressed={showFavoritesOnly}
              className={`filter-chip w-full justify-center ${showFavoritesOnly ? 'is-selected' : ''}`}
            >
              <Heart size={16} fill={showFavoritesOnly ? 'currentColor' : 'none'} />{' '}
              รายการที่บันทึกไว้
            </button>
            <p className="text-xs text-content-secondary mt-3 leading-6">
              กดหัวใจบนสถานที่ที่ชอบเพื่อบันทึกไว้บนอุปกรณ์นี้
            </p>
          </div>
        </aside>

        <div className="min-w-0" aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-border">
            <p role="status" className="text-sm text-content-secondary">
              {loading ? (
                'กำลังค้นหาจุดหมาย…'
              ) : (
                <>
                  พบ <strong className="text-content">{displayPlaces.length}</strong> สถานที่
                  {query && ` สำหรับ "${query}"`}
                </>
              )}
            </p>
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              เรียงตาม
              <Select
                id="places-sort"
                label="เรียงลำดับสถานที่"
                value={sort}
                onChange={setSort}
                size="sm"
                className="w-auto min-w-[9rem]"
                options={[
                  { value: 'newest', label: 'ล่าสุด' },
                  { value: 'popular', label: 'ยอดนิยม' },
                  { value: 'name', label: 'ชื่อ ก-ฮ' },
                ]}
              />
            </div>
          </div>

          {loading ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
              aria-hidden="true"
              role="status"
              aria-label="กำลังโหลดสถานที่"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
                  <div className="aspect-[4/3] bg-surface-alt animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-surface-alt rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-surface-alt rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-surface-alt rounded animate-pulse w-full" />
                    <div className="h-3 bg-surface-alt rounded animate-pulse w-5/6" />
                    <div className="flex gap-2 pt-2">
                      <div className="h-6 bg-surface-alt rounded animate-pulse w-16" />
                      <div className="h-6 bg-surface-alt rounded animate-pulse w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="result-panel text-center text-content-secondary py-16">
              {error}
            </div>
          ) : displayPlaces.length === 0 ? (
            <div className="result-panel text-center py-16">
              <MapPin size={36} className="mx-auto mb-5 text-primary" />
              <h2 className="text-xl mb-3">ยังไม่พบจุดหมายที่ตรงใจ</h2>
              <p className="text-content-secondary text-sm mb-6">
                ลองเปลี่ยนคำค้น หรือเลือกประเภทสถานที่อื่น
              </p>
              <button type="button" onClick={resetFilters} className="nature-button-secondary">
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayPlaces.map((place) => (
                <PlaceCard key={place.place_id} place={place} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
