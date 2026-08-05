'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plane, RefreshCw, AlertTriangle, CloudRain, Target, Search, Compass, Shield, Wind, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Use mapbox instead of maplibre
import ReactMap, { FullscreenControl, NavigationControl, Source, Layer, MapRef, ViewState } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DeadReckoningEngine, FlightState } from '@/lib/flight-tracker/dead-reckoning';
import { getColorByAltitude, getStatusText } from '@/lib/flight-tracker/aircraft-utils';

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

// To save on Mapbox tile usage fees, we continue using CARTO and ESRI basemaps
const BASEMAP_STYLE_URLS = {
  VOYAGER: {
    version: 8,
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    sources: {
      'basemap': {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }]
  },
  SATELLITE: {
    version: 8,
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    sources: {
      'basemap': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    },
    layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }]
  },
  DARK: {
    version: 8,
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    sources: {
      'basemap': {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }]
  }
};

const svgToImageAsync = (svgPath: string, width: number, height: number) => {
  return new Promise<HTMLImageElement>(resolve => {
    const image = new Image(width, height);
    image.addEventListener('load', () => resolve(image));
    image.src = svgPath;
  });
};

export function LiveFlights() {
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Filters & Map Controls
  const [mapTheme, setMapTheme] = useState<'VOYAGER' | 'SATELLITE' | 'DARK'>('VOYAGER');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AIR' | 'GND'>('ALL');
  const [altitudeFilter, setAltitudeFilter] = useState<'ALL' | 'HIGH' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);

  // GeoJSON & Path Prediction
  const [featureCollection, setFeatureCollection] = useState<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [routeCollection, setRouteCollection] = useState<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  
  const deadReckoningRef = useRef<DeadReckoningEngine>(new DeadReckoningEngine());
  
  // React Map GL State
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    latitude: 38,
    longitude: -95,
    zoom: 4,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  const fetchLive = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/opensky/live');
      if (!res.ok) {
        if (res.status === 429) {
          setError('Rate limit reached. Using cached telemetry feed.');
          return;
        }
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      if (!data.data || data.data.length === 0) throw new Error("No live telemetry");
      setFlights(data.data);
      deadReckoningRef.current.updateStates(data.data);
      setLastUpdated(new Date().toLocaleTimeString());
      if (data.source === 'mock') setError('OpenSky API Limit Reached: Mock simulations.');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch live data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 45000);
    return () => clearInterval(interval);
  }, []);

  const filteredFlights = useMemo(() => {
    return flights.filter(f => {
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
      return (f.callsign?.toLowerCase().includes(q) || f.icao24?.toLowerCase().includes(q));
    });
  }, [flights, statusFilter, altitudeFilter, searchQuery]);

  // OpenMeteo weather fetching
  useEffect(() => {
    if (selectedFlight && selectedFlight.latitude && selectedFlight.longitude) {
      const fetchWeather = async () => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selectedFlight.latitude}&longitude=${selectedFlight.longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover,precipitation`);
          const data = await res.json();
          if (data && data.current) {
            setWeatherData({
              temp: data.current.temperature_2m,
              windSpeed: data.current.wind_speed_10m,
              windDirection: data.current.wind_direction_10m,
              cloudCover: data.current.cloud_cover,
              precipitation: data.current.precipitation,
              conditionCode: data.current.weather_code
            });
          }
        } catch (e) {
          console.error("OpenMeteo fetch failed:", e);
        }
      };
      fetchWeather();
    } else {
      setWeatherData(null);
    }
  }, [selectedFlight]);

  // Interpolation Engine & Route Generation
  useEffect(() => {
    const updateFeatures = () => {
      const predictions = deadReckoningRef.current.predictPositions(300);
      const predictionMap = new Map(predictions.map(p => [p.icao24, p]));
      const features: GeoJSON.Feature[] = [];

      for (const f of filteredFlights) {
        const pred = predictionMap.get(f.icao24);
        const lat = pred?.latitude ?? f.latitude ?? 0;
        const lon = pred?.longitude ?? f.longitude ?? 0;

        const isSelected = selectedFlight?.icao24 === f.icao24;
        const altMeters = f.baroAltitude ?? 0;
        const color = getColorByAltitude(altMeters, f.onGround, isSelected);

        let iconName = 'flight-icon';
        if (f.verticalRate && f.verticalRate > 0 && altMeters < 1000) {
          iconName = (f.trueTrack ?? 0) < 180 ? 'flight-takeoff-icon' : 'flight-takeoff-flipped-icon';
        } else if (f.verticalRate && f.verticalRate < 0 && altMeters < 1000) {
          iconName = (f.trueTrack ?? 0) < 180 ? 'flight-land-icon' : 'flight-land-flipped-icon';
        }

        let label = '';
        if (viewState.zoom > 7) label = f.callsign || f.icao24;
        if (viewState.zoom > 9) label += `\n${(altMeters * 3.28084).toFixed(0)}ft | ${((f.velocity ?? 0) * 1.94384).toFixed(0)}kts`;

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {
            icao24: f.icao24,
            iconName,
            rotation: f.trueTrack ?? 0,
            color,
            label
          }
        });
      }
      setFeatureCollection({ type: 'FeatureCollection', features });

      // Update Route Collection
      if (selectedFlight) {
        const p = predictionMap.get(selectedFlight.icao24) || selectedFlight;
        const curLon = p.longitude ?? 0;
        const curLat = p.latitude ?? 0;
        const origCode = selectedFlight.originAirport || 'JFK';
        const destCode = selectedFlight.destinationAirport || 'LAX';
        const origCoords = AIRPORT_COORDS[origCode] || [-73.7789, 40.6413];
        const destCoords = AIRPORT_COORDS[destCode] || [-118.4085, 33.9416];

        const routeFeatures: GeoJSON.Feature[] = [
          // Traveled path
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [origCoords, [curLon, curLat]] },
            properties: { status: 'past' }
          },
          // Planned path
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[curLon, curLat], destCoords] },
            properties: { status: 'future' }
          },
          // Origin marker
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: origCoords },
            properties: { type: 'marker', name: origCode, position: 'orig' }
          },
          // Destination marker
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: destCoords },
            properties: { type: 'marker', name: destCode, position: 'dest' }
          }
        ];
        setRouteCollection({ type: 'FeatureCollection', features: routeFeatures });
      } else {
        setRouteCollection({ type: 'FeatureCollection', features: [] });
      }
    };

    updateFeatures();
    const interval = setInterval(updateFeatures, 300);
    return () => clearInterval(interval);
  }, [filteredFlights, selectedFlight, viewState.zoom]);

  const handleMapLoad = (e: any) => {
    const map = e.target;
    svgToImageAsync('/icons/flight-24px.svg', 24, 24).then(img => {
      if (!map.hasImage('flight-icon')) map.addImage('flight-icon', img, { sdf: true });
    });
    svgToImageAsync('/icons/flight_takeoff-24px.svg', 24, 24).then(img => {
      if (!map.hasImage('flight-takeoff-icon')) map.addImage('flight-takeoff-icon', img, { sdf: true });
    });
    svgToImageAsync('/icons/flight_takeoff-24px_flippedx.svg', 24, 24).then(img => {
      if (!map.hasImage('flight-takeoff-flipped-icon')) map.addImage('flight-takeoff-flipped-icon', img, { sdf: true });
    });
    svgToImageAsync('/icons/flight_land-24px.svg', 24, 24).then(img => {
      if (!map.hasImage('flight-land-icon')) map.addImage('flight-land-icon', img, { sdf: true });
    });
    svgToImageAsync('/icons/flight_land-24px_flippedx.svg', 24, 24).then(img => {
      if (!map.hasImage('flight-land-flipped-icon')) map.addImage('flight-land-flipped-icon', img, { sdf: true });
    });
  };

  const handleMapClick = (e: any) => {
    if (e.features && e.features.length > 0) {
      // Find the first feature that is an aircraft
      const feature = e.features.find((f: any) => f.layer.id === 'aircrafts');
      if (feature) {
        const icao24 = feature.properties?.icao24;
        if (icao24) {
          const flight = flights.find(f => f.icao24 === icao24);
          if (flight) {
            setSelectedFlight(flight);
            
            // Pan to selected aircraft
            if (mapRef.current && flight.latitude && flight.longitude) {
               mapRef.current.flyTo({ center: [flight.longitude, flight.latitude], zoom: 6, duration: 1500 });
            }
            return;
          }
        }
      }
    }
    setSelectedFlight(null);
  };

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
              <h2 className="font-bold text-xl text-white tracking-tight">Active WebGL Flight Radar</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Mapbox GL
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 font-mono">
              <span>AIRBORNE: <strong className="text-blue-400">{filteredFlights.filter(f=>!f.onGround).length}</strong></span>
              <span>•</span>
              <span>GROUND: <strong className="text-amber-400">{filteredFlights.filter(f=>f.onGround).length}</strong></span>
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
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Flight ID, Callsign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900/90 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-inner font-mono"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl font-mono">
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

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl font-mono">
            <button onClick={() => setStatusFilter('ALL')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>All</button>
            <button onClick={() => setStatusFilter('AIR')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg ${statusFilter === 'AIR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Airborne</button>
            <button onClick={() => setStatusFilter('GND')} className={`px-2.5 py-1.5 text-xs font-bold rounded-lg ${statusFilter === 'GND' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>Ground</button>
          </div>

          <button
            onClick={fetchLive}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-bold shadow-lg shadow-blue-900/30 font-mono"
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

      {/* Immersive Map Viewport using React Map GL Mapbox */}
      <div className="w-full h-[600px] relative bg-slate-950 overflow-hidden">
        <ReactMap
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          mapStyle={BASEMAP_STYLE_URLS[mapTheme] as any}
          interactiveLayerIds={['aircrafts']}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
          dragPan={true}
          scrollZoom={true}
          doubleClickZoom={true}
        >
          <FullscreenControl position='bottom-right' />
          <NavigationControl position='bottom-right' />

          {/* Route Layer */}
          <Source type="geojson" data={routeCollection}>
            <Layer
              id="route-line-past"
              type="line"
              filter={['==', 'status', 'past']}
              paint={{
                'line-color': '#f97316',
                'line-width': 3
              }}
            />
            <Layer
              id="route-line-future"
              type="line"
              filter={['==', 'status', 'future']}
              paint={{
                'line-color': '#10b981',
                'line-width': 2.5,
                'line-dasharray': [2, 2]
              }}
            />
            <Layer
              id="route-labels"
              type="symbol"
              filter={['==', 'type', 'marker']}
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 12,
                'text-anchor': 'bottom',
                'text-offset': [0, -1]
              }}
              paint={{
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 2
              }}
            />
            <Layer
              id="route-points"
              type="circle"
              filter={['==', 'type', 'marker']}
              paint={{
                'circle-radius': 4,
                'circle-color': ['match', ['get', 'position'], 'orig', '#f97316', 'dest', '#10b981', '#ffffff']
              }}
            />
          </Source>

          <Source type="geojson" data={featureCollection}>
            <Layer
              id="aircrafts"
              type="symbol"
              source="geojson"
              layout={{
                'icon-image': ['get', 'iconName'],
                'icon-allow-overlap': true,
                'icon-rotate': ['get', 'rotation'],
                'icon-size': viewState.zoom > 9 ? 1.6 : (viewState.zoom > 7 ? 1.3 : 1.0),
                'text-field': viewState.zoom > 7 ? ['get', 'label'] : '',
                'text-optional': true,
                'text-allow-overlap': true,
                'text-anchor': viewState.zoom > 7 ? 'top' : 'center',
                'text-offset': viewState.zoom > 7 ? [0, 1] : [0, 0]
              }}
              paint={{
                'icon-color': ['get', 'color'],
                'text-color': ['get', 'color'],
                'text-halo-width': 2,
                'text-halo-color': '#090d16',
                'text-halo-blur': 2
              }}
            />
          </Source>
        </ReactMap>

        {/* Selected Flight HUD - Mirrored from react-flight-tracker AircraftInfoOverlay */}
        <AnimatePresence>
          {selectedFlight && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="absolute top-4 left-4 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-4 text-white z-20"
              style={{ minWidth: 268 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-500/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-full text-white shadow-lg shadow-blue-500/30">
                    <Plane className="h-6 w-6" style={{ transform: `rotate(${selectedFlight.trueTrack || 0}deg)` }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg font-sans leading-none">{selectedFlight.callsign || '?'}</h3>
                    <span className="text-sm text-slate-300 font-sans">{selectedFlight.originCountry}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedFlight(null)} className="p-1 rounded-full hover:bg-slate-700 text-red-400 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Data Rows */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Last position update</span>
                  <span className="text-sm font-sans">{(selectedFlight as any).timePosition ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric' }).format(new Date((selectedFlight as any).timePosition * 1000)) : '?'} [0s]</span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Barometric altitude</span>
                  <span className="text-sm font-sans">{selectedFlight.baroAltitude ? `${selectedFlight.baroAltitude.toFixed(1)} m [${(selectedFlight.baroAltitude * 3.28084).toFixed(1)} ft.]` : '0.0 m [0.0 ft.]'}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Velocity</span>
                  <span className="text-sm font-sans">{selectedFlight.velocity ? `${(selectedFlight.velocity * 3.6).toFixed(1)} km/h [${selectedFlight.velocity.toFixed(1)} m/s]` : '0.0 km/h [0.0 m/s]'}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Longitude / Latitude</span>
                  <span className="text-sm font-sans">{selectedFlight.longitude?.toFixed(3) || -1} ° / {selectedFlight.latitude?.toFixed(3) || -1} °</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Rotation</span>
                  <span className="text-sm font-sans">{selectedFlight.trueTrack?.toFixed(1) || 0} °</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Vertical rate</span>
                  <span className="text-sm font-sans">{selectedFlight.verticalRate?.toFixed(1) || 0} m/s</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Status</span>
                  <span className="text-sm font-sans">{getStatusText(selectedFlight.onGround, selectedFlight.verticalRate ?? 0, selectedFlight.baroAltitude ?? 0)}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">ICAO24</span>
                  <span className="text-sm font-sans">{selectedFlight.icao24}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-sans mb-0.5">Transpondercode [Squawk]</span>
                  <span className="text-sm font-sans">{selectedFlight.squawk || -1}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weather Radar Panel */}
        <AnimatePresence>
          {selectedFlight && weatherData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 right-4 w-72 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/40 rounded-xl shadow-2xl p-4 text-white z-20"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <CloudRain className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="font-bold text-xs font-mono">OPENMETEO WEATHER</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">LIVE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 mb-1">TEMP</div>
                  <div className="font-bold text-white text-sm">{weatherData.temp.toFixed(1)}°C</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 mb-1">WINDS</div>
                  <div className="font-bold text-blue-400 text-sm">{weatherData.windSpeed.toFixed(0)} km/h</div>
                  <div className="text-[9px] text-slate-400">@ {weatherData.windDirection}°</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 mb-1">CLOUD CVR</div>
                  <div className="font-bold text-slate-200 text-sm">{weatherData.cloudCover}%</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="text-slate-500 mb-1">PRECIP</div>
                  <div className="font-bold text-slate-200 text-sm">{weatherData.precipitation} mm</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Flight Radar Data Table */}
      {flights.length > 0 && (
        <div className="overflow-x-auto max-h-64 border-t border-slate-800 bg-slate-950">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/90 text-slate-400 sticky top-0 z-10 border-b border-slate-800 font-mono">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Callsign</th>
                <th className="px-4 py-3 text-left font-semibold">From</th>
                <th className="px-4 py-3 text-left font-semibold">To</th>
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
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFlight(null);
                      } else {
                        setSelectedFlight(f);
                        if (mapRef.current && f.latitude && f.longitude) {
                          mapRef.current.flyTo({ center: [f.longitude, f.latitude], zoom: 6, duration: 1500 });
                        }
                      }
                    }}
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
