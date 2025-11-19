import { useEffect, useRef } from 'react';
import { RealTimePatch } from '@shared/types';

export function useRealtimeCollaboration(scriptId: string, onPatch: (patch: RealTimePatch) => void) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!scriptId) return;

    const socket = new WebSocket('ws://localhost:4455');
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const patch: RealTimePatch = JSON.parse(event.data);
        if (patch.scriptId === scriptId) {
          onPatch(patch);
        }
      } catch (error) {
        console.error('Erro ao processar patch recebido', error);
      }
    };

    return () => {
      socket.close();
    };
  }, [scriptId, onPatch]);

  const broadcast = (patch: RealTimePatch) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(patch));
    }
  };

  return { broadcast };
}
