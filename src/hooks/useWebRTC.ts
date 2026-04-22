// src/hooks/useWebRTC.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import SocketService from '@/services/SocketService';

interface UseWebRTCProps {
  conversationId: string;
  isInitiator: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
}

const ICE_SERVERS = {
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
  onCallEnded,
}: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const hasStarted = useRef(false); // FIX 3: prevents multiple startCall() fires

  // ─── Stable refs for latest handler functions (FIX 1) ───────────────────────
  const answerCallRef = useRef<((offer: RTCSessionDescriptionInit) => Promise<void>) | null>(null);
  const handleAnswerRef = useRef<((answer: RTCSessionDescriptionInit) => Promise<void>) | null>(null);
  const handleICECandidateRef = useRef<((candidate: RTCIceCandidateInit) => Promise<void>) | null>(null);
  const endCallRef = useRef<(() => void) | null>(null);

  // ─── Get local media ─────────────────────────────────────────────────────────
  const initializeLocalStream = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    setLocalStream(stream);
    return stream;
  }, []);

  // ─── Create RTCPeerConnection ─────────────────────────────────────────────────
  const createPeerConnection = useCallback((stream: MediaStream): RTCPeerConnection => {
    // Close any existing connection first
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks BEFORE creating offer/answer
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate');
        SocketService.sendICECandidate(conversationId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log('📹 Received remote track');
      const [remote] = event.streams;
      setRemoteStream(remote);
      onRemoteStream?.(remote);
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState);
    };

    peerConnection.current = pc;
    return pc;
  }, [conversationId, onRemoteStream]);

  // ─── Initiator: create and send offer ────────────────────────────────────────
  const startCall = useCallback(async () => {
    console.log('🚨 startCall fired, pc exists:', !!peerConnection.current);
    try {
      setIsConnecting(true);
      console.log('📞 Starting call as initiator');

      const stream = await initializeLocalStream();
      const pc = createPeerConnection(stream);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      SocketService.sendWebRTCOffer(conversationId, offer);

      console.log('✅ Offer sent');
    } catch (error) {
      console.error('❌ Error starting call:', error);
      setIsConnecting(false);
      hasStarted.current = false; // allow retry on error
    }
  }, [conversationId, initializeLocalStream, createPeerConnection]); // FIX 3: removed isInitiator & isConnecting

  // ─── Receiver: answer incoming offer ─────────────────────────────────────────
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      setIsConnecting(true);
      console.log('📞 Answering call');

      const stream = await initializeLocalStream();
      const pc = createPeerConnection(stream);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush buffered ICE candidates now that remote description is set
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      SocketService.sendWebRTCAnswer(conversationId, answer);

      console.log('✅ Answer sent');
    } catch (error) {
      console.error('❌ Error answering call:', error);
      setIsConnecting(false);
    }
  }, [conversationId, initializeLocalStream, createPeerConnection]);

  // ─── Initiator: handle incoming answer ───────────────────────────────────────
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnection.current;
      if (!pc) {
        console.error('❌ No peer connection when answer arrived');
        return;
      }
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('⚠️ Unexpected signaling state for answer:', pc.signalingState);
        return;
      }

      console.log('📹 Handling answer');
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Flush buffered ICE candidates
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      console.log('✅ Remote description set from answer');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  }, []);

  // ─── Both: handle incoming ICE candidate ─────────────────────────────────────
  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnection.current;
      // FIX 2: safer check — remoteDescription.type must exist
      if (pc && pc.remoteDescription?.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🧊 ICE candidate added');
      } else {
        console.log('🧊 Buffering ICE candidate (no remote desc yet)');
        pendingCandidates.current.push(candidate);
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }, []);

  // ─── End call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log('📞 Ending call');

    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());

    peerConnection.current?.close();
    peerConnection.current = null;

    SocketService.endVideoCall(conversationId);

    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);
    hasStarted.current = false;
  }, [localStream, remoteStream, conversationId]);

  // ─── Keep refs in sync with latest functions (FIX 1) ─────────────────────────
  useEffect(() => { answerCallRef.current = answerCall; }, [answerCall]);
  useEffect(() => { handleAnswerRef.current = handleAnswer; }, [handleAnswer]);
  useEffect(() => { handleICECandidateRef.current = handleICECandidate; }, [handleICECandidate]);
  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  // ─── Register socket listeners ONCE with stable wrappers (FIX 1) ─────────────
  useEffect(() => {
    SocketService.onWebRTCOffer(({ offer }) => {
      console.log('📹 Received offer, answering call');
      answerCallRef.current?.(offer);
    });

    SocketService.onWebRTCAnswer(({ answer }) => {
      console.log('📹 Received answer');
      handleAnswerRef.current?.(answer);
    });

    SocketService.onICECandidate(({ candidate }) => {
      handleICECandidateRef.current?.(candidate);
    });

    SocketService.onCallEnded(() => {
      console.log('📞 Call ended by peer');
      endCallRef.current?.();
      onCallEnded?.();
    });

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
  }, []); // ← intentionally empty: register once, use refs for latest functions

  // ─── Auto-start for initiator — runs ONCE on mount (FIX 3) ───────────────────
  useEffect(() => {
    if (isInitiator && !hasStarted.current) {
      hasStarted.current = true;
      console.log('🎬 Initiator starting call');
      startCall();
    }
  }, []); // ← intentionally empty: isInitiator won't change after mount

  // ─── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      remoteStream?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
      peerConnection.current = null;
    };
  }, []); // ← intentionally empty: cleanup uses refs, not state

  // ─── Toggle video ─────────────────────────────────────────────────────────────
  const toggleVideo = useCallback((enabled: boolean) => {
    localStream?.getVideoTracks().forEach(track => { track.enabled = enabled; });
    SocketService.toggleMediaState(conversationId, 'video', enabled);
  }, [localStream, conversationId]);

  // ─── Toggle audio ─────────────────────────────────────────────────────────────
  const toggleAudio = useCallback((enabled: boolean) => {
    localStream?.getAudioTracks().forEach(track => { track.enabled = enabled; });
    SocketService.toggleMediaState(conversationId, 'audio', enabled);
  }, [localStream, conversationId]);

  return {
    localStream,
    remoteStream,
    isConnected,
    isConnecting,
    toggleVideo,
    toggleAudio,
    endCall,
    startCall,
  };
};