import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Ban, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/apiServices';

interface BlockedUser {
  id: string;
  name: string;
  avatar_url?: string;
  age?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function BlockedUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    ApiService.getBlockedUsers()
      .then((res) => {
        // API may return { data: [...] } or { blockedUsers: [...] } or []
        const list = res?.data ?? res?.blockedUsers ?? (Array.isArray(res) ? res : []);
        setBlockedUsers(list);
      })
      .catch(() => {
        toast({ title: 'Could not load blocked users', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (userId: string, name: string) => {
    setUnblocking(userId);
    try {
      await ApiService.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({ title: `${name} unblocked` });
    } catch {
      toast({ title: 'Could not unblock user', variant: 'destructive' });
    } finally {
      setUnblocking(null);
    }
  };

  const getAvatarUrl = (url?: string) => {
    if (!url) return '/placeholder.svg';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground ml-4">Blocked Users</h1>
        </div>
      </header>

      <div className="px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No blocked users</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card"
              >
                <img
                  src={getAvatarUrl(user.avatar_url)}
                  alt={user.name}
                  className="h-12 w-12 rounded-full object-cover bg-secondary flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{user.name}</p>
                  {user.age && <p className="text-sm text-muted-foreground">Age {user.age}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={unblocking === user.id}
                  onClick={() => handleUnblock(user.id, user.name)}
                >
                  {unblocking === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Unblock
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
