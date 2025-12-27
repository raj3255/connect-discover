const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiService {
  private static token: string | null = null;

  static setToken(token: string): void {
    this.token = token;
  }

  static getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  // ============================================================================
  // AUTH
  // ============================================================================

  static async register(data: {
    name: string;
    email: string;
    password: string;
    age: number;
    gender: string;
  }) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }

  static async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }

  // ============================================================================
  // USERS
  // ============================================================================

  static async getCurrentUser() {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async updateProfile(data: any) {
    const res = await fetch(`${API_URL}/api/users/me`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }

  // ============================================================================
  // CONVERSATIONS
  // ============================================================================

  static async getConversations(page = 1, limit = 20) {
    const res = await fetch(
      `${API_URL}/api/conversations?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
    return res.json();
  }

  static async createConversation(participantId: string) {
    const res = await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ participantId })
    });
    return res.json();
  }

  static async getConversation(conversationId: string) {
    const res = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  static async getMessages(conversationId: string, page = 1, limit = 50) {
    const res = await fetch(
      `${API_URL}/api/messages/${conversationId}?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
    return res.json();
  }

  // ============================================================================
  // LOCATION
  // ============================================================================

  static async updateLocation(latitude: number, longitude: number) {
    const res = await fetch(`${API_URL}/api/location`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ latitude, longitude })
    });
    return res.json();
  }

  static async getNearbyUsers(radius: number = 50, limit?: number) {
    const url = new URL(`${API_URL}/api/location/nearby`);
    url.searchParams.append('radius', radius.toString());
    if (limit) url.searchParams.append('limit', limit.toString());
    
    const res = await fetch(url.toString(), {
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // ALBUMS
  // ============================================================================

  static async getAlbums() {
    const res = await fetch(`${API_URL}/api/albums`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ============================================================================
  // BLOCKS
  // ============================================================================

  static async blockUser(userId: string) {
    const res = await fetch(`${API_URL}/api/blocks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId })
    });
    return res.json();
  }

  static async unblockUser(userId: string) {
    const res = await fetch(`${API_URL}/api/blocks/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }
}

export default ApiService;