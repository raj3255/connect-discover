import { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { MapPin, MessageCircle, X, Eye } from 'lucide-react';
import { User } from '@/types';
import { StatusIndicator } from './StatusIndicator';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface UserCardProps {
  user: User;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onMessage?: () => void;
  onViewProfile?: () => void;
}

export function UserCard({ user, onSwipeLeft, onSwipeRight, onMessage, onViewProfile }: UserCardProps) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      setExitX(300);
      onSwipeRight?.();
    } else if (info.offset.x < -100) {
      setExitX(-300);
      onSwipeLeft?.();
    }
  };

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={{ x: exitX }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-card">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${user.avatar})` }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          {/* User Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-foreground">
                {user.name}, {user.age}
              </h2>
              <StatusIndicator status={user.status} showRing />
            </div>
            
            {user.location && (
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4" />
                <span>{user.location.distance} km away</span>
              </div>
            )}
            
            <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
              {user.bio}
            </p>
            
            {/* Interests */}
            <div className="flex flex-wrap gap-2 mt-3">
              {user.interests.slice(0, 3).map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 text-xs rounded-full glass text-foreground"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="icon"
              size="icon-lg"
              onClick={onSwipeLeft}
              className="rounded-full bg-secondary/80 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-6 w-6" />
            </Button>
            
            <Button
              variant="gradient"
              size="icon-lg"
              onClick={onMessage}
              className="rounded-full h-16 w-16"
            >
              <MessageCircle className="h-7 w-7" />
            </Button>
            
            <Button
              variant="icon"
              size="icon-lg"
              onClick={onViewProfile}
              className="rounded-full bg-secondary/80 hover:bg-accent hover:text-accent-foreground"
            >
              <Eye className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
