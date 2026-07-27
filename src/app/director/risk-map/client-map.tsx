'use client';

import React, { useState, useEffect, useRef } from 'react';
import { flagZone, addMonitoredAirport } from '@/lib/actions/map';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getCountries, getCities, getAirportsByCity, globalAirports } from '@/lib/data/airports';

export function RiskMapClient({ airports, initialFlagged }: { airports: any[], initialFlagged: any[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  
  const [selectedAirport, setSelectedAirport] = useState<any>(null);
  const [flagged, setFlagged] = useState(initialFlagged);
  
  // Cascading dropdown states
  const [countries] = useState(getCountries());
  const [selectedCountry, setSelectedCountry] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [availableAirports, setAvailableAirports] = useState<any[]>([]);
  const [selectedDropdownAirport, setSelectedDropdownAirport] = useState('');

  const rotationAnimationId = useRef<number | null>(null);

  useEffect(() => {
    if (selectedCountry) {
      setCities(getCities(selectedCountry));
      setSelectedCity('');
      setAvailableAirports([]);
      setSelectedDropdownAirport('');
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedCity) {
      setAvailableAirports(getAirportsByCity(selectedCity));
      setSelectedDropdownAirport('');
    }
  }, [selectedCity]);

  const startAerialRotation = () => {
    if (rotationAnimationId.current) cancelAnimationFrame(rotationAnimationId.current);
    const rotate = (timestamp: number) => {
      if (map.current) {
        map.current.rotateTo((timestamp / 120) % 360, { duration: 0 });
      }
      rotationAnimationId.current = requestAnimationFrame(rotate);
    };
    rotate(0);
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Tiles &copy; Esri'
          },
          'terrarium': {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            encoding: 'terrarium'
          }
        },
        layers: [
          { id: 'satellite-layer', type: 'raster', source: 'satellite' }
        ],
        terrain: {
          source: 'terrarium',
          exaggeration: 1.5
        }
      },
      center: [airports[0]?.lng || -73.7781, airports[0]?.lat || 40.6413],
      zoom: 13,
      pitch: 70,
      bearing: 0
    });

    map.current.on('load', () => {
      startAerialRotation();

      // Add markers for monitored airports
      airports.forEach(airport => {
        const el = document.createElement('div');
        const color = airport.risk >= 7.5 ? 'bg-red-500' : airport.risk >= 5.0 ? 'bg-amber-500' : 'bg-emerald-500';
        
        el.className = `w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer animate-pulse ${color}`;
        el.title = airport.code;

        el.addEventListener('click', () => {
          setSelectedAirport(airport);
          flyToLocation(airport.lng, airport.lat);
        });

        new maplibregl.Marker({ element: el })
          .setLngLat([airport.lng, airport.lat])
          .addTo(map.current!);
      });
    });

    map.current.on('mousedown', () => {
      if (rotationAnimationId.current) {
        cancelAnimationFrame(rotationAnimationId.current);
      }
    });

    return () => {
      if (rotationAnimationId.current) cancelAnimationFrame(rotationAnimationId.current);
      map.current?.remove();
    };
  }, [airports]);

  const flyToLocation = (lng: number, lat: number) => {
    if (rotationAnimationId.current) cancelAnimationFrame(rotationAnimationId.current);
    
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 14.5,
        pitch: 70,
        speed: 0.8,
        curve: 1
      });

      map.current.once('moveend', () => {
        startAerialRotation();
      });
    }
  };

  const [liveWeatherRisk, setLiveWeatherRisk] = useState<number | null>(null);
  const [liveWeatherDesc, setLiveWeatherDesc] = useState<string>('');
  const [liveHourlyForecast, setLiveHourlyForecast] = useState<any[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const fetchLiveWeather = async (lat: number, lng: number) => {
    setIsLoadingWeather(true);
    setLiveWeatherRisk(null);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m&wind_speed_unit=ms`);
      const data = await res.json();
      const windSpeed = data.current?.wind_speed_10m ?? 0;
      const temperature = data.current?.temperature_2m ?? 0;
      
      const hourlyData = data.hourly;
      if (hourlyData && hourlyData.time) {
        const forecast = hourlyData.time.slice(0, 24).map((timeStr: string, idx: number) => ({
          time: new Date(timeStr).getHours() + ':00',
          temp: hourlyData.temperature_2m[idx],
          wind: hourlyData.wind_speed_10m[idx]
        }));
        setLiveHourlyForecast(forecast);
      } else {
        setLiveHourlyForecast([]);
      }
      
      // Continuous wind factor
      let windFactor = 0.1;
      if (windSpeed >= 5 && windSpeed <= 30) {
        windFactor = 0.1 + ((windSpeed - 5) / 25) * 0.9;
      } else if (windSpeed > 30) {
        windFactor = 1.0;
      }

      // Continuous temperature factor
      let tempFactor = 0.0;
      if (temperature < -10) tempFactor = 1.0;
      else if (temperature < 0) tempFactor = (0 - temperature) / 10;
      else if (temperature > 40) tempFactor = 1.0;
      else if (temperature > 30) tempFactor = (temperature - 30) / 10;

      // Combined severity
      let severityIndex = Math.min(1.0, (windFactor * 0.7) + (tempFactor * 0.3));
      // Ensure minimum baseline
      severityIndex = Math.max(0.1, severityIndex);

      setLiveWeatherRisk(severityIndex * 10);
      setLiveWeatherDesc(`Temp: ${temperature}°C, Wind: ${windSpeed} m/s`);
    } catch (e) {
      console.error('Weather fetch failed', e);
      setLiveWeatherRisk(0);
      setLiveWeatherDesc('Failed to load weather data');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleDropdownSelect = (code: string) => {
    setSelectedDropdownAirport(code);
    const ap = availableAirports.find(a => a.code === code);
    if (ap) {
      // Find if this is a monitored airport to show risk details
      const monitored = airports.find(a => a.code === code);
      if (monitored) {
        setSelectedAirport(monitored);
        setLiveWeatherRisk(null); // Use monitored risk
        
        // Parse hourly forecast if available from server
        if (monitored.hourlyForecast && monitored.hourlyForecast.time) {
          const forecast = monitored.hourlyForecast.time.slice(0, 24).map((timeStr: string, idx: number) => ({
            time: new Date(timeStr).getHours() + ':00',
            temp: monitored.hourlyForecast.temperature_2m[idx],
            wind: monitored.hourlyForecast.wind_speed_10m[idx]
          }));
          setLiveHourlyForecast(forecast);
        } else {
          setLiveHourlyForecast([]);
        }
      } else {
        setSelectedAirport({
          code: ap.code,
          name: ap.name,
          risk: 0,
          lat: ap.lat,
          lng: ap.lng,
          unmonitored: true
        });
        fetchLiveWeather(ap.lat, ap.lng);
      }
      flyToLocation(ap.lng, ap.lat);
    }
  };

  const handleFlagZone = async (airport: any) => {
    const reason = prompt(`Reason for flagging ${airport.name} zone?`);
    if (reason) {
      const newZone = await flagZone(airport.code, reason);
      setFlagged([...flagged, newZone]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search / Cascading Dropdown Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="font-bold text-slate-800 dark:text-slate-200">Go to Location:</div>
        
        <select 
          className="p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
        >
          <option value="">Select Country...</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          className="p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          disabled={!selectedCountry}
        >
          <option value="">Select City...</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select 
          className="p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-50 flex-1"
          value={selectedDropdownAirport}
          onChange={(e) => handleDropdownSelect(e.target.value)}
          disabled={!selectedCity}
        >
          <option value="">Select Airport...</option>
          {availableAirports.map(a => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
        </select>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm relative h-[600px]">
          <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
          
          <div className="absolute bottom-6 left-6 z-10 bg-white/90 dark:bg-slate-900/90 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm pointer-events-none">
            <h4 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-200">Risk Legend</h4>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs">Normal (&lt;5.0)</span></div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-xs">Elevated (5.0 - 7.4)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs">High Risk (&ge;7.5)</span></div>
          </div>
        </div>

        <div className="w-full md:w-80 flex flex-col gap-4">
          {selectedAirport ? (
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{selectedAirport.name} ({selectedAirport.code})</h2>
              
              {selectedAirport.unmonitored ? (
                <div className="mt-4">
                  <div className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    This airport is not active in dispatcher monitoring. Live weather fetch enabled:
                  </div>
                  {isLoadingWeather ? (
                    <div className="text-sm font-bold text-blue-500 animate-pulse">Fetching live weather...</div>
                  ) : (
                    <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                      <div>
                        <span className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">Live Weather Conditions</span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{liveWeatherDesc}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">Estimated Flight Risk</span>
                        <span className={`text-2xl font-bold ${liveWeatherRisk !== null && liveWeatherRisk >= 7.5 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {liveWeatherRisk !== null ? liveWeatherRisk.toFixed(2) : '--'} / 10
                        </span>
                      </div>

                      {liveHourlyForecast.length > 0 && (
                        <div className="h-40 w-full mt-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={liveHourlyForecast}>
                              <XAxis dataKey="time" fontSize={10} tickMargin={5} stroke="#94a3b8" />
                              <YAxis yAxisId="left" fontSize={10} width={25} stroke="#3b82f6" />
                              <YAxis yAxisId="right" orientation="right" fontSize={10} width={25} stroke="#10b981" />
                              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp °C" stroke="#3b82f6" strokeWidth={2} dot={false} />
                              <Line yAxisId="right" type="monotone" dataKey="wind" name="Wind m/s" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={async () => {
                            await addMonitoredAirport(selectedAirport.code);
                            // Set local state so it appears monitored immediately
                            setSelectedAirport({...selectedAirport, unmonitored: false, risk: liveWeatherRisk || 0});
                          }}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-sm"
                        >
                          Add to Monitoring
                        </button>
                        <button 
                          onClick={() => handleFlagZone(selectedAirport)}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm"
                        >
                          Flag Zone
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Current Risk Profile</p>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">Total Risk Score</span>
                      <span className={`text-2xl font-bold ${selectedAirport.risk >= 7.5 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                        {selectedAirport.risk.toFixed(2)} / 10
                      </span>
                    </div>

                    {liveHourlyForecast.length > 0 && (
                        <div className="h-40 w-full mt-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={liveHourlyForecast}>
                              <XAxis dataKey="time" fontSize={10} tickMargin={5} stroke="#94a3b8" />
                              <YAxis yAxisId="left" fontSize={10} width={25} stroke="#3b82f6" />
                              <YAxis yAxisId="right" orientation="right" fontSize={10} width={25} stroke="#10b981" />
                              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp °C" stroke="#3b82f6" strokeWidth={2} dot={false} />
                              <Line yAxisId="right" type="monotone" dataKey="wind" name="Wind m/s" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    
                    <button 
                      onClick={() => handleFlagZone(selectedAirport)}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                    >
                      Flag as High-Risk Zone
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
              Select an airport to view details.
            </div>
          )}

          {flagged.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-y-auto max-h-[360px]">
              <h3 className="font-bold mb-4 text-slate-900 dark:text-white">Flagged Zones</h3>
              <ul className="space-y-3">
                {flagged.map((zone, idx) => (
                  <li key={idx} className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg">
                    <span className="font-bold text-red-700 dark:text-red-400 text-sm block">{zone.coordinates}</span>
                    <span className="text-xs text-red-600 dark:text-red-500">{zone.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
