// src/pages/AlbumSharing.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserCheck, UserX, Loader2, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/apiServices';

interface Recipient {
  id: string;
  name: string;
  avatar_url: string;
  sharedAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function AlbumSharing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // If opened from chat with a specific user pre-filled
  const prefilledUserId = searchParams.get('userId');
  const prefilledUserName = searchParams.get('userName');

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadRecipients();
  }, []);

  // If a userId is pre-filled (coming from chat), auto-share on mount
  useEffect(() => {
    if (prefilledUserId && !loading) {
      const alreadyShared = recipients.some(r => r.id === prefilledUserId);
      if (!alreadyShared) {
        handleShareWithUser(prefilledUserId);
      }
    }
  }, [loading, prefilledUserId]);

  const loadRecipients = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getAlbumRecipients();
      if (res.recipients) setRecipients(res.recipients);
    } catch {
      toast({ title: 'Error', description: 'Failed to load sharing info', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleShareWithUser = async (userId: string) => {
    setSharing(true);
    try {
      const res = await ApiService.shareAllPhotosWithUser(userId);
      if (res.success) {
        await loadRecipients(); // refresh list
        toast({
          title: 'Album Shared!',
          description: `${prefilledUserName || 'User'} can now view your photos`,
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to share album', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  const revokeAccess = async (userId: string) => {
    setRevokingId(userId);
    try {
      const res = await ApiService.unshareAllPhotosFromUser(userId);
      if (res.success) {
        setRecipients(prev => prev.filter(r => r.id !== userId));
        toast({ title: 'Access Revoked', description: 'User can no longer view your photos' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke access', variant: 'destructive' });
    } finally {
      setRevokingId(null);
    }
  };

  const getAvatarUrl = (url: string) =>
    url?.startsWith('http') ? url : `${API_BASE}${url}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Album Sharing</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-card border border-border"
        >
          <div className="flex items-start gap-3">
            <Images className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Users with access can view all your private photos. Revoking access takes effect immediately — they lose access to all your photos instantly.
            </p>
          </div>
        </motion.div>

        {/* Pre-filled share action */}
        {prefilledUserId && sharing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3"
          >
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <p className="text-sm text-primary font-medium">
              Sharing your album with {prefilledUserName}...
            </p>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {/* Shared With List */}
        {!loading && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-5 w-5 text-green-500" />
              <h2 className="font-semibold text-foreground">Shared With</h2>
              <span className="text-sm text-muted-foreground">({recipients.length})</span>
            </div>

            {recipients.length === 0 ? (
              <div className="py-12 text-center">
                <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No one has access yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your album from a chat to grant access
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {recipients.map((recipient, index) => (
                    <motion.div
                      key={recipient.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={getAvatarUrl(recipient.avatar_url)}
                            alt={recipient.name}
                            className="h-12 w-12 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${recipient.name}&background=random`;
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{recipient.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Shared {recipient.sharedAt
                              ? new Date(recipient.sharedAt).toLocaleDateString()
                              : 'recently'}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeAccess(recipient.id)}
                        disabled={revokingId === recipient.id}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        {revokingId === recipient.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Revoke'
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}