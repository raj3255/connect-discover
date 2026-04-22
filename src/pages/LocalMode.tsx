import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Loader2 } from 'lucide-react';
import SocketService from '@/services/SocketService';
import ApiService from '@/services/apiServices';
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
type LocationState = 'unknown' | 'requesting' | 'granted' | 'denied';

const distances = [1, 5, 10, 25, 50, 100];

export default function LocalMode() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [matchState, setMatchState] = useState<MatchState>('preferences');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [matchDistance, setMatchDistance] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState(25);
  const [searchTime, setSearchTime] = useState(0);
  const [currentMode, setCurrentMode] = useState<'chat' | 'video'>('chat');
  const [preferences, setPreferences] = useState<MatchPreferencesData | null>(null);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [locationState, setLocationState] = useState<LocationState>('unknown');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  // Refs to prevent double operations
  const isConnectingRef = useRef(false);
  const isSearchingRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const mountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Initialize and request location
  useEffect(() => {
    const timer = setTimeout(() => {
      hasInitializedRef.current = true;
      console.log('✅ LocalMode fully initialized');
      requestLocation(); // Auto-request location on mount
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Request location permission
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location Not Supported',
        description: 'Your browser does not support geolocation',
        variant: 'destructive',
      });
      setLocationState('denied');
      return;
    }

    setLocationState('requesting');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          // Update location in backend
          await ApiService.updateLocation(latitude, longitude);

          setLocationState('granted');
          console.log('✅ Location updated:', latitude, longitude);

          toast({
            title: 'Location Enabled',
            description: 'You can now search for nearby matches',
          });
        } catch (error) {
          console.error('Failed to update location:', error);
          toast({
            title: 'Error',
            description: 'Failed to save location',
            variant: 'destructive',
          });
          setLocationState('denied');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationState('denied');

        let message = 'Location access denied';
        if (error.code === 1) {
          message = 'Please allow location access in your browser settings';
        } else if (error.code === 2) {
          message = 'Location unavailable. Please check your device settings';
        } else if (error.code === 3) {
          message = 'Location request timed out. Please try again';
        }

        toast({
          title: 'Location Required',
          description: message,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

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

  // Socket event listeners
  useEffect(() => {
    const handleMatchFound = (data: any) => {
      console.log('🎉 Local match found:', data);

      if (hasNavigatedRef.current) {
        console.log('⚠️ Already navigated, ignoring match event');
        return;
      }

      setMatchedUser(data.partner);
      setMatchId(data.matchId);
      setConversationId(data.conversationId);
      setMatchDistance(data.distance);
      setIsInitiator(data.isInitiator);
      setMatchState('matched');
      isConnectingRef.current = false;
      isSearchingRef.current = false;
    };

    const handlePartnerLeft = () => {
      console.log('👋 Partner left');
      setMatchedUser(null);
      setMatchId(null);
      setConversationId(null);
      setMatchDistance(null);
      setMatchState('preferences');
      isConnectingRef.current = false;
      isSearchingRef.current = false;
    };

    SocketService.onLocalMatchFound(handleMatchFound);
    SocketService.onLocalPartnerLeft(handlePartnerLeft);

    return () => {
      SocketService.off('local_match:found');
      SocketService.off('local_match:partner_left');
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      console.log('🧹 LocalMode unmounting');

      if (isSearchingRef.current && !hasNavigatedRef.current) {
        console.log('⏹️ Cancelling local search on unmount');
        SocketService.cancelLocalSearch();
        isSearchingRef.current = false;
      }
    };
  }, []);

  const startSearching = (prefs: MatchPreferencesData) => {
    if (!hasInitializedRef.current) {
      console.log('⚠️ Component not initialized yet, delaying search');
      setTimeout(() => startSearching(prefs), 600);
      return;
    }

    // Check if location is granted
    if (locationState !== 'granted') {
      toast({
        title: 'Location Required',
        description: 'Please enable location to use Local Mode',
        variant: 'destructive',
      });
      requestLocation();
      return;
    }

    if (isSearchingRef.current) {
      console.log('⚠️ Already searching, ignoring duplicate call');
      return;
    }

    hasNavigatedRef.current = false;
    isSearchingRef.current = true;
    setPreferences(prefs);
    setCurrentMode(prefs.mode);
    setMatchState('searching');
    setSearchTime(0);

    console.log('🔍 Starting LOCAL search with preferences:', prefs);
    SocketService.startLocalSearch({
      mode: prefs.mode,
      maxDistance: selectedDistance,
      genderPreference: prefs.genderPreference,
      ageRange: prefs.ageRange
    });
  };

  const connectToMatch = () => {
    if (!matchedUser || !conversationId) {
      console.log('❌ Missing matched user or conversationId');
      return;
    }

    if (isConnectingRef.current || hasNavigatedRef.current) {
      console.log('⚠️ Already connecting or navigated, ignoring');
      return;
    }

    isConnectingRef.current = true;
    setMatchState('connecting');
    isSearchingRef.current = false;

    if (currentMode === 'video') {
      console.log('✅ Starting video call');
      setMatchState('connected');
    } else {
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

    console.log('⏹️ User cancelled local search');
    SocketService.cancelLocalSearch();
    setMatchState('preferences');
    setSearchTime(0);
    isSearchingRef.current = false;
  };

  const skipMatch = useCallback(() => {
    if (matchedUser?.id && matchId) {
      console.log('⏭️ Skipping local match:', matchId);
      SocketService.skipLocalMatch(matchId);
    }

    setMatchedUser(null);
    setMatchId(null);
    setConversationId(null);
    setMatchDistance(null);
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
    setMatchDistance(null);
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

  // Render connected state
  if (matchState === 'connected' && matchedUser && conversationId) {
    if (currentMode === 'video') {
      return (
        <VideoCallInterface
          user={matchedUser}
          conversationId={conversationId}
          isInitiator={isInitiator}
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
        conversationId={conversationId!}
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
        <div className="absolute inset-0 opacity-20">
          {/* Animated location pins */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              }}
              animate={{
                y: [
                  Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                  Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                ],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 8 + Math.random() * 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <MapPin className="h-4 w-4 text-primary" />
            </motion.div>
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        {/* Header */}
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">Within {selectedDistance} km</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Location Request Screen */}
          {locationState === 'requesting' && (
            <motion.div
              key="requesting-location"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-12 w-12 text-primary-foreground animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Requesting Location</h2>
              <p className="text-muted-foreground text-sm">
                Please allow location access to use Local Mode
              </p>
            </motion.div>
          )}

          {/* Location Denied Screen */}
          {locationState === 'denied' && (
            <motion.div
              key="location-denied"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center max-w-md"
            >
              <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                <MapPin className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Location Required</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Local Mode needs your location to find nearby matches. Please enable location access in your browser settings.
              </p>
              <Button variant="gradient" onClick={requestLocation}>
                <MapPin className="h-4 w-4 mr-2" />
                Enable Location
              </Button>
            </motion.div>
          )}

          {locationState === 'granted' && matchState === 'preferences' && (
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
                <MapPin className="h-12 w-12 text-primary-foreground" />
              </motion.div>

              <h1 className="text-2xl font-bold text-foreground text-center mb-2">Local Mode</h1>
              <p className="text-muted-foreground text-center mb-4 text-sm">
                Match with people nearby
              </p>

              {/* Distance Selector */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="text-sm text-muted-foreground">Search radius:</span>
                <select
                  value={selectedDistance}
                  onChange={(e) => setSelectedDistance(Number(e.target.value))}
                  className="px-4 py-2 rounded-full bg-secondary text-foreground font-medium border-2 border-border focus:border-primary outline-none transition-colors"
                >
                  {distances.map(d => (
                    <option key={d} value={d}>{d} km</option>
                  ))}
                </select>
              </div>

              <MatchPreferences
                onStart={startSearching}
                isLoading={isSearchingRef.current}
              />
            </motion.div>
          )}

          {locationState === 'granted' && matchState === 'searching' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
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
                  <MapPin className="h-16 w-16 text-primary-foreground animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                Finding Nearby {currentMode === 'video' ? 'Video' : 'Chat'} Match...
              </h2>
              <p className="text-muted-foreground mb-2">Searching {searchTime}s</p>
              <p className="text-sm text-muted-foreground mb-2">Within {selectedDistance} km radius</p>
              <p className="text-xs text-muted-foreground mb-8">Usually matches in 5-10 seconds</p>

              <Button variant="outline" onClick={cancelSearch}>
                Cancel
              </Button>
            </motion.div>
          )}

          {locationState === 'granted' && (matchState === 'matched' || matchState === 'connecting') && matchedUser && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm"
            >
              <div className="glass rounded-3xl p-6 text-center">
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-primary font-semibold mb-4"
                >
                  ✨ Match Found Nearby!
                </motion.p>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="relative w-28 h-28 mx-auto mb-4"
                >
                  <img
                    src={matchedUser.avatar?.startsWith('http')
                      ? matchedUser.avatar
                      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${matchedUser.avatar || ''}`}
                    alt={matchedUser.name}
                    className="w-full h-full rounded-full object-cover border-4 border-primary shadow-glow"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                  <div className="absolute bottom-0 right-0 p-1 bg-card rounded-full border-2 border-card">
                    <StatusIndicator status={matchedUser.status} size="lg" showRing />
                  </div>
                </motion.div>

                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {matchedUser.name}, {matchedUser.age}
                </h2>

                {matchDistance && (
                  <div className="flex items-center justify-center gap-1 text-primary mb-4">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">{matchDistance} away</span>
                  </div>
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