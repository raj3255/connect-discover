import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Ban, Share2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface UserActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userId: string;
  action: 'block' | 'report' | 'share' | null;
}

export function UserActionsModal({ 
  isOpen, 
  onClose, 
  userName, 
  userId,
  action 
}: UserActionsModalProps) {
  const { toast } = useToast();

  const handleBlock = () => {
    toast({
      title: "User blocked",
      description: `${userName} has been blocked. They won't be able to contact you.`,
    });
    onClose();
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe. We'll review this report.",
    });
    onClose();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`https://connect.app/user/${userId}`);
    toast({
      title: "Link copied",
      description: "Profile link has been copied to clipboard.",
    });
    onClose();
  };

  const reportReasons = [
    'Inappropriate content',
    'Fake profile',
    'Harassment',
    'Spam',
    'Underage user',
    'Other',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {action === 'block' && (
              <div className="px-6 pb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Ban className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Block {userName}?</h2>
                    <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <p className="text-foreground">When you block someone:</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• They can't see your profile or photos</li>
                    <li>• They can't message you</li>
                    <li>• Your existing conversations will be hidden</li>
                    <li>• They won't be notified</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleBlock}>
                    <Ban className="h-4 w-4 mr-2" />
                    Block
                  </Button>
                </div>
              </div>
            )}

            {action === 'report' && (
              <div className="px-6 pb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Flag className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Report {userName}</h2>
                    <p className="text-sm text-muted-foreground">Select a reason</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {reportReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={handleReport}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{reason}</span>
                    </button>
                  ))}
                </div>

                <Button variant="ghost" className="w-full" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            )}

            {action === 'share' && (
              <div className="px-6 pb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Share2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Share Profile</h2>
                    <p className="text-sm text-muted-foreground">Share {userName}'s profile</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-secondary mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Profile link</p>
                  <p className="text-foreground font-mono text-sm truncate">
                    https://connect.app/user/{userId}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button className="flex-1 gradient-primary" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
