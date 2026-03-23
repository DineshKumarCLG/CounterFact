"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { ConfidenceLabel } from "@/components/ui/ConfidenceLabel";
import { Markdown } from "@/components/ui/Markdown";
import type {
  SimulationState, AgentStatus, Domain,
  CascadeNode, CascadeEdge,
} from "@/lib/engine/types";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/* ── Easing ── */
type Ease4 = [number, number, number, number];
const EASE_OUT: Ease4 = [0.16, 1, 0.3, 1];

/* ── Domain palette ── */
const DC: Record<string, string> = {
  HISTORICAL: "#a78bfa", ECONOMIC: "#34d399", POLITICAL: "#60a5fa",
  MILITARY: "#f87171", DIPLOMATIC: "#fbbf24", SOCIAL: "#fb923c",
  TECHNOLOGICAL: "#22d3ee", ENVIRONMENTAL: "#4ade80", CULTURAL: "#e879f9",
  LEGAL: "#94a3b8", DEMOGRAPHIC: "#f472b6", URBAN_PLANNING: "#a3e635",
};
const NTC = { POSITIVE: "#34d399", NEGATIVE: "#f87171", NEUTRAL: "#64748b" };

/* ── Region / country data ── */
const CR: Record<string, string> = {};
["840","124","484","192","332","388","630","044","052","060","084","188","212","214","222","320","340","558","591","780","670"].forEach(c=>CR[c]="na");
["032","068","076","152","170","218","238","254","328","600","604","740","858","862"].forEach(c=>CR[c]="sa");
["040","056","100","191","203","208","233","246","250","276","300","348","352","372","380","428","440","442","470","528","578","616","620","642","643","703","705","724","752","756","826","008","070","499","688","807","804"].forEach(c=>CR[c]="eu");
["012","024","072","108","120","132","140","148","174","178","180","204","226","231","232","262","266","270","288","324","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","694","706","710","716","728","729","748","768","788","800","834","854","894"].forEach(c=>CR[c]="af");
["364","368","376","400","414","422","275","512","634","682","760","784","792","887"].forEach(c=>CR[c]="me");
["004","050","064","144","356","462","524","586"].forEach(c=>CR[c]="sa_a");
["156","392","408","410","496"].forEach(c=>CR[c]="ea");
["096","104","116","360","418","458","608","702","764","704"].forEach(c=>CR[c]="sea");
["398","417","762","795","860"].forEach(c=>CR[c]="ca");
["036","554","598","090","242","296","520","540","548","570","583","584","585","882"].forEach(c=>CR[c]="oc");

const RL: Record<string,string> = { na:"N. America",sa:"S. America",eu:"Europe",af:"Africa",me:"Middle East",sa_a:"S. Asia",ea:"E. Asia",sea:"SE Asia",ca:"C. Asia",oc:"Oceania" };

const COUNTRY_HINTS: [string, string, [number,number,number]][] = [
  ["india","356",[78,22,4]],["pakistan","586",[70,30,4]],["china","156",[105,35,3.5]],
  ["russia","643",[90,60,2.5]],["ukraine","804",[32,49,5]],["united states","840",[-98,38,3]],
  ["usa","840",[-98,38,3]],["iran","364",[53,32,4.5]],["israel","376",[35,31,6]],
  ["taiwan","158",[121,24,6]],["korea","410",[128,37,5]],["japan","392",[138,36,4.5]],
  ["germany","276",[10,51,5]],["france","250",[2,46,5]],["uk","826",[-2,54,5]],
  ["britain","826",[-2,54,5]],["turkey","792",[35,39,4.5]],["saudi","682",[45,24,4]],
  ["brazil","076",[-52,-10,3]],["mexico","484",[-102,24,4]],["nigeria","566",[8,10,4]],
  ["ethiopia","231",[40,9,4]],["egypt","818",[30,27,4.5]],["indonesia","360",[118,-5,3.5]],
  ["vietnam","704",[108,14,5]],["myanmar","104",[96,17,5]],["afghanistan","004",[67,33,4.5]],
  ["syria","760",[38,35,5]],["iraq","368",[44,33,5]],["libya","434",[17,27,4.5]],
  ["sudan","729",[30,15,4]],["somalia","706",[46,6,4.5]],["venezuela","862",[-66,8,4]],
  ["colombia","170",[-74,4,4.5]],["argentina","032",[-64,-34,3.5]],["chile","152",[-71,-30,4]],
  ["poland","616",[20,52,5]],["hungary","348",[19,47,5.5]],["serbia","688",[21,44,5.5]],
  ["georgia","268",[44,42,5.5]],["armenia","051",[45,40,5.5]],["azerbaijan","031",[47,40,5.5]],
  ["kazakhstan","398",[67,48,4]],["uzbekistan","860",[63,41,4.5]],
  ["philippines","608",[122,13,4.5]],["thailand","764",[101,15,4.5]],["malaysia","458",[110,4,4.5]],
  ["thamizhagam","356",[80,11,5]],["tamil","356",[80,11,5]],
];

const REGION_VIEW: Record<string,{center:[number,number];zoom:number}> = {
  na:{center:[-100,45],zoom:2.5}, sa:{center:[-58,-15],zoom:2.5},
  eu:{center:[15,52],zoom:3.5},  af:{center:[20,5],zoom:2.2},
  me:{center:[45,28],zoom:3.5},  sa_a:{center:[78,22],zoom:3},
  ea:{center:[115,35],zoom:3},   sea:{center:[110,5],zoom:3.5},
  ca:{center:[65,42],zoom:3},    oc:{center:[140,-25],zoom:2.5},
};

function domReg(d: string): string[] {
  const m: Record<string,string[]> = {
    HISTORICAL:["eu","ca","me","af","na"],ECONOMIC:["na","eu","ea","sa","ca"],POLITICAL:["na","eu","ca","me","af"],
    MILITARY:["na","eu","me","ea","ca"],DIPLOMATIC:["eu","na","ca","me","af"],SOCIAL:["na","eu","sa","af","ca"],
    TECHNOLOGICAL:["na","ea","eu","sa_a","sea"],ENVIRONMENTAL:["na","eu","sa","af","oc","ca","sea"],
    CULTURAL:["eu","na","ea","sa_a","af"],LEGAL:["na","eu","ca","sa"],DEMOGRAPHIC:["sa_a","af","sea","sa","ea"],
    URBAN_PLANNING:["na","eu","ea","sa_a"],
  };
  return m[d]??["na","eu"];
}

function inferScenarioView(scenario: string): {center:[number,number];zoom:number} {
  const lower = scenario.toLowerCase();
  for (const [hint,,coords] of COUNTRY_HINTS) {
    if (lower.includes(hint)) return { center: [coords[0], coords[1]], zoom: coords[2] };
  }
  if (/middle east|gulf|levant|arab/.test(lower)) return REGION_VIEW.me;
  if (/south asia|subcontinent/.test(lower)) return REGION_VIEW.sa_a;
  if (/east asia|pacific rim/.test(lower)) return REGION_VIEW.ea;
  if (/southeast asia|asean/.test(lower)) return REGION_VIEW.sea;
  if (/central asia/.test(lower)) return REGION_VIEW.ca;
  if (/europe|nato|eu |european/.test(lower)) return REGION_VIEW.eu;
  if (/africa|sahel|sahara/.test(lower)) return REGION_VIEW.af;
  if (/latin america|south america/.test(lower)) return REGION_VIEW.sa;
  if (/north america|canada/.test(lower)) return REGION_VIEW.na;
  if (/oceania|pacific/.test(lower)) return REGION_VIEW.oc;
  return { center: [10, 20], zoom: 1.8 };
}

/* ── Animated counter ── */
function AnimNum({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 800, 1);
      setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * value));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display}</>;
}

/* ── Section label ── */
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-semibold shrink-0">{children}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-white/[0.05] to-transparent" />
    </div>
  );
}

/* ================================================================
   MAPLIBRE IMPACT MAP — full-bleed, scenario-aware
   ================================================================ */
interface RegionImpact { doms: Set<string>; intensity: number; effects: string[]; color: string; }
interface HoveredFeature { name: string; iso: string; region: string | null; impact: RegionImpact | null; x: number; y: number; }

function ImpactMap({ state }: { state: SimulationState }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [hovered, setHovered] = useState<HoveredFeature | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const initialView = useMemo(() => inferScenarioView(state.scenario), [state.scenario]);

  const highlightedIsos = useMemo(() => {
    const lower = state.scenario.toLowerCase();
    const s = new Set<string>();
    for (const [hint, iso] of COUNTRY_HINTS) if (lower.includes(hint)) s.add(iso);
    return s;
  }, [state.scenario]);

  /* Scenario country coords for pulse markers */
  const scenarioMarkers = useMemo(() => {
    const lower = state.scenario.toLowerCase();
    const out: { lng: number; lat: number; label: string }[] = [];
    const seen = new Set<string>();
    for (const [hint, iso, coords] of COUNTRY_HINTS) {
      if (lower.includes(hint) && !seen.has(iso)) {
        seen.add(iso);
        out.push({ lng: coords[0], lat: coords[1], label: hint });
      }
    }
    return out;
  }, [state.scenario]);

  const regionImpact = useMemo(() => {
    const m = new Map<string, RegionImpact>();
    for (const k of Object.keys(RL)) m.set(k, { doms: new Set(), intensity: 0, effects: [], color: "#94a3b8" });
    for (const n of state.cascades?.cascadeTree.nodes ?? []) {
      for (const r of domReg(n.domain)) {
        const i = m.get(r);
        if (i) { i.doms.add(n.domain); i.intensity += n.confidence; if (i.effects.length < 4) i.effects.push(n.description.slice(0, 80)); }
      }
    }
    for (const [d] of Object.entries(state.agentOutputs ?? {})) {
      for (const r of domReg(d)) { const i = m.get(r); if (i) { i.doms.add(d); i.intensity += 0.4; } }
    }
    for (const i of m.values()) { const fd = [...i.doms][0]; if (fd) i.color = DC[fd] ?? "#94a3b8"; }
    return m;
  }, [state.cascades, state.agentOutputs]);

  const maxIntensity = useMemo(() => { let v = 1; for (const i of regionImpact.values()) if (i.intensity > v) v = i.intensity; return v; }, [regionImpact]);

  /* Build heatmap points from cascade data — each cascade node generates
     points in its affected regions, weighted by confidence */
  const heatmapGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    const cascadeNodes = state.cascades?.cascadeTree.nodes ?? [];

    /* From cascade nodes — place weighted points in affected regions */
    for (const node of cascadeNodes) {
      const regions = domReg(node.domain);
      for (const regionId of regions) {
        const rv = REGION_VIEW[regionId];
        if (!rv) continue;
        /* Scatter a few points around the region center */
        const count = Math.max(1, Math.round(node.confidence * 3));
        for (let i = 0; i < count; i++) {
          const jitterLng = (Math.random() - 0.5) * 20;
          const jitterLat = (Math.random() - 0.5) * 12;
          features.push({
            type: "Feature",
            properties: { weight: node.confidence, domain: node.domain, type: node.type },
            geometry: { type: "Point", coordinates: [rv.center[0] + jitterLng, rv.center[1] + jitterLat] },
          });
        }
      }
    }

    /* From scenario markers — add high-weight points at focus countries */
    for (const { lng, lat } of scenarioMarkers) {
      for (let i = 0; i < 5; i++) {
        features.push({
          type: "Feature",
          properties: { weight: 0.9, domain: "FOCUS", type: "NEUTRAL" },
          geometry: { type: "Point", coordinates: [lng + (Math.random() - 0.5) * 4, lat + (Math.random() - 0.5) * 3] },
        });
      }
    }

    return { type: "FeatureCollection", features };
  }, [state.cascades, scenarioMarkers]);

  /* Build arc lines between cascade-connected regions (like logistics arcs) */
  const arcGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    const edges = state.cascades?.cascadeTree.edges ?? [];
    const nodes = state.cascades?.cascadeTree.nodes ?? [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const edge of edges) {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) continue;

      const fromRegions = domReg(fromNode.domain);
      const toRegions = domReg(toNode.domain);
      if (!fromRegions[0] || !toRegions[0] || fromRegions[0] === toRegions[0]) continue;

      const fromRV = REGION_VIEW[fromRegions[0]];
      const toRV = REGION_VIEW[toRegions[0]];
      if (!fromRV || !toRV) continue;

      /* Generate quadratic bezier arc */
      const [x1, y1] = fromRV.center;
      const [x2, y2] = toRV.center;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;
      const nx = -dy / dist;
      const ny = dx / dist;
      const height = dist * 0.25;
      const cx = mx + nx * height;
      const cy = my + ny * height;

      const coords: number[][] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
        const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
        coords.push([px, py]);
      }

      const color = fromNode.type === "NEGATIVE" ? "#f87171" : fromNode.type === "POSITIVE" ? "#34d399" : "#60a5fa";
      features.push({
        type: "Feature",
        properties: { confidence: edge.confidence, color, fromDomain: fromNode.domain, toDomain: toNode.domain },
        geometry: { type: "LineString", coordinates: coords },
      });
    }

    return { type: "FeatureCollection", features };
  }, [state.cascades]);

  /* Init map — CartoDB Dark Matter + globe */
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    let destroyed = false;

    const raf = requestAnimationFrame(() => {
      if (destroyed || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        center: initialView.center,
        zoom: initialView.zoom,
        minZoom: 1.2,
        maxZoom: 12,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
        renderWorldCopies: false,
      });

      const ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current!);

      map.on("style.load", () => {
        if (destroyed) return;
        try { map.setProjection({ type: "globe" }); } catch { /* fallback mercator */ }
        try {
          map.setSky({
            "sky-color": "#020210",
            "horizon-color": "#08081a",
            "fog-color": "#020210",
            "sky-horizon-blend": 0.5,
            "horizon-fog-blend": 0.5,
            "fog-ground-blend": 0.8,
            "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] as unknown as number,
          });
        } catch { /* sky not supported */ }
      });

      map.on("load", () => {
        if (destroyed) return;

        /* ── Heatmap layer — cascade impact density ── */
        map.addSource("cf-heat", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "cf-heatmap",
          type: "heatmap",
          source: "cf-heat",
          maxzoom: 8,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 5, 1.2],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(124,92,252,0)",
              0.15, "rgba(124,92,252,0.15)",
              0.35, "rgba(99,102,241,0.3)",
              0.55, "rgba(96,165,250,0.45)",
              0.75, "rgba(34,211,238,0.6)",
              1, "rgba(52,211,153,0.8)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 4, 40, 8, 60],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 8, 0.3],
          },
        });

        /* ── Circle points at higher zoom ── */
        map.addLayer({
          id: "cf-heat-points",
          type: "circle",
          source: "cf-heat",
          minzoom: 5,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["get", "weight"], 0, 3, 1, 8],
            "circle-color": ["match", ["get", "type"],
              "POSITIVE", "rgba(52,211,153,0.7)",
              "NEGATIVE", "rgba(248,113,113,0.7)",
              "rgba(96,165,250,0.7)",
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": "rgba(255,255,255,0.15)",
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.8],
          },
        });

        /* ── Arc lines — cascade connections between regions ── */
        map.addSource("cf-arcs", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "cf-arcs-glow",
          type: "line",
          source: "cf-arcs",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 4,
            "line-blur": 3,
            "line-opacity": 0.25,
          },
          layout: { "line-join": "round", "line-cap": "round" },
        });
        map.addLayer({
          id: "cf-arcs-line",
          type: "line",
          source: "cf-arcs",
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["interpolate", ["linear"], ["get", "confidence"], 0, 1, 1, 2.5],
            "line-opacity": 0.6,
          },
          layout: { "line-join": "round", "line-cap": "round" },
        });

        /* ── Country borders from world-atlas for hover interaction ── */
        fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
          .then(r => r.json())
          .then(async (topo) => {
            if (destroyed) return;
            const topojsonClient = await import("topojson-client");
            const geojson = topojsonClient.feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;

            map.addSource("cf-countries", { type: "geojson", data: geojson });
            map.addLayer({
              id: "cf-hover",
              type: "fill",
              source: "cf-countries",
              paint: {
                "fill-color": "rgba(255,255,255,0)",
                "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.06, 0],
              },
            });

            if (!destroyed) {
              mapRef.current = map;
              map.resize();
              setMapReady(true);
            }
          })
          .catch(err => console.error("world-atlas load failed:", err));
      });

      (map as maplibregl.Map & { _ro?: ResizeObserver })._ro = ro;
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      const m = mapRef.current as (maplibregl.Map & { _ro?: ResizeObserver }) | null;
      if (m) { m._ro?.disconnect(); m.remove(); }
      mapRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Update heatmap + arcs when data changes */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const heatSrc = map.getSource("cf-heat") as maplibregl.GeoJSONSource | undefined;
    if (heatSrc) heatSrc.setData(heatmapGeoJSON);
    const arcSrc = map.getSource("cf-arcs") as maplibregl.GeoJSONSource | undefined;
    if (arcSrc) arcSrc.setData(arcGeoJSON);
  }, [mapReady, heatmapGeoJSON, arcGeoJSON]);

  /* Animated pulse markers on scenario countries */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    for (const { lng, lat } of scenarioMarkers) {
      const el = document.createElement("div");
      el.className = "cf-pulse-marker";
      el.innerHTML = `<span class="cf-pulse-ring"></span><span class="cf-pulse-ring cf-pulse-ring-2"></span><span class="cf-pulse-dot"></span>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(marker);
    }
  }, [mapReady, scenarioMarkers]);

  /* Hover interaction on country borders */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let hoveredId: string | number | null = null;

    const onMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) {
        setHovered(null);
        if (hoveredId !== null) { map.setFeatureState({ source: "cf-countries", id: hoveredId }, { hover: false }); hoveredId = null; }
        return;
      }
      const f = e.features[0];
      if (hoveredId !== null && hoveredId !== f.id) map.setFeatureState({ source: "cf-countries", id: hoveredId }, { hover: false });
      hoveredId = f.id ?? null;
      if (hoveredId !== null) map.setFeatureState({ source: "cf-countries", id: hoveredId }, { hover: true });
      const iso = String(f.id ?? "");
      const region = CR[iso] ?? null;
      const impact = region ? regionImpact.get(region) ?? null : null;
      setHovered({ name: f.properties?.name ?? iso, iso, region: region ? RL[region] : null, impact, x: e.point.x, y: e.point.y });
    };
    const onLeave = () => {
      setHovered(null);
      if (hoveredId !== null) { map.setFeatureState({ source: "cf-countries", id: hoveredId }, { hover: false }); hoveredId = null; }
    };

    map.on("mousemove", "cf-hover", onMove);
    map.on("mouseleave", "cf-hover", onLeave);
    map.getCanvas().style.cursor = "crosshair";
    return () => { map.off("mousemove", "cf-hover", onMove); map.off("mouseleave", "cf-hover", onLeave); };
  }, [mapReady, regionImpact]);

  /* Fly to scenario focus */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.flyTo({ center: initialView.center, zoom: initialView.zoom, duration: 2200, essential: true });
  }, [mapReady, initialView]);

  const flyTo = useCallback((center: [number, number], zoom: number) => {
    mapRef.current?.flyTo({ center, zoom, duration: 1400, essential: true });
  }, []);

  const topRegions = useMemo(() =>
    Object.entries(RL)
      .map(([id, label]) => ({ id, label, imp: regionImpact.get(id)! }))
      .filter(x => x.imp?.intensity > 0)
      .sort((a, b) => b.imp.intensity - a.imp.intensity)
      .slice(0, 8),
    [regionImpact]
  );

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 56px)" }}>
      {/* Map container — no overlays, let the map breathe */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
            className="absolute pointer-events-none z-20 max-w-[240px]"
            style={{ left: Math.min(hovered.x + 14, (containerRef.current?.clientWidth ?? 400) - 260), top: Math.max(hovered.y - 12, 8) }}>
            <div className="rounded-xl bg-[#08080f]/90 border border-white/[0.08] p-3 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-white text-[13px] font-medium">{hovered.name}</span>
                {hovered.region && <span className="text-[9px] font-mono text-zinc-600">{hovered.region}</span>}
                {highlightedIsos.has(hovered.iso) && (
                  <span className="text-[8px] font-mono text-[#7c5cfc] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#7c5cfc] inline-block" />focus
                  </span>
                )}
              </div>
              {hovered.impact && hovered.impact.intensity > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {[...hovered.impact.doms].slice(0, 4).map(d => (
                      <span key={d} className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
                        style={{ color: DC[d] ?? "#94a3b8", background: `${DC[d] ?? "#94a3b8"}12` }}>{d}</span>
                    ))}
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((hovered.impact.intensity / maxIntensity) * 100)}%`,
                        background: `linear-gradient(90deg, ${hovered.impact.color}90, ${hovered.impact.color})`,
                        boxShadow: `0 0 8px ${hovered.impact.color}40` }} />
                  </div>
                  {hovered.impact.effects[0] && <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-2">{hovered.impact.effects[0]}</p>}
                </>
              ) : <p className="text-[10px] text-zinc-700 italic">No cascade effects</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scenario focus badge — top left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.06] backdrop-blur-xl">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-[#7c5cfc]" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#7c5cfc] animate-ping opacity-40" />
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          {highlightedIsos.size > 0 ? `${highlightedIsos.size} scenario countr${highlightedIsos.size > 1 ? "ies" : "y"}` : "global view"}
        </span>
      </div>

      {/* Heatmap legend — top left below badge */}
      {heatmapGeoJSON.features.length > 0 && (
        <div className="absolute top-14 left-4 z-10 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.06] backdrop-blur-xl">
          <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5">Cascade density</p>
          <div className="flex gap-0.5">
            {["rgba(124,92,252,0.6)","rgba(99,102,241,0.7)","rgba(96,165,250,0.8)","rgba(34,211,238,0.85)","rgba(52,211,153,0.9)"].map((c, i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-mono text-zinc-700">Low</span>
            <span className="text-[8px] font-mono text-zinc-700">High</span>
          </div>
        </div>
      )}

      {/* Zoom controls — top right */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
        {[{ l: "+", d: 1 }, { l: "−", d: -1 }].map(({ l, d }) => (
          <button key={l} onClick={() => { const m = mapRef.current; if (m) m.setZoom(m.getZoom() + d); }}
            className="w-9 h-9 rounded-xl bg-black/50 border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/15 hover:bg-black/70 text-sm font-mono transition-all flex items-center justify-center backdrop-blur-xl">
            {l}
          </button>
        ))}
        <button onClick={() => flyTo(initialView.center, initialView.zoom)}
          className="w-9 h-9 rounded-xl bg-black/50 border border-white/[0.06] text-zinc-600 hover:text-zinc-300 hover:bg-black/70 text-[10px] font-mono transition-all flex items-center justify-center backdrop-blur-xl mt-1"
          title="Reset view">⌂</button>
      </div>

      {/* Region jump pills — bottom */}
      {topRegions.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-1.5 justify-center">
          {topRegions.map(({ id, label, imp }) => {
            const rv = REGION_VIEW[id];
            const pct = Math.round((imp.intensity / maxIntensity) * 100);
            return (
              <button key={id} onClick={() => rv && flyTo(rv.center, rv.zoom)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-white/[0.05] hover:border-white/12 hover:bg-black/70 backdrop-blur-xl transition-all group">
                <div className="w-1.5 h-1.5 rounded-full transition-shadow"
                  style={{ background: imp.color, boxShadow: `0 0 6px ${imp.color}60` }} />
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">{label}</span>
                <span className="text-[9px] font-mono text-zinc-700">{pct}%</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}



/* ================================================================
   PROGRESS VIEW
   ================================================================ */
function ProgressView({ state }: { state: SimulationState }) {
  const agentCount = state.activeAgents?.length ?? 0;
  const completedCount = state.agentStatus
    ? Object.values(state.agentStatus).filter(s => s === "COMPLETE" || s === "FAILED").length : 0;
  const pct = agentCount === 0 ? 5 : 10 + (completedCount / Math.max(agentCount, 1)) * 80;

  // Determine overall phase label
  const hasAnyActive = state.agentStatus
    ? Object.values(state.agentStatus).some(s => s === "ACTIVE") : false;
  const phase = agentCount === 0 ? "Initialising…"
    : hasAnyActive ? `Analysing ${agentCount} domains`
    : completedCount === agentCount ? "Synthesising…"
    : "Dispatching agents…";

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-mono text-zinc-600">
          <span>{phase}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-0.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
          <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: EASE_OUT }}
            style={{ background: "linear-gradient(90deg,#7c5cfc,#60a5fa,#22d3ee)", boxShadow: "0 0 12px rgba(124,92,252,0.4)" }} />
        </div>
      </div>

      {agentCount === 0 ? (
        /* Pre-planning state — show animated placeholder grid */
        <div className="grid grid-cols-2 gap-px bg-white/[0.03] rounded-xl overflow-hidden border border-white/[0.04]">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="p-3 bg-[#060609] h-10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-white/[0.03] rounded-xl overflow-hidden border border-white/[0.04]">
          {state.activeAgents!.map((domain, i) => {
            const status = (state.agentStatus?.[domain as Domain] ?? "PENDING") as AgentStatus;
            const color = DC[domain] ?? "#94a3b8";
            const isActive = status === "ACTIVE";
            const isDone = status === "COMPLETE";
            const isFailed = status === "FAILED";
            return (
              <motion.div key={domain} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: EASE_OUT }}
                className="relative p-3 bg-[#060609]">
                {isActive && (
                  <motion.div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }}
                    animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
                )}
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                    background: isDone || isActive ? color : isFailed ? "#f87171" : "rgba(255,255,255,0.08)",
                    boxShadow: isDone || isActive ? `0 0 6px ${color}50` : "none",
                  }} />
                  <span className="text-[10px] font-mono text-zinc-500 truncate">{domain}</span>
                  {isActive && (
                    <div className="ml-auto flex gap-[2px]">
                      {[0,1,2].map(j => (
                        <motion.div key={j} className="w-[2px] rounded-full" style={{ background: color }}
                          animate={{ height: [4, 10, 4] }} transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }} />
                      ))}
                    </div>
                  )}
                  {isDone && (
                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="ml-auto w-3 h-3 shrink-0" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                  {isFailed && (
                    <span className="ml-auto text-[9px] font-mono text-red-500/60">failed</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   CASCADE TREE — SVG DAG
   ================================================================ */
interface TreeLayout { positions: Map<string, { x: number; y: number; node: CascadeNode }>; w: number; h: number; }

function layoutTree(nodes: CascadeNode[], edges: CascadeEdge[]): TreeLayout {
  const levels = new Map<number, CascadeNode[]>();
  for (const n of nodes) { const a = levels.get(n.level) ?? []; a.push(n); levels.set(n.level, a); }
  const NW = 200, NH = 72, GY = 100, GX = 32, P = 48;
  const pos = new Map<string, { x: number; y: number; node: CascadeNode }>();
  let maxX = 0;
  const sorted = [...levels.keys()].sort((a, b) => a - b);
  for (const lv of sorted) {
    const ns = levels.get(lv)!;
    const tw = ns.length * NW + (ns.length - 1) * GX;
    const sx = P + (maxX > 0 ? Math.max(0, (maxX - tw) / 2) : 0);
    ns.forEach((n, i) => {
      const x = sx + i * (NW + GX), y = P + lv * (NH + GY);
      pos.set(n.id, { x, y, node: n });
      maxX = Math.max(maxX, x + NW + P);
    });
  }
  return { positions: pos, w: Math.max(maxX, 500), h: sorted.length * (NH + GY) + P };
}

function CascadeTree({ nodes, edges, loops }: {
  nodes: CascadeNode[]; edges: CascadeEdge[];
  loops: { nodes: string[]; description: string; breakpoint: string }[];
}) {
  const [hov, setHov] = useState<string | null>(null);
  const layout = useMemo(() => layoutTree(nodes, edges), [nodes, edges]);
  const { positions: pos, w, h } = layout;
  const NW = 200, NH = 72, NR = 10;
  const loopIds = useMemo(() => { const s = new Set<string>(); loops.forEach(l => l.nodes.forEach(id => s.add(id))); return s; }, [loops]);
  const connEdges = useMemo(() => {
    if (!hov) return new Set<string>();
    const s = new Set<string>();
    edges.forEach(e => { if (e.from === hov || e.to === hov) s.add(`${e.from}-${e.to}`); });
    return s;
  }, [hov, edges]);

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: "60vh" }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ minWidth: w, minHeight: h }} className="block">
        <defs>
          <filter id="ng" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arr" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 3.5L0 7z" fill="rgba(255,255,255,0.15)" />
          </marker>
        </defs>
        {edges.map(e => {
          const f = pos.get(e.from), t = pos.get(e.to);
          if (!f || !t) return null;
          const x1 = f.x + NW/2, y1 = f.y + NH, x2 = t.x + NW/2, y2 = t.y, my = (y1+y2)/2;
          const k = `${e.from}-${e.to}`, hi = connEdges.has(k);
          return <path key={k} d={`M${x1} ${y1}C${x1} ${my},${x2} ${my},${x2} ${y2}`} fill="none"
            stroke={hi ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)"} strokeWidth={hi ? 2 : Math.max(0.8, e.confidence * 3)}
            markerEnd="url(#arr)" className="transition-all duration-150" />;
        })}
        {[...pos.entries()].map(([id, { x, y, node }]) => {
          const c = DC[node.domain] ?? "#94a3b8", tc = NTC[node.type] ?? "#64748b";
          const isH = hov === id, isL = loopIds.has(id);
          return (
            <g key={id} className="cursor-pointer" onMouseEnter={() => setHov(id)} onMouseLeave={() => setHov(null)}
              filter={isH ? "url(#ng)" : undefined}>
              <rect x={x} y={y} width={NW} height={NH} rx={NR}
                fill={isH ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"}
                stroke={isL ? "#fbbf24" : isH ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)"}
                strokeWidth={isL ? 1.5 : 1} strokeDasharray={isL ? "4 2" : "none"} />
              <rect x={x} y={y+6} width={2.5} height={NH-12} rx={1.25} fill={c} opacity={0.7} />
              <circle cx={x+NW-14} cy={y+14} r={3.5} fill={tc} opacity={0.8} />
              <foreignObject x={x+12} y={y+6} width={NW-36} height={NH-12}>
                <div className="text-[10px] text-zinc-300 leading-snug line-clamp-3">{node.description}</div>
              </foreignObject>
              <text x={x+NW-28} y={y+NH-8} textAnchor="middle" fontSize={8} fill="rgba(100,116,139,0.8)" fontFamily="monospace">
                {(node.confidence*100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ================================================================
   SYNTHESIS TAB
   ================================================================ */
function SynthesisTab({ state }: { state: SimulationState }) {
  const s = state.synthesis;
  if (!s) return <div className="p-6 text-zinc-600 text-sm">Synthesis pending…</div>;
  const domSums = s.domainSummaries ? Object.entries(s.domainSummaries) : [];
  return (
    <div className="space-y-6 p-6">
      <div className="border-l-2 border-[#7c5cfc]/40 pl-4">
        <Markdown content={s.unifiedAnalysis} />
      </div>
      {domSums.length > 0 && (
        <div>
          <SLabel>Domain Summaries</SLabel>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {domSums.map(([dom, sum]) => (
              <div key={dom} className="shrink-0 w-64 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: DC[dom] ?? "#94a3b8" }} />
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{dom}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-5">{sum}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   DOMAINS TAB
   ================================================================ */
function DomainsTab({ state }: { state: SimulationState }) {
  const [open, setOpen] = useState<string | null>(null);
  const outputs = Object.entries(state.agentOutputs ?? {});
  if (!outputs.length) return <div className="p-6 text-zinc-600 text-sm">No domain data yet.</div>;
  return (
    <div className="divide-y divide-white/[0.04]">
      {outputs.map(([dom, out]) => {
        const color = DC[dom] ?? "#94a3b8";
        const isOpen = open === dom;
        return (
          <div key={dom}>
            <button onClick={() => setOpen(isOpen ? null : dom)}
              className="w-full flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition-colors text-left">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}50` }} />
              <span className="text-sm font-medium text-zinc-200 flex-1">{dom}</span>
              <ConfidenceLabel level={out.confidence} />
              <motion.svg animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                className="w-4 h-4 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="overflow-hidden">
                  <div className="px-6 pb-5 space-y-4">
                    <div className="border-l-2 pl-4" style={{ borderColor: `${color}40` }}>
                      <Markdown content={out.findings} />
                    </div>
                    {out.keyDatapoints.length > 0 && (
                      <div>
                        <SLabel>Evidence</SLabel>
                        <div className="space-y-2">
                          {out.keyDatapoints.slice(0, 6).map((dp, i) => (
                            <div key={i} className="flex gap-3 text-[11px]">
                              <span className="text-zinc-700 font-mono shrink-0 mt-0.5">{String(i+1).padStart(2,"0")}</span>
                              <div>
                                <span className="text-zinc-300">{dp.fact}</span>
                                {dp.source && <span className="text-zinc-600 ml-2">— {dp.source}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   CONTRADICTIONS TAB
   ================================================================ */
function ContradictionsTab({ state }: { state: SimulationState }) {
  const items = state.synthesis?.contradictions ?? [];
  if (!items.length) return <div className="p-6 text-zinc-600 text-sm">No contradictions detected.</div>;
  const modeColor: Record<string, string> = {
    RESOLVED: "#34d399", NUANCED: "#fbbf24", UNRESOLVED_TENSION: "#f87171",
  };
  return (
    <div className="divide-y divide-white/[0.04]">
      {items.map((c, i) => {
        const col = modeColor[c.mode] ?? "#94a3b8";
        return (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: EASE_OUT }}
            className="flex gap-0 px-6 py-5">
            <div className="w-0.5 rounded-full shrink-0 mr-5 self-stretch" style={{ background: col }} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-md" style={{ color: col, background: `${col}15` }}>{c.mode.replace("_"," ")}</span>
              </div>
              <p className="text-sm text-zinc-300">{c.description}</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{c.resolution}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================================================================
   CASCADES TAB
   ================================================================ */
function CascadesTab({ state }: { state: SimulationState }) {
  const tree = state.cascades?.cascadeTree;
  if (!tree) return <div className="p-6 text-zinc-600 text-sm">Cascade analysis pending…</div>;
  const { nodes, edges, feedbackLoops } = tree;
  const byType = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 };
  nodes.forEach(n => { byType[n.type] = (byType[n.type] ?? 0) + 1; });
  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-6">
        {[["POSITIVE","#34d399"],["NEGATIVE","#f87171"],["NEUTRAL","#64748b"]].map(([t,c]) => (
          <div key={t} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="text-[10px] font-mono text-zinc-500">{t}</span>
            <span className="text-[10px] font-mono text-zinc-300"><AnimNum value={byType[t as keyof typeof byType]} /></span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-600">edges</span>
          <span className="text-[10px] font-mono text-zinc-300"><AnimNum value={edges.length} /></span>
        </div>
        {feedbackLoops.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-mono text-zinc-500"><AnimNum value={feedbackLoops.length} /> loops</span>
          </div>
        )}
      </div>
      <CascadeTree nodes={nodes} edges={edges} loops={feedbackLoops} />
    </div>
  );
}

/* ================================================================
   PATHS TAB
   ================================================================ */
function PathsTab({ state }: { state: SimulationState }) {
  const paths = state.cascades?.scenarioPaths ?? [];
  if (!paths.length) return <div className="p-6 text-zinc-600 text-sm">Scenario paths pending…</div>;
  const pathColor: Record<string, string> = { OPTIMISTIC: "#34d399", BASE_CASE: "#60a5fa", PESSIMISTIC: "#f87171" };
  return (
    <div className="space-y-6 p-6">
      {paths.map((path, pi) => {
        const col = pathColor[path.type] ?? "#94a3b8";
        return (
          <motion.div key={pi} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pi * 0.1, duration: 0.4, ease: EASE_OUT }}
            className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className="w-2 h-2 rounded-full" style={{ background: col, boxShadow: `0 0 8px ${col}50` }} />
              <span className="text-sm font-medium text-zinc-200">{path.label}</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-md ml-auto" style={{ color: col, background: `${col}15` }}>{path.type.replace("_"," ")}</span>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-[12px] text-zinc-400 leading-relaxed">{path.summary}</p>
              {path.keyMilestones.length > 0 && (
                <div className="relative pl-4">
                  <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, ${col}40, transparent)` }} />
                  <div className="space-y-3">
                    {path.keyMilestones.map((m, mi) => (
                      <div key={mi} className="flex gap-3 items-start">
                        <div className="absolute -left-[3px] mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: col }} />
                        <span className="text-[10px] font-mono text-zinc-600 shrink-0 w-8">{m.year}</span>
                        <div>
                          <span className="text-[11px] text-zinc-300">{m.event}</span>
                          <span className="text-[9px] font-mono ml-2 px-1.5 py-0.5 rounded" style={{ color: DC[m.domain] ?? "#94a3b8", background: `${DC[m.domain] ?? "#94a3b8"}15` }}>{m.domain}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================================================================
   STAKEHOLDERS TAB
   ================================================================ */
function StakeholdersTab({ state }: { state: SimulationState }) {
  const debate = state.stakeholderDebate;
  if (!debate) return <div className="p-6 text-zinc-600 text-sm">Stakeholder analysis pending…</div>;
  const toneColor: Record<string, string> = {
    SUPPORTIVE: "#34d399", OPPOSED: "#f87171", CAUTIOUS: "#fbbf24",
    NEUTRAL: "#64748b", PRAGMATIC: "#60a5fa",
  };
  return (
    <div className="space-y-5 p-6">
      {debate.summary && (
        <div className="border-l-2 border-white/[0.08] pl-4">
          <p className="text-[12px] text-zinc-400 leading-relaxed">{debate.summary}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {debate.stakeholders.map((s, i) => {
          const col = toneColor[s.tone] ?? "#94a3b8";
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: EASE_OUT }}
              className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${col}, transparent)` }} />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{s.name}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{s.role}</div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-md shrink-0" style={{ color: col, background: `${col}15` }}>{s.tone}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{s.perspective}</p>
                {s.keyArguments.length > 0 && (
                  <ul className="space-y-1">
                    {s.keyArguments.slice(0, 3).map((a, ai) => (
                      <li key={ai} className="flex gap-2 text-[10px] text-zinc-500">
                        <span className="text-zinc-700 shrink-0">›</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   DRILL DOWN — conversation UI with SSE streaming
   ================================================================ */
function DrillDown({ simId, state }: { simId: string; state: SimulationState }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.conversation?.length) {
      setMsgs(state.conversation.map(m => ({ role: m.role, content: m.content })));
    }
  }, [state.conversation]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);
    setMsgs(prev => [...prev, { role: "user", content: q }]);
    let buf = "";
    setMsgs(prev => [...prev, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(`/api/simulations/${simId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.delta) { buf += d.delta; setMsgs(prev => { const n = [...prev]; n[n.length-1] = { role: "assistant", content: buf }; return n; }); }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      setMsgs(prev => { const n = [...prev]; n[n.length-1] = { role: "assistant", content: "Error reaching the engine." }; return n; });
    } finally { setLoading(false); }
  }, [input, loading, simId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {msgs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-zinc-700 text-sm">Ask anything about this simulation</div>
            <div className="text-zinc-800 text-[11px] mt-1">e.g. "What's the most likely 5-year outcome?"</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${
              m.role === "user"
                ? "bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 text-zinc-200 rounded-br-sm"
                : "bg-white/[0.03] border border-white/[0.06] text-zinc-300 rounded-bl-sm"
            }`}>
              {m.role === "assistant" ? <Markdown content={m.content || "…"} /> : m.content}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-white/[0.05]">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask the engine…"
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#7c5cfc]/40 transition-colors" />
          <button onClick={send} disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#7c5cfc]/20 border border-[#7c5cfc]/30 text-[#7c5cfc] text-sm font-medium hover:bg-[#7c5cfc]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            {loading ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SOURCES — collapsible list
   ================================================================ */
function Sources({ state }: { state: SimulationState }) {
  const [open, setOpen] = useState(false);
  const sources = state.baselineData ?? [];
  if (!sources.length) return null;
  return (
    <div className="border-t border-white/[0.04]">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-6 py-3 hover:bg-white/[0.02] transition-colors text-left">
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Sources</span>
        <span className="text-[9px] font-mono text-zinc-700 ml-1">({sources.length})</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-3 h-3 text-zinc-700 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: EASE_OUT }}
            className="overflow-hidden">
            <div className="px-6 pb-4 space-y-2">
              {sources.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-[9px] font-mono text-zinc-700 shrink-0 mt-0.5">{String(i+1).padStart(2,"0")}</span>
                  <div className="min-w-0">
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors truncate block">{s.title}</a>
                    {s.snippet && <p className="text-[10px] text-zinc-700 mt-0.5 line-clamp-2">{s.snippet}</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   REPORT VIEW — pill tab bar + panels
   ================================================================ */
const TABS = [
  { id: "synthesis",      label: "Synthesis"      },
  { id: "domains",        label: "Domains"        },
  { id: "contradictions", label: "Contradictions" },
  { id: "cascades",       label: "Cascades"       },
  { id: "paths",          label: "Paths"          },
  { id: "stakeholders",   label: "Stakeholders"   },
  { id: "drilldown",      label: "Ask"            },
] as const;
type TabId = typeof TABS[number]["id"];

function ReportView({ state, simId }: { state: SimulationState; simId: string }) {
  const [active, setActive] = useState<TabId>("synthesis");

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-white/[0.05] overflow-x-auto scrollbar-none shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)}
            className="relative shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{ color: active === tab.id ? "white" : "rgb(113 113 122)" }}>
            {active === tab.id && (
              <motion.div layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-white/[0.07] border border-white/[0.08]"
                transition={{ type: "spring", stiffness: 400, damping: 35 }} />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: EASE_OUT }}
            className="h-full">
            {active === "synthesis"      && <SynthesisTab state={state} />}
            {active === "domains"        && <DomainsTab state={state} />}
            {active === "contradictions" && <ContradictionsTab state={state} />}
            {active === "cascades"       && <CascadesTab state={state} />}
            {active === "paths"          && <PathsTab state={state} />}
            {active === "stakeholders"   && <StakeholdersTab state={state} />}
            {active === "drilldown"      && <DrillDown simId={simId} state={state} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <Sources state={state} />
    </div>
  );
}

/* ================================================================
   SIMULATION DASHBOARD — main export
   Full-viewport 2-panel: map left (sticky), intel right (scrollable)
   Uses fixed inset-0 to escape root layout's max-w-5xl constraint
   ================================================================ */
export function SimulationDashboard({ simulationId }: { simulationId: string }) {
  const [state, setState] = useState<SimulationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  /* Poll / stream state */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/simulations/${simulationId}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data: SimulationState = await res.json();
        if (!cancelled) setState(data);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    load();

    // SSE for live updates — stream sends state directly (not wrapped)
    const es = new EventSource(`/api/simulations/${simulationId}/stream`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data: SimulationState = JSON.parse(e.data);
        // stream sends raw state object
        if (data?.id && !cancelled) setState(data);
      } catch { /* skip */ }
    };
    es.addEventListener("close", () => es.close());
    es.onerror = () => { es.close(); };

    return () => {
      cancelled = true;
      es.close();
      esRef.current = null;
    };
  }, [simulationId]);

  /* ── Loading ── */
  if (!state && !error) {
    return (
      <div className="fixed inset-0 bg-[#030306] flex items-center justify-center z-50">
        <div className="space-y-4 text-center">
          <div className="relative w-12 h-12 mx-auto">
            <motion.div className="absolute inset-0 rounded-full border border-[#7c5cfc]/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }} />
            <div className="absolute inset-0 rounded-full border border-[#7c5cfc]/60 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#7c5cfc] animate-pulse" />
            </div>
          </div>
          <p className="text-[11px] font-mono text-zinc-600">Loading simulation…</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !state) {
    return (
      <div className="fixed inset-0 bg-[#030306] flex items-center justify-center z-50">
        <div className="text-center space-y-3">
          <div className="text-zinc-600 text-sm">Failed to load simulation</div>
          <div className="text-zinc-700 text-[11px] font-mono">{error}</div>
          <Link href="/" className="text-[#7c5cfc] text-sm hover:underline">← Back</Link>
        </div>
      </div>
    );
  }

  const isRunning = state.agentStatus
    ? Object.values(state.agentStatus).some(s => s === "ACTIVE" || s === "DISPATCHED" || s === "PENDING")
    : false;

  // Show progress if actively running OR if agents exist but synthesis not yet done
  const hasAgents = (state.activeAgents?.length ?? 0) > 0;
  const showProgress = isRunning || (hasAgents && !state.synthesis);

  const completedDomains = state.agentStatus
    ? Object.values(state.agentStatus).filter(s => s === "COMPLETE").length
    : 0;
  const totalDomains = state.activeAgents?.length ?? 0;

  return (
    /* Fixed full-viewport container — escapes root layout max-w-5xl */
    <div className="fixed inset-0 flex bg-[#030306] z-[60]" style={{ top: "56px" }}>

      {/* ── LEFT PANEL: Map (sticky full-height) ── */}
      <div className="relative flex-shrink-0 w-[55%] h-full border-r border-white/[0.04]">
        <ImpactMap state={state} />

        {/* Scenario label overlay at bottom of map — above region pills */}
        <div className="absolute bottom-14 left-4 right-20 z-10 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.05] backdrop-blur-2xl max-w-full">
            <div className="w-1 h-1 rounded-full bg-[#7c5cfc] shrink-0" />
            <p className="text-[10px] text-zinc-500 font-mono truncate">
              {state.scenario.split(/[.!?]/)[0].trim().slice(0, 120)}
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Intel (scrollable) ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-white/[0.05] bg-[#030306]/80 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link href="/" className="text-zinc-700 hover:text-zinc-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                </Link>
                <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">Simulation</span>
                <span className="text-[9px] font-mono text-zinc-800">{simulationId.slice(0, 8)}</span>
              </div>
              <h1 className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2">
                {state.scenario.split(/[.!?]/)[0].trim().slice(0, 200)}
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {state.synthesis && <ConfidenceLabel level={state.synthesis.overallConfidence} />}
              {showProgress && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7c5cfc]/10 border border-[#7c5cfc]/20">
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-[#7c5cfc]"
                    animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  <span className="text-[9px] font-mono text-[#7c5cfc]">
                    {completedDomains}/{totalDomains}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Running progress bar */}
          {showProgress && (
            <div className="mt-3 h-px w-full rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div className="h-full rounded-full"
                animate={{ width: `${totalDomains > 0 ? (completedDomains / totalDomains) * 100 : 5}%` }}
                transition={{ duration: 0.8, ease: EASE_OUT }}
                style={{ background: "linear-gradient(90deg,#7c5cfc,#60a5fa)" }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {showProgress ? (
            <ProgressView state={state} />
          ) : (
            <ReportView state={state} simId={simulationId} />
          )}
        </div>
      </div>
    </div>
  );
}
