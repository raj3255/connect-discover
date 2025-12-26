// User Routes - Get/Update Profile, Avatar Upload
// Backend: PostgreSQL

import { User } from '@/types';

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  interests?: string[];
}

export interface UserRoutes {
  // GET /api/users/:id - Get user profile
  getProfile: (userId: string) => Promise<User>;
  
  // GET /api/users/me - Get current user profile
  getCurrentUser: () => Promise<User>;
  
  // PUT /api/users/me - Update current user profile
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  
  // POST /api/users/me/avatar - Upload avatar
  uploadAvatar: (file: File) => Promise<{ avatarUrl: string }>;
  
  // DELETE /api/users/me/avatar - Delete avatar
  deleteAvatar: () => Promise<void>;
  
  // GET /api/users/search - Search users
  searchUsers: (query: string, limit?: number) => Promise<User[]>;
}

// Example Express.js route handlers:
/*
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  res.json(user.rows[0]);
});

router.get('/users/me', authenticate, async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [req.userId]);
  res.json(user.rows[0]);
});

router.put('/users/me', authenticate, async (req, res) => {
  const { name, bio, age, gender, interests } = req.body;
  const user = await db.query(
    'UPDATE users SET name = $1, bio = $2, age = $3, gender = $4, interests = $5 WHERE id = $6 RETURNING *',
    [name, bio, age, gender, interests, req.userId]
  );
  res.json(user.rows[0]);
});

router.post('/users/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  const avatarUrl = await uploadToStorage(req.file);
  await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatarUrl, req.userId]);
  res.json({ avatarUrl });
});

router.delete('/users/me/avatar', authenticate, async (req, res) => {
  await db.query('UPDATE users SET avatar = NULL WHERE id = $1', [req.userId]);
  res.status(204).send();
});

router.get('/users/search', authenticate, async (req, res) => {
  const { query, limit = 20 } = req.query;
  const users = await db.query(
    'SELECT * FROM users WHERE name ILIKE $1 LIMIT $2',
    [`%${query}%`, limit]
  );
  res.json(users.rows);
});
*/

// SQL Schema:
/*
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  bio TEXT,
  avatar VARCHAR(500),
  interests TEXT[],
  status VARCHAR(20) DEFAULT 'offline',
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_status ON users(status);
*/
