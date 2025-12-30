import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, MessageCircle, Clock, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { StatusIndicator } from '@/components/StatusIndicator';

interface QuickProfileViewProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onViewFullProfile: (userId: string) => void;
}

export function QuickProfileView({ 
  user, 
  isOpen, 
  onClose, 
  onMessage, 
  onViewFullProfile 
}: QuickProfileViewProps) {
  if (!user) return null;

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

            {/* Close Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="absolute top-3 right-3"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Profile Content */}
            <div className="px-6 pb-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-card rounded-full">
                    <StatusIndicator status={user.status} size="md" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground">
                    {user.name}, {user.age}
                  </h2>
                  {user.location && (
                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{user.location.city}</span>
                      {user.location.distance && (
                        <span className="text-sm">• {user.location.distance} km away</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground mt-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {user.status === 'online' ? 'Active now' : 'Last seen recently'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-foreground mb-4">{user.bio}</p>

              {/* Interests */}
              <div className="flex flex-wrap gap-2 mb-6">
                {user.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 text-sm rounded-full bg-secondary text-foreground"
                  >
                    {interest}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onClose();
                    onViewFullProfile(user.id);
                  }}
                >
                  View Profile
                </Button>
                <Button
                  className="flex-1 gradient-primary"
                  onClick={() => {
                    onClose();
                    onMessage(user.id);
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
