import type { WebSocketServer } from 'ws';
import type { RealTimePatch } from '@shared/types';

let server: WebSocketServer | null = null;

export function createCollaborationServer(port = 4455) {
  if (server) return server;
  server = new WebSocketServer({ port });

  server.on('connection', (socket) => {
    socket.on('message', (data) => {
      try {
        const patch: RealTimePatch = JSON.parse(data.toString());
        server?.clients.forEach((client) => {
          if (client !== socket && client.readyState === client.OPEN) {
            client.send(JSON.stringify(patch));
          }
        });
      } catch (error) {
        console.error('Erro ao processar patch', error);
      }
    });
  });

  return server;
}
