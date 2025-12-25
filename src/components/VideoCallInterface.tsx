import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  MessageCircle,
  RotateCcw,
  Sparkles,
  Monitor,
  MoreVertical,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/types';

interface VideoCallInterfaceProps {
  user: User;
  onEndCall: () => void;
  onSwitchToChat: () => void;
  onSkip: () => void;
}

type FilterType = 'none' | 'blur' | 'grayscale' | 'sepia' | 'brightness';

export function VideoCallInterface({ user, onEndCall, onSwitchToChat, onSkip }: VideoCallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('none');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const filters: { type: FilterType; label: string; css: string }[] = [
    { type: 'none', label: 'None', css: '' },
    { type: 'blur', label: 'Blur BG', css: 'backdrop-blur-sm' },
    { type: 'grayscale', label: 'B&W', css: 'grayscale' },
    { type: 'sepia', label: 'Warm', css: 'sepia' },
    { type: 'brightness', label: 'Bright', css: 'brightness-110 contrast-110' },
  ];

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isFrontCamera]);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => setShowControls(false), 5000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const switchCamera = () => {
    stopCamera();
    setIsFrontCamera(!isFrontCamera);
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      // Replace video track with screen share
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      
      setIsScreenSharing(true);
      
      // Listen for screen share end
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    setIsScreenSharing(false);
    startCamera();
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilterStyle = () => {
    const filter = filters.find(f => f.type === currentFilter);
    return filter?.css || '';
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-50"
      onClick={() => setShowControls(true)}
    >
      {/* Remote Video (Full Screen) - Using user avatar as placeholder */}
      <div className="absolute inset-0">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        className={`absolute top-20 right-4 w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 ${getFilterStyle()}`}
      >
        {isVideoEnabled ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </motion.div>

      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="glass px-4 py-2 rounded-full">
                <span className="text-white font-medium">{formatDuration(callDuration)}</span>
              </div>
              {isScreenSharing && (
                <div className="glass px-3 py-2 rounded-full flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-white">Sharing</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="glass rounded-full"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5 text-white" />
                ) : (
                  <Maximize2 className="h-5 w-5 text-white" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Info */}
      <div className="absolute bottom-32 left-4">
        <h2 className="text-2xl font-bold text-white">{user.name}, {user.age}</h2>
        {user.location && (
          <p className="text-white/70">{user.location.city}</p>
        )}
      </div>

      {/* Filter Selection */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-40 left-0 right-0 px-4"
          >
            <div className="glass rounded-2xl p-4">
              <p className="text-white text-sm font-medium mb-3">Filters</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button
                    key={filter.type}
                    onClick={() => setCurrentFilter(filter.type)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all ${
                      currentFilter === filter.type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-4 pb-8"
          >
            <div className="flex items-center justify-center gap-4">
              {/* Switch Camera */}
              <Button
                variant="ghost"
                size="icon"
                onClick={switchCamera}
                className="h-12 w-12 rounded-full glass"
              >
                <RotateCcw className="h-5 w-5 text-white" />
              </Button>

              {/* Filters */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-12 w-12 rounded-full ${showFilters ? 'bg-primary' : 'glass'}`}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </Button>

              {/* Toggle Video */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVideo}
                className={`h-12 w-12 rounded-full ${!isVideoEnabled ? 'bg-destructive' : 'glass'}`}
              >
                {isVideoEnabled ? (
                  <Video className="h-5 w-5 text-white" />
                ) : (
                  <VideoOff className="h-5 w-5 text-white" />
                )}
              </Button>

              {/* End Call */}
              <Button
                onClick={onEndCall}
                className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90"
              >
                <Phone className="h-6 w-6 text-white rotate-[135deg]" />
              </Button>

              {/* Toggle Audio */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAudio}
                className={`h-12 w-12 rounded-full ${!isAudioEnabled ? 'bg-destructive' : 'glass'}`}
              >
                {isAudioEnabled ? (
                  <Mic className="h-5 w-5 text-white" />
                ) : (
                  <MicOff className="h-5 w-5 text-white" />
                )}
              </Button>

              {/* Screen Share */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleScreenShare}
                className={`h-12 w-12 rounded-full ${isScreenSharing ? 'bg-green-500' : 'glass'}`}
              >
                <Monitor className="h-5 w-5 text-white" />
              </Button>

              {/* Switch to Chat */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onSwitchToChat}
                className="h-12 w-12 rounded-full glass"
              >
                <MessageCircle className="h-5 w-5 text-white" />
              </Button>
            </div>

            {/* Skip Button */}
            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full mt-4 text-white/70 hover:text-white"
            >
              Skip to next person
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
