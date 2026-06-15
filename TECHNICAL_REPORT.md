# Connect-Discover — Full Technical Report
> Prepared for internal technical team review | June 2026

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Design](#4-database-design)
5. [Authentication System](#5-authentication-system)
6. [REST API Reference](#6-rest-api-reference)
7. [Real-Time Layer — Socket.IO](#7-real-time-layer--socketio)
8. [Matching System](#8-matching-system)
9. [Video Calls — WebRTC](#9-video-calls--webrtc)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Caching Strategy — Redis](#11-caching-strategy--redis)
12. [Security Implementation](#12-security-implementation)
13. [File Uploads & Album System](#13-file-uploads--album-system)
14. [Location & Geolocation System](#14-location--geolocation-system)
15. [Environment & Configuration](#15-environment--configuration)
16. [Known Bugs Fixed in This Session](#16-known-bugs-fixed-in-this-session)
17. [Interview Q&A Reference](#17-interview-qa-reference)

---

## 1. Project Overview

Connect-Discover is a full-stack real-time social matching web application inspired by Omegle. It allows users to:

- Match randomly with strangers worldwide (**Global Mode**)
- Match with people nearby based on GPS location (**Local Mode**)
- Communicate via **text chat** or **peer-to-peer video call**
- Manage a personal profile, photo albums, and privacy settings
- Block, report, and control visibility to other users

The application is designed as a Single Page Application (SPA) on the frontend communicating with a Node.js backend over both REST (HTTP) and WebSocket (Socket.IO).

---

## 2. Tech Stack

### Frontend
| Concern | Technology | Version | Why Used |
|---------|-----------|---------|---------|
| UI Framework | React | 18.3.1 | Component-based, large ecosystem |
| Build Tool | Vite | 5.4.19 | Fast HMR, ESM-native bundling |
| Language | TypeScript | 5.8.3 | Type safety across the entire frontend |
| Routing | React Router DOM | 6.30.1 | Client-side SPA routing with protected routes |
| UI Components | shadcn/ui + Radix UI | — | Accessible, unstyled primitives customized via Tailwind |
| Styling | Tailwind CSS | 3.4.17 | Utility-first CSS, no custom CSS files needed |
| Animations | Framer Motion | 11.18.2 | Declarative animations (match found cards, transitions) |
| Icons | Lucide React | 0.462.0 | Consistent SVG icon set |
| Forms | React Hook Form + Zod | 7.61 + 3.25 | Performant forms with schema validation |
| Real-time | Socket.IO Client | 4.8.3 | WebSocket communication with the backend |
| State Management | React Context API | — | Auth state; no Redux needed at this scale |

### Backend
| Concern | Technology | Version | Why Used |
|---------|-----------|---------|---------|
| Runtime | Node.js | — | JavaScript runtime for server |
| Framework | Express | 5.2.1 | Minimal, well-known HTTP framework |
| Language | TypeScript | 5.9.3 | Type safety on server side too |
| Dev Runner | tsx | 4.21.0 | Runs TypeScript directly without pre-compiling |
| Real-time | Socket.IO | 4.8.3 | WebSocket server with rooms, namespaces, broadcasting |
| Database Client | pg (node-postgres) | 8.16.3 | Raw SQL queries to PostgreSQL; no ORM overhead |
| Cache | redis (ioredis) | 5.10.0 | In-memory caching and ephemeral state storage |
| Auth | jsonwebtoken + bcryptjs | 9.0.3 + 3.0.3 | JWT generation/validation; password hashing |
| Validation | Joi | 18.0.2 | Server-side request body validation schemas |
| File Uploads | Multer | 2.1.1 | Multipart form-data parsing for avatar/album uploads |
| Security | Helmet + express-rate-limit | 8.1.0 + 8.2.1 | HTTP security headers; rate limiting |
| Email | SendGrid | — | Transactional emails (verification codes, password reset) |
| Geocoding | Nominatim (OpenStreetMap) | — | Free city search/autocomplete; no API key required |

### Infrastructure
| Service | Purpose |
|---------|---------|
| PostgreSQL | Primary relational database — persistent data |
| Redis | Cache layer — ephemeral state (match queues, sessions, presence) |
| Google STUN Servers | WebRTC ICE candidate resolution for P2P video |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                       │
│                                                             │
│  Pages ──► Components ──► Hooks ──► Services               │
│                                         │                   │
│                              ┌──────────┴──────────┐        │
│                         ApiService            SocketService │
│                         (REST HTTP)           (Socket.IO)   │
└──────────────────────────────┼──────────────────┼──────────┘
                               │                  │
                        HTTP/REST           WebSocket (ws://)
                               │                  │
┌──────────────────────────────┼──────────────────┼──────────┐
│                     Express.js Backend                      │
│                                                             │
│  REST Routes ──► Middleware ──► Controllers ──► DB/Cache    │
│                                                             │
│  Socket.IO ──► Auth Middleware ──► Handlers                 │
│               (JWT check)    ├── matchHandler               │
│                              ├── localMatchHandler          │
│                              ├── chatHandler                │
│                              ├── webrtcHandler              │
│                              ├── statusHandler              │
│                              └── locationHandler            │
└──────────────────────────────┬──────────────────┬──────────┘
                               │                  │
                         PostgreSQL              Redis
                    (persistent storage)    (ephemeral cache)
```

### Request Flow
1. Browser makes HTTP request → Express route → Middleware (auth, validation) → Query PostgreSQL → Return JSON
2. Browser emits Socket.IO event → Socket middleware (JWT auth) → Handler function → Emit back to room/user
3. For video calls: Browser ↔ Browser directly via WebRTC P2P (backend only relays signaling messages)

---

## 4. Database Design

### Connection Pooling
The app uses `pg.Pool` (not a single client). This means:
- Multiple concurrent queries share a pool of connections
- Prevents connection exhaustion under load
- Pool errors are caught and logged without crashing the server

```typescript
const pool = new Pool({
  host, port, database, user, password
});
// All queries go through the shared pool.query() wrapper
```

### Tables

#### `users`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
email        VARCHAR(255) UNIQUE NOT NULL
phone        VARCHAR(20)
password_hash VARCHAR(255) NOT NULL
name         VARCHAR(100) NOT NULL
age          INTEGER
bio          TEXT
gender       VARCHAR(20)        -- 'male' | 'female' | 'other'
interests    TEXT[]             -- PostgreSQL array
avatar_url   VARCHAR(500)
is_verified  BOOLEAN DEFAULT false
is_active    BOOLEAN DEFAULT true
created_at   TIMESTAMP DEFAULT NOW()
updated_at   TIMESTAMP DEFAULT NOW()
deleted_at   TIMESTAMP          -- NULL = active, SET = soft-deleted
```
Soft delete pattern: `deleted_at` is set instead of actually removing rows. All queries filter `WHERE deleted_at IS NULL`.

#### `user_settings`
```sql
user_id            UUID PRIMARY KEY REFERENCES users(id)
push_notifications BOOLEAN DEFAULT true
location_services  BOOLEAN DEFAULT true
dark_mode          BOOLEAN DEFAULT false
sound_effects      BOOLEAN DEFAULT true
show_online_status BOOLEAN DEFAULT true
updated_at         TIMESTAMP DEFAULT NOW()
```
One row per user. `INSERT ... ON CONFLICT (user_id) DO NOTHING` ensures the row exists before any UPDATE.

#### `locations`
```sql
id         UUID PRIMARY KEY
user_id    UUID REFERENCES users(id)
latitude   DECIMAL(10, 8)
longitude  DECIMAL(11, 8)
updated_at TIMESTAMP DEFAULT NOW()
```
Indexed on `(latitude, longitude)` to speed up nearby queries.

#### `conversations`
```sql
id              UUID PRIMARY KEY
user_1_id       UUID REFERENCES users(id)
user_2_id       UUID REFERENCES users(id)
chat_mode       TEXT             -- 'chat' | 'video'
is_active       BOOLEAN DEFAULT true
last_message_at TIMESTAMP
created_at      TIMESTAMP
ended_at        TIMESTAMP
```

#### `messages`
```sql
id              UUID PRIMARY KEY
conversation_id UUID REFERENCES conversations(id)
sender_id       UUID REFERENCES users(id)
text            TEXT
media_urls      TEXT[]           -- supports multiple media attachments
message_type    VARCHAR(50)      -- 'text' | 'media' | 'mixed'
is_read         BOOLEAN DEFAULT false
read_at         TIMESTAMP
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### `albums`
```sql
id           UUID PRIMARY KEY
user_id      UUID REFERENCES users(id)
name         VARCHAR(255)
photo_url    VARCHAR(500)
thumbnail_url VARCHAR(500)
caption      TEXT
is_public    BOOLEAN DEFAULT false
shared_with  JSONB              -- array of userIds granted access
view_count   INTEGER DEFAULT 0
uploaded_at  TIMESTAMP
deleted_at   TIMESTAMP          -- soft delete
```
`shared_with` is a JSONB column storing an array of user IDs. A GIN index on this column makes `shared_with @> '["userId"]'` queries fast.

#### `user_blocks`
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
blocked_user_id UUID REFERENCES users(id)
created_at      TIMESTAMP
UNIQUE(user_id, blocked_user_id)
```

#### `user_reports`
```sql
id               UUID PRIMARY KEY
reporter_id      UUID REFERENCES users(id)
reported_user_id UUID REFERENCES users(id)
reason           VARCHAR(100)   -- 'harassment' | 'spam' | 'fake_profile' | etc.
description      TEXT
status           VARCHAR(20)    -- 'pending' | 'reviewed' | 'resolved' | 'dismissed'
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

#### `user_sessions`
```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES users(id)
refresh_token TEXT NOT NULL
device_info   TEXT
ip_address    INET
expires_at    TIMESTAMP
created_at    TIMESTAMP
```

---

## 5. Authentication System

### Flow
```
1. POST /api/auth/register
   → Hash password (bcrypt, 10 rounds)
   → Insert user (is_verified = false)
   → Generate 6-digit verification code
   → Send email via SendGrid
   → Return success

2. POST /api/auth/verify-email { code }
   → Validate code (stored in Redis with TTL)
   → Set is_verified = true
   → Return success

3. POST /api/auth/login { email, password }
   → Find user by email
   → bcrypt.compare(password, hash)
   → Generate access token (JWT, 7d expiry)
   → Generate refresh token (JWT, 7d expiry)
   → Store refresh token in user_sessions table
   → Return { accessToken, refreshToken, user }

4. POST /api/auth/refresh { refreshToken }
   → Verify refresh token signature
   → Look up token in user_sessions (checks it hasn't been revoked)
   → Issue new access token
   → Return { accessToken }

5. POST /api/auth/logout
   → Delete refresh token row from user_sessions
   → Token is now permanently invalidated
```

### JWT Structure
```json
// Access token payload
{
  "userId": "uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Middleware
Every protected route runs through an `authenticate` middleware:
1. Extract `Authorization: Bearer <token>` header
2. `jwt.verify(token, JWT_SECRET)` — throws if expired or tampered
3. Attach `req.user = { userId, email }` for downstream handlers
4. Reject with 401 if anything fails

### Socket.IO Authentication
Socket connections also require a valid JWT:
```typescript
// Applied before any event handler
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, JWT_SECRET);
  socket.userId = decoded.userId;
  next();
});
```
This means unauthenticated sockets cannot emit or receive any events.

### Password Reset
1. `POST /forgot-password` → generate 6-digit code → store in Redis (15min TTL) → email user
2. `POST /reset-password { code, newPassword }` → validate code from Redis → bcrypt hash new password → update user → delete Redis key

---

## 6. REST API Reference

### Auth — `/api/auth`
| Method | Endpoint | Auth? | Body | Response |
|--------|---------|-------|------|----------|
| POST | `/register` | No | `{ email, password, name, age, gender }` | `{ message }` |
| POST | `/verify-email` | No | `{ email, code }` | `{ message }` |
| POST | `/login` | No | `{ email, password }` | `{ accessToken, refreshToken, user }` |
| GET | `/me` | Yes | — | `{ user }` |
| POST | `/refresh` | No | `{ refreshToken }` | `{ accessToken }` |
| POST | `/logout` | Yes | `{ refreshToken }` | `{ message }` |
| POST | `/forgot-password` | No | `{ email }` | `{ message }` |
| POST | `/reset-password` | No | `{ email, code, newPassword }` | `{ message }` |
| POST | `/resend-verification` | No | `{ email }` | `{ message }` |

### Users — `/api/users`
| Method | Endpoint | Auth? | Purpose |
|--------|---------|-------|---------|
| GET | `/profile` | Yes | Get own profile |
| PUT | `/profile` | Yes | Update name, age, gender, bio, interests |
| POST | `/avatar` | Yes | Upload avatar (multipart) |
| GET | `/settings` | Yes | Get all settings |
| PUT | `/settings` | Yes | Update one or more settings |
| DELETE | `/account` | Yes | Soft-delete own account |
| GET | `/search?q=&age=&gender=&limit=&offset=` | Yes | Search users |
| GET | `/:id` | Yes | Get user by ID (Redis-cached 5min) |
| GET | `/:id/online-status` | Yes | Live online status |
| GET | `/:id/albums` | Yes | Albums (privacy-checked) |

### Messages — `/api/messages`
| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/:conversationId?page=&limit=50` | Paginated history |
| POST | `/` | Send text + optional media |
| PUT | `/:messageId/read` | Mark single message read |
| DELETE | `/:messageId` | Soft-delete message |
| GET | `/:conversationId/search?q=` | Full-text search in conversation |

### Albums — `/api/albums`
| Method | Endpoint | Purpose |
|--------|---------|---------|
| GET | `/` | My albums |
| POST | `/upload` | Upload photo (multipart, max 10MB) |
| GET | `/shared/with-me` | All photos shared with me, grouped by owner |
| GET | `/sharing/recipients` | Users I've shared with |
| POST | `/share-all` | Share all my photos with `{ userId }` |
| POST | `/unshare-all` | Revoke all access from `{ userId }` |
| GET | `/:albumId` | Single album (access-controlled) |
| DELETE | `/:albumId` | Soft-delete photo |
| POST | `/:albumId/share` | Share with `{ userId }` |
| POST | `/:albumId/unshare` | Revoke access from `{ userId }` |

### Location — `/api/location`
| Method | Endpoint | Purpose |
|--------|---------|---------|
| POST | `/update` | Store GPS `{ latitude, longitude }` |
| GET | `/nearby?radius=25` | Users within radius (km), uses Haversine |
| GET | `/search-cities?q=` | City autocomplete via Nominatim |
| GET | `/search-by-city?city=&radius=` | Users near a city |
| GET | `/:userId` | Another user's location (only if in same conversation) |

### Blocks & Reports
| Method | Endpoint | Purpose |
|--------|---------|---------|
| POST | `/api/blocks` | Block `{ userId }` |
| GET | `/api/blocks` | List all blocked users |
| DELETE | `/api/blocks/:userId` | Unblock user |
| POST | `/api/reports` | Report `{ userId, reason, description }` |
| GET | `/api/reports` | My reports |
| PUT | `/api/reports/:id` | Update status (admin use) |

---

## 7. Real-Time Layer — Socket.IO

### Connection Lifecycle
```
Client connects with JWT in handshake.auth.token
  → Auth middleware validates JWT
  → socket.userId = decoded.userId
  → socket joins personal room: "user:{userId}"
  → Online status broadcast to subscribers
  → "connection:success" emitted back to client

Client disconnects
  → Removed from matching queues
  → Active match partner notified
  → Online status broadcast (offline)
  → Redis cleanup
```

### Room Strategy
| Room Name | Who's In It | Used For |
|-----------|------------|---------|
| `user:{userId}` | All sockets of this user | Targeting a specific user regardless of which socket |
| `{conversationId}` | Both matched users | Chat messages, typing, WebRTC signaling |

### All Socket Events

#### Global Matching
| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client → Server | `match:start_searching` | `{ mode, ageRange, genderPreference }` | Enter match queue |
| Server → Client | `match:searching` | `{ message, queuePosition }` | Queued confirmation |
| Client → Server | `match:stop_searching` | — | Leave queue |
| Server → Client | `match:stopped` | `{ message }` | Cancelled confirmation |
| Server → Client | `match:found` | `{ matchId, conversationId, partner, isInitiator, mode }` | Match available |
| Client → Server | `match:accept` | `matchId` | Accept the match |
| Server → Client | `match:accepted` | `{ matchId, message }` | Both users → start session |
| Client → Server | `match:skip` | `matchId` | Skip this match |
| Server → Client | `match:skipped` | — | Confirmation |
| Server → Client | `match:partner_skipped` | — | Partner skipped you |
| Client → Server | `match:end_session` | — | End current session |
| Server → Client | `match:session_ended` | — | Confirmation |
| Server → Client | `match:partner_left` | — | Partner disconnected |

#### Local Matching
Same pattern as global but prefixed `local_match:` with an extra `distance` field in `local_match:found`. Backend also filters by GPS distance using the Haversine formula.

#### Chat
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `join_chat` | `conversationId` |
| Server → Client | `chat:joined` | `{ conversationId }` |
| Client → Server | `send_message` | `{ conversationId, text, mediaUrls }` |
| Server → Client | `chat:new_message` | Full message object |
| Client → Server | `typing:start` | `conversationId` |
| Server → Client | `typing:user_typing` | `{ userId, conversationId }` |
| Client → Server | `typing:stop` | `conversationId` |
| Server → Client | `typing:user_stopped` | `{ userId, conversationId }` |

#### Status & Presence
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `heartbeat` | — |
| Client → Server | `status:update` | `'online' \| 'idle' \| 'offline'` |
| Server → Client | `status:user_online` | `{ userId }` |
| Server → Client | `status:user_offline` | `{ userId }` |
| Client → Server | `status:subscribe` | `userId[]` |
| Server → Client | `status:bulk_status` | `{ userId: status }` map |
| Client → Server | `presence:get_count` | — |
| Server → Client | `presence:online_count` | `{ count }` |

#### WebRTC Signaling
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `webrtc:offer` | `{ conversationId, offer }` |
| Server → Room | `webrtc:offer` | `{ userId, offer, conversationId }` |
| Client → Server | `webrtc:answer` | `{ conversationId, answer }` |
| Server → Room | `webrtc:answer` | `{ userId, answer, conversationId }` |
| Client → Server | `webrtc:ice-candidate` | `{ conversationId, candidate }` |
| Server → Room | `webrtc:ice-candidate` | `{ userId, candidate, conversationId }` |
| Client → Server | `webrtc:end-call` | `{ conversationId }` |
| Server → Room | `webrtc:call-ended` | `{ userId, conversationId }` |
| Client → Server | `webrtc:media-toggle` | `{ conversationId, type, enabled }` |
| Server → Room | `webrtc:media-toggle` | `{ userId, type, enabled }` |

#### Location
| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `location:update` | `{ latitude, longitude }` |
| Client → Server | `location:subscribe_nearby` | `{ radius }` |
| Server → Client | `location:nearby_users` | users array (updated every 30s) |
| Client → Server | `location:unsubscribe_nearby` | — |

---

## 8. Matching System

### Global Mode — How It Works

**Data structures (in-memory, per Node process):**
```typescript
const matchingQueue: QueuedUser[] = [];          // who is waiting
const activeMatches = new Map<string, string>(); // userId → partnerId
```

**`match:start_searching` flow:**
1. Clear any stale `activeMatches` entry for this user (handles reconnects)
2. Prevent duplicate queue entries
3. Fetch user profile from PostgreSQL
4. Push to `matchingQueue` with preferences + timestamp
5. Store in Redis (`matching:{userId}`, 5min TTL) for cross-restart visibility
6. Call `findMatch()`

**`findMatch()` algorithm:**
```
For each user in the queue (excluding self and already-matched users):
  1. Check mode matches (chat vs video)
  2. Check gender preference compatibility (both ways)
  3. Check age range compatibility (both ways)
  4. Check neither user has blocked the other (PostgreSQL query)
  5. Fetch partner's live socket via io.in("user:{partnerId}").fetchSockets()
     → If no live socket found: remove from queue, continue
  6. Race condition guard: if either user was matched concurrently, skip
  7. COMMIT: remove both from queue, set activeMatches both ways
  8. Create/reuse conversation in PostgreSQL
  9. Store match data in Redis (match:{matchId}, 1hr TTL)
  10. Join both sockets to conversationId room
  11. Emit match:found to both with partner data and isInitiator flag
```

The user who was already in the queue gets `isInitiator: false`; the user who just joined and found the match gets `isInitiator: true`. This determines who sends the WebRTC offer.

**`match:accept` flow:**
1. Look up `partnerId` from `activeMatches`
2. Fetch partner's live socket
3. Retrieve match data from Redis → re-join both sockets to `conversationId` room (in case of reconnect)
4. Emit `match:accepted` to both users simultaneously
5. Both frontends receive this → transition to chat or video interface

### Local Mode — Difference from Global
- Additional filter: `calculateDistance(userLat, userLng, partnerLat, partnerLng)` using the Haversine formula
- Both users must be within each other's `maxDistance` radius
- Partner socket found by iterating `io.sockets.sockets.values()` (searching by userId)
- Match data includes distance string for display ("2.3 km away")
- Uses separate `localMatchingQueue` and `activeLocalMatches` Maps

### Queue TTL Cleanup
A `setInterval` runs every 5 minutes removing queue entries older than 30 minutes, preventing zombie entries from accumulating.

---

## 9. Video Calls — WebRTC

### What is WebRTC?
WebRTC (Web Real-Time Communication) is a browser API that enables peer-to-peer audio/video/data streaming directly between two browsers without routing media through the server. The server is only needed for **signaling** (exchanging connection metadata).

### Full Connection Sequence
```
User A (Initiator)                  Server                  User B (Receiver)
      │                                │                           │
      │ ── match:accepted ────────────►│◄──── match:accepted ──────│
      │                                │                           │
      │  VideoCallInterface mounts     │      VideoCallInterface mounts
      │                                │                           │
      │  getUserMedia() → localStream  │      getUserMedia() → localStream
      │                                │                           │
      │  createPeerConnection()        │                           │
      │  addTrack(localStream)         │                           │
      │  createOffer()                 │                           │
      │ ── webrtc:offer ──────────────►│──── webrtc:offer ────────►│
      │                                │                           │
      │                                │      setRemoteDescription(offer)
      │                                │      createAnswer()
      │                                │◄─── webrtc:answer ────────│
      │◄─ webrtc:answer ───────────────│                           │
      │                                │                           │
      │  setRemoteDescription(answer)  │                           │
      │                                │                           │
      │◄══ ICE Candidates exchanged ══►│◄═══ ICE Candidates ══════►│
      │       (via webrtc:ice-candidate)                           │
      │                                │                           │
      │◄══════════ P2P Media Stream established ═══════════════════│
      │         (audio + video direct, no server involvement)      │
```

### ICE Candidates
ICE (Interactive Connectivity Establishment) is the process of finding network paths between peers. The browser generates multiple candidate addresses:
- **Host candidates**: Local IP (e.g., 192.168.1.x)
- **Server-reflexive candidates**: Public IP via STUN server
- **Relay candidates**: Via TURN server (not used here)

The app uses 3 Google STUN servers: `stun.l.google.com:19302`, `stun1`, `stun2`.

### Candidate Buffering
ICE candidates may arrive before the remote SDP description is set. The hook buffers them:
```typescript
if (pc.remoteDescription?.type) {
  await pc.addIceCandidate(candidate);
} else {
  pendingCandidates.push(candidate); // Buffer until remote desc is set
}
// When remote desc is set, flush all buffered candidates
```

### Camera/Microphone Cleanup
A critical fix was applied: the cleanup `useEffect` originally captured `localStream = null` (React stale closure). The camera was never released between calls, causing `NotFoundError` on retry. Fixed by using refs:
```typescript
const localStreamRef = useRef<MediaStream | null>(null);
// On stream acquired: localStreamRef.current = stream
// On unmount: localStreamRef.current?.getTracks().forEach(t => t.stop())
```

### Media Constraints Used
```typescript
video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
```

### In-Call Features
- **Mute audio / disable video**: Track `.enabled = false` (stream stays alive, just sends blank)
- **Switch camera**: Stop old tracks, call `getUserMedia` with opposite `facingMode`
- **Screen share**: `navigator.mediaDevices.getDisplayMedia()`
- **Filters**: CSS classes applied to the video element (`grayscale`, `sepia`, etc.)
- **Picture-in-picture**: Local video shown in a draggable overlay (Framer Motion `drag`)

---

## 10. Frontend Architecture

### Folder Structure
```
src/
├── components/        Reusable UI components
│   ├── ui/           shadcn/ui base components (Button, Dialog, etc.)
│   ├── VideoCallInterface.tsx
│   ├── GlobalChatInterface.tsx
│   ├── MatchPreferences.tsx
│   ├── BottomNav.tsx
│   └── ...
├── contexts/
│   └── AuthContext.tsx   Global auth state (user, token, login/logout)
├── hooks/
│   ├── useWebRTC.ts       WebRTC logic (offer/answer/ICE/streams)
│   └── use-toast.ts       Toast notification hook
├── pages/             One file per route
│   ├── GlobalMode.tsx
│   ├── LocalMode.tsx
│   ├── Chat.tsx
│   └── ...
├── services/
│   ├── apiServices.ts     All REST calls (fetch-based, auto-refresh on 401)
│   └── SocketService.ts   Socket.IO singleton wrapper
├── types/             TypeScript interfaces
└── utils/
    ├── sounds.ts          Web Audio API tones (no audio files)
    ├── notifications.ts   Browser push notifications
    └── settingsCache.ts   localStorage-backed settings cache
```

### SocketService Pattern
`SocketService` is a **singleton class** — one Socket.IO connection shared across the entire app:
```typescript
class SocketService {
  private socket: Socket | null = null;
  private isSearching = false;
  
  connect(token: string) { /* init socket with JWT */ }
  disconnect() { /* cleanup */ }
  emit(event, data) { /* wrapper with connection check */ }
  on(event, callback) { /* wrapper */ }
  off(event) { /* cleanup listeners */ }
  // ... domain-specific methods
}
export default new SocketService(); // singleton instance
```

### ApiService Auto-Refresh
When an API call returns 401 (token expired), `ApiService` automatically:
1. Calls `POST /api/auth/refresh` with stored refresh token
2. Stores the new access token
3. Retries the original request
4. If refresh also fails → logout user

### Ref Pattern for Socket Callbacks
A critical React pattern used throughout the matching pages:

**Problem**: Socket event handlers registered in `useEffect([], [])` close over stale state (e.g., `conversationId` is `null` when the handler was registered).

**Solution**: 
```typescript
const conversationIdRef = useRef<string | null>(null);

// In handleMatchFound — set ref BEFORE setState so next socket event sees it immediately
const handleMatchFound = (data) => {
  conversationIdRef.current = data.conversationId; // ← immediate
  setConversationId(data.conversationId);           // ← async (React batches)
};

// In handleMatchAccepted — uses ref, not state
const handleMatchAccepted = () => {
  const convId = conversationIdRef.current; // ← always current value
  navigate(`/chat/${convId}`);
};
```

### Key Pages

**GlobalMode.tsx** — State machine with states: `preferences → searching → matched → connecting → connected`
- On `preferences`: show `MatchPreferences` form
- On `searching`: show spinner, emit `match:start_searching`
- On `matched`: show partner card with Skip/Connect buttons
- On `connecting`: emit `match:accept`, wait for `match:accepted`
- On `connected`: render `VideoCallInterface` or `GlobalChatInterface` full screen

**LocalMode.tsx** — Same state machine + location permission flow
- Auto-requests GPS on mount
- Passes `maxDistance` (km) in search preferences
- Shows distance in matched card ("2.3 km away")

---

## 11. Caching Strategy — Redis

### What's Stored in Redis

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `matching:{userId}` | JSON queue entry | 5 min | Backup of queue state |
| `local_matching:{userId}` | JSON queue entry | 5 min | Local queue backup |
| `match:{matchId}` | JSON match data (includes conversationId) | 1 hour | Used by match:accept to re-join rooms |
| `local_match:{matchId}` | JSON local match data | 1 hour | Same for local mode |
| `user:{userId}` | JSON user profile | 5 min | Avoids repeated DB reads |
| `user:status:{userId}` | online/offline/idle | Variable | Online presence |
| `reset:{email}` | 6-digit code | 15 min | Password reset codes |
| `verify:{email}` | 6-digit code | 24 hours | Email verification codes |
| `location:{userId}` | `{lat, lng}` | 5 min | Fast nearby queries |

### Why Redis for Match State?
The in-memory `matchingQueue` and `activeMatches` Maps live in the Node.js process. Redis provides a backup so:
- If the server restarts, match data isn't permanently lost
- `match:accept` can retrieve the `conversationId` from Redis even if it wasn't stored in React state

### Connection
```typescript
const client = createClient({ host: REDIS_HOST, port: REDIS_PORT });
// Wrappers: setRedis(key, value, ttlSeconds), getRedis(key), deleteRedis(key)
```

---

## 12. Security Implementation

### HTTP Security (Helmet)
Helmet sets these headers automatically:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)
- `Content-Security-Policy`

### Rate Limiting
`express-rate-limit` applied globally — limits requests per IP to prevent:
- Brute-force login attempts
- Spam registrations
- API scraping

### CORS Policy
```typescript
CORS_ORIGIN: [
  "http://localhost:5173",
  "http://localhost:5500",
  "http://localhost:8080",
  "http://127.0.0.1:5500"
]
```
Only listed origins can make cross-origin requests. In production this would be the deployed frontend domain.

### Password Security
- Minimum length enforced by Joi validation
- Hashed with `bcrypt` (cost factor 10) — computationally expensive to brute-force
- Never stored or logged in plain text

### Token Security
- JWT secrets loaded from environment variables; fatal error in production if not set
- Refresh tokens stored in DB — can be individually revoked on logout
- Access tokens are short-lived (7d); refresh tokens rotated on use

### Input Validation
Every API route body passes through a Joi schema before reaching the controller. Rejects unexpected fields, wrong types, out-of-range values.

### Block System
When user A blocks user B:
- B cannot appear in A's match queue (checked in `findMatch`)
- B cannot see A in search results
- B cannot send messages to A

### Soft Deletes
Users and messages are never physically deleted. `deleted_at` is set. This means:
- Deleted accounts don't break conversation history
- Content can be recovered if deletion was accidental
- Reported content from deleted accounts is still available for moderation

---

## 13. File Uploads & Album System

### Upload Flow
```
Client POST /api/albums/upload (multipart/form-data)
  → Multer middleware parses file (max 10MB)
  → File saved to /uploads directory on server
  → Thumbnail generated (or same URL used)
  → Row inserted into albums table
  → Return { albumId, photoUrl, thumbnailUrl }
```

### Access Control
Albums have two visibility levels:
- `is_public: true` — anyone can see
- `is_public: false` + `shared_with: ["userId1", "userId2"]` — only listed users

The `shared_with` JSONB column is queried with PostgreSQL's `@>` operator:
```sql
WHERE shared_with @> $1::jsonb
-- $1 = '["userId"]'
```

### Sharing
- `POST /albums/share-all` — adds a userId to `shared_with` in ALL albums at once
- `POST /albums/unshare-all` — removes userId from all albums
- Individual album share/unshare via `/:albumId/share` and `/:albumId/unshare`
- The `AlbumShareButton` component in the chat UI provides one-click share-all with the current chat partner

---

## 14. Location & Geolocation System

### GPS Storage
```
POST /api/location/update { latitude, longitude }
  → UPSERT into locations table (INSERT ... ON CONFLICT DO UPDATE)
  → Cache in Redis (location:{userId}, 5min TTL)
```

### Distance Calculation (Haversine Formula)
```typescript
function calculateDistance(lat1, lng1, lat2, lng2): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)² + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2)²;
  return R * 2 * Math.atan2(√a, √(1-a));
}
```
This is the standard formula for great-circle distance between two points on Earth's surface.

### Nearby Users
`GET /api/location/nearby?radius=25` queries all users with known locations and filters those within the given radius using the Haversine formula in-application (not in SQL). Could be optimised with a PostGIS extension for very large datasets.

### City Search
- Uses Nominatim (OpenStreetMap's free geocoding API)
- No API key required, attribution to OSM required
- `GET /location/search-cities?q=New` → returns city name suggestions
- `GET /location/search-by-city?city=Mumbai&radius=10` → finds users near that city's coordinates

### Socket-Based Location Subscriptions
Users can subscribe to real-time nearby user updates:
- `location:subscribe_nearby { radius }` → server starts a 30s interval sending `location:nearby_users`
- `location:unsubscribe_nearby` → stops the interval
- Useful for a live "people near you" map feature

---

## 15. Environment & Configuration

### Backend `.env`
```env
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=connect_discover
DB_USER=postgres
DB_PASSWORD=yourpassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT — REQUIRED (fatal error in production if missing)
JWT_SECRET=your-long-random-secret
JWT_REFRESH_SECRET=your-long-random-refresh-secret
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=7d

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@connectdiscover.com

# Optional
NOMINATIM_API_URL=https://nominatim.openstreetmap.org
MAX_FILE_SIZE=10485760
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Config Safety
Security-critical secrets use `requireSecret()`:
```typescript
function requireSecret(name, devFallback) {
  if (process.env[name]) return process.env[name];
  if (isProduction) throw new Error(`Missing: ${name}`); // crash on startup
  console.warn(`[config] ${name} not set — using insecure dev default`);
  return devFallback;
}
```
This prevents accidental deployment to production with missing secrets.

---

## 16. Known Bugs Fixed in This Session

| Bug | Root Cause | Fix Applied |
|-----|-----------|-------------|
| Settings toggles always show "Could not save" | PUT /settings INSERT used `${paramIndex}` (was `$3`) but passed only `[userId]` (length 1), causing PostgreSQL parameter count mismatch | Changed to `$1` |
| Global mode users stuck searching forever | `activeMatches` never cleared when users ended sessions; `endConnection()` never called `endSession()` on backend | Added `SocketService.endSession()` calls + stale match cleanup at top of `match:start_searching` |
| `match:skip` left partner stuck searching | Handler received `matchId` but called `activeMatches.delete(matchId)` — matchId is not a userId key | Fixed to look up real `partnerId` from `activeMatches.get(userId)` first |
| Partner never receives `match:found` | `findMatch` committed the match before checking if partner had a live socket | Added pre-check: fetch partner socket, if none found remove from queue and continue |
| Double-match race condition | Two users' `findMatch` calls could run concurrently matching the same pair twice | Added guard: `if (activeMatches.has(A) \|\| activeMatches.has(B)) continue` |
| Video "Waiting for user" on both screens | WebRTC handler silently dropped offer/answer if socket wasn't in conversation room | Changed to auto-join the room instead of returning; `match:accept` also re-joins both sockets |
| `match:accepted` had null `conversationId` | React state → `useEffect` propagation delay meant `conversationIdRef.current` was null when event fired | Set refs directly in `handleMatchFound` BEFORE `setState` |
| Auto-logout every 15 minutes | JWT_EXPIRY default was `'15m'` | Changed to `'7d'` |
| Wrong refresh endpoint | `ApiService.refreshToken` calling `/auth/refresh-token` instead of `/auth/refresh` | Fixed URL |
| Global video mode never matched (after first search) | `SocketService.startMatching` has `isSearching` guard; set to `true` on search start but never reset to `false` when a match was found (only reset on manual cancel). Every search after the first was silently dropped | Reset `this.isSearching = false` in `startGlobalSearch` before calling `startMatching` |
| Camera `NotFoundError` on every retry | `useWebRTC` cleanup `useEffect` used `[]` deps, capturing `localStream = null` at mount. Camera was never released on unmount | Added `localStreamRef` / `remoteStreamRef` that stay in sync; cleanup effect uses refs instead of stale state |

---

## 17. Interview Q&A Reference

### Architecture

**Q: Why Socket.IO over raw WebSockets?**
Socket.IO adds rooms, namespaces, automatic reconnection, event-based API, and fallback to long-polling. Raw WebSockets would require implementing all of that manually.

**Q: Why no ORM (no Sequelize/Prisma)?**
The app uses raw SQL via `pg`. This gives full control over queries, avoids N+1 issues that ORMs can introduce, and makes query optimization straightforward. The trade-off is more boilerplate for inserts/updates.

**Q: Why Redis alongside PostgreSQL?**
PostgreSQL is durable but slower for ephemeral, high-churn data. Redis serves: match queue state (needs to be fast — multiple users searching simultaneously), online presence (changes every few seconds), and short-lived tokens (verification codes). Using Redis for these avoids hammering PostgreSQL with constant small reads/writes.

**Q: How do you handle horizontal scaling?**
Currently the in-memory `matchingQueue` and `activeMatches` live in one Node process. For multiple servers, these would need to move to Redis (using Redis pub/sub or Sorted Sets for the queue). Socket.IO also supports the `socket.io-redis` adapter for broadcasting across nodes.

**Q: What happens if the server crashes mid-match?**
- Queue entries in Redis survive (5min TTL) — users would need to re-search
- `activeMatches` Map is lost — but on reconnect, `match:start_searching` clears any stale entry
- Conversation records in PostgreSQL are preserved
- Messages are persisted so chat history is not lost

### Real-Time & Matching

**Q: How does matching work?**
Both users enter a queue with their preferences. When a new user joins, `findMatch()` scans the existing queue for compatible partners (mode, age, gender, not blocked, has live socket). The first compatible user is matched. Both are removed from the queue, `activeMatches` records the pair, a conversation is created in PostgreSQL, both sockets join the conversation room, and `match:found` is emitted to both.

**Q: What prevents two users from being double-matched?**
A guard before committing: `if (activeMatches.has(A) || activeMatches.has(B)) continue`. Since JavaScript is single-threaded, async interleaving during `await` calls could cause both users' `findMatch` to commit simultaneously — this guard prevents that.

**Q: How do you find a user's socket when you only have their userId?**
`io.in("user:{userId}").fetchSockets()` — every user joins a personal room `user:{userId}` on connect. This works even if the user has multiple connections (multiple browser tabs).

### WebRTC

**Q: What is WebRTC and how is it different from Socket.IO video?**
WebRTC is a browser API for peer-to-peer media (audio/video/data). The media travels directly between browsers — the server never sees it. Socket.IO only carries the signaling (SDP offer/answer, ICE candidates). This means no media server is needed and latency is minimized.

**Q: What are ICE candidates?**
Network paths the browser discovers for peer connectivity. Types: host (local IP), server-reflexive (public IP via STUN), relay (TURN server). Browsers exchange candidates until they find one that works through any NATs or firewalls.

**Q: What's a STUN server?**
Session Traversal Utilities for NAT. A STUN server tells a browser its public-facing IP address (which is typically hidden behind NAT). Used to generate server-reflexive ICE candidates. The app uses Google's free public STUN servers.

**Q: What's the difference between SDP offer and answer?**
SDP (Session Description Protocol) describes what media a peer wants to send/receive (codecs, bandwidth, encryption). The offer says "here's what I can do"; the answer says "here's what I accept from your offer." Together they negotiate the connection parameters.

### Authentication

**Q: Why both access token and refresh token?**
Access tokens are short-lived (used on every request). Refresh tokens are long-lived but used less frequently (only to get new access tokens). If an access token is intercepted, it expires quickly. Refresh tokens are stored in the database and can be individually revoked.

**Q: How do you handle token expiry on the frontend?**
`ApiService` has an interceptor. If any request returns 401, it calls `POST /auth/refresh` with the stored refresh token. If successful, it replaces the access token and retries the original request. If refresh fails, the user is logged out.

**Q: How does Socket.IO authentication work?**
The JWT is passed in `socket.handshake.auth.token` when connecting. Server-side middleware calls `jwt.verify()` on every new connection. Invalid tokens are rejected before any event handler runs. There is no way to emit events without a valid token.

### Database

**Q: What is a soft delete? Why use it?**
Setting `deleted_at = NOW()` instead of `DELETE FROM`. Benefits: data recovery, referential integrity (foreign keys to deleted rows still resolve), audit trail, content moderation on reported content from deleted accounts.

**Q: Why JSONB for album sharing instead of a join table?**
For this use case (an array of userIds attached to each album), JSONB is simpler and fast enough with a GIN index. A join table would be better for complex queries (e.g., "find all albums shared with user X across all users") but JSONB is sufficient for "check if user Y can access album Z."

**Q: How does the nearby users query work?**
GPS coordinates are stored in a `locations` table. The API fetches all known locations from the DB (or Redis cache) and applies the Haversine formula in JavaScript to calculate distances. Rows beyond the radius are filtered out. For production scale, PostGIS's `ST_DWithin` would replace this with a geospatially-indexed query.

### Frontend

**Q: Why React Context instead of Redux?**
The only truly global state is the authenticated user. Redux would be over-engineering for this. Context + `useReducer` or simple `useState` is sufficient. All other state is local to pages/components.

**Q: How do you prevent stale closures in socket event handlers?**
Socket listeners registered in `useEffect([], [])` close over the initial state values. To always access current values, refs are used: state is mirrored into refs (`useEffect(() => { ref.current = value }, [value])`), and handlers read from refs, not state. Additionally, refs are set directly in event handlers before `setState` calls, so subsequent handlers in the same microtask tick see the latest value.

**Q: How does the isInitiator flag work?**
The backend sets `isInitiator: true` for the user who triggered the match (the one who just joined the queue and found a waiting user). `isInitiator: false` goes to the user who was waiting. In WebRTC, the initiator creates the offer and sends it first. This prevents both users from sending offers simultaneously and avoids a "glare" condition.

---

*End of Technical Report — connect-discover | June 2026*
