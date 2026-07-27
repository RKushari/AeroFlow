import axios, { AxiosInstance } from 'axios';

export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export interface StateVector {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  sensors: number[] | null;
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  positionSource: number;
  category: number;
}

class OpenSkyService {
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private baseURL: string = 'https://opensky-network.org/api';
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  public creditsRemaining: number | null = null;
  private client: AxiosInstance;

  constructor() {
    this.clientId = process.env.OPENSKY_CLIENT_ID;
    this.clientSecret = process.env.OPENSKY_CLIENT_SECRET;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000
    });

    // Interceptor to track rate limits automatically
    this.client.interceptors.response.use((response) => {
      if (response.headers['x-rate-limit-remaining']) {
        this.creditsRemaining = parseInt(response.headers['x-rate-limit-remaining'], 10);
      }
      return response;
    }, (error) => {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['x-rate-limit-retry-after-seconds'] || 60;
        error.message = `OpenSky Rate Limit Exhausted. Retry after ${retryAfter} seconds.`;
        (error as any).retryAfter = retryAfter;
      }
      return Promise.reject(error);
    });
  }

  /**
   * OAuth2 Token Management (Client Credentials Grant)
   */
  async authenticate() {
    if (!this.clientId || !this.clientSecret) {
      return null;
    }
    try {
      const token = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      this.client.defaults.headers.common['Authorization'] = `Basic ${token}`;
      return token;
    } catch (error: any) {
      console.warn(`OpenSky authentication failed. Falling back to unauthenticated tier. Reason: ${error.message}`);
      return null;
    }
  }

  /**
   * 1. GET /states/all
   */
  async getStates(bbox: BoundingBox | null = null, icao24List: string[] = []): Promise<StateVector[]> {
    await this.authenticate();
    
    const params: any = {};
    if (bbox) {
      params.lamin = bbox.lamin;
      params.lomin = bbox.lomin;
      params.lamax = bbox.lamax;
      params.lomax = bbox.lomax;
    }
    
    let url = '/states/all';
    if (icao24List.length > 0) {
      const query = icao24List.map(icao => `icao24=${icao}`).join('&');
      url += (Object.keys(params).length > 0 ? `&${query}` : `?${query}`);
    }

    const response = await this.client.get(url, { params });
    
    if (!response.data || !response.data.states) return [];
    
    return response.data.states.map((state: any[]) => this._parseStateVector(state));
  }

  /**
   * 2. GET /flights/arrival
   */
  async getArrivals(airportCode: string, beginTime: number, endTime: number) {
    await this.authenticate();
    const response = await this.client.get('/flights/arrival', {
      params: { airport: airportCode, begin: beginTime, end: endTime }
    });
    return response.data || [];
  }

  /**
   * 3. GET /flights/departure
   */
  async getDepartures(airportCode: string, beginTime: number, endTime: number) {
    await this.authenticate();
    const response = await this.client.get('/flights/departure', {
      params: { airport: airportCode, begin: beginTime, end: endTime }
    });
    return response.data || [];
  }

  /**
   * 4. GET /tracks
   */
  async getTrack(icao24: string, time: number = 0) {
    await this.authenticate();
    const response = await this.client.get('/tracks', {
      params: { icao24, time }
    });
    return response.data;
  }

  /**
   * 5. GET /flights/aircraft
   */
  async getAircraftHistory(icao24: string, beginTime: number, endTime: number) {
    await this.authenticate();
    const response = await this.client.get('/flights/aircraft', {
      params: { icao24, begin: beginTime, end: endTime }
    });
    return response.data || [];
  }

  /**
   * Structure parsing based strictly on OpenSky's 18-element array
   */
  private _parseStateVector(v: any[]): StateVector {
    return {
      icao24: v[0],
      callsign: v[1] ? String(v[1]).trim() : null,
      originCountry: v[2],
      timePosition: v[3],
      lastContact: v[4],
      longitude: v[5],
      latitude: v[6],
      baroAltitude: v[7],
      onGround: v[8],
      velocity: v[9],       // m/s
      trueTrack: v[10],     // degrees
      verticalRate: v[11],  // m/s
      sensors: v[12],
      geoAltitude: v[13],
      squawk: v[14],
      spi: v[15],
      positionSource: v[16],
      category: v[17]
    };
  }
}

// Singleton instance
export const openSky = new OpenSkyService();
