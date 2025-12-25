import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Video, 
  SkipForward, 
  X, 
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Flag,
  Ban,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from '@/types';
import { StatusIndicator } from '@/components/StatusIndicator';
import { UserActionsModal } from '@/components/UserActionsModal';

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'system';
}

interface GlobalChatInterfaceProps {
  user: User;
  currentUserId: string;
  onEndChat: () => void;
  onSwitchToVideo: () => void;
  onSkip: () => void;
}

export function GlobalChatInterface({ 
  user, 
  currentUserId,
  onEndChat, 
  onSwitchToVideo, 
  onSkip 
}: GlobalChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: `You're now connected with ${user.name}! Say hi 👋`,
      senderId: 'system',
      timestamp: new Date(),
      type: 'system',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [actionType, setActionType] = useState<'block' | 'report' | 'share' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatDuration, setChatDuration] = useState(0);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chat duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setChatDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate typing indicator
  useEffect(() => {
    const typingTimeout = setTimeout(() => {
      if (messages.length > 1 && messages.length < 5) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          // Simulate a response
          const responses = [
            "Hey! Nice to meet you 😊",
            "Where are you from?",
            "What brings you here today?",
            "I love meeting new people!",
          ];
          const response = responses[Math.floor(Math.random() * responses.length)];
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: response,
            senderId: user.id,
            timestamp: new Date(),
            type: 'text',
          }]);
        }, 2000);
      }
    }, 3000);

    return () => clearTimeout(typingTimeout);
  }, [messages.length, user.id]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      senderId: currentUserId,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAction = (action: 'block' | 'report' | 'share') => {
    setActionType(action);
    setShowActions(false);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onEndChat}>
            <X className="h-5 w-5" />
          </Button>
          
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="absolute bottom-0 right-0">
              <StatusIndicator status={user.status} size="sm" />
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground">{user.name}, {user.age}</h3>
            <p className="text-xs text-muted-foreground">
              {user.location?.city} • {formatDuration(chatDuration)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSwitchToVideo}
            className="text-primary"
          >
            <Video className="h-5 w-5" />
          </Button>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50"
                >
                  <button
                    onClick={() => handleAction('share')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                  >
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Share Profile</span>
                  </button>
                  <button
                    onClick={() => handleAction('report')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors"
                  >
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Report</span>
                  </button>
                  <button
                    onClick={() => handleAction('block')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-destructive"
                  >
                    <Ban className="h-4 w-4" />
                    <span className="text-sm">Block User</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${
              message.type === 'system' 
                ? 'justify-center' 
                : message.senderId === currentUserId 
                  ? 'justify-end' 
                  : 'justify-start'
            }`}
          >
            {message.type === 'system' ? (
              <div className="px-4 py-2 bg-secondary/50 rounded-full">
                <p className="text-xs text-muted-foreground">{message.content}</p>
              </div>
            ) : (
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  message.senderId === currentUserId
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-foreground rounded-bl-md'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-[10px] mt-1 ${
                  message.senderId === currentUserId 
                    ? 'text-primary-foreground/70' 
                    : 'text-muted-foreground'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Skip Banner */}
      <div className="px-4 py-2 bg-secondary/50">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip to next person
        </Button>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-10 rounded-full bg-secondary border-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
          
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            size="icon"
            className="flex-shrink-0 rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* User Actions Modal */}
      <UserActionsModal
        isOpen={actionType !== null}
        onClose={() => setActionType(null)}
        action={actionType}
        userName={user.name}
        userId={user.id}
      />
    </div>
  );
}
