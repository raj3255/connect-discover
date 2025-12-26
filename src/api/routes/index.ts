// API Routes Index - Export all route types and interfaces
// This file serves as the main entry point for route definitions

// User Routes
export type { UpdateProfileData, UserRoutes } from './userRoutes';

// Location Routes
export type { LocationData, NearbyUser, LocationRoutes } from './locationRoutes';

// Conversation Routes
export type { Conversation, ConversationWithUsers, ConversationRoutes } from './conversationRoutes';

// Message Routes
export type { Message, SendMessageData, MessageRoutes } from './messageRoutes';

// Album Routes
export type { Album, Photo, AlbumShare, AlbumRoutes } from './albumRoutes';

// Block Routes
export type { Block, BlockRoutes } from './blockRoutes';

// Report Routes
export type { ReportReason, ReportStatus, Report, ReportRoutes } from './reportRoutes';

// Complete SQL Schema for all tables:
/*
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  bio TEXT,
  avatar VARCHAR(500),
  photos TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'idle', 'offline')),
  last_seen TIMESTAMP DEFAULT NOW(),
  location GEOGRAPHY(POINT, 4326),
  city VARCHAR(100),
  country VARCHAR(100),
  location_updated_at TIMESTAMP,
  push_token VARCHAR(500),
  banned BOOLEAN DEFAULT false,
  banned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_city ON users(city);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_cp_user ON conversation_participants(user_id);
CREATE INDEX idx_cp_conv ON conversation_participants(conversation_id);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video')),
  media_url VARCHAR(500),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Albums table
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_albums_user ON albums(user_id);

-- Photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_photos_album ON photos(album_id);

-- Album shares table
CREATE TABLE album_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(10) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(album_id, shared_with_user_id)
);

CREATE INDEX idx_album_shares_user ON album_shares(shared_with_user_id);

-- Blocks table
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- Reports table
CREATE TYPE report_reason AS ENUM (
  'inappropriate_content',
  'harassment',
  'spam',
  'fake_profile',
  'underage',
  'violence',
  'other'
);

CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason report_reason NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status report_status DEFAULT 'pending',
  admin_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

// Redis Keys Reference:
/*
## User Status
- user_status (HASH): userId -> status ('online' | 'idle' | 'offline')
- user_last_seen (HASH): userId -> ISO timestamp
- online_users (SET): Set of online user IDs
- status_subscribers:{userId} (SET): Set of userIds subscribed to this user's status

## Location
- user_locations (GEOSPATIAL): userId with coordinates
- user:{userId}:location (HASH): latitude, longitude, accuracy, city, country, updatedAt
- location_subscribers:{userId} (SET): Set of userIds subscribed to this user's location

## Messaging
- messages:{conversationId} (LIST): Last 100 messages (JSON strings)
- typing:{conversationId} (SET): Set of userIds currently typing
- conversation:{conversationId}:participants (SET): Set of participant userIds

## Blocking
- blocked:{userId} (SET): Set of userIds blocked by this user
- blocked_by:{userId} (SET): Set of userIds who blocked this user

## Matching
- match_queue (HASH): userId -> JSON {id, name, age, gender, avatar, preferences, joinedAt}
- pending_matches (HASH): matchId -> JSON {user1, user2, mode, createdAt, user1_accepted, user2_accepted}
- active_sessions (HASH): sessionId -> JSON {id, participants, mode, startedAt}

## Caching
- user_names (HASH): userId -> name (TTL: 1 hour)
- user:{userId} (HASH): cached user data (TTL: 5 minutes)
*/
