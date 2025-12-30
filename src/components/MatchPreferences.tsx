import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Video, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export interface MatchPreferencesData {
  mode: 'chat' | 'video';
  ageRange: [number, number];
  genderPreference: 'all' | 'male' | 'female' | 'other';
  sexualityPreference: 'all' | 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'other';
}

interface MatchPreferencesProps {
  onStart: (preferences: MatchPreferencesData) => void;
  isLoading?: boolean;
}

export function MatchPreferences({ onStart, isLoading }: MatchPreferencesProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mode, setMode] = useState<'chat' | 'video'>('chat');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 99]);
  const [genderPreference, setGenderPreference] = useState<MatchPreferencesData['genderPreference']>('all');
  const [sexualityPreference, setSexualityPreference] = useState<MatchPreferencesData['sexualityPreference']>('all');

  const handleStart = () => {
    onStart({
      mode,
      ageRange,
      genderPreference,
      sexualityPreference,
    });
  };

  const genderOptions: { value: MatchPreferencesData['genderPreference']; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const sexualityOptions: { value: MatchPreferencesData['sexualityPreference']; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'straight', label: 'Straight' },
    { value: 'gay', label: 'Gay' },
    { value: 'lesbian', label: 'Lesbian' },
    { value: 'bisexual', label: 'Bisexual' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">
          Choose Your Mode
        </h2>

        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setMode('chat')}
            className={`relative p-4 rounded-2xl border-2 transition-all duration-200 ${
              mode === 'chat'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <MessageCircle className={`h-8 w-8 mx-auto mb-2 ${mode === 'chat' ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className={`font-medium ${mode === 'chat' ? 'text-primary' : 'text-foreground'}`}>Text Chat</p>
            <p className="text-xs text-muted-foreground mt-1">Messages only</p>
          </button>

          <button
            onClick={() => setMode('video')}
            className={`relative p-4 rounded-2xl border-2 transition-all duration-200 ${
              mode === 'video'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <Video className={`h-8 w-8 mx-auto mb-2 ${mode === 'video' ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className={`font-medium ${mode === 'video' ? 'text-primary' : 'text-foreground'}`}>Video Call</p>
            <p className="text-xs text-muted-foreground mt-1">Face to face</p>
          </button>
        </div>

        {/* Advanced Preferences Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors mb-4"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Match Preferences</span>
          </div>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Advanced Preferences */}
        <motion.div
          initial={false}
          animate={{ height: showAdvanced ? 'auto' : 0, opacity: showAdvanced ? 1 : 0 }}
          className="overflow-hidden"
        >
          <div className="space-y-6 pb-4">
            {/* Age Range */}
            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Age Range: {ageRange[0]} - {ageRange[1] === 99 ? '99+' : ageRange[1]}
              </Label>
              <div className="px-2">
                <Slider
                  min={18}
                  max={99}
                  step={1}
                  value={ageRange}
                  onValueChange={(value) => setAgeRange(value as [number, number])}
                  className="w-full"
                />
              </div>
            </div>

            {/* Gender Preference */}
            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Gender Preference
              </Label>
              <div className="flex flex-wrap gap-2">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setGenderPreference(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      genderPreference === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sexuality Preference */}
            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Sexuality Preference
              </Label>
              <div className="flex flex-wrap gap-2">
                {sexualityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSexualityPreference(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      sexualityPreference === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Start Button */}
        <Button
          variant="gradient"
          size="xl"
          className="w-full"
          onClick={handleStart}
          disabled={isLoading}
        >
          {isLoading ? 'Finding Match...' : `Start ${mode === 'chat' ? 'Chatting' : 'Video Call'}`}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You can switch between chat and video during the call
        </p>
      </div>
    </motion.div>
  );
}
