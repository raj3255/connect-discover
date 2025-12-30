import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/apiServices';
import { useAuth } from '@/contexts/AuthContext';

const interestOptions = [
  'Travel', 'Photography', 'Coffee', 'Art', 'Music', 'Yoga', 
  'Tech', 'Sustainability', 'Dogs', 'Fitness', 'Food', 'Dance',
  'Writing', 'Books', 'Film', 'Gaming', 'Nightlife', 'Hiking',
  'Cooking', 'Fashion', 'Sports', 'Nature', 'Science', 'Comedy'
];

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, updateUser } = useAuth();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState<string[]>([]); // ✅ Always initialize as empty array
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Fetch current user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const response = await ApiService.getProfile();
        
        if (response.success && response.data) {
          const user = response.data;
          setName(user.name || '');
          setAge(user.age?.toString() || '');
          setBio(user.bio || '');
          setGender(user.gender || '');
          setAvatarPreview(user.avatar_url || '');
          
          // ✅ Better parsing with guaranteed array result
          let parsedInterests: string[] = [];
          if (Array.isArray(user.interests)) {
            parsedInterests = user.interests;
          } else if (typeof user.interests === 'string' && user.interests.trim()) {
            try {
              const parsed = JSON.parse(user.interests);
              parsedInterests = Array.isArray(parsed) ? parsed : [];
            } catch {
              parsedInterests = [];
            }
          }
          setInterests(parsedInterests);
        } else if (response.user) {
          const user = response.user;
          setName(user.name || '');
          setAge(user.age?.toString() || '');
          setBio(user.bio || '');
          setGender(user.gender || '');
          setAvatarPreview(user.avatar_url || '');
          
          // ✅ Better parsing with guaranteed array result
          let parsedInterests: string[] = [];
          if (Array.isArray(user.interests)) {
            parsedInterests = user.interests;
          } else if (typeof user.interests === 'string' && user.interests.trim()) {
            try {
              const parsed = JSON.parse(user.interests);
              parsedInterests = Array.isArray(parsed) ? parsed : [];
            } catch {
              parsedInterests = [];
            }
          }
          setInterests(parsedInterests);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        // ✅ Ensure interests is set even on error
        setInterests([]);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (authUser) {
      fetchProfile();
    }
  }, [authUser, toast]);

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 6 ? [...prev, interest] : prev
    );
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setAvatarFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select an image file first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await ApiService.uploadAvatar(avatarFile);

      if (response.success) {
        let newAvatarUrl = response.data?.avatar_url || response.avatar_url;
        
        // ✅ Convert relative path to full URL if needed
        if (newAvatarUrl && !newAvatarUrl.startsWith('http')) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const BASE_URL = API_BASE_URL.replace('/api', '');
          const cleanPath = newAvatarUrl.startsWith('/') ? newAvatarUrl : `/${newAvatarUrl}`;
          newAvatarUrl = `${BASE_URL}${cleanPath}`;
          console.log('🔧 Converted avatar URL to:', newAvatarUrl);
        }
        
        if (newAvatarUrl) {
          setAvatarPreview(newAvatarUrl);
          
          if (authUser) {
            updateUser({
              ...authUser,
              avatar_url: newAvatarUrl
            });
          }
        }
        
        toast({
          title: 'Success',
          description: 'Avatar uploaded successfully',
        });
        
        setAvatarFile(null);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Avatar upload failed';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    const ageNum = parseInt(age);
    if (!age || ageNum < 18 || ageNum > 120) {
      toast({
        title: 'Validation Error',
        description: 'Age must be between 18 and 120',
        variant: 'destructive',
      });
      return;
    }

    if (!gender) {
      toast({
        title: 'Validation Error',
        description: 'Please select a gender',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const updateData: any = {
        name: name.trim(),
        age: ageNum,
        bio: bio.trim(),
        gender
      };

      updateData.interests = JSON.stringify(interests);
      
      const response = await ApiService.updateProfile(updateData);

      if (response.success) {
        const updatedUser = response.user || response.data;

        if (updatedUser) {
          const userToUpdate = {
            ...authUser,
            ...updatedUser,
            interests: interests,
            avatar_url: avatarPreview || updatedUser.avatar_url || authUser?.avatar_url
          };
          
          updateUser(userToUpdate);
        }

        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });

        navigate('/profile');
      } else {
        throw new Error(response.error || 'Update failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // ✅ Ensure interests is always an array before rendering
  const safeInterests = Array.isArray(interests) ? interests : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Edit Profile</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || uploadingAvatar}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="px-6 py-6 space-y-8">
        {/* Avatar Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={name}
                className="h-28 w-28 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {getInitials(name)}
                </span>
              </div>
            )}
            <label className="absolute bottom-0 right-0 h-10 w-10 rounded-full gradient-primary flex items-center justify-center shadow-glow cursor-pointer">
              <Camera className="h-5 w-5 text-primary-foreground" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-muted-foreground mt-3">Tap to change photo</p>
          
          {avatarFile && (
            <Button
              onClick={handleAvatarUpload}
              disabled={uploadingAvatar}
              variant="default"
              size="sm"
              className="mt-3"
            >
              {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
            </Button>
          )}
        </motion.div>

        {/* Form Fields */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-card border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Your age"
                className="bg-card border-border"
                min="18"
                max="120"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer Not to Say</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="bg-card border-border min-h-[100px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>
        </motion.div>

        {/* Interests Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <Label>Interests</Label>
            <span className="text-xs text-muted-foreground">{safeInterests.length}/6 selected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((interest) => {
              const isSelected = safeInterests.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? 'gradient-primary text-primary-foreground shadow-glow'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {interest}
                  {isSelected && <X className="inline-block ml-1 h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}