require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { LRUCache } = require('lru-cache');

const app = express();
app.use(cors());

// Cache for 45 seconds to prevent rate limiting
const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 45, 
});

const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;
const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

// OAuth2 token cache
let cachedToken = null; // { accessToken, expiresAt }

async function getOAuth2Token() {
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) return null;
  
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    });

    const res = await axios.post(OPENSKY_TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    });

    cachedToken = {
      accessToken: res.data.access_token,
      expiresAt: Date.now() + (res.data.expires_in || 1800) * 1000,
    };
    console.log(`[AUTH] Got OAuth2 token, expires in ${res.data.expires_in}s`);
    return cachedToken.accessToken;
  } catch (err) {
    console.error('[AUTH] Token exchange failed:', err.response?.data || err.message);
    return null;
  }
}

app.get('/', (req, res) => {
  res.send('AeroFlow OpenSky Proxy is running. (OAuth2 enabled)');
});

app.get('/api/live', async (req, res) => {
  try {
    const lamin = req.query.lamin || '24.396308';
    const lomin = req.query.lomin || '-125.0';
    const lamax = req.query.lamax || '49.384358';
    const lomax = req.query.lomax || '-66.93457';

    const cacheKey = `states_${lamin}_${lomin}_${lamax}_${lomax}`;

    if (cache.has(cacheKey)) {
      console.log('Serving from cache');
      return res.json(cache.get(cacheKey));
    }

    let headers = {
      'User-Agent': 'AeroFlow-Proxy/1.0',
      'Accept': 'application/json',
    };

    // Get OAuth2 Bearer token
    const token = await getOAuth2Token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    console.log('Fetching from OpenSky API with OAuth2...');
    const response = await axios.get(openSkyUrl, { headers, timeout: 15000 });
    
    // Cache the response
    cache.set(cacheKey, response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('Proxy Error:', error.response?.status, error.response?.data || error.message);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT} (OAuth2 enabled)`);
});
