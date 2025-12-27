import { useEffect, useState } from 'react';
import socketService from '../services/socketService';

export const useSocket = (token: string | null) => {
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    socketService.connect(token);
    setConnected(true);
    setSocketId(socketService.getSocketId() || null);

    socketService.on('connect', () => {
      setConnected(true);
      setSocketId(socketService.getSocketId() || null);
    });

    socketService.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, [token]);

  return { connected, socketId };
};