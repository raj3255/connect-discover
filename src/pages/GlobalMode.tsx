import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Users } from 'lucide-react';
import SocketService from '@/services/SocketService';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { StatusIndicator } from '@/components/StatusIndicator';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MatchPreferences, MatchPreferencesData } from '@/components/MatchPreferences';
import { VideoCallInterface } from '@/components/VideoCallInterface';
import { GlobalChatInterface } from '@/components/GlobalChatInterface';

type MatchState = 'preferences' | 'searching' | 'matched' | 'connected' | 'connecting';

export default function GlobalMode() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [matchState, setMatchState] = useState<MatchState>('preferences');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [onlineCount] = useState(2341);
  const [searchTime, setSearchTime] = useState(0);
  const [currentMode, setCurrentMode] = useState<'chat' | 'video'>('chat');
  const [preferences, setPreferences] = useState<MatchPreferencesData | null>(null);
  
  // Refs to prevent double operations
  const isConnectingRef = useRef(false);
  const isSearchingRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const mountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Prevent any operations until component is fully stable
  useEffect(() => {
    const timer = setTimeout(() => {
      hasInitializedRef.current = true;
      console.log('✅ GlobalMode fully initialized');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Search timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (matchState === 'searching') {
      timer = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [matchState]);

  // Socket event listeners - ONLY SETUP ONCE
  useEffect(() => {
    const handleMatchFound = (data: any) => {
      console.log('🎉 Match found event received:', data);
      
      // Prevent processing if already navigating
      if (hasNavigatedRef.current) {
        console.log('⚠️ Already navigated, ignoring match event');
        return;
      }
      
      setMatchedUser(data.partner);
      setMatchId(data.matchId);
      setConversationId(data.conversationId);
      setMatchState('matched');
      isConnectingRef.current = false;
      isSearchingRef.current = false;
    };

    const handlePartnerLeft = () => {
      console.log('👋 Partner left');
      setMatchedUser(null);
      setMatchId(null);
      setConversationId(null);
      setMatchState('preferences');
      isConnectingRef.current = false;
      isSearchingRef.current = false;
    };

    SocketService.onMatchFound(handleMatchFound);
    SocketService.onPartnerLeft(handlePartnerLeft);

    return () => {
      SocketService.off('match:found');
      SocketService.off('match:partner_left');
    };
  }, []);

  // Cleanup on unmount - ONLY CANCEL IF ACTUALLY SEARCHING
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      console.log('🧹 GlobalMode unmounting');
      
      // Only cancel if we're actively searching and haven't navigated
      if (isSearchingRef.current && !hasNavigatedRef.current) {
        console.log('⏹️ Cancelling search on unmount');
        SocketService.cancelGlobalSearch();
        isSearchingRef.current = false;
      }
    };
  }, []);

  const startSearching = (prefs: MatchPreferencesData) => {
    // Don't allow search if not fully initialized
    if (!hasInitializedRef.current) {
      console.log('⚠️ Component not initialized yet, delaying search');
      setTimeout(() => startSearching(prefs), 600);
      return;
    }

    // Prevent double-searching
    if (isSearchingRef.current) {
      console.log('⚠️ Already searching, ignoring duplicate call');
      return;
    }

    // Reset navigation flag when starting new search
    hasNavigatedRef.current = false;
    isSearchingRef.current = true;
    setPreferences(prefs);
    setCurrentMode(prefs.mode);
    setMatchState('searching');
    setSearchTime(0);

    console.log('🔍 Starting search with preferences:', prefs);
    SocketService.startGlobalSearch({
      mode: prefs.mode,
      genderPreference: prefs.genderPreference,
      ageRange: prefs.ageRange
    });
  };

  const connectToMatch = () => {
    if (!matchedUser || !conversationId) {
      console.log('❌ Missing matched user or conversationId');
      return;
    }

    // Prevent double-click
    if (isConnectingRef.current || hasNavigatedRef.current) {
      console.log('⚠️ Already connecting or navigated, ignoring');
      return;
    }

    isConnectingRef.current = true;
    setMatchState('connecting');
    
    // Mark as no longer searching
    isSearchingRef.current = false;
    
    // If video mode, stay on this page and switch to connected state
    if (currentMode === 'video') {
      console.log('✅ Starting video call');
      setMatchState('connected');
    } else {
      // If chat mode, navigate to chat page
      hasNavigatedRef.current = true;
      console.log(`✅ Navigating to chat/${conversationId}`);
      setTimeout(() => {
        navigate(`/chat/${conversationId}`, { replace: true });
      }, 100);
    }
  };

  const cancelSearch = () => {
    if (!isSearchingRef.current) {
      console.log('⚠️ Not searching, nothing to cancel');
      return;
    }
    
    console.log('⏹️ User cancelled search');
    SocketService.cancelGlobalSearch();
    setMatchState('preferences');
    setSearchTime(0);
    isSearchingRef.current = false;
  };

  const skipMatch = useCallback(() => {
    if (matchedUser?.id && matchId) {
      console.log('⏭️ Skipping match:', matchId);
      SocketService.skipGlobalMatch(matchId);
    }

    setMatchedUser(null);
    setMatchId(null);
    setConversationId(null);
    setMatchState('preferences');
    isConnectingRef.current = false;
    isSearchingRef.current = false;
    hasNavigatedRef.current = false;

    toast({
      title: "Skipped",
      description: "You can search again when ready",
    });
  }, [matchedUser, matchId, toast]);

  const endConnection = useCallback(() => {
    setMatchedUser(null);
    setMatchId(null);
    setConversationId(null);
    setMatchState('preferences');
    isConnectingRef.current = false;
    isSearchingRef.current = false;
    hasNavigatedRef.current = false;
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
  if (matchState === 'connected' && matchedUser && conversationId) {
    if (currentMode === 'video') {
      return (
        <VideoCallInterface
          user={matchedUser}
          conversationId={conversationId}
          isInitiator={true} // In global mode, the user who clicks "Start Video" is the initiator
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

              <MatchPreferences 
                onStart={startSearching}
                isLoading={isSearchingRef.current}
              />
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

          {(matchState === 'matched' || matchState === 'connecting') && matchedUser && (
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
                  {Array.isArray(matchedUser.interests)
                    ? matchedUser.interests.slice(0, 3).map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 text-xs rounded-full bg-secondary text-foreground"
                      >
                        {interest}
                      </span>
                    ))
                    : JSON.parse(matchedUser.interests || '[]')
                      .slice(0, 3)
                      .map((interest: string) => (
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
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={skipMatch}
                    disabled={matchState === 'connecting'}
                  >
                    Skip
                  </Button>
                  <Button 
                    variant="gradient" 
                    className="flex-1" 
                    onClick={connectToMatch}
                    disabled={matchState === 'connecting'}
                  >
                    {matchState === 'connecting' 
                      ? 'Connecting...' 
                      : currentMode === 'video' ? 'Start Video' : 'Start Chat'}
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