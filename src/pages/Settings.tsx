import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Bell, Shield, Eye, MapPin,
  Moon, Volume2, Trash2, HelpCircle, Info, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/apiServices';
import { cacheSettingValue, applyBootstrapSettings } from '@/utils/settingsCache';
import { requestNotifPermission, getNotifPermission } from '@/utils/notifications';

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

// Maps the frontend toggle keys to the backend's snake_case setting fields.
type SettingsKey = 'notifications' | 'locationEnabled' | 'darkMode' | 'sounds' | 'showOnline';
const SETTING_API_KEY: Record<SettingsKey, string> = {
  notifications: 'push_notifications',
  locationEnabled: 'location_services',
  darkMode: 'dark_mode',
  sounds: 'sound_effects',
  showOnline: 'show_online_status',
};

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<Record<SettingsKey, boolean>>({
    notifications: true,
    locationEnabled: true,
    darkMode: true,
    sounds: true,
    showOnline: true,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tailwind is configured with darkMode: ["class"], so the theme is driven by
  // the `dark` class on <html>.
  const applyTheme = (dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark);
  };

  useEffect(() => {
    ApiService.getSettings()
      .then((res) => {
        if (res?.data) {
          setSettings({
            notifications: res.data.push_notifications ?? true,
            locationEnabled: res.data.location_services ?? true,
            darkMode: res.data.dark_mode ?? true,
            sounds: res.data.sound_effects ?? true,
            showOnline: res.data.show_online_status ?? true,
          });
          applyTheme(res.data.dark_mode ?? true);
          applyBootstrapSettings(res.data);
        } else if (res?.error) {
          toast({
            title: 'Could not load settings',
            description: 'Make sure the backend is running and migrations have been applied (npm run migrate).',
            variant: 'destructive',
          });
        }
      })
      .catch(() => {
        toast({
          title: 'Could not connect to server',
          description: 'Settings will not be saved until the backend is reachable.',
          variant: 'destructive',
        });
      });
  }, []);

  // Optimistically update a toggle, persist it, and revert on failure.
  const updateSetting = async (key: SettingsKey, value: boolean) => {
    const previous = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    if (key === 'darkMode') applyTheme(value);

    // Mirror to localStorage immediately so runtime utils can read it synchronously
    cacheSettingValue(SETTING_API_KEY[key], value);

    // If push notifications just turned ON, request browser permission
    if (key === 'notifications' && value) {
      const perm = getNotifPermission();
      if (perm === 'denied') {
        toast({
          title: 'Notifications blocked',
          description: 'Allow notifications in your browser settings, then try again.',
          variant: 'destructive',
        });
      } else if (perm !== 'granted') {
        const granted = await requestNotifPermission();
        if (!granted) {
          // Revert — user denied the browser prompt
          setSettings((s) => ({ ...s, [key]: false }));
          cacheSettingValue(SETTING_API_KEY[key], false);
          return;
        }
      }
    }

    try {
      const res = await ApiService.updateSettings({ [SETTING_API_KEY[key]]: value });
      if (res?.error) throw new Error(res.error);
    } catch {
      setSettings((s) => ({ ...s, [key]: previous }));
      if (key === 'darkMode') applyTheme(previous);
      cacheSettingValue(SETTING_API_KEY[key], previous);
      toast({
        title: 'Could not save setting',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await ApiService.deleteAccount();
      if (res?.error) {
        toast({ title: 'Could not delete account', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' });
      logout();
      navigate('/login', { replace: true });
    } catch {
      toast({ title: 'Could not delete account', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
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
          toggleValue: settings.notifications,
          onToggle: (v) => updateSetting('notifications', v)
        },
        {
          icon: MapPin,
          label: 'Location Services',
          description: 'Required for local mode',
          toggle: true,
          toggleValue: settings.locationEnabled,
          onToggle: (v) => updateSetting('locationEnabled', v)
        },
        {
          icon: Moon,
          label: 'Dark Mode',
          toggle: true,
          toggleValue: settings.darkMode,
          onToggle: (v) => updateSetting('darkMode', v)
        },
        {
          icon: Volume2,
          label: 'Sound Effects',
          toggle: true,
          toggleValue: settings.sounds,
          onToggle: (v) => updateSetting('sounds', v)
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
          toggleValue: settings.showOnline,
          onToggle: (v) => updateSetting('showOnline', v)
        },
        { 
          icon: Shield, 
          label: 'Blocked Users', 
          action: () => navigate('/blocked-users') 
        },
        {
          icon: Shield,
          label: 'Privacy Policy',
          action: () => window.open('https://connect.app/legal/privacy', '_blank', 'noopener,noreferrer')
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
          action: () => setDeleteOpen(true),
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
