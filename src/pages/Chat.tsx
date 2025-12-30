import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, Send, Image, Smile } from 'lucide-react';
import { StatusIndicator } from '@/components/StatusIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import ApiService from '@/services/apiServices';
import SocketService from '@/services/SocketService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  isRead: boolean;
}

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Single useEffect to fetch conversation, messages, and setup socket
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    console.log('Chat effect running', { conversationId, currentUser });

    // Fetch conversation and messages
    fetchConversation();
    fetchMessages();

    // Join chat room
    SocketService.joinChat(conversationId);

    // Socket listeners
    SocketService.onNewMessage((message) => {
      setMessages(prev => [
        ...prev,
        { ...message, createdAt: new Date(message.createdAt) }
      ]);
    });

    SocketService.onUserTyping(({ userId }) => {
      if (userId !== currentUser.id) setIsTyping(true);
    });

    SocketService.onUserStoppedTyping(({ userId }) => {
      if (userId !== currentUser.id) setIsTyping(false);
    });

    // Cleanup
    return () => {
      SocketService.leaveChat(conversationId);
      SocketService.off('chat:new_message');
      SocketService.off('typing:user_typing');
      SocketService.off('typing:user_stopped');
    };
  }, [conversationId, currentUser?.id]);

  const fetchConversation = async () => {
    try {
      const response = await ApiService.getConversation(conversationId!);
      if (response.conversation) {
        setOtherUser(response.conversation.otherUser);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
      navigate('/messages');
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getMessages(conversationId!);
      if (response.messages) {
        setMessages(response.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.created_at)
        })));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: currentUser!.id,
      text: newMessage,
      createdAt: new Date(),
      isRead: false,
    };

    setMessages(prev =>
      prev.some(m => m.id.startsWith('temp-'))
        ? prev
        : [...prev, tempMessage]
    );
    const messageText = newMessage;
    setNewMessage('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    SocketService.stopTyping(conversationId);

    // Send via socket
    SocketService.sendMessage(conversationId, messageText);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (value && conversationId) {
      SocketService.startTyping(conversationId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        SocketService.stopTyping(conversationId);
      }, 2000);
    } else if (conversationId) {
      SocketService.stopTyping(conversationId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!otherUser && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <button
              onClick={() => navigate(`/user/${otherUser?.id}`)}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <img
                  src={otherUser?.avatar_url || '/placeholder.svg'}
                  alt={otherUser?.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 p-0.5 bg-card rounded-full">
                  <StatusIndicator status="online" size="sm" />
                </div>
              </div>

              <div className="text-left">
                <h2 className="font-semibold text-foreground">{otherUser?.name}</h2>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </button>
          </div>

          <Button variant="ghost" size="icon-sm">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, index) => {
          const isOwn = msg.senderId === currentUser?.id;
          const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== msg.senderId);

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {!isOwn && (
                <div className="w-8 shrink-0">
                  {showAvatar && (
                    <img
                      src={otherUser?.avatar_url || '/placeholder.svg'}
                      alt={otherUser?.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                </div>
              )}

              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  isOwn
                    ? 'gradient-primary text-primary-foreground rounded-br-sm'
                    : 'bg-secondary text-foreground rounded-bl-sm'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <img
              src={otherUser?.avatar_url || '/placeholder.svg'}
              alt={otherUser?.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="px-4 py-3 rounded-2xl bg-secondary rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <div className="sticky bottom-0 glass safe-area-bottom">
        <div className="flex items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="icon-sm">
            <Image className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="pr-10"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <Smile className="h-5 w-5" />
            </button>
          </div>

          <Button
            variant="gradient"
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}