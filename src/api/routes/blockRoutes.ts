// Block Routes - Block/Unblock users
// Backend: PostgreSQL + Redis (for fast block checks)

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: Date;
}

export interface BlockRoutes {
  // GET /api/blocks - Get blocked users list
  getBlockedUsers: () => Promise<Block[]>;
  
  // POST /api/blocks - Block a user
  blockUser: (userId: string, reason?: string) => Promise<Block>;
  
  // DELETE /api/blocks/:userId - Unblock a user
  unblockUser: (userId: string) => Promise<void>;
  
  // GET /api/blocks/check/:userId - Check if user is blocked
  isBlocked: (userId: string) => Promise<{ blocked: boolean; blockedBy: boolean }>;
}

// Example Express.js route handlers:
/*
router.get('/blocks', authenticate, async (req, res) => {
  const blocks = await db.query(`
    SELECT b.*, u.name as blocked_name, u.avatar as blocked_avatar
    FROM blocks b
    JOIN users u ON b.blocked_id = u.id
    WHERE b.blocker_id = $1
    ORDER BY b.created_at DESC
  `, [req.userId]);
  
  res.json(blocks.rows);
});

router.post('/blocks', authenticate, async (req, res) => {
  const { userId, reason } = req.body;
  
  if (userId === req.userId) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }
  
  // Check if already blocked
  const existing = await db.query(
    'SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
    [req.userId, userId]
  );
  
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'User already blocked' });
  }
  
  const block = await db.query(`
    INSERT INTO blocks (blocker_id, blocked_id, reason)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [req.userId, userId, reason]);
  
  // Add to Redis set for fast lookups
  await redis.sadd(`blocked:${req.userId}`, userId);
  await redis.sadd(`blocked_by:${userId}`, req.userId);
  
  // Remove any existing conversation (optional)
  await db.query(`
    DELETE FROM conversation_participants 
    WHERE conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
      WHERE c.type = 'direct'
    )
  `, [req.userId, userId]);
  
  res.status(201).json(block.rows[0]);
});

router.delete('/blocks/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  
  await db.query(
    'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
    [req.userId, userId]
  );
  
  // Remove from Redis
  await redis.srem(`blocked:${req.userId}`, userId);
  await redis.srem(`blocked_by:${userId}`, req.userId);
  
  res.status(204).send();
});

router.get('/blocks/check/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  
  // Check Redis first for speed
  const blocked = await redis.sismember(`blocked:${req.userId}`, userId);
  const blockedBy = await redis.sismember(`blocked_by:${req.userId}`, userId);
  
  res.json({ blocked: Boolean(blocked), blockedBy: Boolean(blockedBy) });
});

// Middleware to check blocks before messaging
const checkBlockStatus = async (req, res, next) => {
  const { userId } = req.body; // or req.params depending on route
  
  const isBlocked = await redis.sismember(`blocked:${req.userId}`, userId);
  const isBlockedBy = await redis.sismember(`blocked_by:${req.userId}`, userId);
  
  if (isBlocked || isBlockedBy) {
    return res.status(403).json({ error: 'Cannot interact with this user' });
  }
  
  next();
};
*/

// SQL Schema:
/*
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
*/
