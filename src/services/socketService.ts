import io from 'socket.io-client';
import type {Socket} from 'socket.io-client';


class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(token: string):Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
      {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    this.setupListeners();
    return this.socket;
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    this.socket.on('connection:success', (data) => {
      console.log('✅ Socket connection success:', data);
    });
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string): void {
    this.socket?.off(event);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // ============================================================================
  // CHAT METHODS
  // ============================================================================

  joinChat(conversationId: string): void {
    this.emit('join_chat', conversationId);
  }

  leaveChat(conversationId: string): void {
    this.emit('leave_chat', conversationId);
  }

  sendMessage(conversationId: string, text: string, mediaUrls?: string[]): void {
    this.emit('send_message', {
      conversationId,
      text,
      mediaUrls: mediaUrls || [],
      messageType: 'text'
    });
  }

  onNewMessage(callback: (message: any) => void): void {
    this.on('chat:new_message', callback);
  }

  onMessagesRead(callback: (data: any) => void): void {
    this.on('chat:messages_read', callback);
  }

  onJoined(callback: (data: any) => void): void {
    this.on('chat:joined', callback);
  }

  // ============================================================================
  // TYPING METHODS
  // ============================================================================

  startTyping(conversationId: string): void {
    this.emit('typing:start', conversationId);
  }

  stopTyping(conversationId: string): void {
    this.emit('typing:stop', conversationId);
  }

  onUserTyping(callback: (data: any) => void): void {
    this.on('typing:user_typing', callback);
  }

  onUserStoppedTyping(callback: (data: any) => void): void {
    this.on('typing:user_stopped', callback);
  }

  // ============================================================================
  // STATUS METHODS
  // ============================================================================

  updateStatus(status: 'online' | 'idle' | 'offline'): void {
    this.emit('status:update', status);
  }

  subscribeToStatus(userIds: string[]): void {
    this.emit('status:subscribe', userIds);
  }

  onUserOnline(callback: (data: any) => void): void {
    this.on('status:user_online', callback);
  }

  onUserOffline(callback: (data: any) => void): void {
    this.on('status:user_offline', callback);
  }

  // ============================================================================
  // LOCATION METHODS
  // ============================================================================

  updateLocation(latitude: number, longitude: number, accuracy?: number): void {
    this.emit('location:update', {
      latitude,
      longitude,
      accuracy: accuracy || 10
    });
  }

  subscribeNearby(radius: number): void {
    this.emit('location:subscribe_nearby', radius);
  }

  onNearbyUsers(callback: (data: any) => void): void {
    this.on('location:nearby_users', callback);
  }

  // ============================================================================
  // MATCHING METHODS
  // ============================================================================

  startMatching(mode: 'chat' | 'video', ageRange: [number, number], genderPreference: string): void {
    this.emit('match:start_searching', {
      mode,
      ageRange,
      genderPreference
    });
  }

  stopMatching(): void {
    this.emit('match:stop_searching');
  }

  acceptMatch(matchId: string): void {
    this.emit('match:accept', matchId);
  }

  declineMatch(matchId: string): void {
    this.emit('match:decline', matchId);
  }

  endSession(): void {
    this.emit('match:end_session');
  }

  onMatching(callback: () => void): void {
    this.on('match:searching', callback);
  }

  onMatchFound(callback: (data: any) => void): void {
    this.on('match:found', callback);
  }

  onMatchAccepted(callback: (data: any) => void): void {
    this.on('match:accepted', callback);
  }

  onPartnerLeft(callback: () => void): void {
    this.on('match:partner_left', callback);
  }
}

export default SocketService.getInstance();