import io from 'socket.io-client';

type SocketIO = ReturnType<typeof io>;

class SocketService {
  private static instance: SocketService;
  private socket: SocketIO | null = null;
  private isSearching: boolean = false; // Track if already searching

  private constructor() { }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(token: string): SocketIO {
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
      this.isSearching = false; // Reset on disconnect
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    this.socket.on('connection:success', (data) => {
      console.log('✅ Socket connection success:', data);
    });

    // Listen for match events to update search state
    this.socket.on('match:found', () => {
      this.isSearching = false;
    });

    this.socket.on('match:stopped', () => {
      this.isSearching = false;
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
    if (this.isSearching) {
      console.warn('⚠️ Already searching, ignoring duplicate request');
      return;
    }

    console.log('🔍 Starting match search:', { mode, ageRange, genderPreference });
    this.isSearching = true;
    this.emit('match:start_searching', {
      mode,
      ageRange,
      genderPreference
    });
  }

  stopMatching(): void {
    console.log('⏹️ Stopping match search');
    this.isSearching = false;
    this.emit('match:stop_searching');
  }

  acceptMatch(matchId: string): void {
    this.emit('match:accept', matchId);
  }

  declineMatch(matchId: string): void {
    this.emit('match:decline', matchId);
  }

  skipMatch(matchId: string): void {
    console.log('⏭️ Skipping match:', matchId);
    this.emit('match:skip', matchId);
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

  onPartnerSkipped(callback: () => void): void {
    this.on('match:partner_skipped', callback);
  }
  // ============================================================================
  // WEBRTC METHODS - Video Call Signaling
  // ============================================================================

  // Send WebRTC offer to peer
  sendWebRTCOffer(conversationId: string, offer: any): void {
    console.log('📹 Sending WebRTC offer');
    this.emit('webrtc:offer', { conversationId, offer });
  }

  // Send WebRTC answer to peer
  sendWebRTCAnswer(conversationId: string, answer: any): void {
    console.log('📹 Sending WebRTC answer');
    this.emit('webrtc:answer', { conversationId, answer });
  }

  // Send ICE candidate to peer
  sendICECandidate(conversationId: string, candidate: any): void {
    console.log('🧊 Sending ICE candidate');
    this.emit('webrtc:ice-candidate', { conversationId, candidate });
  }

  // End video call
  endVideoCall(conversationId: string): void {
    console.log('📞 Ending video call');
    this.emit('webrtc:end-call', { conversationId });
  }

  // Notify peer about media toggle (video/audio on/off)
  toggleMediaState(conversationId: string, type: 'video' | 'audio', enabled: boolean): void {
    console.log(`🎥 Toggling ${type} to ${enabled ? 'on' : 'off'}`);
    this.emit('webrtc:media-toggle', { conversationId, type, enabled });
  }

  // Listen for incoming WebRTC offer
  onWebRTCOffer(callback: (data: { userId: string; offer: any; conversationId: string }) => void): void {
    this.on('webrtc:offer', callback);
  }

  // Listen for incoming WebRTC answer
  onWebRTCAnswer(callback: (data: { userId: string; answer: any; conversationId: string }) => void): void {
    this.on('webrtc:answer', callback);
  }

  // Listen for incoming ICE candidates
  onICECandidate(callback: (data: { userId: string; candidate: any; conversationId: string }) => void): void {
    this.on('webrtc:ice-candidate', callback);
  }

  // Listen for call ended by peer
  onCallEnded(callback: (data: { userId: string; conversationId: string }) => void): void {
    this.on('webrtc:call-ended', callback);
  }

  // Listen for peer media toggle
  onMediaToggle(callback: (data: { userId: string; type: 'video' | 'audio'; enabled: boolean }) => void): void {
    this.on('webrtc:media-toggle', callback);
  }

  // Listen for WebRTC errors
  onWebRTCError(callback: (data: { message: string }) => void): void {
    this.on('webrtc:error', callback);
  }

  // ============================================================================
  // GLOBAL MODE WRAPPERS (UI-FRIENDLY)
  // ============================================================================

  startGlobalSearch(data: {
    mode: 'chat' | 'video';
    ageRange: [number, number];
    genderPreference: string;
  }): void {
    this.startMatching(data.mode, data.ageRange, data.genderPreference);
  }

  cancelGlobalSearch(): void {
    this.stopMatching();
  }

  skipGlobalMatch(matchId: string): void {
    this.skipMatch(matchId);
  }

  onGlobalMatch(callback: (user: any) => void): void {
    this.on('match:found', callback);
  }

  // ============================================================================
  // LOCAL MODE METHODS (DISTANCE-BASED MATCHING)
  // ============================================================================

  startLocalSearch(data: {
    mode: 'chat' | 'video';
    maxDistance: number;
    ageRange: [number, number];
    genderPreference: string;
  }): void {
    console.log('🗺️ Starting LOCAL search:', data);
    this.emit('local_match:start_searching', data);
  }

  cancelLocalSearch(): void {
    console.log('⏹️ Stopping LOCAL search');
    this.emit('local_match:stop_searching');
  }

  skipLocalMatch(matchId: string): void {
    console.log('⏭️ Skipping LOCAL match:', matchId);
    this.emit('local_match:skip', matchId);
  }

  onLocalMatchFound(callback: (data: any) => void): void {
    this.on('local_match:found', callback);
  }

  onLocalPartnerLeft(callback: () => void): void {
    this.on('local_match:partner_left', callback);
  }

  onLocalPartnerSkipped(callback: () => void): void {
    this.on('local_match:partner_skipped', callback);
  }
}

export default SocketService.getInstance();