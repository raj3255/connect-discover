// Status Handler - Online/offline status via Socket.io
// Uses: Socket.io + Redis (for presence tracking)

export type UserStatus = 'online' | 'idle' | 'offline';

export interface StatusUpdate {
  userId: string;
  status: UserStatus;
  lastSeen?: Date;
}

export interface StatusEvents {
  // Client -> Server
  'status:update': (status: UserStatus) => void;
  'status:subscribe': (userIds: string[]) => void;
  'status:unsubscribe': (userIds: string[]) => void;
  
  // Server -> Client
  'status:user_online': (data: { userId: string; status: UserStatus }) => void;
  'status:user_offline': (data: { userId: string; lastSeen: Date }) => void;
  'status:bulk_status': (data: StatusUpdate[]) => void;
}

// Socket.io Handler Implementation:
/*
const statusHandler = (io, socket, db, redis) => {
  const userId = socket.userId;
  
  // Set user online when they connect
  const setOnline = async () => {
    try {
      // Update database
      await db.query(
        'UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2',
        ['online', userId]
      );
      
      // Update Redis
      await redis.hset('user_status', userId, 'online');
      await redis.hset('user_last_seen', userId, new Date().toISOString());
      
      // Add to online users set
      await redis.sadd('online_users', userId);
      
      // Notify friends/subscribers
      const subscribers = await redis.smembers(`status_subscribers:${userId}`);
      subscribers.forEach(subscriberId => {
        io.to(`user:${subscriberId}`).emit('status:user_online', {
          userId,
          status: 'online'
        });
      });
      
      console.log(`User ${userId} is online`);
    } catch (error) {
      console.error('Error setting online status:', error);
    }
  };
  
  // Set user offline when they disconnect
  const setOffline = async () => {
    try {
      const lastSeen = new Date();
      
      // Update database
      await db.query(
        'UPDATE users SET status = $1, last_seen = $2 WHERE id = $3',
        ['offline', lastSeen, userId]
      );
      
      // Update Redis
      await redis.hset('user_status', userId, 'offline');
      await redis.hset('user_last_seen', userId, lastSeen.toISOString());
      
      // Remove from online users set
      await redis.srem('online_users', userId);
      
      // Notify friends/subscribers
      const subscribers = await redis.smembers(`status_subscribers:${userId}`);
      subscribers.forEach(subscriberId => {
        io.to(`user:${subscriberId}`).emit('status:user_offline', {
          userId,
          lastSeen
        });
      });
      
      console.log(`User ${userId} is offline`);
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
  };
  
  // Initialize online status
  setOnline();
  
  // Handle explicit status updates (e.g., idle)
  socket.on('status:update', async (status) => {
    try {
      await db.query(
        'UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2',
        [status, userId]
      );
      
      await redis.hset('user_status', userId, status);
      
      // Notify subscribers
      const subscribers = await redis.smembers(`status_subscribers:${userId}`);
      subscribers.forEach(subscriberId => {
        io.to(`user:${subscriberId}`).emit('status:user_online', {
          userId,
          status
        });
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  });
  
  // Subscribe to multiple users' status
  socket.on('status:subscribe', async (userIds) => {
    try {
      // Add this user as subscriber to each target user
      await Promise.all(userIds.map(targetId => 
        redis.sadd(`status_subscribers:${targetId}`, userId)
      ));
      
      // Get current status of all requested users
      const statuses = await Promise.all(userIds.map(async (targetId) => {
        const status = await redis.hget('user_status', targetId) || 'offline';
        const lastSeen = await redis.hget('user_last_seen', targetId);
        
        return {
          userId: targetId,
          status: status as UserStatus,
          lastSeen: lastSeen ? new Date(lastSeen) : undefined
        };
      }));
      
      socket.emit('status:bulk_status', statuses);
    } catch (error) {
      console.error('Error subscribing to status:', error);
    }
  });
  
  // Unsubscribe from users' status
  socket.on('status:unsubscribe', async (userIds) => {
    try {
      await Promise.all(userIds.map(targetId =>
        redis.srem(`status_subscribers:${targetId}`, userId)
      ));
    } catch (error) {
      console.error('Error unsubscribing from status:', error);
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', async () => {
    // Wait a bit before setting offline (in case of reconnect)
    setTimeout(async () => {
      const stillConnected = io.sockets.adapter.rooms.get(`user:${userId}`);
      if (!stillConnected || stillConnected.size === 0) {
        await setOffline();
      }
    }, 5000); // 5 second grace period
  });
  
  // Handle idle detection
  let idleTimeout;
  
  socket.on('activity', () => {
    if (idleTimeout) clearTimeout(idleTimeout);
    
    idleTimeout = setTimeout(async () => {
      await db.query('UPDATE users SET status = $1 WHERE id = $2', ['idle', userId]);
      await redis.hset('user_status', userId, 'idle');
      
      const subscribers = await redis.smembers(`status_subscribers:${userId}`);
      subscribers.forEach(subscriberId => {
        io.to(`user:${subscriberId}`).emit('status:user_online', {
          userId,
          status: 'idle'
        });
      });
    }, 5 * 60 * 1000); // 5 minutes of inactivity
  });
};

export default statusHandler;
*/
