// Location Routes - Nearby users, City search
// Backend: PostgreSQL with PostGIS extension

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface NearbyUser {
  id: string;
  name: string;
  avatar: string;
  distance: number; // in kilometers
  status: 'online' | 'idle' | 'offline';
}

export interface LocationRoutes {
  // PUT /api/location - Update current user location
  updateLocation: (location: LocationData) => Promise<void>;
  
  // GET /api/location/nearby - Get nearby users
  getNearbyUsers: (radius: number, limit?: number) => Promise<NearbyUser[]>;
  
  // GET /api/location/city/:cityName - Search users by city
  getUsersByCity: (cityName: string, limit?: number) => Promise<NearbyUser[]>;
  
  // GET /api/location/cities - Search cities
  searchCities: (query: string) => Promise<{ name: string; country: string }[]>;
}

// Example Express.js route handlers:
/*
router.put('/location', authenticate, async (req, res) => {
  const { latitude, longitude, city, country } = req.body;
  await db.query(
    `UPDATE users SET 
      location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
      city = $3,
      country = $4,
      location_updated_at = NOW()
    WHERE id = $5`,
    [longitude, latitude, city, country, req.userId]
  );
  
  // Also update in Redis for fast lookups
  await redis.geoadd('user_locations', longitude, latitude, req.userId);
  await redis.setex(`user:${req.userId}:location`, 3600, JSON.stringify({ latitude, longitude, city }));
  
  res.status(204).send();
});

router.get('/location/nearby', authenticate, async (req, res) => {
  const { radius = 50, limit = 50 } = req.query;
  
  // Get current user's location
  const userLocation = await redis.geopos('user_locations', req.userId);
  if (!userLocation[0]) {
    return res.status(400).json({ error: 'Location not set' });
  }
  
  // Find nearby users using Redis GEORADIUS
  const nearbyUserIds = await redis.georadius(
    'user_locations',
    userLocation[0][0],
    userLocation[0][1],
    radius,
    'km',
    'WITHDIST',
    'COUNT', limit,
    'ASC'
  );
  
  // Get user details from PostgreSQL
  const users = await db.query(
    'SELECT id, name, avatar, status FROM users WHERE id = ANY($1)',
    [nearbyUserIds.map(u => u[0])]
  );
  
  res.json(users.rows.map(user => ({
    ...user,
    distance: nearbyUserIds.find(u => u[0] === user.id)?.[1] || 0
  })));
});

router.get('/location/city/:cityName', authenticate, async (req, res) => {
  const { cityName } = req.params;
  const { limit = 50 } = req.query;
  
  const users = await db.query(
    'SELECT id, name, avatar, status FROM users WHERE city ILIKE $1 AND id != $2 LIMIT $3',
    [`%${cityName}%`, req.userId, limit]
  );
  
  res.json(users.rows);
});

router.get('/location/cities', async (req, res) => {
  const { query } = req.query;
  
  const cities = await db.query(
    'SELECT DISTINCT city as name, country FROM users WHERE city ILIKE $1 LIMIT 20',
    [`%${query}%`]
  );
  
  res.json(cities.rows);
});
*/

// SQL Schema:
/*
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location columns to users table
ALTER TABLE users ADD COLUMN location GEOGRAPHY(POINT, 4326);
ALTER TABLE users ADD COLUMN city VARCHAR(100);
ALTER TABLE users ADD COLUMN country VARCHAR(100);
ALTER TABLE users ADD COLUMN location_updated_at TIMESTAMP;

CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_city ON users(city);
*/
