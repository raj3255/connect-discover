// Socket.io Main Entry Point
// Combines all handlers and sets up the server

/*
import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createClient } from 'redis';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Import handlers
import chatHandler from './chatHandler';
import statusHandler from './statusHandler';
import locationHandler from './locationHandler';
import matchHandler from './matchHandler';
import typingHandler from './typingHandler';

export const initializeSocketServer = (httpServer: HttpServer, db: Pool, redis: ReturnType<typeof createClient>) => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      
      // Check if user exists and is not banned
      const user = await db.query(
        'SELECT id, banned FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (!user.rows[0]) {
        return next(new Error('User not found'));
      }
      
      if (user.rows[0].banned) {
        return next(new Error('User is banned'));
      }
      
      // Attach userId to socket
      socket.userId = decoded.userId;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
  
  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    
    // Join user's personal room for direct messages
    socket.join(`user:${socket.userId}`);
    
    // Initialize all handlers
    chatHandler(io, socket, db, redis);
    statusHandler(io, socket, db, redis);
    locationHandler(io, socket, db, redis);
    matchHandler(io, socket, db, redis);
    typingHandler(io, socket, db, redis);
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
  
  return io;
};

// Type augmentation for socket
declare module 'socket.io' {
  interface Socket {
    userId: string;
  }
}
*/

// Export handler types for client-side use
export type { ChatEvents } from './chatHandler';
export type { StatusEvents, UserStatus, StatusUpdate } from './statusHandler';
export type { LocationEvents, LocationData, NearbyUser } from './locationHandler';
export type { MatchEvents, MatchPreferences, MatchedUser, MatchSession } from './matchHandler';
export type { TypingEvents } from './typingHandler';

// Client-side Socket Manager Example:
/*
import { io, Socket } from 'socket.io-client';

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  
  private constructor() {}
  
  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }
  
  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }
    
    this.socket = io(process.env.SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    return this.socket;
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  getSocket(): Socket | null {
    return this.socket;
  }
}

export default SocketManager;
*/
