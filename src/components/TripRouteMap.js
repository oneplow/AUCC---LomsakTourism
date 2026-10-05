'use client';
import { useEffect, useRef, useState } from 'react';

const MARKER_COLORS = ['#2d6a4f', '#e76f51', '#264653', '#2a9d8f', '#6d28d9', '#dc2626', '#e9c46a', '#f4a261'];

/**
 * Groups markers into clusters where any two members are within THRESHOLD of each other,
 * using a union-find approach so chains of nearby points all end up in one cluster.
 */
function buildClusters(places, threshold = 0.003) {
  const n = places.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(a, b) {
    parent[find(a)] = find(b);
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dLat = Math.abs(places[i].lat - places[j].lat);
      const dLng = Math.abs(places[i].lng - places[j].lng);
      if (dLat < threshold && dLng < threshold) {
        union(i, j);
      }
    }
  }

  // Group by root
  const clusters = {};
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusters[root]) clusters[root] = [];
    clusters[root].push(i);
  }
  return Object.values(clusters);
}

/**
 * Compute display coordinates: for clusters with >1 member, spread them in a spiral/circle
 * large enough that markers don't visually overlap (~32px icon → ~0.0004° per px at zoom13).
 * We use an adaptive radius based on cluster size.
 */
function computeDisplayCoords(places) {
  const display = places.map(p => ({ lat: p.lat, lng: p.lng }));
  const clusters = buildClusters(places, 0.003); // ~300m

  for (const cluster of clusters) {
    if (cluster.length <= 1) continue;

    // Centre of the cluster
    const cLat = cluster.reduce((s, i) => s + places[i].lat, 0) / cluster.length;
    const cLng = cluster.reduce((s, i) => s + places[i].lng, 0) / cluster.length;

    // Adaptive radius: more items → bigger circle
    const baseRadius = 0.006; // ~600m
    const radius = baseRadius * (1 + 0.3 * Math.log(cluster.length));

    cluster.forEach((idx, ci) => {
      // Evenly spaced around a circle, starting at top (−π/2)
      const angle = (2 * Math.PI * ci) / cluster.length - Math.PI / 2;
      display[idx] = {
        lat: cLat + radius * Math.sin(angle),
        lng: cLng + radius * Math.cos(angle),
      };
    });
  }

  return display;
}

export default function TripRouteMap({ places = [], userLocation = null, className = '' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) { }
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || places.length === 0) return;

    if (mapRef.current) {
      try { mapRef.current.remove(); } catch (e) { }
      mapRef.current = null;
    }
    if (containerRef.current._leaflet_id) {
      delete containerRef.current._leaflet_id;
    }

    let cancelled = false;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;

      try {
        const center = [places[0].lat, places[0].lng];
        const map = L.map(containerRef.current, { center, zoom: 13, zoomControl: true });
        mapRef.current = map;

        // Google Maps tile layers
        const googleRoad = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps', maxZoom: 20,
        });
        const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps', maxZoom: 20,
        });
        const googleTerrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps', maxZoom: 20,
        });

        googleRoad.addTo(map);
        L.control.layers(
          { 'แผนที่ถนน': googleRoad, 'ดาวเทียม': googleSatellite, 'ภูมิประเทศ': googleTerrain },
          {},
          { position: 'topright' }
        ).addTo(map);

        const bounds = [];

        // User location blue dot
        if (userLocation && userLocation.lat && userLocation.lng) {
          const userIcon = L.divIcon({
            className: 'user-loc',
            html: `<div style="width:16px;height:16px;background:#4285F4;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 5px rgba(66,133,244,0.2),0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16], iconAnchor: [8, 8],
          });
          L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 2000 })
            .addTo(map)
            .bindPopup('<strong>📍 จุดเริ่มต้นของคุณ</strong>');
          bounds.push([userLocation.lat, userLocation.lng]);
        }

        // Only valid coordinates
        const validPlaces = places.filter(
          p => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
        );

        // Compute spread-out display positions
        const displayCoords = computeDisplayCoords(validPlaces);

        const markers = [];

        validPlaces.forEach((place, index) => {
          const num = index + 1;
          const color = MARKER_COLORS[index % MARKER_COLORS.length];
          const dc = displayCoords[index];

          // Each marker gets a unique high zIndexOffset so later ones render on top
          // but ALL are visible — Leaflet renders by zIndex not by insertion order masking.
          const icon = L.divIcon({
            className: 'trip-pin',
            html: `<div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
              <svg viewBox="0 0 36 44" width="36" height="44" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"
                  fill="${color}" stroke="#fff" stroke-width="2"/>
                <circle cx="18" cy="17" r="11" fill="rgba(255,255,255,0.22)"/>
              </svg>
              <span style="position:absolute;top:5px;left:50%;transform:translateX(-50%);color:#fff;font-weight:800;font-size:14px;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.4);">${num}</span>
            </div>`,
            iconSize: [36, 44],
            iconAnchor: [18, 44],
            popupAnchor: [0, -46],
          });

          const marker = L.marker([dc.lat, dc.lng], {
            icon,
            // Stagger zIndex so all markers are clickable; higher index = higher z
            zIndexOffset: index * 10,
          }).addTo(map);

          // Draw a thin dashed line from display position back to real position
          // only when the marker was actually moved (cluster spread)
          const realPos = [place.lat, place.lng];
          const dispPos = [dc.lat, dc.lng];
          const moved =
            Math.abs(dispPos[0] - realPos[0]) > 0.0001 ||
            Math.abs(dispPos[1] - realPos[1]) > 0.0001;

          if (moved) {
            L.polyline([dispPos, realPos], {
              color: color,
              weight: 1.5,
              opacity: 0.5,
              dashArray: '4 4',
            }).addTo(map);
          }

          marker.bindPopup(`
            <div style="min-width:160px;font-family:var(--font-sans);">
              <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:3px;">จุดที่ ${num}</div>
              <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${place.name}</div>
              ${place.time ? `<div style="color:#888;font-size:12px;">🕐 ${place.time}</div>` : ''}
              ${place.description ? `<div style="font-size:12px;color:#555;margin-top:3px;">${place.description}</div>` : ''}
            </div>
          `);

          markers.push(marker);
          bounds.push(realPos); // fit bounds to REAL positions
        });

        // Legend panel
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
          const div = L.DomUtil.create('div', 'map-legend');
          let html = '<div class="map-legend-title">📍 กดเพื่อดูสถานที่</div>';
          if (userLocation && userLocation.lat && userLocation.lng) {
            html += `<div class="map-legend-item"><span class="map-legend-dot" style="background:#4285F4;"></span> จุดเริ่มต้น</div>`;
          }
          validPlaces.forEach((p, i) => {
            const c = MARKER_COLORS[i % MARKER_COLORS.length];
            const shortN = p.name.length > 18 ? p.name.substring(0, 16) + '…' : p.name;
            html += `<div class="map-legend-item map-legend-clickable" data-idx="${i}">
              <span class="map-legend-num" style="background:${c};">${i + 1}</span> ${shortN}
            </div>`;
          });
          div.innerHTML = html;

          div.querySelectorAll('.map-legend-clickable').forEach(el => {
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = parseInt(el.dataset.idx);
              const m = markers[idx];
              if (m) {
                map.flyTo(m.getLatLng(), 15, { duration: 0.6 });
                setTimeout(() => m.openPopup(), 650);
              }
            });
          });

          L.DomEvent.disableScrollPropagation(div);
          L.DomEvent.disableClickPropagation(div);
          return div;
        };
        legend.addTo(map);

        // Route line — use REAL coordinates (not display-spread ones)
        const latLngs = [];
        if (userLocation && userLocation.lat && userLocation.lng) {
          latLngs.push([userLocation.lat, userLocation.lng]);
        }
        validPlaces.forEach(p => latLngs.push([p.lat, p.lng]));

        if (latLngs.length > 1) {
          try {
            const coordsString = latLngs.map(ll => `${ll[1]},${ll[0]}`).join(';');
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
            const res = await fetch(osrmUrl);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes?.length > 0) {
              const geojson = data.routes[0].geometry;
              L.geoJSON(geojson, { style: { color: '#2d6a4f', weight: 7, opacity: 0.18, lineCap: 'round', lineJoin: 'round' } }).addTo(map);
              L.geoJSON(geojson, { style: { color: '#2d6a4f', weight: 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round' } }).addTo(map);
            } else {
              throw new Error('OSRM no route');
            }
          } catch {
            L.polyline(latLngs, { color: '#2d6a4f', weight: 7, opacity: 0.18, lineCap: 'round', lineJoin: 'round' }).addTo(map);
            L.polyline(latLngs, { color: '#2d6a4f', weight: 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
          }
        }

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [60, 60] });
        }

        if (cancelled) { map.remove(); mapRef.current = null; }
      } catch (e) {
        console.warn('TripRouteMap error:', e.message);
      }
    };

    initMap();
    return () => {
      cancelled = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch (e) { } mapRef.current = null; }
    };
  }, [ready, places, userLocation]);

  if (places.length === 0) return null;

  return (
    <div className={`rounded-2xl overflow-hidden border border-border ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}