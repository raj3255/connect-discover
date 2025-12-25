import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, Send, Image, Smile } from 'lucide-react';
import { mockUsers, mockMessages } from '@/data/mockUsers';
import { Message } from '@/types';
import { StatusIndicator } from '@/components/StatusIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

export default function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const user = mockUsers.find(u => u.id === userId);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const currentUserId = '1'; // Mock current user

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    if (newMessage) {
      setIsTyping(false);
    }
  }, [newMessage]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      conversationId: 'conv1',
      senderId: currentUserId,
      content: newMessage,
      timestamp: new Date(),
      read: false,
      type: 'text',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const response: Message = {
          id: (Date.now() + 1).toString(),
          conversationId: 'conv1',
          senderId: userId || '2',
          content: 'Thanks for the message! 😊',
          timestamp: new Date(),
          read: false,
          type: 'text',
        };
        setMessages(prev => [...prev, response]);
      }, 2000);
    }, 1000);
  };

  if (!user) {
    navigate('/messages');
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
              onClick={() => navigate(`/user/${user.id}`)}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 p-0.5 bg-card rounded-full">
                  <StatusIndicator status={user.status} size="sm" />
                </div>
              </div>
              
              <div className="text-left">
                <h2 className="font-semibold text-foreground">{user.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {user.status === 'online' ? 'Online' : 'Last seen recently'}
                </p>
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
          const isOwn = msg.senderId === currentUserId;
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
                      src={user.avatar}
                      alt={user.name}
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
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
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
            <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
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
              onChange={(e) => setNewMessage(e.target.value)}
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
