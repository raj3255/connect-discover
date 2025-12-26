// Typing Handler - Typing indicators via Socket.io
// Uses: Socket.io + Redis (for debouncing)

export interface TypingEvents {
  // Client -> Server
  'typing:start': (conversationId: string) => void;
  'typing:stop': (conversationId: string) => void;
  
  // Server -> Client
  'typing:user_typing': (data: { conversationId: string; userId: string; userName: string }) => void;
  'typing:user_stopped': (data: { conversationId: string; userId: string }) => void;
}

// Socket.io Handler Implementation:
/*
const typingHandler = (io, socket, db, redis) => {
  const userId = socket.userId;
  const typingTimeouts = new Map();
  
  // Get user name (cached)
  const getUserName = async () => {
    let userName = await redis.hget('user_names', userId);
    
    if (!userName) {
      const result = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
      userName = result.rows[0]?.name || 'Unknown';
      await redis.hset('user_names', userId, userName);
      await redis.expire('user_names', 3600); // Cache for 1 hour
    }
    
    return userName;
  };
  
  // Start typing
  socket.on('typing:start', async (conversationId) => {
    try {
      // Verify user is participant
      const participant = await redis.sismember(`conversation:${conversationId}:participants`, userId);
      
      if (!participant) {
        // Fallback to database
        const dbParticipant = await db.query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, userId]
        );
        
        if (dbParticipant.rows.length === 0) {
          return; // Silently ignore if not a participant
        }
      }
      
      // Clear any existing timeout for this conversation
      const timeoutKey = `${conversationId}:${userId}`;
      if (typingTimeouts.has(timeoutKey)) {
        clearTimeout(typingTimeouts.get(timeoutKey));
      }
      
      // Get user name
      const userName = await getUserName();
      
      // Add to typing set in Redis
      await redis.sadd(`typing:${conversationId}`, userId);
      
      // Broadcast to conversation room (except sender)
      socket.to(`conversation:${conversationId}`).emit('typing:user_typing', {
        conversationId,
        userId,
        userName
      });
      
      // Auto-stop typing after 5 seconds of no activity
      const timeout = setTimeout(async () => {
        await stopTyping(conversationId);
        typingTimeouts.delete(timeoutKey);
      }, 5000);
      
      typingTimeouts.set(timeoutKey, timeout);
      
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });
  
  // Stop typing
  socket.on('typing:stop', async (conversationId) => {
    await stopTyping(conversationId);
    
    // Clear timeout
    const timeoutKey = `${conversationId}:${userId}`;
    if (typingTimeouts.has(timeoutKey)) {
      clearTimeout(typingTimeouts.get(timeoutKey));
      typingTimeouts.delete(timeoutKey);
    }
  });
  
  // Helper function to stop typing
  const stopTyping = async (conversationId) => {
    try {
      // Remove from typing set
      await redis.srem(`typing:${conversationId}`, userId);
      
      // Broadcast to conversation room
      socket.to(`conversation:${conversationId}`).emit('typing:user_stopped', {
        conversationId,
        userId
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  };
  
  // Clean up on disconnect
  socket.on('disconnect', async () => {
    // Clear all typing timeouts
    for (const [key, timeout] of typingTimeouts.entries()) {
      clearTimeout(timeout);
      
      const [conversationId] = key.split(':');
      await redis.srem(`typing:${conversationId}`, userId);
      
      // Notify conversation that user stopped typing
      io.to(`conversation:${conversationId}`).emit('typing:user_stopped', {
        conversationId,
        userId
      });
    }
    
    typingTimeouts.clear();
  });
};

export default typingHandler;
*/

// Client-side implementation example:
/*
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export const useTypingIndicator = (
  socket: Socket,
  conversationId: string,
  onTypingChange: (typingUsers: { userId: string; userName: string }[]) => void
) => {
  const typingUsersRef = useRef<Map<string, { userId: string; userName: string }>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Listen for typing events
    socket.on('typing:user_typing', (data) => {
      if (data.conversationId === conversationId) {
        typingUsersRef.current.set(data.userId, {
          userId: data.userId,
          userName: data.userName
        });
        onTypingChange(Array.from(typingUsersRef.current.values()));
      }
    });
    
    socket.on('typing:user_stopped', (data) => {
      if (data.conversationId === conversationId) {
        typingUsersRef.current.delete(data.userId);
        onTypingChange(Array.from(typingUsersRef.current.values()));
      }
    });
    
    return () => {
      socket.off('typing:user_typing');
      socket.off('typing:user_stopped');
    };
  }, [socket, conversationId, onTypingChange]);
  
  // Function to emit typing event (debounced)
  const emitTyping = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    socket.emit('typing:start', conversationId);
    
    debounceRef.current = setTimeout(() => {
      socket.emit('typing:stop', conversationId);
    }, 3000);
  };
  
  // Function to stop typing
  const stopTyping = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    socket.emit('typing:stop', conversationId);
  };
  
  return { emitTyping, stopTyping };
};
*/
