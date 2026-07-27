'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plane, RefreshCw, AlertTriangle, CloudRain, Filter, Target, Info, Activity, Search, Layers, Compass, Navigation, ArrowUpRight, Gauge, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface StateVector {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  latitude: number | null;
  longitude: number | null;
  baroAltitude: number | null;
  velocity: number | null;
  onGround: boolean;
  trueTrack?: number;
  squawk?: string;
  verticalRate?: number;
  originAirport?: string;
  destinationAirport?: string;
  originCoords?: [number, number];
  destinationCoords?: [number, number];
}

const AIRPORT_COORDS: Record<string, [number, number]> = {
  JFK: [-73.7789, 40.6413],
  LAX: [-118.4085, 33.9416],
  ORD: [-87.9073, 41.9742],
  DFW: [-97.0403, 32.8998],
  DEN: [-104.6737, 39.8561],
  SFO: [-122.3790, 37.6213],
  SEA: [-122.3088, 47.4502],
  MIA: [-80.2870, 25.7959],
  ATL: [-84.4277, 33.6407],
  BOS: [-71.0096, 42.3656],
};

const BASEMAP_TILES = {
  VOYAGER: [
    'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
  ],
  SATELLITE: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  ],
  DARK: [
    'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
  ]
};

export function LiveFlights() {
  const [flights, setFlights] = useState<StateVector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Filters & Map Controls
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [mapTheme, setMapTheme] = useState<'VOYAGER' | 'SATELLITE' | 'DARK'>('VOYAGER');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AIR' | 'GND'>('ALL');
  const [altitudeFilter, setAltitudeFilter] = useState<'ALL' | 'HIGH' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlight, setSelectedFlight] = useState<StateVector | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const endpointMarkersRef = useRef<maplibregl.Marker[]>([]);

  const fetchLive = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/opensky/live');
      if (!res.ok) {
        if (res.status === 429) {
          setError('Rate limit reached. Using cached telemetry feed. Retrying automatically.');
          return;
        }
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      if (!data.data || data.data.length === 0) {
        throw new Error("No live telemetry returned");
      }
      setFlights(data.data);
      setLastUpdated(new Date().toLocaleTimeString());
      
      if (data.source === 'mock') {
        setError('OpenSky API Limit Reached: Displaying 300 active flight radar simulations.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch live data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 60000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Map & Event Handlers
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'basemap-source': {
            type: 'raster',
            tiles: BASEMAP_TILES[mapTheme],
            tileSize: 256,
            attribution: '&copy; CARTO / Esri'
          }
        },
        layers: [
          { id: 'basemap-layer', type: 'raster', source: 'basemap-source' }
        ]
      },
      center: [-95, 38],
      zoom: 4,
      pitch: 0,
    });

    map.current = instance;

    instance.on('load', () => {
      setTimeout(() => instance.resize(), 150);
      setMapReady(true);
    });

    // Deselect flight when clicking on empty map canvas
    instance.on('click', (e) => {
      const originalEvt = e.originalEvent?.target as HTMLElement;
      if (originalEvt && !originalEvt.closest('.flight-marker') && !originalEvt.closest('.endpoint-badge')) {
        setSelectedFlight(null);
      }
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      endpointMarkersRef.current.forEach(m => m.remove());
      endpointMarkersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Handle Basemap Theme Switch
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const source = map.current.getSource('basemap-source') as any;
    if (source && source.setTiles) {
      source.setTiles(BASEMAP_TILES[mapTheme]);
    }
  }, [mapTheme, mapReady]);

  // Derive filtered flight list
  const filteredFlights = flights.filter(f => {
    if (statusFilter === 'AIR') return !f.onGround;
    if (statusFilter === 'GND') return f.onGround;
    return true;
  }).filter(f => {
    if (altitudeFilter === 'HIGH') return f.baroAltitude != null && f.baroAltitude > 9144;
    if (altitudeFilter === 'LOW') return f.baroAltitude == null || f.baroAltitude <= 9144;
    return true;
  }).filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (f.callsign && f.callsign.toLowerCase().includes(q)) ||
      (f.icao24 && f.icao24.toLowerCase().includes(q)) ||
      (f.originCountry && f.originCountry.toLowerCase().includes(q)) ||
      (f.originAirport && f.originAirport.toLowerCase().includes(q)) ||
      (f.destinationAirport && f.destinationAirport.toLowerCase().includes(q))
    );
  });

  // Render DOM Aircraft Markers on Map
  useEffect(() => {
    if (!mapReady || !map.current) return;

    const currentFlightIds = new Set<string>();

    filteredFlights.forEach(f => {
      const key = f.icao24;
      currentFlightIds.add(key);

      const lat = f.latitude!;
      const lon = f.longitude!;
      const heading = f.trueTrack ?? 0;
      const isSelected = selectedFlight?.icao24 === f.icao24;

      let marker = markersRef.current.get(key);

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'flight-marker cursor-pointer transition-all duration-300 hover:scale-125';
        el.style.width = '26px';
        el.style.height = '26px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        
        const planeColor = f.onGround ? '#f59e0b' : (isSelected ? '#3b82f6' : '#2563eb');
        
        el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="${planeColor}" stroke="#ffffff" stroke-width="1.5" style="transform: rotate(${heading}deg); transform-origin: center; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.6));">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedFlight(prev => prev?.icao24 === f.icao24 ? null : f);
        });

        marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lon, lat])
          .addTo(map.current!);

        markersRef.current.set(key, marker);
      } else {
        marker.setLngLat([lon, lat]);
        const svgEl = marker.getElement().querySelector('svg');
        if (svgEl) {
          const planeColor = f.onGround ? '#f59e0b' : (isSelected ? '#3b82f6' : '#2563eb');
          svgEl.style.transform = `rotate(${heading}deg)`;
          svgEl.setAttribute('fill', planeColor);
        }
      }
    });

    // Remove inactive markers
    markersRef.current.forEach((marker, key) => {
      if (!currentFlightIds.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });
  }, [filteredFlights, selectedFlight, mapReady]);

  // Route Connection Line State (SVG Pixel Coordinates)
  const [routePixels, setRoutePixels] = useState<{
    orig: { x: number; y: number; visible: boolean; code: string };
    cur: { x: number; y: number };
    dest: { x: number; y: number; visible: boolean; code: string };
  } | null>(null);

  // Update Route Connection Pixels & Endpoint Pins on Map Move/Render
  useEffect(() => {
    if (!map.current || !mapReady || !selectedFlight || selectedFlight.latitude == null || selectedFlight.longitude == null) {
      setRoutePixels(null);
      return;
    }

    const origCode = selectedFlight.originAirport || 'JFK';
    const destCode = selectedFlight.destinationAirport || 'LAX';

    const origPos: [number, number] = AIRPORT_COORDS[origCode] || selectedFlight.originCoords || [-73.7789, 40.6413];
    const destPos: [number, number] = AIRPORT_COORDS[destCode] || selectedFlight.destinationCoords || [-118.4085, 33.9416];
    const curPos: [number, number] = [selectedFlight.longitude, selectedFlight.latitude];

    const updateRouteProjection = () => {
      if (!map.current) return;

      const bounds = map.current.getBounds();
      const origPixel = map.current.project(origPos);
      const curPixel = map.current.project(curPos);
      const destPixel = map.current.project(destPos);

      const origVisible = bounds.contains(origPos);
      const destVisible = bounds.contains(destPos);

      setRoutePixels({
        orig: { x: origPixel.x, y: origPixel.y, visible: origVisible, code: origCode },
        cur: { x: curPixel.x, y: curPixel.y },
        dest: { x: destPixel.x, y: destPixel.y, visible: destVisible, code: destCode }
      });
    };

    // Initial camera fit to show full route
    const lons = [origPos[0], curPos[0], destPos[0]];
    const lats = [origPos[1], curPos[1], destPos[1]];
    map.current.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: 120, maxZoom: 7, duration: 800 }
    );

    updateRouteProjection();

    const instance = map.current;
    instance.on('render', updateRouteProjection);
    instance.on('move', updateRouteProjection);
    instance.on('zoom', updateRouteProjection);

    return () => {
      instance.off('render', updateRouteProjection);
      instance.off('move', updateRouteProjection);
      instance.off('zoom', updateRouteProjection);
    };
  }, [selectedFlight, mapReady]);

  // Handle Dynamic OpenMeteo Weather Fetch on Map Move / Flight Selection
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    windSpeed: number;
    windDirection: number;
    humidity: number;
    cloudCover: number;
    precipitation: number;
    weatherCode: number;
    conditionText: string;
    flightCategory: string;
    zoneName: string;
  } | null>(null);

  const [mapCenterCoords, setMapCenterCoords] = useState<{ lat: number; lon: number }>({ lat: 38.0, lon: -95.0 });

  useEffect(() => {
    if (!map.current || !mapReady) return;

    const handleMoveEnd = () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      setMapCenterCoords({ lat: parseFloat(center.lat.toFixed(2)), lon: parseFloat(center.lng.toFixed(2)) });
    };

    map.current.on('moveend', handleMoveEnd);
    return () => {
      map.current?.off('moveend', handleMoveEnd);
    };
  }, [mapReady]);

  useEffect(() => {
    let isMounted = true;

    const fetchOpenMeteoWeather = async () => {
      let rawLat = selectedFlight?.latitude ?? mapCenterCoords.lat;
      let rawLon = selectedFlight?.longitude ?? mapCenterCoords.lon;

      if (isNaN(rawLat) || isNaN(rawLon)) return;

      // Clamp latitude [-90, 90] and normalize longitude [-180, 180]
      const lat = parseFloat(Math.max(-89.9, Math.min(89.9, rawLat)).toFixed(2));
      let lon = rawLon % 360;
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      lon = parseFloat(lon.toFixed(2));

      let zone = `${lat >= 0 ? lat + '°N' : Math.abs(lat) + '°S'}, ${lon >= 0 ? lon + '°E' : Math.abs(lon) + '°W'}`;
      if (selectedFlight) {
        zone = `${selectedFlight.callsign || 'Target'} Zone (${selectedFlight.originAirport || 'JFK'} → ${selectedFlight.destinationAirport || 'LAX'})`;
      }

      setWeatherLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`OpenMeteo returned status ${res.status} for lat: ${lat}, lon: ${lon}`);
          return;
        }
        const data = await res.json();
        const cur = data.current;

        if (cur && isMounted) {
          const code = cur.weather_code ?? 0;
          let cond = 'Clear Sky';
          let cat = 'VFR (Optimal)';

          if (code >= 1 && code <= 3) { cond = 'Partly Cloudy'; cat = 'VFR'; }
          else if (code >= 45 && code <= 48) { cond = 'Dense Fog'; cat = 'IFR (Low Vis)'; }
          else if (code >= 51 && code <= 67) { cond = 'Light/Mod Rain'; cat = 'MVFR'; }
          else if (code >= 71 && code <= 77) { cond = 'Snowfall'; cat = 'IFR'; }
          else if (code >= 80 && code <= 82) { cond = 'Heavy Rain Showers'; cat = 'MVFR'; }
          else if (code >= 95) { cond = 'Severe Thunderstorm'; cat = 'LIFR (Turbulence)'; }

          setWeatherData({
            temp: cur.temperature_2m ?? 20,
            humidity: cur.relative_humidity_2m ?? 45,
            windSpeed: ((cur.wind_speed_10m ?? 10) * 0.539957),
            windDirection: cur.wind_direction_10m ?? 180,
            cloudCover: cur.cloud_cover ?? 10,
            precipitation: cur.precipitation ?? 0,
            weatherCode: code,
            conditionText: cond,
            flightCategory: cat,
            zoneName: zone
          });
        }
      } catch (err) {
        console.warn("OpenMeteo weather fetch warning:", err);
      } finally {
        if (isMounted) setWeatherLoading(false);
      }
    };

    if (showWeather || selectedFlight) {
      fetchOpenMeteoWeather();
    } else {
      setWeatherData(null);
    }

    return () => {
      isMounted = false;
    };
  }, [showWeather, selectedFlight, mapCenterCoords]);

  // Compute stats for header display
  const airborneCount = flights.filter(f => !f.onGround).length;
  const groundCount = flights.filter(f => f.onGround).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 backdrop-blur-xl">
      {/* High-Tech Tactical Toolbar */}
      <div className="flex items-center justify-between p-4 bg-slate-950/90 border-b border-slate-800 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/40 shadow-lg shadow-blue-900/20">
            <Plane className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xl text-white tracking-tight">Active Flight Radar Deck</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> LIVE
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 font-mono">
              <span>AIRBORNE: <strong className="text-blue-400">{airborneCount}</strong></span>
              <span>•</span>
              <span>GROUND: <strong className="text-amber-400">{groundCount}</strong></span>
              {lastUpdated && (
                <>
                  <span>•</span>
                  <span className="text-slate-400">UPDATED: <strong className="text-slate-200">{lastUpdated}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Flight ID, Callsign, Airport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900/90 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-inner"
            />
          </div>

          {/* Map Theme Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMapTheme('VOYAGER')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${mapTheme === 'VOYAGER' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white'}`}
            >
              Tactical
            </button>
            <button
              onClick={() => setMapTheme('SATELLITE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${mapTheme === 'SATELLITE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white'}`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapTheme('DARK')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${mapTheme === 'DARK' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white'}`}
            >
              Dark
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button onClick={() => setStatusFilter('ALL')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>All</button>
            <button onClick={() => setStatusFilter('AIR')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg ${statusFilter === 'AIR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Airborne</button>
            <button onClick={() => setStatusFilter('GND')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg ${statusFilter === 'GND' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>Ground</button>
          </div>

          {/* NEXRAD Radar Button */}
          <button
            onClick={() => setShowWeather(!showWeather)}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold border ${showWeather ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <CloudRain className={`h-4 w-4 ${weatherLoading ? 'animate-bounce' : ''}`} />
            {weatherLoading ? 'Telemetry...' : 'NEXRAD'}
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchLive}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-bold shadow-lg shadow-blue-900/30"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Feed
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-950/40 text-amber-300 text-xs flex items-center gap-2 border-b border-amber-800/60 font-mono">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Immersive Map Viewport */}
      <div className="w-full h-[580px] relative bg-slate-950 overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* SVG Route Path Overlay (100% Guaranteed Connected Colored Lines Across All Maps & Camera Moves) */}
        {routePixels && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {/* Orange Line: From Origin -> Plane */}
            <line
              x1={routePixels.orig.x}
              y1={routePixels.orig.y}
              x2={routePixels.cur.x}
              y2={routePixels.cur.y}
              stroke="#f97316"
              strokeWidth="4"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}
            />
            {/* Dashed Emerald Line: Plane -> Destination */}
            <line
              x1={routePixels.cur.x}
              y1={routePixels.cur.y}
              x2={routePixels.dest.x}
              y2={routePixels.dest.y}
              stroke="#10b981"
              strokeWidth="3.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}
            />
          </svg>
        )}

        {/* DOM Endpoint Badges (Pixel-Anchored directly on Map Coordinates) */}
        {routePixels && (
          <>
            {/* FROM Badge (Orange) */}
            <div 
              className="absolute z-20 pointer-events-none transition-all duration-75"
              style={{
                left: `${routePixels.orig.x}px`,
                top: `${routePixels.orig.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-2xl border-2 border-white flex items-center gap-1.5 animate-bounce">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>FROM: {routePixels.orig.code}</span>
              </div>
            </div>

            {/* TO Badge (Green) */}
            <div 
              className="absolute z-20 pointer-events-none transition-all duration-75"
              style={{
                left: `${routePixels.dest.x}px`,
                top: `${routePixels.dest.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-2xl border-2 border-white flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>TO: {routePixels.dest.code}</span>
              </div>
            </div>
          </>
        )}
        
        {/* Live Flight Telemetry HUD Card */}
        <AnimatePresence>
          {selectedFlight && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute top-4 left-4 w-84 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-4 text-white z-20"
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg font-mono text-white leading-none">{selectedFlight.callsign || 'UNKNOWN'}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedFlight.originCountry}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFlight(null)} 
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-lg"
                  title="Deselect Flight"
                >
                  &times;
                </button>
              </div>

              {/* Trajectory Flight Progress Bar */}
              <div className="mb-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="font-bold text-orange-400">{selectedFlight.originAirport || 'JFK'}</span>
                  <span className="text-[10px] text-slate-400">IN-FLIGHT TRAJECTORY</span>
                  <span className="font-bold text-emerald-400">{selectedFlight.destinationAirport || 'LAX'}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
                  <div className="bg-gradient-to-r from-orange-500 via-blue-500 to-emerald-500 h-full w-[65%] rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">TRANSPONDER ICAO24</span>
                  <span className="font-bold text-slate-200">{selectedFlight.icao24}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">SQUAWK CODE</span>
                  <span className={selectedFlight.squawk === '7700' ? 'text-red-400 font-bold' : 'font-bold text-slate-200'}>{selectedFlight.squawk || '1200'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">ALTITUDE</span>
                  <span className="text-emerald-400 font-bold">{selectedFlight.baroAltitude ? `${(selectedFlight.baroAltitude * 3.28084).toFixed(0)} ft` : 'GROUND TAXI'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">GROUND SPEED</span>
                  <span className="font-bold text-blue-400">{selectedFlight.velocity ? `${(selectedFlight.velocity * 1.94384).toFixed(0)} kts` : '0 kts'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">HEADING TRACK</span>
                  <span className="font-bold text-slate-200">{selectedFlight.trueTrack?.toFixed(0) || '0'}°</span>
                </div>

                {/* OpenMeteo Weather Telemetry Section */}
                {weatherData && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <CloudRain className="h-3.5 w-3.5 text-blue-400" /> OPENMETEO WEATHER
                      </span>
                      <span className="font-bold text-emerald-400">{weatherData.flightCategory}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="text-slate-500">ATMOSPHERE</div>
                        <div className="font-bold text-white mt-0.5">{weatherData.conditionText}</div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="text-slate-500">TEMP / HUMIDITY</div>
                        <div className="font-bold text-white mt-0.5">{weatherData.temp.toFixed(1)}°C ({weatherData.humidity}%)</div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="text-slate-500">WINDS</div>
                        <div className="font-bold text-blue-400 mt-0.5">{weatherData.windSpeed.toFixed(0)} kts @ {weatherData.windDirection}°</div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="text-slate-500">COVER / PRECIP</div>
                        <div className="font-bold text-slate-200 mt-0.5">{weatherData.cloudCover}% ({weatherData.precipitation}mm)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OpenMeteo Radar Panel when NEXRAD active */}
        <AnimatePresence>
          {showWeather && weatherData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 right-4 w-76 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl shadow-2xl p-4 text-white z-20"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <CloudRain className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="font-bold text-xs font-mono">OPENMETEO LIVE RADAR</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">ACTIVE</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">ZONE</span>
                  <span className="font-bold text-emerald-400 truncate max-w-[170px]">{weatherData.zoneName}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">FLIGHT STATUS</span>
                  <span className="font-bold text-emerald-400">{weatherData.flightCategory}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">CONDITIONS</span>
                  <span className="font-bold text-white">{weatherData.conditionText}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">AIR TEMP</span>
                  <span className="font-bold text-slate-200">{weatherData.temp.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">WINDS</span>
                  <span className="font-bold text-blue-400">{weatherData.windSpeed.toFixed(0)} kts ({weatherData.windDirection}°)</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && flights.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-10">
            <div className="animate-pulse font-bold text-slate-300 flex items-center gap-3 text-sm font-mono">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" /> Initializing Active Telemetry Deck...
            </div>
          </div>
        )}
      </div>

      {/* Flight Radar Data Table */}
      {flights.length > 0 && (
        <div className="overflow-x-auto max-h-64 border-t border-slate-800 bg-slate-950">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/90 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Callsign</th>
                <th className="px-4 py-3 text-left font-semibold">Origin (From)</th>
                <th className="px-4 py-3 text-left font-semibold">Destination (To)</th>
                <th className="px-4 py-3 text-left font-semibold">ICAO24</th>
                <th className="px-4 py-3 text-right font-semibold">Alt (ft)</th>
                <th className="px-4 py-3 text-right font-semibold">Speed (kts)</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredFlights.slice(0, 50).map((f, i) => {
                const isSelected = selectedFlight?.icao24 === f.icao24;
                return (
                  <tr 
                    key={`${f.icao24}-${i}`}
                    onClick={() => setSelectedFlight(prev => prev?.icao24 === f.icao24 ? null : f)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-950/60 text-white font-bold' : 'hover:bg-slate-900 text-slate-300'}`}
                  >
                    <td className="px-4 py-2.5 font-bold flex items-center gap-2 text-white">
                      <Plane className={`h-3.5 w-3.5 ${f.onGround ? 'text-amber-400' : (isSelected ? 'text-blue-400' : 'text-blue-500')}`} />
                      {f.callsign || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-orange-400">
                      {f.originAirport || 'JFK'}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-emerald-400">
                      {f.destinationAirport || 'LAX'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{f.icao24}</td>
                    <td className="px-4 py-2.5 text-right">{f.baroAltitude ? (f.baroAltitude * 3.28084).toFixed(0) : 'GND'}</td>
                    <td className="px-4 py-2.5 text-right">{f.velocity ? (f.velocity * 1.94384).toFixed(0) : '0'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${f.onGround ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'}`}>
                        {f.onGround ? 'GND' : 'AIR'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
