export interface AirportRecord {
  code: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export const globalAirports: AirportRecord[] = [
  // USA
  { code: 'JFK', name: 'John F. Kennedy Intl', lat: 40.6413, lng: -73.7781, city: 'New York', country: 'United States' },
  { code: 'LAX', name: 'Los Angeles Intl', lat: 33.9416, lng: -118.4085, city: 'Los Angeles', country: 'United States' },
  { code: 'ORD', name: "Chicago O'Hare Intl", lat: 41.9742, lng: -87.9073, city: 'Chicago', country: 'United States' },
  { code: 'MIA', name: 'Miami Intl', lat: 25.7959, lng: -80.2870, city: 'Miami', country: 'United States' },
  { code: 'SEA', name: 'Seattle-Tacoma Intl', lat: 47.4502, lng: -122.3088, city: 'Seattle', country: 'United States' },
  { code: 'SFO', name: 'San Francisco Intl', lat: 37.6213, lng: -122.3790, city: 'San Francisco', country: 'United States' },
  
  // Japan
  { code: 'HND', name: 'Tokyo Haneda', lat: 35.5494, lng: 139.7798, city: 'Tokyo', country: 'Japan' },
  { code: 'NRT', name: 'Narita Intl', lat: 35.7720, lng: 140.3929, city: 'Tokyo', country: 'Japan' },
  { code: 'KIX', name: 'Kansai Intl', lat: 34.4320, lng: 135.2304, city: 'Osaka', country: 'Japan' },

  // UK
  { code: 'LHR', name: 'London Heathrow', lat: 51.4700, lng: -0.4543, city: 'London', country: 'United Kingdom' },
  { code: 'LGW', name: 'London Gatwick', lat: 51.1537, lng: -0.1821, city: 'London', country: 'United Kingdom' },
  { code: 'MAN', name: 'Manchester', lat: 53.3623, lng: -2.2729, city: 'Manchester', country: 'United Kingdom' },

  // France
  { code: 'CDG', name: 'Charles de Gaulle', lat: 49.0097, lng: 2.5479, city: 'Paris', country: 'France' },
  { code: 'ORY', name: 'Paris Orly', lat: 48.7262, lng: 2.3652, city: 'Paris', country: 'France' },
  { code: 'NCE', name: 'Nice Côte d\'Azur', lat: 43.6652, lng: 7.2150, city: 'Nice', country: 'France' },

  // UAE
  { code: 'DXB', name: 'Dubai Intl', lat: 25.2532, lng: 55.3657, city: 'Dubai', country: 'United Arab Emirates' },
  { code: 'AUH', name: 'Abu Dhabi Intl', lat: 24.4330, lng: 54.6511, city: 'Abu Dhabi', country: 'United Arab Emirates' },

  // Germany
  { code: 'FRA', name: 'Frankfurt', lat: 50.0379, lng: 8.5622, city: 'Frankfurt', country: 'Germany' },
  { code: 'MUC', name: 'Munich', lat: 48.3537, lng: 11.7861, city: 'Munich', country: 'Germany' },
];

export const getCountries = () => Array.from(new Set(globalAirports.map(a => a.country))).sort();
export const getCities = (country: string) => Array.from(new Set(globalAirports.filter(a => a.country === country).map(a => a.city))).sort();
export const getAirportsByCity = (city: string) => globalAirports.filter(a => a.city === city).sort((a, b) => a.name.localeCompare(b.name));
