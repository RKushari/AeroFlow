import globalAirportsJson from './global-airports.json';

export interface AirportRecord {
  code: string;
  icao: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export const globalAirports: AirportRecord[] = globalAirportsJson as AirportRecord[];

export const getCountries = () => Array.from(new Set(globalAirports.map(a => a.country))).filter(Boolean).sort();
export const getCities = (country: string) => Array.from(new Set(globalAirports.filter(a => a.country === country).map(a => a.city))).sort();
export const getAirportsByCountry = (country: string) => globalAirports.filter(a => a.country === country).sort((a, b) => a.name.localeCompare(b.name));
export const getAirportsByCity = (city: string) => globalAirports.filter(a => a.city === city).sort((a, b) => a.name.localeCompare(b.name));
export const getAirportByIcao = (icao: string) => globalAirports.find(a => a.icao === icao);
export const getAirportByIata = (iata: string) => globalAirports.find(a => a.code === iata);
