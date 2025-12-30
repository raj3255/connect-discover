// src/hooks/useWebRTC.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import SocketService from '@/services/SocketService';

interface UseWebRTCProps {
  conversationId: string;
  isInitiator: boolean; // true if this user started the call
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
}

// STUN servers for NAT traversal
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export const useWebRTC = ({ 
  conversationId, 
  isInitiator,
  onRemoteStream,
  onCallEnded 
}: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((stream: MediaStream) => {
    try {
      const pc = new RTCPeerConnection(iceServers);
      
      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          SocketService.sendICECandidate(conversationId, event.candidate);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('📹 Received remote track');
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        onRemoteStream?.(remoteStream);
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (pc.connectionState === 'disconnected' || 
                   pc.connectionState === 'failed' || 
                   pc.connectionState === 'closed') {
          setIsConnected(false);
          setIsConnecting(false);
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
      };

      peerConnection.current = pc;
      return pc;
    } catch (error) {
      console.error('❌ Error creating peer connection:', error);
      throw error;
    }
  }, [conversationId, onRemoteStream]);

  // Start call (initiator creates offer)
  const startCall = useCallback(async () => {
    if (!isInitiator || isConnecting) return;

    try {
      setIsConnecting(true);
      console.log('📞 Starting call as initiator');

      const stream = await initializeLocalStream();
      const pc = createPeerConnection(stream);

      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      SocketService.sendWebRTCOffer(conversationId, offer);
      
      console.log('✅ Offer sent');
    } catch (error) {
      console.error('❌ Error starting call:', error);
      setIsConnecting(false);
    }
  }, [isInitiator, isConnecting, conversationId, initializeLocalStream, createPeerConnection]);

  // Answer call (receiver creates answer)
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (isInitiator) return;

    try {
      setIsConnecting(true);
      console.log('📞 Answering call');

      const stream = await initializeLocalStream();
      const pc = createPeerConnection(stream);

      // Set remote description (the offer)
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Add any pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidates.current = [];

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      SocketService.sendWebRTCAnswer(conversationId, answer);
      
      console.log('✅ Answer sent');
    } catch (error) {
      console.error('❌ Error answering call:', error);
      setIsConnecting(false);
    }
  }, [isInitiator, conversationId, initializeLocalStream, createPeerConnection]);

  // Handle incoming answer (initiator receives answer)
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      console.log('📹 Received answer');
      
      if (peerConnection.current && peerConnection.current.signalingState !== 'stable') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Add any pending ICE candidates
        for (const candidate of pendingCandidates.current) {
          await peerConnection.current.addIceCandidate(candidate);
        }
        pendingCandidates.current = [];
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleICECandidate = useCallback(async (candidate: RTCIceCandidate) => {
    try {
      console.log('🧊 Received ICE candidate');
      
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Store candidate for later if remote description not set yet
        pendingCandidates.current.push(candidate);
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }, []);

  // Toggle local video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      SocketService.toggleMediaState(conversationId, 'video', enabled);
    }
  }, [localStream, conversationId]);

  // Toggle local audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      SocketService.toggleMediaState(conversationId, 'audio', enabled);
    }
  }, [localStream, conversationId]);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 Ending call');
    
    // Stop all tracks
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    
    // Close peer connection
    peerConnection.current?.close();
    peerConnection.current = null;
    
    // Notify peer
    SocketService.endVideoCall(conversationId);
    
    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);
  }, [localStream, remoteStream, conversationId]);

  // Setup socket listeners
  useEffect(() => {
    // Listen for offer (receiver)
    SocketService.onWebRTCOffer(({ offer }) => {
      console.log('📹 Received offer, answering call');
      answerCall(offer);
    });

    // Listen for answer (initiator)
    SocketService.onWebRTCAnswer(({ answer }) => {
      console.log('📹 Received answer');
      handleAnswer(answer);
    });

    // Listen for ICE candidates
    SocketService.onICECandidate(({ candidate }) => {
      handleICECandidate(candidate);
    });

    // Listen for call ended
    SocketService.onCallEnded(() => {
      console.log('📞 Call ended by peer');
      endCall();
      onCallEnded?.();
    });

    // Listen for peer media toggle
    SocketService.onMediaToggle(({ type, enabled }) => {
      console.log(`🎥 Peer toggled ${type} to ${enabled ? 'on' : 'off'}`);
    });

    return () => {
      SocketService.off('webrtc:offer');
      SocketService.off('webrtc:answer');
      SocketService.off('webrtc:ice-candidate');
      SocketService.off('webrtc:call-ended');
      SocketService.off('webrtc:media-toggle');
    };
  }, [answerCall, handleAnswer, handleICECandidate, endCall, onCallEnded]);

  // Auto-start call if initiator - ONLY when explicitly requested
  useEffect(() => {
    if (isInitiator && !localStream && !isConnecting) {
      console.log('🎬 Initiator starting call');
      startCall();
    }
  }, [isInitiator, localStream, isConnecting, startCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    localStream,
    remoteStream,
    isConnected,
    isConnecting,
    toggleVideo,
    toggleAudio,
    endCall,
    startCall
  };
};