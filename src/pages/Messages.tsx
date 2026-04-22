import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MessageCircle } from 'lucide-react';
import { StatusIndicator } from '@/components/StatusIndicator';
import { BottomNav } from '@/components/BottomNav';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import ApiService from '@/services/apiServices';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar_url: string;
    is_verified: boolean;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount: number;
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getConversations();

      if (response.conversations) {
        setConversations(
          response.conversations.map((c: any) => ({
            ...c,
            lastMessage: c.lastMessage
              ? { ...c.lastMessage, timestamp: new Date(c.lastMessage.timestamp) }
              : undefined
          }))
        );
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass safe-area-top">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">Messages</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>
        </div>
      </header>

      {/* Conversations List */}
      <main className="px-4 py-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-2">
            {filteredConversations.map((conv, index) => {
              const otherUser = conv.otherUser;

              return (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-secondary transition-colors"
                >
                  {/* Avatar */}
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={otherUser.avatar_url?.startsWith('http')
                        ? otherUser.avatar_url
                        : otherUser.avatar_url
                          ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${otherUser.avatar_url}`
                          : '/placeholder.svg'}
                      alt={otherUser.name}
                      className="h-14 w-14 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                    <div className="absolute bottom-0 right-0 p-0.5 bg-card rounded-full">
                      <StatusIndicator status="online" size="sm" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {otherUser.name}
                      </h3>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.lastMessage.timestamp), { addSuffix: false })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate pr-4">
                        {conv.lastMessage?.text || 'Start a conversation'}
                      </p>

                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No conversations yet</h2>
            <p className="text-muted-foreground">
              Start by finding someone to chat with!
            </p>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}