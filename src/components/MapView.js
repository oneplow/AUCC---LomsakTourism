'use client';
import { useEffect, useRef, useState } from 'react';

export default function MapView({ latitude, longitude, name, className = '' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Use a unique key approach: remount the div to guarantee a fresh container
  useEffect(() => {
    setReady(true);
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !latitude || !longitude || !containerRef.current) return;

    // Ensure no previous map on this container
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {}
      mapRef.current = null;
    }

    let cancelled = false;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      // Clear Leaflet's internal reference if any
      if (containerRef.current._leaflet_id) {
        delete containerRef.current._leaflet_id;
      }

      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      try {
        const map = L.map(containerRef.current).setView([latitude, longitude], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        L.marker([latitude, longitude])
          .addTo(map)
          .bindPopup(`<b>${name || 'สถานที่'}</b>`)
          .openPopup();

        if (!cancelled) {
          mapRef.current = map;
        } else {
          map.remove();
        }
      } catch (e) {
        console.warn('Map init error:', e.message);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [ready, latitude, longitude, name]);

  if (!latitude || !longitude) {
    return (
      <div
        className={`bg-surface-alt rounded-xl flex items-center justify-center text-content-muted ${className}`}
      >
        <p className="text-sm">ไม่มีข้อมูลพิกัด</p>
      </div>
    );
  }

  return <div ref={containerRef} className={`rounded-xl overflow-hidden ${className}`} />;
}
