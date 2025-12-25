import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Users } from 'lucide-react';
import { mockUsers, currentUser } from '@/data/mockUsers';
import { User } from '@/types';
import { StatusIndicator } from '@/components/StatusIndicator';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MatchPreferences, MatchPreferencesData } from '@/components/MatchPreferences';
import { VideoCallInterface } from '@/components/VideoCallInterface';
import { GlobalChatInterface } from '@/components/GlobalChatInterface';

type MatchState = 'preferences' | 'searching' | 'matched' | 'connected';

export default function GlobalMode() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [matchState, setMatchState] = useState<MatchState>('preferences');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [onlineCount] = useState(2341);
  const [searchTime, setSearchTime] = useState(0);
  const [currentMode, setCurrentMode] = useState<'chat' | 'video'>('chat');
  const [preferences, setPreferences] = useState<MatchPreferencesData | null>(null);

  // Search timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (matchState === 'searching') {
      timer = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
      
      // Simulate finding a match after 2-5 seconds
      const matchTimer = setTimeout(() => {
        // Filter users based on preferences (mock filtering)
        let filteredUsers = mockUsers.filter(u => u.id !== currentUser.id);
        
        if (preferences) {
          if (preferences.genderPreference !== 'all') {
            filteredUsers = filteredUsers.filter(u => u.gender === preferences.genderPreference);
          }
          filteredUsers = filteredUsers.filter(u => 
            u.age >= preferences.ageRange[0] && u.age <= preferences.ageRange[1]
          );
        }
        
        if (filteredUsers.length === 0) {
          filteredUsers = mockUsers.filter(u => u.id !== currentUser.id);
        }
        
        const randomUser = filteredUsers[Math.floor(Math.random() * filteredUsers.length)];
        setMatchedUser(randomUser);
        setMatchState('matched');
      }, 2000 + Math.random() * 3000);
      
      return () => {
        clearInterval(timer);
        clearTimeout(matchTimer);
      };
    }
  }, [matchState, preferences]);

  const startSearching = (prefs: MatchPreferencesData) => {
    setPreferences(prefs);
    setCurrentMode(prefs.mode);
    setMatchState('searching');
    setSearchTime(0);
  };

  const cancelSearch = () => {
    setMatchState('preferences');
    setSearchTime(0);
  };

  const skipMatch = useCallback(() => {
    setMatchedUser(null);
    setMatchState('searching');
    setSearchTime(0);
    toast({
      title: "Skipped",
      description: "Looking for someone else...",
    });
  }, [toast]);

  const connectToMatch = useCallback(() => {
    setMatchState('connected');
  }, []);

  const endConnection = useCallback(() => {
    setMatchedUser(null);
    setMatchState('preferences');
    toast({
      title: "Connection Ended",
      description: "You can find a new match anytime!",
    });
  }, [toast]);

  const switchToVideo = useCallback(() => {
    setCurrentMode('video');
    toast({
      title: "Switched to Video",
      description: "Camera is now active",
    });
  }, [toast]);

  const switchToChat = useCallback(() => {
    setCurrentMode('chat');
    toast({
      title: "Switched to Chat",
      description: "Video call ended",
    });
  }, [toast]);

  // Render connected state (full screen chat or video)
  if (matchState === 'connected' && matchedUser) {
    if (currentMode === 'video') {
      return (
        <VideoCallInterface
          user={matchedUser}
          onEndCall={endConnection}
          onSwitchToChat={switchToChat}
          onSkip={skipMatch}
        />
      );
    }
    
    return (
      <GlobalChatInterface
        user={matchedUser}
        currentUserId={currentUser.id}
        onEndChat={endConnection}
        onSwitchToVideo={switchToVideo}
        onSkip={skipMatch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30">
          {/* Animated dots representing users */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              }}
              animate={{
                x: [
                  Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                  Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                  Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                ],
                y: [
                  Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                  Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                  Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                ],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        {/* Online Count Header */}
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">{onlineCount.toLocaleString()} users online</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {matchState === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow"
              >
                <Globe className="h-12 w-12 text-primary-foreground" />
              </motion.div>
              
              <h1 className="text-2xl font-bold text-foreground text-center mb-2">Global Mode</h1>
              <p className="text-muted-foreground text-center mb-8 text-sm">
                Match with someone from around the world
              </p>
              
              <MatchPreferences onStart={startSearching} />
            </motion.div>
          )}

          {matchState === 'searching' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              {/* Pulsing search indicator */}
              <div className="relative h-32 w-32 mx-auto mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full gradient-primary opacity-20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full gradient-primary opacity-30"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
                <div className="absolute inset-0 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                  <Globe className="h-16 w-16 text-primary-foreground animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Finding Your {currentMode === 'video' ? 'Video' : 'Chat'} Match...
              </h2>
              <p className="text-muted-foreground mb-2">Searching {searchTime}s</p>
              <p className="text-sm text-muted-foreground mb-8">Usually matches in 5 seconds</p>
              
              <Button variant="outline" onClick={cancelSearch}>
                Cancel
              </Button>
            </motion.div>
          )}

          {matchState === 'matched' && matchedUser && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm"
            >
              {/* Match Found Card */}
              <div className="glass rounded-3xl p-6 text-center">
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-primary font-semibold mb-4"
                >
                  ✨ Match Found!
                </motion.p>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="relative w-28 h-28 mx-auto mb-4"
                >
                  <img
                    src={matchedUser.avatar}
                    alt={matchedUser.name}
                    className="w-full h-full rounded-full object-cover border-4 border-primary shadow-glow"
                  />
                  <div className="absolute bottom-0 right-0 p-1 bg-card rounded-full border-2 border-card">
                    <StatusIndicator status={matchedUser.status} size="lg" showRing />
                  </div>
                </motion.div>
                
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {matchedUser.name}, {matchedUser.age}
                </h2>
                
                {matchedUser.location && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {matchedUser.location.city}
                  </p>
                )}
                
                <p className="text-foreground/80 text-sm mb-6 line-clamp-2">
                  {matchedUser.bio}
                </p>
                
                {/* Interests */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {matchedUser.interests.slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 text-xs rounded-full bg-secondary text-foreground"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={skipMatch}>
                    Skip
                  </Button>
                  <Button variant="gradient" className="flex-1" onClick={connectToMatch}>
                    {currentMode === 'video' ? 'Start Video' : 'Start Chat'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
