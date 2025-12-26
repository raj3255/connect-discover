// Chat Handler - Real-time messaging via Socket.io
// Uses: Socket.io + Redis (for message queue/presence)

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video';
  mediaUrl?: string;
  timestamp: Date;
}

export interface ChatEvents {
  // Client -> Server
  'chat:join': (conversationId: string) => void;
  'chat:leave': (conversationId: string) => void;
  'chat:message': (data: { conversationId: string; content: string; type: string; mediaUrl?: string }) => void;
  'chat:message_read': (data: { conversationId: string; messageId: string }) => void;
  
  // Server -> Client
  'chat:new_message': (message: ChatMessage) => void;
  'chat:message_delivered': (data: { messageId: string; conversationId: string }) => void;
  'chat:messages_read': (data: { conversationId: string; userId: string; messageIds: string[] }) => void;
  'chat:error': (error: { code: string; message: string }) => void;
}

// Socket.io Handler Implementation:
/*
const chatHandler = (io, socket, db, redis) => {
  const userId = socket.userId; // Set from auth middleware
  
  // Join conversation room
  socket.on('chat:join', async (conversationId) => {
    try {
      // Verify user is participant
      const participant = await db.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      if (participant.rows.length === 0) {
        socket.emit('chat:error', { code: 'FORBIDDEN', message: 'Not a participant' });
        return;
      }
      
      socket.join(`conversation:${conversationId}`);
      
      // Mark unread messages as delivered
      await db.query(
        'UPDATE messages SET delivered = true WHERE conversation_id = $1 AND sender_id != $2 AND delivered = false',
        [conversationId, userId]
      );
      
      console.log(`User ${userId} joined conversation ${conversationId}`);
    } catch (error) {
      socket.emit('chat:error', { code: 'ERROR', message: 'Failed to join conversation' });
    }
  });
  
  // Leave conversation room
  socket.on('chat:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${userId} left conversation ${conversationId}`);
  });
  
  // Send message
  socket.on('chat:message', async (data) => {
    const { conversationId, content, type, mediaUrl } = data;
    
    try {
      // Verify user is participant
      const participant = await db.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      
      if (participant.rows.length === 0) {
        socket.emit('chat:error', { code: 'FORBIDDEN', message: 'Not a participant' });
        return;
      }
      
      // Check if blocked
      const otherParticipant = await db.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
        [conversationId, userId]
      );
      
      if (otherParticipant.rows[0]) {
        const isBlocked = await redis.sismember(`blocked:${userId}`, otherParticipant.rows[0].user_id);
        const blockedBy = await redis.sismember(`blocked_by:${userId}`, otherParticipant.rows[0].user_id);
        
        if (isBlocked || blockedBy) {
          socket.emit('chat:error', { code: 'BLOCKED', message: 'Cannot send message to this user' });
          return;
        }
      }
      
      // Insert message
      const message = await db.query(`
        INSERT INTO messages (conversation_id, sender_id, content, type, media_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [conversationId, userId, content, type, mediaUrl]);
      
      const newMessage = message.rows[0];
      
      // Update conversation
      await db.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
      
      // Cache in Redis
      await redis.lpush(`messages:${conversationId}`, JSON.stringify(newMessage));
      await redis.ltrim(`messages:${conversationId}`, 0, 99);
      
      // Broadcast to conversation room
      io.to(`conversation:${conversationId}`).emit('chat:new_message', {
        ...newMessage,
        timestamp: new Date(newMessage.created_at)
      });
      
      // Send push notification to offline users
      const offlineParticipants = await db.query(`
        SELECT cp.user_id, u.push_token FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = $1 AND cp.user_id != $2 AND u.status = 'offline'
      `, [conversationId, userId]);
      
      for (const participant of offlineParticipants.rows) {
        if (participant.push_token) {
          await sendPushNotification(participant.push_token, {
            title: 'New Message',
            body: content.substring(0, 100),
            data: { conversationId }
          });
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('chat:error', { code: 'ERROR', message: 'Failed to send message' });
    }
  });
  
  // Mark message as read
  socket.on('chat:message_read', async (data) => {
    const { conversationId, messageId } = data;
    
    try {
      await db.query(
        'UPDATE messages SET read = true, read_at = NOW() WHERE id = $1 AND sender_id != $2',
        [messageId, userId]
      );
      
      // Notify sender
      const message = await db.query('SELECT sender_id FROM messages WHERE id = $1', [messageId]);
      
      if (message.rows[0]) {
        io.to(`user:${message.rows[0].sender_id}`).emit('chat:messages_read', {
          conversationId,
          userId,
          messageIds: [messageId]
        });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });
};

export default chatHandler;
*/
