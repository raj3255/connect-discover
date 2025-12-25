import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, RefreshCw, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/UserCard';
import { BottomNav } from '@/components/BottomNav';
import { mockUsers } from '@/data/mockUsers';

export default function CitySearchResults() {
  const navigate = useNavigate();
  const { cityName } = useParams();
  const [users, setUsers] = useState(mockUsers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSwipeLeft = () => {
    setCurrentIndex(prev => Math.min(prev + 1, users.length));
  };

  const handleSwipeRight = () => {
    setCurrentIndex(prev => Math.min(prev + 1, users.length));
  };

  const handleMessage = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCurrentIndex(0);
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate('/local')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{cityName || 'City'}</span>
          </div>
          
          <Button variant="ghost" size="icon">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {users.length} users in {cityName}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* User Cards */}
      <div className="relative h-[calc(100vh-200px)] px-4">
        <AnimatePresence>
          {currentIndex < users.length ? (
            users.slice(currentIndex, currentIndex + 3).reverse().map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: index === users.slice(currentIndex, currentIndex + 3).length - 1 ? 1 : 0.5,
                  scale: 1 - (users.slice(currentIndex, currentIndex + 3).length - 1 - index) * 0.05,
                  y: (users.slice(currentIndex, currentIndex + 3).length - 1 - index) * 10,
                }}
                exit={{ opacity: 0, x: -300 }}
                className="absolute inset-0"
                style={{ zIndex: index }}
              >
                <UserCard
                  user={user}
                  onSwipeLeft={() => handleSwipeLeft()}
                  onSwipeRight={() => handleSwipeRight()}
                  onMessage={handleMessage}
                  onViewProfile={handleViewProfile}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                <MapPin className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No more users in {cityName}
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-xs">
                Check back later or try searching in a different city
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
