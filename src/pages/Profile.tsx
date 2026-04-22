// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Camera, Edit2, LogOut, Shield, Bell, HelpCircle, ChevronRight, ImagePlus, Plus } from 'lucide-react';
import { StatusIndicator } from '@/components/StatusIndicator';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/apiServices';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    ApiService.getMyAlbums().then(res => {
      if (res.albums) setPhotos(res.albums.slice(0, 6));
    }).catch(() => {});
  }, [user]);

  const menuItems = [
    { icon: Edit2, label: 'Edit Profile', action: () => navigate('/edit-profile') },
    { icon: Bell, label: 'Notifications', action: () => {} },
    { icon: Shield, label: 'Privacy & Security', action: () => {} },
    { icon: HelpCircle, label: 'Help & Support', action: () => {} },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const interests = Array.isArray(user.interests)
    ? user.interests
    : typeof user.interests === 'string' && user.interests
      ? JSON.parse(user.interests)
      : [];

  const userStatus = user.is_active ? 'online' : 'offline';

  const getPhotoUrl = (url: string) =>
    url?.startsWith('http') ? url : `${API_BASE}${url}`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="relative">
        <div className="h-32 gradient-primary" />

        <Button
          variant="glass"
          size="icon"
          className="absolute top-4 right-4 safe-area-top"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5" />
        </Button>

        <div className="relative px-6 -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6"
          >
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-4">
              <div className="relative">
                {user.avatar_url ? (
                  <img
                    src={getPhotoUrl(user.avatar_url)}
                    alt={user.name}
                    className="h-28 w-28 rounded-full object-cover border-4 border-card shadow-elevated"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-full bg-primary/10 border-4 border-card shadow-elevated flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">
                      {getInitials(user.name)}
                    </span>
                  </div>
                )}
                <button
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full gradient-primary flex items-center justify-center shadow-glow"
                  onClick={() => navigate('/edit-profile')}
                >
                  <Camera className="h-4 w-4 text-primary-foreground" />
                </button>
                <div className="absolute bottom-0 left-0 p-1 bg-card rounded-full">
                  <StatusIndicator status={userStatus} size="lg" showRing />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-foreground">
                {user.name}, {user.age}
              </h1>
              {user.bio && (
                <p className="text-muted-foreground mt-1">{user.bio}</p>
              )}
            </div>

            {/* Interests */}
            {interests.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {interests.map((interest: string) => (
                  <span
                    key={interest}
                    className="px-3 py-1 text-sm rounded-full bg-secondary text-foreground"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </header>

      {/* Album Section */}
      <section className="px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            My Album
            {photos.length > 0 && (
              <span className="text-sm text-muted-foreground font-normal ml-2">
                ({photos.length})
              </span>
            )}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/album')}>
            Manage
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {photos.length > 0 ? (
            <>
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-secondary"
                  onClick={() => navigate(`/album-viewer/${photo.id}`)}
                >
                  <img
                    src={getPhotoUrl(photo.thumbnail_url || photo.photo_url)}
                    alt={photo.caption || 'Photo'}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                </motion.div>
              ))}
              {/* Add more button if less than 6 */}
              {photos.length < 6 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: photos.length * 0.06 }}
                  className="aspect-square rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors border-2 border-dashed border-border"
                  onClick={() => navigate('/album')}
                >
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </motion.div>
              )}
            </>
          ) : (
            // Empty state — 3 placeholder boxes
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="aspect-square rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => navigate('/album')}
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Menu Items */}
      <section className="px-6 mt-6 space-y-2">
        {menuItems.map(({ icon: Icon, label, action }, index) => (
          <motion.button
            key={label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={action}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-card hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <span className="font-medium text-foreground">{label}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        ))}

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: menuItems.length * 0.05 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-card hover:bg-destructive/10 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <span className="font-medium text-destructive">Logout</span>
          </div>
        </motion.button>
      </section>

      <BottomNav />
    </div>
  );
}