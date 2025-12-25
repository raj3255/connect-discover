import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, ChevronRight, History, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCity: (city: string) => void;
}

const popularCities = [
  { name: 'New York', country: 'USA', users: '12.5k' },
  { name: 'Los Angeles', country: 'USA', users: '8.3k' },
  { name: 'London', country: 'UK', users: '9.1k' },
  { name: 'Paris', country: 'France', users: '7.2k' },
  { name: 'Tokyo', country: 'Japan', users: '6.8k' },
  { name: 'Sydney', country: 'Australia', users: '4.5k' },
];

const recentCities = [
  { name: 'Brooklyn', country: 'USA' },
  { name: 'Manhattan', country: 'USA' },
];

export function CitySearchModal({ isOpen, onClose, onSelectCity }: CitySearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof popularCities>([]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      // Simulate search
      const filtered = popularCities.filter(city =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSelect = (city: string) => {
    onSelectCity(city);
    onClose();
  };

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[85vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <h2 className="text-xl font-bold text-foreground">Search City</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search Input */}
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a city..."
                  className="pl-12 h-12 bg-secondary border-0 rounded-xl"
                  autoFocus
                />
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-8 overflow-y-auto max-h-[60vh]">
              {searchQuery ? (
                /* Search Results */
                <div className="space-y-2">
                  {searchResults.length > 0 ? (
                    searchResults.map((city) => (
                      <motion.button
                        key={city.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleSelect(city.name)}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium text-foreground">{city.name}</p>
                            <p className="text-sm text-muted-foreground">{city.country}</p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">{city.users} users</span>
                      </motion.button>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-foreground font-medium">No cities found</p>
                      <p className="text-sm text-muted-foreground">Try a different search</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Recent Searches */}
                  {recentCities.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">Recent</h3>
                      </div>
                      <div className="space-y-2">
                        {recentCities.map((city) => (
                          <button
                            key={city.name}
                            onClick={() => handleSelect(city.name)}
                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">{city.name}, {city.country}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular Cities */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">Popular Cities</h3>
                    </div>
                    <div className="space-y-2">
                      {popularCities.map((city, index) => (
                        <motion.button
                          key={city.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleSelect(city.name)}
                          className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <p className="font-medium text-foreground">{city.name}</p>
                              <p className="text-sm text-muted-foreground">{city.country}</p>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">{city.users} users</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
