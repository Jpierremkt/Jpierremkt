# Teleprompter IA para criadores

App desktop multiplataforma em Electron + React + TypeScript, focado em apresentadores e equipes de marketing que precisam de roteiros dinâmicos, colaboração e integrações de IA.

## Principais decisões de arquitetura
- **Electron + Vite + styled-components**: separação clara entre processo `main` (Node) e renderer (React). Vite gera o bundle da UI em `dist/renderer` e o processo principal é compilado via `tsc` para `dist/electron`.
- **Persistência local com SQLite (better-sqlite3)**: scripts são gravados em `teleprompter.db` e expostos ao renderer via IPC seguro (`window.electronAPI`).
- **Realtime interno com WebSocket**: `electron/services/realtimeServer.ts` cria um servidor WebSocket local para simular múltiplas instâncias colaborando na mesma sala.
- **Abstrações de IA e nuvem**: stubs para transcrição (`AiTranscriptionService`), correção de eye contact e storage em Google Drive/OneDrive. Comentários indicam onde plugar APIs reais (Whisper, AssemblyAI, etc.).
- **VoiceTrack modular**: o hook `useVoiceControl` encapsula a Web Speech API para alternar facilmente para outro engine (local ou cloud) mantendo os comandos de voz isolados em `commandParser.ts`.

## Como rodar
1. Instale dependências: `npm install`.
2. Ambiente de desenvolvimento com hot reload do React e Electron: `npm run dev` (abre a UI em http://localhost:5173, o Electron espera o Vite subir).
3. Build de produção: `npm run build` (gera `dist/electron` e `dist/renderer`). Para rodar o build: `npm start` após o build.

> No modo dev o preload é carregado via `ts-node/register`. Em produção, use o output de `tsc` (`dist/electron/preload.js`).

### Teste rápido com dados de demonstração
Para abrir o software já com um projeto de exemplo pronto para testes:

1. Instale dependências: `npm install`.
2. Popule o banco local com o projeto “Demo Studio”: `npm run seed:demo` (cria o arquivo `electron/teleprompter.db`).
3. Suba o app: `npm run dev` e selecione o projeto "Demo Studio" para testar teleprompter, overlay e painel de gravações.

### Principais arquivos do esqueleto
- `package.json`: scripts de dev/build e dependências compartilhadas.
- `electron/main.ts`: cria a janela principal/overlay, expõe IPCs para CRUD, gravação, streaming, sync e integrações stub.
- `electron/preload.ts`: registra a API segura (`window.electronAPI`) consumida pelo React.
- `renderer/`: app React com Vite. `renderer/src/App.tsx` concentra o fluxo principal; componentes e hooks ficam em `renderer/src/hooks` e `renderer/src/services`.
- `core/`: modelos e contratos TypeScript compartilhados (`core/models`, `core/services/contracts.ts`).

## Arquitetura e estrutura de pastas
- `electron/`: processo principal do Electron (janelas, overlay, integrações nativas, ffmpeg/RTMP) e serviços que interagem com o SO. Build em `dist/electron`.
- `renderer/`: app React com Vite + TypeScript (UI, editor, teleprompter, painel de performance, onboarding). Build em `dist/renderer`.
- `core/`: contratos e modelos compartilhados (`core/models`) e re-export em `core/types.ts` para facilitar o consumo via alias `@shared`.
- `core/services` (interfaces) e `core/storage` ficam disponíveis para futuras migrações; serviços concretos rodam hoje em `electron/services` mas seguem as interfaces expostas.

### Passos de implementação (checklist)
- PASSO 1: README com visão geral, stack e scripts → entregue neste arquivo.
- PASSO 2: estrutura mínima Electron + React + TypeScript separada em `electron/` e `renderer/`.
- PASSO 3: gestão de projetos + scripts e teleprompter básico com editor integrado.
- PASSO 4: VoiceTrack e comandos de voz modulares (hook + parser separado).
- PASSO 5: gravação de vídeo + legendas automáticas (stub de transcrição) com preview.
- PASSO 6: WordTrim (corte por texto) com pipeline de transcrição → ffmpeg (stub).
- PASSO 7: overlay avançado, perfis e controle remoto via WebSocket/HTTP local.
- PASSO 8: painel de performance e relatórios de ritmo/entoação.
- PASSO 9: stubs de integrações (RTMP, Slack, Notion, Trello) e tela de configurações/backup.

### Evolução etapa a etapa (o que foi adicionado)
- **Passo 1–2 (esqueleto)**: `package.json`, Vite + Electron configurados, aliases TypeScript (`@shared`), preload seguro e `.gitignore` preparados.
- **Passo 3 (base funcional)**: tela de projetos com CRUD, editor de scripts, teleprompter simples com rolagem manual via botões e destaque de parágrafo.
- **Passo 4**: VoiceTrack/atalhos/controle remoto via WebSocket com parser de comandos separado (`renderer/src/services/commandParser.ts`).
- **Passo 5**: captura de vídeo até 4K, geração de legendas multi-idioma (stub `transcriptionService`), export `.srt/.vtt` e aplicação opcional de correção de olhar.
- **Passo 6**: WordTrim (corte por texto) mapeando trechos da transcrição em intervals de tempo (ffmpeg stub em `electron/services/videoEditingService.ts`).
- **Passo 7**: overlay avançado (transparência, espelhado, sempre-on-top), perfis de teleprompter, controle remoto local e sync conceitual por fila.
- **Passo 8**: painel de performance com avatar de ensaio (TTS stub), gráfico de ritmo, dicas automáticas e notas pós-gravação.
- **Passo 9**: streaming RTMP (config/start/stop) e compartilhamento em Slack/Notion/Trello via adaptadores simulados; tela de backup/online-offline.

## Funcionalidades entregues
- Organização por projetos com scripts, gravações e perfis de teleprompter persistidos em SQLite.
- Teleprompter com destaque de parágrafo ativo, VoiceTrack (play/pause, avanço/retrocesso por voz) e pausa automática após silêncio.
- Overlay flutuante sempre no topo com modo espelhado, transparência ajustável, controles de fonte/cores/alinhamento e barra de progresso com tempo restante estimado.
- Editor embutido com botões de navegação de parágrafo e simulação de colaboração em tempo real via WebSocket.
- Importação de `.txt` (docx/pdf com stub para integração de parser) e exportação rápida para `.txt`/`.pdf` (stub).
- Stubs para integração de IA (transcrição, eye contact) e armazenamento em nuvem (Google Drive/OneDrive) com pontos de extensão bem marcados, incluindo fila de sync conceitual e provedores plugáveis.
- Módulo de captura até 4K (MediaDevices + MediaRecorder) com preview, seleção de câmera/mic, correção de olhar pós-processada (stub), geração de legendas multi-idioma, exportação `.srt/.vtt`, cortes por texto (WordTrim com ffmpeg/fluent-ffmpeg), trilha/marca d’água/B-roll stub e exportação de shorts 9:16 sugeridos automaticamente.
- Painel de performance do apresentador com avatares de ensaio (TTS stub), sugestões de pausa/ênfase e relatório automático de ritmo, pausas e trechos acelerados após cada gravação transcrita.
- Modo Remote Control via HTTP/WebSocket local (página pronta para celular/tablet) e edição remota de scripts na mesma sala de colaboração.
- Live streaming RTMP (YouTube/Facebook/Instagram/custom) com configs por projeto, start/stop simulado e integração conceitual de ffmpeg/RTMP server. Inclui painel de compartilhamento para Slack/Notion/Trello com adaptadores stub e logs claros do payload.
- Personalização e acessibilidade: temas claro/escuro/alto contraste, modo daltônico-friendly, ajustes de line-height/margens, navegação por teclado/atalhos, tour guiado para primeiros passos e indicador offline/backup automático da fila de sync.

## Próximos passos sugeridos
- Trocar Web Speech API por um provider robusto (Whisper Streaming, Deepgram) implementando `AiTranscriptionService`.
- Implementar autenticação OAuth nas classes de cloud storage e mapping para download/upload real.
- Substituir o stub de PDF por geração via `pdfkit` ou exportação do próprio Electron (printToPDF).
- Adicionar testes automatizados e lint.
