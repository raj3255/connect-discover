import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, MessageCircle, Flag, Ban, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/apiServices';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface Album {
  id: string;
  name: string;
  photo_count?: number;
}

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const userResponse = await ApiService.getUserById(userId);
        
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
        } else if (userResponse.user) {
          setUser(userResponse.user);
        } else {
          throw new Error('User not found');
        }

        // Fetch user's albums
        try {
          const albumsResponse = await ApiService.getUserAlbums(userId);
          if (albumsResponse.success && Array.isArray(albumsResponse.data)) {
            setAlbums(albumsResponse.data);
          } else if (Array.isArray(albumsResponse.albums)) {
            setAlbums(albumsResponse.albums);
          }
        } catch {
          setAlbums([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load user';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, toast]);

  const handleBlockUser = async () => {
    if (!userId) return;

    try {
      const response = await ApiService.blockUser(userId);
      
      if (response.success) {
        setIsBlocked(true);
        toast({
          title: 'Success',
          description: 'User blocked successfully',
        });
      } else {
        throw new Error(response.error || 'Block failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block user';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleUnblockUser = async () => {
    if (!userId) return;

    try {
      const response = await ApiService.unblockUser(userId);
      
      if (response.success) {
        setIsBlocked(false);
        toast({
          title: 'Success',
          description: 'User unblocked successfully',
        });
      } else {
        throw new Error(response.error || 'Unblock failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unblock user';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleReportUser = async () => {
    if (!userId || !reportReason) {
      toast({
        title: 'Validation Error',
        description: 'Please select a reason for reporting',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await ApiService.reportUser(userId, reportReason, reportDescription);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Report submitted successfully. Our team will review it.',
        });
        setReportReason('');
        setReportDescription('');
        setReportDialogOpen(false);
      } else {
        throw new Error(response.error || 'Report failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleStartChat = async () => {
    if (!userId) return;

    try {
      const response = await ApiService.createConversation(userId);
      
      if (response.success && response.data?.id) {
        navigate(`/chat/${response.data.id}`);
      } else if (response.conversation?.id) {
        navigate(`/chat/${response.conversation.id}`);
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start chat';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass safe-area-top">
          <div className="flex items-center gap-2 px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold">Error</span>
          </div>
        </header>
        <div className="flex items-center justify-center p-6 min-h-[calc(100vh-3.5rem)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error || 'User not found'}</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const createdDate = new Date(user.created_at).toLocaleDateString();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Image */}
      <div className="relative h-[50vh]">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-6xl font-bold text-primary-foreground">
              {getInitials(user.name)}
            </span>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-area-top">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-10 bg-background rounded-t-[2rem] px-6 pt-6">
        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {user.name}, {user.age}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              user.is_active 
                ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                : 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
            }`}>
              {user.is_active ? 'Online' : 'Offline'}
            </span>
            {user.is_verified && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-400">
                ✓ Verified
              </span>
            )}
          </div>

          {user.bio && (
            <p className="text-foreground/80 mb-6">{user.bio}</p>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Albums ({albums.length})</h2>
              <div className="grid grid-cols-3 gap-2">
                {albums.slice(0, 6).map((album, i) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="aspect-square rounded-xl bg-secondary flex items-center justify-center p-2"
                  >
                    <div className="text-center">
                      <p className="font-semibold text-sm line-clamp-2">{album.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {album.photo_count || 0} photos
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 py-4 border-y border-border">
            <div className="text-center">
              <p className="text-2xl font-bold">{user.age}</p>
              <p className="text-xs text-muted-foreground">Age</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold capitalize">{user.gender}</p>
              <p className="text-xs text-muted-foreground">Gender</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{albums.length}</p>
              <p className="text-xs text-muted-foreground">Albums</p>
            </div>
          </div>

          {/* Member Since */}
          <div className="text-sm text-muted-foreground mb-8">
            Member since {createdDate}
          </div>
        </motion.div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 glass safe-area-bottom">
        <div className="flex items-center gap-3 px-6 py-4">
          {/* Report */}
          <AlertDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full shrink-0">
                <Flag className="h-5 w-5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogTitle>Report User</AlertDialogTitle>
              <AlertDialogDescription>
                Help us keep our community safe
              </AlertDialogDescription>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason *</label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="fake_profile">Fake Profile</SelectItem>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="scam">Scam/Fraud</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Details</label>
                  <Textarea
                    placeholder="Describe the issue (optional)"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReportUser}>
                  Submit
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Block/Unblock */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full shrink-0">
                <Ban className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>
                {isBlocked ? 'Unblock User?' : 'Block User?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isBlocked
                  ? 'You can unblock this user anytime from your settings.'
                  : "You won't see messages from this user. You can unblock them later."}
              </AlertDialogDescription>
              <div className="flex gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                  className={isBlocked ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                >
                  {isBlocked ? 'Unblock' : 'Block'}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Message */}
          <Button
            variant="gradient"
            size="lg"
            className="flex-1 rounded-full"
            onClick={handleStartChat}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Message
          </Button>
        </div>
      </div>
    </div>
  );
}