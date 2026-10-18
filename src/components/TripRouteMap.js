'use client';
import { useEffect, useRef, useState } from 'react';

const MARKER_COLORS = [
  '#2d6a4f',
  '#e76f51',
  '#264653',
  '#2a9d8f',
  '#6d28d9',
  '#dc2626',
  '#e9c46a',
  '#f4a261',
];

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
  const display = places.map((p) => ({ lat: p.lat, lng: p.lng }));
  const clusters = buildClusters(places, 0.0012); // ~120m — แค่มุดซ้อนจริงๆ ถึงกระจาย

  for (const cluster of clusters) {
    if (cluster.length <= 1) continue;

    // Centre of the cluster
    const cLat = cluster.reduce((s, i) => s + places[i].lat, 0) / cluster.length;
    const cLng = cluster.reduce((s, i) => s + places[i].lng, 0) / cluster.length;

    // Adaptive radius: พอให้ icon 36px ไม่ทับกัน (~0.001° ≈ 100m) ไม่ใช่ 600m
    const baseRadius = 0.0014; // ~140m
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
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || places.length === 0) return;

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {}
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
          attribution: '&copy; Google Maps',
          maxZoom: 20,
        });
        const googleSatellite = L.tileLayer(
          'https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
          {
            attribution: '&copy; Google Maps',
            maxZoom: 20,
          }
        );
        const googleTerrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps',
          maxZoom: 20,
        });

        googleRoad.addTo(map);
        L.control
          .layers(
            { แผนที่ถนน: googleRoad, ดาวเทียม: googleSatellite, ภูมิประเทศ: googleTerrain },
            {},
            { position: 'topright' }
          )
          .addTo(map);

        const bounds = [];

        // User location blue dot
        if (userLocation && userLocation.lat && userLocation.lng) {
          const userIcon = L.divIcon({
            className: 'user-loc',
            html: `<div style="width:16px;height:16px;background:#4285F4;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 5px rgba(66,133,244,0.2),0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 2000 })
            .addTo(map)
            .bindPopup('<strong>📍 จุดเริ่มต้นของคุณ</strong>');
          bounds.push([userLocation.lat, userLocation.lng]);
        }

        // Only valid coordinates
        const validPlaces = places.filter(
          (p) =>
            typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
        );

        // Compute spread-out display positions
        const displayCoords = computeDisplayCoords(validPlaces);

        const markers = [];
        // แยกตามวัน: สีหมุด/เส้น = สีของวัน, เลข = ลำดับในวันนั้น (ตรงกับตารางกิจกรรม)
        const multiDay = new Set(validPlaces.map((p) => p.day ?? 1)).size > 1;
        const dayColor = (day) => MARKER_COLORS[((day ?? 1) - 1) % MARKER_COLORS.length];
        const labelOf = (p, index) => (multiDay ? `${p.day}.${p.seq}` : String(p.seq ?? index + 1));

        validPlaces.forEach((place, index) => {
          const num = labelOf(place, index);
          const color = dayColor(place.day);
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
              <span style="position:absolute;top:5px;left:50%;transform:translateX(-50%);color:#fff;font-weight:800;font-size:${multiDay ? 11 : 14}px;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.4);">${num}</span>
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
              <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:3px;">${multiDay ? `วันที่ ${place.day} · ` : ''}จุดที่ ${place.seq ?? index + 1}</div>
              <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${place.name}</div>
              ${place.time ? `<div style="color:#888;font-size:12px;">🕐 ${place.time}</div>` : ''}
              ${place.travel ? `<div style="color:#888;font-size:12px;">🚗 ${place.travel} (ตามถนนจริงจากจุดก่อนหน้า)</div>` : ''}
              ${place.description ? `<div style="font-size:12px;color:#555;margin-top:3px;">${place.description}</div>` : ''}
            </div>
          `);

          markers.push(marker);
          bounds.push(realPos); // fit bounds to REAL positions
        });

        // Legend panel
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
          const collapsed = window.matchMedia('(max-width: 640px)').matches;
          const div = L.DomUtil.create('div', `map-legend${collapsed ? ' is-collapsed' : ''}`);
          let html = `<button type="button" class="map-legend-title" aria-expanded="${!collapsed}">📍 รายชื่อสถานที่ (${validPlaces.length}) <span class="map-legend-caret">▾</span></button><div class="map-legend-body">`;
          if (userLocation && userLocation.lat && userLocation.lng) {
            html += `<div class="map-legend-item"><span class="map-legend-dot" style="background:#4285F4;"></span> จุดเริ่มต้น</div>`;
          }
          validPlaces.forEach((p, i) => {
            const c = dayColor(p.day);
            if (multiDay && (i === 0 || validPlaces[i - 1].day !== p.day)) {
              html += `<div class="map-legend-day" style="color:${c};">วันที่ ${p.day}</div>`;
            }
            const shortN = p.name.length > 18 ? p.name.substring(0, 16) + '…' : p.name;
            html += `<div class="map-legend-item map-legend-clickable" data-idx="${i}">
              <span class="map-legend-num" style="background:${c};">${labelOf(p, i)}</span> ${shortN}
            </div>`;
          });
          html += '</div>';
          div.innerHTML = html;

          const toggle = div.querySelector('.map-legend-title');
          toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = div.classList.toggle('is-collapsed');
            toggle.setAttribute('aria-expanded', String(!isCollapsed));
          });

          div.querySelectorAll('.map-legend-clickable').forEach((el) => {
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = parseInt(el.dataset.idx);
              const m = markers[idx];
              if (m) {
                if (window.matchMedia('(max-width: 640px)').matches) {
                  div.classList.add('is-collapsed');
                  toggle.setAttribute('aria-expanded', 'false');
                }
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

        // Route line — use REAL coordinates (not display-spread ones), fetch per leg
        // ช่วงสั้นๆ (< ~450m) วาดเส้นตรง ไม่เรียก OSRM เพื่อกันถนน one-way พาอ้อมบล็อกเป็นสี่เหลี่ยม
        const haversineKm = (a, b) => {
          const R = 6371;
          const dLat = ((b[0] - a[0]) * Math.PI) / 180;
          const dLon = ((b[1] - a[1]) * Math.PI) / 180;
          const s =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((a[0] * Math.PI) / 180) *
              Math.cos((b[0] * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
        };
        const SHORT_LEG_KM = 0.45;
        const routeLayer = L.layerGroup().addTo(map);
        const drawLeg = (layer, color) => {
          layer(color, 7, 0.2).addTo(routeLayer);
          layer(color, 3.5, 0.95).addTo(routeLayer);
        };
        // เลื่อนเส้นไปทางซ้ายของทิศขับ (ไทยขับชิดซ้าย) ตามพิกเซลบนจอ
        // ขาไป-ขากลับที่ใช้ถนนเส้นเดียวกันจะกลายเป็น 2 เส้นขนาน ลูกศรไม่ทับสวนกัน
        const OFFSET_PX = 5;
        const offsetLine = (pts) => {
          if (pts.length < 2) return pts;
          const z = map.getZoom();
          const p = pts.map((ll) => map.project(L.latLng(ll[0], ll[1]), z));
          const normals = [];
          for (let i = 1; i < p.length; i++) {
            const dx = p[i].x - p[i - 1].x;
            const dy = p[i].y - p[i - 1].y;
            const len = Math.hypot(dx, dy) || 1;
            normals.push([dy / len, -dx / len]);
          }
          return p.map((pt, i) => {
            const a = normals[Math.max(0, i - 1)];
            const b = normals[Math.min(normals.length - 1, i)];
            const nx = a[0] + b[0];
            const ny = a[1] + b[1];
            const len = Math.hypot(nx, ny) || 1;
            const ll = map.unproject(
              L.point(pt.x + (nx / len) * OFFSET_PX, pt.y + (ny / len) * OFFSET_PX),
              z
            );
            return [ll.lat, ll.lng];
          });
        };
        const lineStyle = (color, weight, opacity) => ({
          color,
          weight,
          opacity,
          lineCap: 'round',
          lineJoin: 'round',
        });
        // ลูกศรบอกทิศทางขับบนเส้น: วางตามสัดส่วนความยาวเส้น หมุนตามทิศบนจอ (Mercator คงมุม จึงคำนวณที่ zoom 0 ได้)
        const addArrows = (pts, color) => {
          if (pts.length < 2) return;
          const proj = pts.map((ll) => map.project(L.latLng(ll[0], ll[1]), 0));
          const cum = [0];
          let km = 0;
          for (let i = 1; i < proj.length; i++) {
            cum.push(cum[i - 1] + proj[i].distanceTo(proj[i - 1]));
            km += haversineKm(pts[i - 1], pts[i]);
          }
          const total = cum[cum.length - 1];
          if (!total) return;
          // จุดบนเส้นที่ระยะสะสม d (หน่วยพิกเซลที่ zoom 0)
          const pointAt = (d) => {
            let i = 1;
            while (i < cum.length - 1 && cum[i] < d) i++;
            const a = proj[i - 1];
            const b = proj[i];
            const t = cum[i] > cum[i - 1] ? (d - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
            return L.point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
          };
          const count = km > 8 ? 3 : km > 3 ? 2 : 1;
          // ทิศของลูกศรวัดจากช่วงกว้าง ±4% ของเส้น (ไม่ใช่ช่วงสั้นจิ๋วของ OSRM ที่อาจหักมุมตรงทางแยก)
          const span = total * 0.04;
          for (let k = 1; k <= count; k++) {
            const target = (total * k) / (count + 1);
            const pos = map.unproject(pointAt(target), 0);
            const a = pointAt(Math.max(0, target - span));
            const b = pointAt(Math.min(total, target + span));
            const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            // วงกลมสีของวัน + ลูกศรสีขาว ให้เด่นจากเส้น ไม่กลืนเป็นเส้นเดียวกัน
            const icon = L.divIcon({
              className: 'route-arrow',
              html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 12 12" width="12" height="12" style="transform:rotate(${angle}deg);" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 2 L8.5 6 L3.5 10" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            });
            L.marker(pos, { icon, interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(
              routeLayer
            );
          }
        };
        // เก็บทุกขาไว้ แล้ววาดใหม่ทุกครั้งที่ซูม (ระยะเลื่อนเป็นพิกเซล ต้องคำนวณตาม zoom ปัจจุบัน)
        const routeLegs = [];
        const renderRoutes = () => {
          routeLayer.clearLayers();
          for (const { pts, color, dashed } of routeLegs) {
            const line = offsetLine(pts);
            drawLeg(
              (c, w, o) =>
                L.polyline(line, {
                  ...lineStyle(c, w, o),
                  ...(dashed ? { dashArray: '6 6' } : {}),
                }),
              color
            );
            addArrows(line, color);
          }
        };
        map.on('zoomend', renderRoutes);
        const drawStraight = (seg, color) => {
          routeLegs.push({ pts: seg, color, dashed: true });
        };
        // ขาเดินทางแยกตามวัน: วันแรกเริ่มจาก GPS, วันถัดไปเริ่มจากที่พักของคืนก่อน
        // (ถ้าไม่มีที่พัก เริ่มจาก GPS เหมือนที่ server คำนวณ) — ไม่ลากเส้นข้ามวัน
        const hasUser = userLocation && userLocation.lat && userLocation.lng;
        const userLL = hasUser ? [userLocation.lat, userLocation.lng] : null;
        const legs = [];
        let prev = null;
        validPlaces.forEach((p, i) => {
          const firstOfDay = i === 0 || validPlaces[i - 1].day !== p.day;
          if (firstOfDay) {
            const last = i > 0 ? validPlaces[i - 1] : null;
            const lastLL = last ? [last.lat, last.lng] : null;
            prev = last && last.type === 'lodging' ? lastLL : (userLL ?? lastLL);
          }
          if (prev) legs.push({ seg: [prev, [p.lat, p.lng]], color: dayColor(p.day) });
          prev = [p.lat, p.lng];
        });

        for (const { seg, color } of legs) {
          if (cancelled) break;
          if (haversineKm(seg[0], seg[1]) < SHORT_LEG_KM) {
            drawStraight(seg, color);
            continue;
          }
          try {
            const coordsString = seg.map((ll) => `${ll[1]},${ll[0]}`).join(';');
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
            const res = await fetch(osrmUrl);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
              const pts = (data.routes[0].geometry.coordinates || []).map(([lng, lat]) => [
                lat,
                lng,
              ]);
              routeLegs.push({ pts, color, dashed: false });
              continue;
            }
            throw new Error('OSRM no route');
          } catch {
            drawStraight(seg, color);
          }
        }

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [60, 60] });
        }
        if (!cancelled) renderRoutes();

        if (cancelled) {
          map.remove();
          mapRef.current = null;
        }
      } catch (e) {
        console.warn('TripRouteMap error:', e.message);
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
  }, [ready, places, userLocation]);

  if (places.length === 0) return null;

  return (
    <div className={`rounded-2xl overflow-hidden border border-border ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
