import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Camera, Edit2, LogOut, Shield, Bell, HelpCircle, ChevronRight, ImagePlus } from 'lucide-react';
import { currentUser } from '@/data/mockUsers';
import { StatusIndicator } from '@/components/StatusIndicator';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="relative">
        {/* Background */}
        <div className="h-32 gradient-primary" />
        
        {/* Settings button */}
        <Button
          variant="glass"
          size="icon"
          className="absolute top-4 right-4 safe-area-top"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5" />
        </Button>

        {/* Profile Card */}
        <div className="relative px-6 -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6"
          >
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-4">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-28 w-28 rounded-full object-cover border-4 border-card shadow-elevated"
                />
                <button className="absolute bottom-0 right-0 h-9 w-9 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                  <Camera className="h-4 w-4 text-primary-foreground" />
                </button>
                <div className="absolute bottom-0 left-0 p-1 bg-card rounded-full">
                  <StatusIndicator status={currentUser.status} size="lg" showRing />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-foreground">
                {currentUser.name}, {currentUser.age}
              </h1>
              <p className="text-muted-foreground mt-1">{currentUser.bio}</p>
            </div>

            {/* Interests */}
            <div className="flex flex-wrap justify-center gap-2">
              {currentUser.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 text-sm rounded-full bg-secondary text-foreground"
                >
                  {interest}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Album Section */}
      <section className="px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Album</h2>
          <Button variant="ghost" size="sm">
            See All
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="aspect-square rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            </motion.div>
          ))}
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
