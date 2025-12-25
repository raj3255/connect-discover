import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { currentUser } from '@/data/mockUsers';
import { useToast } from '@/hooks/use-toast';

const interestOptions = [
  'Travel', 'Photography', 'Coffee', 'Art', 'Music', 'Yoga', 
  'Tech', 'Sustainability', 'Dogs', 'Fitness', 'Food', 'Dance',
  'Writing', 'Books', 'Film', 'Gaming', 'Nightlife', 'Hiking',
  'Cooking', 'Fashion', 'Sports', 'Nature', 'Science', 'Comedy'
];

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState(currentUser.name);
  const [age, setAge] = useState(currentUser.age.toString());
  const [bio, setBio] = useState(currentUser.bio);
  const [interests, setInterests] = useState<string[]>(currentUser.interests);
  const [isSaving, setIsSaving] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 6 ? [...prev, interest] : prev
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({
      title: "Profile updated",
      description: "Your changes have been saved successfully.",
    });
    navigate('/profile');
  };

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
            disabled={isSaving}
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
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-28 w-28 rounded-full object-cover border-4 border-primary/20"
            />
            <button className="absolute bottom-0 right-0 h-10 w-10 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">Tap to change photo</p>
        </motion.div>

        {/* Form Fields */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-card border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Your age"
              className="bg-card border-border"
            />
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
            <span className="text-xs text-muted-foreground">{interests.length}/6 selected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((interest) => {
              const isSelected = interests.includes(interest);
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

        {/* Photos Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <Label>Photos</Label>
            <Button variant="ghost" size="sm" onClick={() => navigate('/album')}>
              Manage Album
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-card border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
