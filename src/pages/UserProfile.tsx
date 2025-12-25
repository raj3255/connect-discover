import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, MapPin, MessageCircle, Flag, Ban } from 'lucide-react';
import { mockUsers } from '@/data/mockUsers';
import { StatusIndicator } from '@/components/StatusIndicator';
import { Button } from '@/components/ui/button';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const user = mockUsers.find(u => u.id === userId);

  if (!user) {
    navigate(-1);
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Image */}
      <div className="relative h-[50vh]">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-area-top">
          <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="glass" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Photo Indicators */}
        {user.photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {user.photos.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full ${i === 0 ? 'w-6 bg-foreground' : 'w-1 bg-foreground/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative -mt-10 bg-background rounded-t-[2rem] px-6 pt-6 pb-24">
        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {user.name}, {user.age}
            </h1>
            <StatusIndicator status={user.status} size="lg" showRing />
          </div>
          
          {user.location && (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span>{user.location.city} • {user.location.distance} km away</span>
            </div>
          )}

          <p className="text-foreground/80 mb-6">{user.bio}</p>

          {/* Interests */}
          <div className="flex flex-wrap gap-2 mb-8">
            {user.interests.map((interest) => (
              <span
                key={interest}
                className="px-4 py-2 rounded-full bg-secondary text-foreground font-medium"
              >
                {interest}
              </span>
            ))}
          </div>

          {/* Album Preview */}
          {user.photos.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                {user.photos.map((photo, i) => (
                  <motion.img
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    src={photo}
                    alt={`${user.name}'s photo ${i + 1}`}
                    className="aspect-square rounded-xl object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 glass safe-area-bottom">
        <div className="flex items-center gap-3 px-6 py-4">
          <Button variant="outline" size="icon-lg" className="rounded-full shrink-0">
            <Flag className="h-5 w-5 text-destructive" />
          </Button>
          <Button variant="outline" size="icon-lg" className="rounded-full shrink-0">
            <Ban className="h-5 w-5" />
          </Button>
          <Button
            variant="gradient"
            size="lg"
            className="flex-1 rounded-full"
            onClick={() => navigate(`/chat/${user.id}`)}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Message
          </Button>
        </div>
      </div>
    </div>
  );
}
