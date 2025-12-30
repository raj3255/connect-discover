import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, ChevronRight, Bell, Shield, Eye, MapPin, 
  Moon, Volume2, Trash2, HelpCircle, Info, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';

interface SettingItem {
  icon: React.ElementType;
  label: string;
  description?: string;
  action?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [notifications, setNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [showOnline, setShowOnline] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const settingsSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Preferences',
      items: [
        { 
          icon: Bell, 
          label: 'Push Notifications', 
          description: 'Receive alerts for messages and matches',
          toggle: true, 
          toggleValue: notifications, 
          onToggle: setNotifications 
        },
        { 
          icon: MapPin, 
          label: 'Location Services', 
          description: 'Required for local mode',
          toggle: true, 
          toggleValue: locationEnabled, 
          onToggle: setLocationEnabled 
        },
        { 
          icon: Moon, 
          label: 'Dark Mode', 
          toggle: true, 
          toggleValue: darkMode, 
          onToggle: setDarkMode 
        },
        { 
          icon: Volume2, 
          label: 'Sound Effects', 
          toggle: true, 
          toggleValue: sounds, 
          onToggle: setSounds 
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { 
          icon: Eye, 
          label: 'Show Online Status', 
          description: 'Let others see when you\'re online',
          toggle: true, 
          toggleValue: showOnline, 
          onToggle: setShowOnline 
        },
        { 
          icon: Shield, 
          label: 'Blocked Users', 
          action: () => navigate('/blocked-users') 
        },
        { 
          icon: Shield, 
          label: 'Privacy Policy', 
          action: () => {} 
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { 
          icon: HelpCircle, 
          label: 'Help Center', 
          action: () => navigate('/help') 
        },
        { 
          icon: Info, 
          label: 'About', 
          action: () => navigate('/about') 
        },
      ],
    },
    {
      title: 'Account',
      items: [
        { 
          icon: Trash2, 
          label: 'Delete Account', 
          description: 'Permanently delete your account and data',
          action: () => {},
          danger: true 
        },
        { 
          icon: LogOut, 
          label: 'Log Out', 
          action: handleLogout,
          danger: true 
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground ml-4">Settings</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-8">
        {settingsSections.map((section, sectionIndex) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {section.title}
            </h2>
            <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border">
              {section.items.map((item, itemIndex) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: sectionIndex * 0.1 + itemIndex * 0.03 }}
                  onClick={item.toggle ? undefined : item.action}
                  className={`flex items-center justify-between p-4 ${
                    !item.toggle ? 'cursor-pointer hover:bg-secondary/50' : ''
                  } transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      item.danger ? 'bg-destructive/10' : 'bg-secondary'
                    }`}>
                      <item.icon className={`h-5 w-5 ${item.danger ? 'text-destructive' : 'text-foreground'}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${item.danger ? 'text-destructive' : 'text-foreground'}`}>
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.toggle ? (
                    <Switch 
                      checked={item.toggleValue} 
                      onCheckedChange={item.onToggle}
                    />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}

        {/* App Version */}
        <p className="text-center text-sm text-muted-foreground">
          Connect v1.0.0
        </p>
      </div>
    </div>
  );
}
