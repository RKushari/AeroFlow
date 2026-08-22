require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { LRUCache } = require('lru-cache');

const app = express();
app.use(cors()); // Allow all origins since Vercel domains can vary, or restrict to your Vercel domain later

// Cache for 45 seconds to prevent rate limiting
const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 45, 
});

const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;

app.get('/', (req, res) => {
  res.send('AeroFlow OpenSky Proxy is running.');
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

    if (OPENSKY_CLIENT_ID && OPENSKY_CLIENT_SECRET) {
      const auth = Buffer.from(`${OPENSKY_CLIENT_ID}:${OPENSKY_CLIENT_SECRET}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    console.log('Fetching from OpenSky API...');
    const response = await axios.get(openSkyUrl, { headers, timeout: 10000 });
    
    // Cache the response
    cache.set(cacheKey, response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('Proxy Error:', error.response ? error.response.data : error.message);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
