import { io, Socket } from 'socket.io-client';
import type { ChatEvents, ChatMessage } from '@/api/sockets/chatHandler';
import type { StatusEvents, UserStatus } from '@/api/sockets/statusHandler';
import type { LocationEvents, LocationData, NearbyUser } from '@/api/sockets/locationHandler';
import type { MatchEvents, MatchPreferences, MatchedUser, MatchSession } from '@/api/sockets/matchHandler';
import type { TypingEvents } from '@/api/sockets/typingHandler';

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

  connect(token: string): Socket {
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
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  }

  emit<T = any>(event: string, data?: T): void {
    this.socket?.emit(event, data);
  }

  on<T = any>(event: string, callback: (data: T) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
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
    this.emit('chat:join', { conversationId });
  }

  leaveChat(conversationId: string): void {
    this.emit('chat:leave', { conversationId });
  }

  sendMessage(conversationId: string, content: string, type: 'text' | 'image' | 'video' = 'text'): void {
    this.emit('chat:message', { conversationId, content, type });
  }

  markMessageRead(conversationId: string, messageId: string): void {
    this.emit('chat:message_read', { conversationId, messageId });
  }

  onChatJoined(callback: (data: { conversationId: string; messages: ChatMessage[] }) => void): void {
    this.on('chat:joined', callback);
  }

  onNewMessage(callback: (message: ChatMessage) => void): void {
    this.on('chat:new_message', callback);
  }

  onMessageRead(callback: (data: { conversationId: string; messageId: string; readBy: string; readAt: string }) => void): void {
    this.on('chat:message_read', callback);
  }

  onChatError(callback: (error: { message: string }) => void): void {
    this.on('chat:error', callback);
  }

  // ============================================================================
  // TYPING METHODS
  // ============================================================================

  startTyping(conversationId: string): void {
    this.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId: string): void {
    this.emit('typing:stop', { conversationId });
  }

  onUserTyping(callback: (data: { conversationId: string; userId: string; userName: string }) => void): void {
    this.on('typing:user_typing', callback);
  }

  onUserStoppedTyping(callback: (data: { conversationId: string; userId: string }) => void): void {
    this.on('typing:user_stopped', callback);
  }

  // ============================================================================
  // STATUS METHODS
  // ============================================================================

  updateStatus(status: UserStatus): void {
    this.emit('status:update', { status });
  }

  subscribeToStatus(userIds: string[]): void {
    this.emit('status:subscribe', { userIds });
  }

  unsubscribeFromStatus(userIds: string[]): void {
    this.emit('status:unsubscribe', { userIds });
  }

  onUserOnline(callback: (data: { userId: string; status: UserStatus; lastSeen?: string }) => void): void {
    this.on('status:user_online', callback);
  }

  onUserOffline(callback: (data: { userId: string; lastSeen: string }) => void): void {
    this.on('status:user_offline', callback);
  }

  onBulkStatus(callback: (data: { statuses: Array<{ userId: string; status: UserStatus; lastSeen?: string }> }) => void): void {
    this.on('status:bulk_status', callback);
  }

  // ============================================================================
  // LOCATION METHODS
  // ============================================================================

  updateLocation(location: LocationData): void {
    this.emit('location:update', location);
  }

  subscribeNearby(radiusKm: number): void {
    this.emit('location:subscribe_nearby', { radiusKm });
  }

  unsubscribeNearby(): void {
    this.emit('location:unsubscribe_nearby');
  }

  onNearbyUsers(callback: (data: { users: NearbyUser[] }) => void): void {
    this.on('location:nearby_users', callback);
  }

  onLocationError(callback: (error: { message: string }) => void): void {
    this.on('location:error', callback);
  }

  // ============================================================================
  // MATCHING METHODS
  // ============================================================================

  startMatching(preferences: MatchPreferences): void {
    this.emit('match:start_searching', preferences);
  }

  stopMatching(): void {
    this.emit('match:stop_searching');
  }

  acceptMatch(matchId: string): void {
    this.emit('match:accept', { matchId });
  }

  declineMatch(matchId: string): void {
    this.emit('match:decline', { matchId });
  }

  skipPartner(): void {
    this.emit('match:skip');
  }

  endSession(): void {
    this.emit('match:end_session');
  }

  switchMode(mode: 'chat' | 'video'): void {
    this.emit('match:switch_mode', { mode });
  }

  onSearching(callback: () => void): void {
    this.on('match:searching', callback);
  }

  onMatchFound(callback: (data: { matchId: string; partner: MatchedUser; expiresAt: string }) => void): void {
    this.on('match:found', callback);
  }

  onMatchExpired(callback: (data: { matchId: string }) => void): void {
    this.on('match:expired', callback);
  }

  onSessionStarted(callback: (session: MatchSession) => void): void {
    this.on('match:session_started', callback);
  }

  onPartnerLeft(callback: () => void): void {
    this.on('match:partner_left', callback);
  }

  onSessionEnded(callback: (data: { reason: string }) => void): void {
    this.on('match:session_ended', callback);
  }

  onModeChanged(callback: (data: { mode: 'chat' | 'video'; changedBy: string }) => void): void {
    this.on('match:mode_changed', callback);
  }

  onMatchError(callback: (error: { message: string }) => void): void {
    this.on('match:error', callback);
  }

  // ============================================================================
  // CLEANUP HELPERS
  // ============================================================================

  removeAllChatListeners(): void {
    this.off('chat:joined');
    this.off('chat:new_message');
    this.off('chat:message_read');
    this.off('chat:error');
  }

  removeAllTypingListeners(): void {
    this.off('typing:user_typing');
    this.off('typing:user_stopped');
  }

  removeAllStatusListeners(): void {
    this.off('status:user_online');
    this.off('status:user_offline');
    this.off('status:bulk_status');
  }

  removeAllLocationListeners(): void {
    this.off('location:nearby_users');
    this.off('location:error');
  }

  removeAllMatchListeners(): void {
    this.off('match:searching');
    this.off('match:found');
    this.off('match:expired');
    this.off('match:session_started');
    this.off('match:partner_left');
    this.off('match:session_ended');
    this.off('match:mode_changed');
    this.off('match:error');
  }

  removeAllListeners(): void {
    this.removeAllChatListeners();
    this.removeAllTypingListeners();
    this.removeAllStatusListeners();
    this.removeAllLocationListeners();
    this.removeAllMatchListeners();
  }
}

export default SocketService.getInstance();
