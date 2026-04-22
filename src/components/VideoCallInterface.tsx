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
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { useWebRTC } from '@/hooks/useWebRTC';

interface VideoCallInterfaceProps {
  user: User;
  conversationId: string;
  isInitiator: boolean;
  onEndCall: () => void;
  onSwitchToChat: () => void;
  onSkip: () => void;
}

type FilterType = 'none' | 'blur' | 'grayscale' | 'sepia' | 'brightness';

export function VideoCallInterface({
  user,
  conversationId,
  isInitiator,
  onEndCall,
  onSwitchToChat,
  onSkip
}: VideoCallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('none');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const {
    localStream,
    remoteStream,
    isConnected,
    isConnecting,
    toggleVideo: webrtcToggleVideo,
    toggleAudio: webrtcToggleAudio,
    endCall: webrtcEndCall,
  } = useWebRTC({
    conversationId,
    isInitiator,
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    },
    onCallEnded: onEndCall,
  });

  const filters: { type: FilterType; label: string; css: string }[] = [
    { type: 'none', label: 'None', css: '' },
    { type: 'blur', label: 'Blur BG', css: 'backdrop-blur-sm' },
    { type: 'grayscale', label: 'B&W', css: 'grayscale' },
    { type: 'sepia', label: 'Warm', css: 'sepia' },
    { type: 'brightness', label: 'Bright', css: 'brightness-110 contrast-110' },
  ];

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  // This covers the case where the component re-renders after stream arrives
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isConnected]);

  // Auto-hide controls after 5s
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => setShowControls(false), 5000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  const toggleVideo = () => {
    const next = !isVideoEnabled;
    setIsVideoEnabled(next);
    webrtcToggleVideo(next);
  };

  const toggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    webrtcToggleAudio(next);
  };

  const switchCamera = async () => {
    localStream?.getTracks().forEach(track => track.stop());
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? 'environment' : 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      setIsFrontCamera(prev => !prev);
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
      screenStream.getVideoTracks()[0].onended = stopScreenShare;
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    setIsScreenSharing(false);
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  };

  const handleEndCall = () => {
    webrtcEndCall();
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getFilterClass = () => filters.find(f => f.type === currentFilter)?.css ?? '';

  // ─── Single root div — everything inside one return ──────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black z-50"
      onClick={() => setShowControls(true)}
    >
      {/* ── Remote Video (always mounted so ref is never null) ── */}
      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${remoteStream ? 'block' : 'hidden'}`}
        />

        {/* Placeholder shown while waiting for remote stream */}
        {!remoteStream && (
          <>
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover blur-sm"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center text-white">
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
                    <p className="text-xl font-medium">Connecting...</p>
                  </>
                ) : (
                  <>
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-medium">Waiting for {user.name}...</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      </div>

      {/* ── Connection Status ── */}
      {isConnected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white text-sm">{formatDuration(callDuration)}</span>
          </div>
        </div>
      )}

      {/* ── Local Video PiP ── */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        className={`absolute top-20 right-4 w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-10 ${getFilterClass()}`}
      >
        {isVideoEnabled ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </motion.div>

      {/* ── Top Bar ── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10"
          >
            <div className="flex items-center gap-3">
              {isScreenSharing && (
                <div className="glass px-3 py-2 rounded-full flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-white">Sharing</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="glass rounded-full"
            >
              {isFullscreen
                ? <Minimize2 className="h-5 w-5 text-white" />
                : <Maximize2 className="h-5 w-5 text-white" />}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User Info ── */}
      <div className="absolute bottom-32 left-4 z-10">
        <h2 className="text-2xl font-bold text-white">{user.name}, {user.age}</h2>
        {user.location && <p className="text-white/70">{user.location.city}</p>}
      </div>

      {/* ── Filter Picker ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-40 left-0 right-0 px-4 z-10"
          >
            <div className="glass rounded-2xl p-4">
              <p className="text-white text-sm font-medium mb-3">Filters</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map(filter => (
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

      {/* ── Bottom Controls ── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-10"
          >
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" onClick={switchCamera} className="h-12 w-12 rounded-full glass">
                <RotateCcw className="h-5 w-5 text-white" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(prev => !prev)}
                className={`h-12 w-12 rounded-full ${showFilters ? 'bg-primary' : 'glass'}`}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVideo}
                className={`h-12 w-12 rounded-full ${!isVideoEnabled ? 'bg-destructive' : 'glass'}`}
              >
                {isVideoEnabled
                  ? <Video className="h-5 w-5 text-white" />
                  : <VideoOff className="h-5 w-5 text-white" />}
              </Button>

              {/* End Call */}
              <Button
                onClick={handleEndCall}
                className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90"
              >
                <Phone className="h-6 w-6 text-white rotate-[135deg]" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAudio}
                className={`h-12 w-12 rounded-full ${!isAudioEnabled ? 'bg-destructive' : 'glass'}`}
              >
                {isAudioEnabled
                  ? <Mic className="h-5 w-5 text-white" />
                  : <MicOff className="h-5 w-5 text-white" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className={`h-12 w-12 rounded-full ${isScreenSharing ? 'bg-green-500' : 'glass'}`}
                disabled={!isConnected}
              >
                <Monitor className="h-5 w-5 text-white" />
              </Button>

              <Button variant="ghost" size="icon" onClick={onSwitchToChat} className="h-12 w-12 rounded-full glass">
                <MessageCircle className="h-5 w-5 text-white" />
              </Button>
            </div>

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
    </div>
  );
}