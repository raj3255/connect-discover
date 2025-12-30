import { useEffect, useState } from 'react';
import socketService from '@/services/SocketService';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

export const useChat = (conversationId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) return;

    socketService.joinChat(conversationId);

    socketService.onNewMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketService.onUserTyping(({ userId }) => {
      setTypingUsers((prev) => new Set([...prev, userId]));
    });

    socketService.onUserStoppedTyping(({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socketService.leaveChat(conversationId);
    };
  }, [conversationId]);

  const sendMessage = (text: string, mediaUrls?: string[]) => {
    socketService.sendMessage(conversationId, text, mediaUrls);
  };

  const startTyping = () => {
    socketService.startTyping(conversationId);
  };

  const stopTyping = () => {
    socketService.stopTyping(conversationId);
  };

  return {
    messages,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    startTyping,
    stopTyping
  };
};