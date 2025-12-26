// Message Routes - Send, Get messages
// Backend: PostgreSQL + Redis (for caching recent messages)

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video';
  mediaUrl?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageData {
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video';
  mediaUrl?: string;
}

export interface MessageRoutes {
  // GET /api/messages/:conversationId - Get messages for conversation
  getMessages: (conversationId: string, page?: number, limit?: number) => Promise<Message[]>;
  
  // POST /api/messages - Send a message
  sendMessage: (data: SendMessageData) => Promise<Message>;
  
  // PUT /api/messages/:id/read - Mark message as read
  markAsRead: (messageId: string) => Promise<void>;
  
  // DELETE /api/messages/:id - Delete message
  deleteMessage: (messageId: string) => Promise<void>;
  
  // POST /api/messages/media - Upload media for message
  uploadMedia: (file: File) => Promise<{ mediaUrl: string }>;
}

// Example Express.js route handlers:
/*
router.get('/messages/:conversationId', authenticate, async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  
  // Verify user is participant
  const participant = await db.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, req.userId]
  );
  
  if (participant.rows.length === 0) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  
  // Try to get from Redis cache first (last 100 messages)
  const cachedMessages = await redis.lrange(`messages:${conversationId}`, 0, 99);
  
  if (cachedMessages.length > 0 && page === 1) {
    return res.json(cachedMessages.map(m => JSON.parse(m)));
  }
  
  // Fallback to PostgreSQL
  const messages = await db.query(`
    SELECT * FROM messages 
    WHERE conversation_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `, [conversationId, limit, offset]);
  
  res.json(messages.rows);
});

router.post('/messages', authenticate, async (req, res) => {
  const { conversationId, content, type, mediaUrl } = req.body;
  
  // Verify user is participant
  const participant = await db.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, req.userId]
  );
  
  if (participant.rows.length === 0) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  
  // Insert message
  const message = await db.query(`
    INSERT INTO messages (conversation_id, sender_id, content, type, media_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [conversationId, req.userId, content, type, mediaUrl]);
  
  // Update conversation updated_at
  await db.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
  
  // Cache in Redis
  await redis.lpush(`messages:${conversationId}`, JSON.stringify(message.rows[0]));
  await redis.ltrim(`messages:${conversationId}`, 0, 99); // Keep last 100 messages
  
  // Emit via Socket.io to other participants
  const participants = await db.query(
    'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
    [conversationId, req.userId]
  );
  
  participants.rows.forEach(p => {
    io.to(`user:${p.user_id}`).emit('new_message', message.rows[0]);
  });
  
  res.status(201).json(message.rows[0]);
});

router.put('/messages/:id/read', authenticate, async (req, res) => {
  const { id } = req.params;
  
  await db.query(
    'UPDATE messages SET read = true WHERE id = $1 AND sender_id != $2',
    [id, req.userId]
  );
  
  res.status(204).send();
});

router.delete('/messages/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  // Verify sender
  const message = await db.query('SELECT * FROM messages WHERE id = $1', [id]);
  
  if (message.rows[0]?.sender_id !== req.userId) {
    return res.status(403).json({ error: 'Not the sender' });
  }
  
  await db.query('DELETE FROM messages WHERE id = $1', [id]);
  
  res.status(204).send();
});

router.post('/messages/media', authenticate, upload.single('media'), async (req, res) => {
  const mediaUrl = await uploadToStorage(req.file);
  res.json({ mediaUrl });
});
*/

// SQL Schema:
/*
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video')),
  media_url VARCHAR(500),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
*/
