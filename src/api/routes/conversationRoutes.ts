// Conversation Routes - Create, Get conversations
// Backend: PostgreSQL

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
    type: 'text' | 'image';
  };
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationWithUsers extends Conversation {
  participantDetails: {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'idle' | 'offline';
  }[];
}

export interface ConversationRoutes {
  // GET /api/conversations - Get all conversations for current user
  getConversations: (page?: number, limit?: number) => Promise<ConversationWithUsers[]>;
  
  // GET /api/conversations/:id - Get single conversation
  getConversation: (conversationId: string) => Promise<ConversationWithUsers>;
  
  // POST /api/conversations - Create or get existing conversation
  createConversation: (participantId: string) => Promise<Conversation>;
  
  // DELETE /api/conversations/:id - Delete/leave conversation
  deleteConversation: (conversationId: string) => Promise<void>;
  
  // PUT /api/conversations/:id/read - Mark conversation as read
  markAsRead: (conversationId: string) => Promise<void>;
}

// Example Express.js route handlers:
/*
router.get('/conversations', authenticate, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const conversations = await db.query(`
    SELECT 
      c.*,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read = false) as unread_count,
      (SELECT json_build_object('content', m.content, 'sender_id', m.sender_id, 'timestamp', m.created_at, 'type', m.type)
       FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = $1
    ORDER BY c.updated_at DESC
    LIMIT $2 OFFSET $3
  `, [req.userId, limit, offset]);
  
  // Get participant details
  for (const conv of conversations.rows) {
    const participants = await db.query(`
      SELECT u.id, u.name, u.avatar, u.status
      FROM users u
      JOIN conversation_participants cp ON u.id = cp.user_id
      WHERE cp.conversation_id = $1
    `, [conv.id]);
    conv.participantDetails = participants.rows;
  }
  
  res.json(conversations.rows);
});

router.get('/conversations/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  // Verify user is participant
  const participant = await db.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [id, req.userId]
  );
  
  if (participant.rows.length === 0) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  
  const conversation = await db.query('SELECT * FROM conversations WHERE id = $1', [id]);
  res.json(conversation.rows[0]);
});

router.post('/conversations', authenticate, async (req, res) => {
  const { participantId } = req.body;
  
  // Check if conversation already exists
  const existing = await db.query(`
    SELECT c.* FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
    WHERE c.type = 'direct'
  `, [req.userId, participantId]);
  
  if (existing.rows.length > 0) {
    return res.json(existing.rows[0]);
  }
  
  // Create new conversation
  const conversation = await db.query(
    "INSERT INTO conversations (type) VALUES ('direct') RETURNING *"
  );
  
  await db.query(
    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
    [conversation.rows[0].id, req.userId, participantId]
  );
  
  res.status(201).json(conversation.rows[0]);
});

router.delete('/conversations/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  await db.query(
    'DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [id, req.userId]
  );
  
  res.status(204).send();
});

router.put('/conversations/:id/read', authenticate, async (req, res) => {
  const { id } = req.params;
  
  await db.query(
    'UPDATE messages SET read = true WHERE conversation_id = $1 AND sender_id != $2',
    [id, req.userId]
  );
  
  res.status(204).send();
});
*/

// SQL Schema:
/*
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name VARCHAR(100), -- For group chats
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conv ON conversation_participants(conversation_id);
*/
