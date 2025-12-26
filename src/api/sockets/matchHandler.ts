// Match Handler - Global mode matching via Socket.io
// Uses: Socket.io + Redis (for match queue)

export interface MatchPreferences {
  mode: 'chat' | 'video';
  ageRange: [number, number];
  genderPreference: 'male' | 'female' | 'any';
  sexualityPreference?: string;
}

export interface MatchedUser {
  id: string;
  name: string;
  age: number;
  avatar: string;
  gender: string;
}

export interface MatchSession {
  id: string;
  participants: string[];
  mode: 'chat' | 'video';
  startedAt: Date;
}

export interface MatchEvents {
  // Client -> Server
  'match:start_searching': (preferences: MatchPreferences) => void;
  'match:stop_searching': () => void;
  'match:accept': (matchId: string) => void;
  'match:decline': (matchId: string) => void;
  'match:skip': () => void;
  'match:end_session': () => void;
  'match:switch_mode': (mode: 'chat' | 'video') => void;
  
  // Server -> Client
  'match:searching': () => void;
  'match:found': (data: { matchId: string; user: MatchedUser }) => void;
  'match:accepted': (session: MatchSession) => void;
  'match:declined': () => void;
  'match:partner_left': () => void;
  'match:mode_switched': (mode: 'chat' | 'video') => void;
  'match:error': (error: { code: string; message: string }) => void;
}

// Socket.io Handler Implementation:
/*
const matchHandler = (io, socket, db, redis) => {
  const userId = socket.userId;
  let currentMatchId = null;
  let currentSessionId = null;
  let searchInterval = null;
  
  // Start searching for a match
  socket.on('match:start_searching', async (preferences) => {
    try {
      const { mode, ageRange, genderPreference, sexualityPreference } = preferences;
      
      // Get user info
      const userResult = await db.query(
        'SELECT id, name, age, gender, avatar FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];
      
      if (!user) {
        socket.emit('match:error', { code: 'USER_NOT_FOUND', message: 'User not found' });
        return;
      }
      
      // Add to match queue
      const queueData = {
        id: userId,
        name: user.name,
        age: user.age,
        gender: user.gender,
        avatar: user.avatar,
        preferences: {
          mode,
          ageRange,
          genderPreference,
          sexualityPreference
        },
        joinedAt: Date.now()
      };
      
      await redis.hset('match_queue', userId, JSON.stringify(queueData));
      
      socket.emit('match:searching');
      
      // Start matching loop
      searchInterval = setInterval(async () => {
        await findMatch(user, preferences);
      }, 2000);
      
    } catch (error) {
      console.error('Error starting search:', error);
      socket.emit('match:error', { code: 'SEARCH_FAILED', message: 'Failed to start searching' });
    }
  });
  
  // Stop searching
  socket.on('match:stop_searching', async () => {
    if (searchInterval) {
      clearInterval(searchInterval);
      searchInterval = null;
    }
    await redis.hdel('match_queue', userId);
  });
  
  // Find a matching user
  const findMatch = async (user, preferences) => {
    try {
      // Get all users in queue
      const queue = await redis.hgetall('match_queue');
      
      // Get blocked users
      const blockedUsers = await redis.smembers(`blocked:${userId}`);
      const blockedByUsers = await redis.smembers(`blocked_by:${userId}`);
      const blockedSet = new Set([...blockedUsers, ...blockedByUsers]);
      
      // Find compatible match
      for (const [candidateId, dataStr] of Object.entries(queue)) {
        if (candidateId === userId) continue;
        if (blockedSet.has(candidateId)) continue;
        
        const candidate = JSON.parse(dataStr);
        
        // Check mutual compatibility
        if (!isCompatible(user, preferences, candidate)) continue;
        if (!isCompatible(candidate, candidate.preferences, user)) continue;
        
        // Found a match!
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store pending match
        await redis.hset('pending_matches', matchId, JSON.stringify({
          user1: userId,
          user2: candidateId,
          mode: preferences.mode,
          createdAt: Date.now()
        }));
        
        // Remove both from queue
        await redis.hdel('match_queue', userId, candidateId);
        
        if (searchInterval) {
          clearInterval(searchInterval);
          searchInterval = null;
        }
        
        currentMatchId = matchId;
        
        // Notify both users
        socket.emit('match:found', {
          matchId,
          user: {
            id: candidateId,
            name: candidate.name,
            age: candidate.age,
            avatar: candidate.avatar,
            gender: candidate.gender
          }
        });
        
        io.to(`user:${candidateId}`).emit('match:found', {
          matchId,
          user: {
            id: userId,
            name: user.name,
            age: user.age,
            avatar: user.avatar,
            gender: user.gender
          }
        });
        
        // Set match timeout (30 seconds to accept)
        setTimeout(async () => {
          const match = await redis.hget('pending_matches', matchId);
          if (match) {
            await redis.hdel('pending_matches', matchId);
            socket.emit('match:declined');
            io.to(`user:${candidateId}`).emit('match:declined');
          }
        }, 30000);
        
        return;
      }
    } catch (error) {
      console.error('Error finding match:', error);
    }
  };
  
  // Check if two users are compatible
  const isCompatible = (user, preferences, candidate) => {
    // Check age range
    if (candidate.age < preferences.ageRange[0] || candidate.age > preferences.ageRange[1]) {
      return false;
    }
    
    // Check gender preference
    if (preferences.genderPreference !== 'any' && candidate.gender !== preferences.genderPreference) {
      return false;
    }
    
    // Check mode preference matches
    if (preferences.mode !== candidate.preferences.mode) {
      return false;
    }
    
    return true;
  };
  
  // Accept match
  socket.on('match:accept', async (matchId) => {
    try {
      const matchData = await redis.hget('pending_matches', matchId);
      if (!matchData) {
        socket.emit('match:error', { code: 'MATCH_EXPIRED', message: 'Match has expired' });
        return;
      }
      
      const match = JSON.parse(matchData);
      
      // Mark user as accepted
      match[`${userId}_accepted`] = true;
      
      const partnerId = match.user1 === userId ? match.user2 : match.user1;
      
      // Check if both accepted
      if (match[`${partnerId}_accepted`]) {
        // Create session
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
          id: sessionId,
          participants: [match.user1, match.user2],
          mode: match.mode,
          startedAt: new Date()
        };
        
        await redis.hset('active_sessions', sessionId, JSON.stringify(session));
        await redis.hdel('pending_matches', matchId);
        
        currentSessionId = sessionId;
        
        // Notify both users
        socket.emit('match:accepted', session);
        io.to(`user:${partnerId}`).emit('match:accepted', session);
        
        // Join session room
        socket.join(`session:${sessionId}`);
        io.to(`user:${partnerId}`).socketsJoin(`session:${sessionId}`);
      } else {
        // Wait for partner
        await redis.hset('pending_matches', matchId, JSON.stringify(match));
      }
    } catch (error) {
      console.error('Error accepting match:', error);
      socket.emit('match:error', { code: 'ACCEPT_FAILED', message: 'Failed to accept match' });
    }
  });
  
  // Decline match
  socket.on('match:decline', async (matchId) => {
    try {
      const matchData = await redis.hget('pending_matches', matchId);
      if (matchData) {
        const match = JSON.parse(matchData);
        const partnerId = match.user1 === userId ? match.user2 : match.user1;
        
        await redis.hdel('pending_matches', matchId);
        
        io.to(`user:${partnerId}`).emit('match:declined');
      }
      
      currentMatchId = null;
    } catch (error) {
      console.error('Error declining match:', error);
    }
  });
  
  // Skip current partner and find new match
  socket.on('match:skip', async () => {
    if (currentSessionId) {
      const sessionData = await redis.hget('active_sessions', currentSessionId);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const partnerId = session.participants.find(id => id !== userId);
        
        await redis.hdel('active_sessions', currentSessionId);
        
        io.to(`user:${partnerId}`).emit('match:partner_left');
      }
    }
    
    currentSessionId = null;
    currentMatchId = null;
  });
  
  // End session
  socket.on('match:end_session', async () => {
    if (currentSessionId) {
      const sessionData = await redis.hget('active_sessions', currentSessionId);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const partnerId = session.participants.find(id => id !== userId);
        
        await redis.hdel('active_sessions', currentSessionId);
        
        io.to(`user:${partnerId}`).emit('match:partner_left');
      }
    }
    
    currentSessionId = null;
  });
  
  // Switch mode (chat <-> video)
  socket.on('match:switch_mode', async (mode) => {
    if (currentSessionId) {
      const sessionData = await redis.hget('active_sessions', currentSessionId);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.mode = mode;
        
        await redis.hset('active_sessions', currentSessionId, JSON.stringify(session));
        
        // Notify partner
        const partnerId = session.participants.find(id => id !== userId);
        io.to(`user:${partnerId}`).emit('match:mode_switched', mode);
      }
    }
  });
  
  // Cleanup on disconnect
  socket.on('disconnect', async () => {
    if (searchInterval) {
      clearInterval(searchInterval);
    }
    
    await redis.hdel('match_queue', userId);
    
    if (currentSessionId) {
      const sessionData = await redis.hget('active_sessions', currentSessionId);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const partnerId = session.participants.find(id => id !== userId);
        
        await redis.hdel('active_sessions', currentSessionId);
        
        io.to(`user:${partnerId}`).emit('match:partner_left');
      }
    }
  });
};

export default matchHandler;
*/
