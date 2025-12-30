import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw, Search, ChevronDown, Users } from 'lucide-react';
import ApiService from '@/services/apiServices';
import { useEffect } from 'react';


import { UserCard } from '@/components/UserCard';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const distances = [1, 5, 10, 25, 50];

export default function LocalMode() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDistance, setSelectedDistance] = useState(25);
  const [showDistanceDropdown, setShowDistanceDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentUser = users[currentIndex];
  const fetchNearbyUsers = useCallback(async (distance: number) => {
    try {
      const res = await ApiService.get(`/location/nearby?distance=${distance}`);
      setUsers(res.data.users || []);
      setCurrentIndex(0);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Unable to fetch nearby users',
        variant: 'destructive',
      });
    }
  }, [toast]);

 useEffect(() => {
  fetchNearbyUsers(selectedDistance);
}, [fetchNearbyUsers, selectedDistance]);

  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < users.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, users.length]);

  const handleSwipeRight = useCallback(() => {
    toast({ title: 'Profile Viewed!', description: `You viewed ${currentUser?.name}'s profile` });
    if (currentIndex < users.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, currentUser, toast, users.length]);

  const handleMessage = useCallback(() => {
    if (currentUser) {
      navigate(`/chat/${currentUser.id}`);
    }
  }, [currentUser, navigate]);

  const handleViewProfile = useCallback(() => {
    if (currentUser) {
      navigate(`/user/${currentUser.id}`);
    }
  }, [currentUser, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNearbyUsers(selectedDistance);
    setIsRefreshing(false);

    toast({
      title: 'Refreshed',
      description: 'Found nearby users',
    });
  };
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Distance Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDistanceDropdown(!showDistanceDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground"
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{selectedDistance} km</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showDistanceDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-2 py-2 rounded-xl bg-card border border-border shadow-elevated z-50"
                >
                  {distances.map(d => (
                    <button
                      key={d}
                      onClick={() => {
                        setSelectedDistance(d);
                        setShowDistanceDropdown(false)
                      }}
                      className={`w-full px-6 py-2 text-left hover:bg-secondary transition-colors ${d === selectedDistance ? 'text-primary font-semibold' : 'text-foreground'
                        }`}
                    >
                      {d} km
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="icon"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="icon" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Online Count */}
        <div className="flex items-center justify-center gap-2 pb-3 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{users.length} users nearby</span>
        </div>
      </header>

      {/* Card Stack */}
      <main className="relative h-[calc(100vh-200px)] px-4 pt-4">
        {currentUser ? (
          <div className="relative h-full max-w-md mx-auto">
            <AnimatePresence>
              <UserCard
                key={currentUser.id}
                user={currentUser}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onMessage={handleMessage}
                onViewProfile={handleViewProfile}
              />
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center px-8"
          >
            <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <MapPin className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No one nearby</h2>
            <p className="text-muted-foreground mb-6">
              Try increasing the search distance or check back later
            </p>
            <Button variant="gradient" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
