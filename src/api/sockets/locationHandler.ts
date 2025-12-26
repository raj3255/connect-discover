// Location Handler - Real-time location updates via Socket.io
// Uses: Socket.io + Redis (for geo queries)

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  country?: string;
}

export interface NearbyUser {
  userId: string;
  distance: number;
  status: 'online' | 'idle' | 'offline';
}

export interface LocationEvents {
  // Client -> Server
  'location:update': (location: LocationData) => void;
  'location:subscribe_nearby': (radius: number) => void;
  'location:unsubscribe_nearby': () => void;
  
  // Server -> Client
  'location:nearby_users': (users: NearbyUser[]) => void;
  'location:user_entered_radius': (user: NearbyUser) => void;
  'location:user_left_radius': (userId: string) => void;
  'location:error': (error: { code: string; message: string }) => void;
}

// Socket.io Handler Implementation:
/*
const locationHandler = (io, socket, db, redis) => {
  const userId = socket.userId;
  let nearbySubscription = null;
  
  // Update user location
  socket.on('location:update', async (location) => {
    const { latitude, longitude, accuracy, city, country } = location;
    
    try {
      // Update PostgreSQL
      await db.query(`
        UPDATE users SET 
          location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
          city = $3,
          country = $4,
          location_updated_at = NOW()
        WHERE id = $5
      `, [longitude, latitude, city, country, userId]);
      
      // Update Redis geospatial index
      await redis.geoadd('user_locations', longitude, latitude, userId);
      
      // Store location details
      await redis.hset(`user:${userId}:location`, {
        latitude,
        longitude,
        accuracy: accuracy || 0,
        city: city || '',
        country: country || '',
        updatedAt: new Date().toISOString()
      });
      
      // If subscribed to nearby updates, recalculate
      if (nearbySubscription) {
        await sendNearbyUsers(nearbySubscription);
      }
      
      // Notify users who have subscribed to this user's location
      const subscribers = await redis.smembers(`location_subscribers:${userId}`);
      subscribers.forEach(subscriberId => {
        io.to(`user:${subscriberId}`).emit('location:user_moved', {
          userId,
          latitude,
          longitude,
          city
        });
      });
      
    } catch (error) {
      console.error('Error updating location:', error);
      socket.emit('location:error', { code: 'UPDATE_FAILED', message: 'Failed to update location' });
    }
  });
  
  // Subscribe to nearby users
  socket.on('location:subscribe_nearby', async (radius) => {
    nearbySubscription = radius;
    await sendNearbyUsers(radius);
    
    // Set up interval to refresh nearby users
    const intervalId = setInterval(async () => {
      if (nearbySubscription) {
        await sendNearbyUsers(nearbySubscription);
      }
    }, 30000); // Every 30 seconds
    
    socket.on('disconnect', () => {
      clearInterval(intervalId);
    });
  });
  
  // Unsubscribe from nearby users
  socket.on('location:unsubscribe_nearby', () => {
    nearbySubscription = null;
  });
  
  // Helper function to send nearby users
  const sendNearbyUsers = async (radius) => {
    try {
      const userLocation = await redis.geopos('user_locations', userId);
      
      if (!userLocation[0]) {
        socket.emit('location:error', { code: 'NO_LOCATION', message: 'Your location is not set' });
        return;
      }
      
      // Get nearby users from Redis
      const nearbyUserIds = await redis.georadius(
        'user_locations',
        userLocation[0][0], // longitude
        userLocation[0][1], // latitude
        radius,
        'km',
        'WITHDIST',
        'COUNT', 100,
        'ASC'
      );
      
      // Filter out self and blocked users
      const blockedUsers = await redis.smembers(`blocked:${userId}`);
      const blockedByUsers = await redis.smembers(`blocked_by:${userId}`);
      const blockedSet = new Set([...blockedUsers, ...blockedByUsers, userId]);
      
      const filteredUsers = nearbyUserIds.filter(([id]) => !blockedSet.has(id));
      
      // Get user details
      const users = await Promise.all(filteredUsers.map(async ([id, distance]) => {
        const status = await redis.hget('user_status', id) || 'offline';
        return {
          userId: id,
          distance: parseFloat(distance),
          status: status as 'online' | 'idle' | 'offline'
        };
      }));
      
      socket.emit('location:nearby_users', users);
      
    } catch (error) {
      console.error('Error getting nearby users:', error);
      socket.emit('location:error', { code: 'FETCH_FAILED', message: 'Failed to get nearby users' });
    }
  };
  
  // Clean up on disconnect
  socket.on('disconnect', () => {
    nearbySubscription = null;
  });
};

export default locationHandler;
*/

// Helper: Haversine formula for distance calculation (if not using Redis geo)
/*
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
*/
