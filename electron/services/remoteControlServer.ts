import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer } from 'ws';

const REMOTE_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Controle Remoto - Teleprompter</title>
  <style>
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #080b16; color: #f7fbff; margin: 0; padding: 16px; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    .grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    button { padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: #5be7c4; color: #0b1021; font-weight: 700; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
    .muted { color: rgba(247,251,255,0.7); font-size: 14px; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Controle remoto</h1>
  <div class="grid">
    <button data-action="togglePlayPause">Reproduzir/Pausar</button>
    <button data-action="speedUp">+ Velocidade</button>
    <button data-action="speedDown">- Velocidade</button>
    <button data-action="nextParagraph">Próximo parágrafo</button>
    <button data-action="prevParagraph">Parágrafo anterior</button>
  </div>
  <p class="muted">Conectado via WebSocket local. Os comandos impactam a instância desktop ativa.</p>
  <script>
    const ws = new WebSocket('ws://' + location.host);
    ws.onopen = () => console.log('Remote control conectado');
    ws.onmessage = (msg) => console.log('Estado:', msg.data);
    document.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        ws.send(JSON.stringify({ type: 'action', action }));
      });
    });
  </script>
</body>
</html>`;

export function createRemoteControlServer(port = 4777, onAction?: (action: string) => void) {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(REMOTE_HTML);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.type === 'action' && payload.action) {
          onAction?.(payload.action);
        }
      } catch (err) {
        console.error('Remote control parse error', err);
      }
    });
  });

  server.listen(port, () => console.log(`[remote-control] ouvindo em http://localhost:${port}`));

  return { server, wss, port };
}
