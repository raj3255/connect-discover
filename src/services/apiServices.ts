const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private static token: string | null = null;

  static setToken(token: string): void {
    this.token = token;
  }

  static getToken(): string | null {
    return this.token;
  }

  static clearToken(): void {
    this.token = null;
  }

  static getHeaders(includeContentType = true): HeadersInit {
    const headers: HeadersInit = {};

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // ============================================================================
  // AUTH ENDPOINTS
  // ============================================================================

  static async register(data: {
    name: string;
    email: string;
    password: string;
    age: number;
    gender: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }

  static async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }

  static async verifyEmail(email: string, code: string) {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, code })
    });
    return res.json();
  }

  static async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email })
    });
    return res.json();
  }

  static async resetPassword(email: string, code: string, newPassword: string) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, code, newPassword })
    });
    return res.json();
  }
  static async markConversationRead(conversationId: string) {
    const res = await fetch(
      `${API_BASE}/conversations/${conversationId}/read`,
      {
        method: 'POST',
        headers: this.getHeaders()
      }
    );
    return res.json();
  }

  static async logout(refreshToken?: string) {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refreshToken })
    });
    return res.json();
  }

  static async refreshToken(refreshToken: string) {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refreshToken })
    });
    return res.json();
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  static async getCurrentUser() {
    const res = await fetch(`${API_BASE}/users/profile`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async getProfile() {
    return this.getCurrentUser();
  }

  static async getUserById(userId: string) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async updateProfile(data: {
    name?: string;
    age?: number;
    gender?: string;
    bio?: string;
    interests?: string[];

  }) {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }

  static async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(`${API_BASE}/users/avatar`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      body: formData
    });
    return res.json();
  }

  static async searchUsers(query: {
    q?: string;
    age?: number;
    gender?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (query.q) params.append('q', query.q);
    if (query.age) params.append('age', query.age.toString());
    if (query.gender) params.append('gender', query.gender);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());

    const res = await fetch(`${API_BASE}/users/search?${params.toString()}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async getOnlineStatus(userId: string) {
    const res = await fetch(`${API_BASE}/users/${userId}/online-status`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async getUserAlbums(userId: string) {
    const res = await fetch(`${API_BASE}/users/${userId}/albums`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // CONVERSATION ENDPOINTS
  // ============================================================================

  static async getConversations(page = 1, limit = 20) {
    const res = await fetch(
      `${API_BASE}/conversations?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
    return res.json();
  }

  static async createConversation(
    userId: string,
    chatMode: string = 'global'
  ) {
    console.log(`Creating conversation with ${userId}, mode: ${chatMode}`);

    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        otherUserId: userId,
        chatMode
      })
    });

    // ✅ READ ONCE
    const data = await res.json();

    console.log('Conversation creation response:', data);

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to create conversation');
    }

    // ✅ RETURN PARSED DATA
    return data;
  }


  static async getConversation(conversationId: string) {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async updateConversation(conversationId: string, data: any) {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }

  static async deleteConversation(conversationId: string) {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // MESSAGE ENDPOINTS
  // ============================================================================

  static async getMessages(conversationId: string, page = 1, limit = 50) {
    const res = await fetch(
      `${API_BASE}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
    const data = await res.json();
    return data;
  }

  static async sendMessage(conversationId: string, text: string, mediaUrls?: string[]) {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text, mediaUrls })  // ✅ Fixed
    });
    return res.json();
  }

  static async updateMessage(messageId: string, content: string) {
    const res = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ content })
    });
    return res.json();
  }

  static async deleteMessage(messageId: string) {
    const res = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async markMessageAsRead(messageId: string) {
    const res = await fetch(`${API_BASE}/messages/${messageId}/read`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // ALBUM ENDPOINTS
  // ============================================================================

  static async getMyAlbums() {
    const res = await fetch(`${API_BASE}/albums`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  static async uploadAlbumPhoto(file: File, caption?: string, isPublic = false) {
    const formData = new FormData();
    formData.append('photo', file);
    if (caption) formData.append('caption', caption);
    formData.append('isPublic', String(isPublic));

    const res = await fetch(`${API_BASE}/albums/upload`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });
    return res.json();
  }

  static async deleteAlbumPhoto(albumId: string) {
    const res = await fetch(`${API_BASE}/albums/${albumId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  static async shareAlbumWithUser(albumId: string, recipientUserId: string) {
    const res = await fetch(`${API_BASE}/albums/${albumId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ recipientUserId }),
    });
    return res.json();
  }

  static async unshareAlbumFromUser(albumId: string, recipientUserId: string) {
    const res = await fetch(`${API_BASE}/albums/${albumId}/unshare`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ recipientUserId }),
    });
    return res.json();
  }

  // Share ALL photos with a matched user (used in chat)
  static async shareAllPhotosWithUser(recipientUserId: string) {
    const res = await fetch(`${API_BASE}/albums/share-all`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ recipientUserId }),
    });
    return res.json();
  }

  // Revoke ALL access for a user
  static async unshareAllPhotosFromUser(recipientUserId: string) {
    const res = await fetch(`${API_BASE}/albums/unshare-all`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ recipientUserId }),
    });
    return res.json();
  }

  // Get list of users I've shared my album with
  static async getAlbumRecipients() {
    const res = await fetch(`${API_BASE}/albums/sharing/recipients`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // Get albums shared with me
  static async getSharedWithMe() {
    const res = await fetch(`${API_BASE}/albums/shared/with-me`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // Get a specific photo (checks access)
  static async getAlbumPhoto(albumId: string) {
    const res = await fetch(`${API_BASE}/albums/${albumId}`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // ============================================================================
  // BLOCK ENDPOINTS
  // ============================================================================

  static async blockUser(userId: string) {
    const res = await fetch(`${API_BASE}/blocks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ user_id_to_block: userId })
    });
    return res.json();
  }

  static async unblockUser(userId: string) {
    const res = await fetch(`${API_BASE}/blocks/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async getBlockedUsers() {
    const res = await fetch(`${API_BASE}/blocks`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // REPORT ENDPOINTS
  // ============================================================================

  static async reportUser(userId: string, reason: string, description?: string) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        reported_user_id: userId,
        reason,
        description
      })
    });
    return res.json();
  }

  static async getReports() {
    const res = await fetch(`${API_BASE}/reports`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // LOCATION ENDPOINTS
  // ============================================================================

  static async updateLocation(latitude: number, longitude: number) {
    const res = await fetch(`${API_BASE}/location/update`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ latitude, longitude })
    });
    return res.json();
  }

  static async getNearbyUsers(latitude: number, longitude: number, radius: number = 50, limit?: number) {
    const params = new URLSearchParams();
    params.append('latitude', latitude.toString());
    params.append('longitude', longitude.toString());
    if (radius) params.append('radius', radius.toString());
    if (limit) params.append('limit', limit.toString());

    const res = await fetch(`${API_BASE}/location/nearby?${params.toString()}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async getLocationHistory() {
    const res = await fetch(`${API_BASE}/location/history`, {
      headers: this.getHeaders()
    });
    return res.json();
  }
}

export default ApiService;