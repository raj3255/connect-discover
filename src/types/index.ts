export type UserStatus = 'online' | 'idle' | 'offline';

export interface User {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bio: string;
  avatar: string;
  photos: string[];
  location?: {
    city: string;
    distance?: number;
  };
  status: UserStatus;
  interests: string[];
  lastSeen?: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  type: 'text' | 'image';
  imageUrl?: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LocationState {
  latitude: number;
  longitude: number;
  city?: string;
  lastUpdated: Date;
}
