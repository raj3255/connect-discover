// src/components/AlbumShareButton.tsx
// Drop this button anywhere in your chat interface (GlobalChatInterface, Chat.tsx, etc.)
// It lets the current user share/unshare their album with the person they're chatting with.

import { useState, useEffect } from 'react';
import { Images, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import ApiService from '@/services/apiServices';

interface AlbumShareButtonProps {
  recipientUserId: string;
  recipientName: string;
}

export function AlbumShareButton({ recipientUserId, recipientName }: AlbumShareButtonProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Check if already shared with this user
  useEffect(() => {
    const checkShared = async () => {
      try {
        const res = await ApiService.getAlbumRecipients();
        const recipients: any[] = res.recipients || [];
        setIsShared(recipients.some(r => r.id === recipientUserId));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    checkShared();
  }, [recipientUserId]);

  const toggle = async () => {
    setToggling(true);
    try {
      if (isShared) {
        await ApiService.unshareAllPhotosFromUser(recipientUserId);
        setIsShared(false);
        toast({
          title: 'Album Hidden',
          description: `${recipientName} can no longer view your photos`,
        });
      } else {
        await ApiService.shareAllPhotosWithUser(recipientUserId);
        setIsShared(true);
        toast({
          title: 'Album Shared!',
          description: `${recipientName} can now view your private photos`,
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update album sharing', variant: 'destructive' });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={toggling}
      title={isShared ? 'Hide album from this user' : 'Share your album with this user'}
      className={isShared ? 'text-primary' : 'text-muted-foreground'}
    >
      {toggling ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isShared ? (
        <Eye className="h-5 w-5" />
      ) : (
        <Images className="h-5 w-5" />
      )}
    </Button>
  );
}