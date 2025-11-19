import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { format } from 'url';
import { ScriptService } from './services/scriptService';
import { createCollaborationServer } from './services/realtimeServer';
import type { ShortcutConfig, TranscriptionSegment, WordTrimRequest } from '@shared/types';
import { EyeContactStubService } from './services/eyeContactService';
import { StubTranscriptionService } from './services/transcriptionService';
import { VideoEditingService } from './services/videoEditingService';
import { BrollSuggestionService } from './services/brollSuggestionService';
import { ProjectService } from './services/projectService';
import { ProfileConfigService } from './services/profileConfigService';
import { RecordingService } from './services/recordingService';
import { SyncService } from './services/syncService';
import { createRemoteControlServer } from './services/remoteControlServer';
import { LiveStreamingService } from './services/liveStreamingService';
import { SlackClient } from './services/slackClient';
import { NotionClient } from './services/notionClient';
import { TrelloClient } from './services/trelloClient';

const scriptService = new ScriptService();
const eyeContactService = new EyeContactStubService();
const transcriptionService = new StubTranscriptionService();
const videoEditingService = new VideoEditingService();
const brollService = new BrollSuggestionService();
const projectService = new ProjectService();
const profileService = new ProfileConfigService();
const recordingService = new RecordingService();
const syncService = new SyncService();
const liveStreamingService = new LiveStreamingService();
const slackClient = new SlackClient();
const notionClient = new NotionClient();
const trelloClient = new TrelloClient();
const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let remoteControlPort: number | null = null;
let currentShortcuts: ShortcutConfig = {
  togglePlayPause: 'CommandOrControl+Shift+P',
  speedUp: 'CommandOrControl+Shift+Up',
  speedDown: 'CommandOrControl+Shift+Down',
  nextParagraph: 'CommandOrControl+Shift+Right'
};

function createWindow() {
  const preloadFile = isDev ? 'preload.ts' : 'preload.js';

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#00000000',
    vibrancy: 'sidebar',
    webPreferences: {
      preload: path.join(__dirname, preloadFile),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      format({
        pathname: path.join(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  createCollaborationServer();
  registerShortcuts(currentShortcuts);
  const remote = createRemoteControlServer(4777, (action) => {
    if (mainWindow) {
      mainWindow.webContents.send('remote-control-action', action);
    }
  });
  remoteControlPort = remote.port;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle('scripts:list', (_event, projectId?: string) => {
  return scriptService.listScripts(projectId);
});

ipcMain.handle('scripts:save', (_event, payload) => {
  const saved = scriptService.saveScript(payload);
  if (saved.projectId) {
    const project = projectService.getProject(saved.projectId);
    if (project?.syncEnabled) {
      syncService.enqueue(saved.projectId, 'script', saved.id!, saved);
    }
  }
  return saved;
});

ipcMain.handle('scripts:delete', (_event, id: string) => {
  scriptService.deleteScript(id);
});

ipcMain.handle('scripts:get', (_event, id: string) => {
  return scriptService.getScript(id);
});

ipcMain.handle('projects:list', () => {
  return projectService.listProjects();
});

ipcMain.handle('projects:save', (_event, payload) => {
  const saved = projectService.saveProject(payload);
  if (saved.syncEnabled) {
    syncService.enqueue(saved.id!, 'project', saved.id!, saved);
  }
  return saved;
});

ipcMain.handle('projects:delete', (_event, id: string) => {
  projectService.deleteProject(id);
});

ipcMain.handle('profiles:list', (_event, projectId?: string) => {
  return profileService.list(projectId);
});

ipcMain.handle('profiles:save', (_event, payload) => {
  const saved = profileService.save(payload);
  if (saved.projectId) {
    const project = projectService.getProject(saved.projectId);
    if (project?.syncEnabled) {
      syncService.enqueue(saved.projectId, 'profile', saved.id!, saved);
    }
  }
  return saved;
});

ipcMain.handle('recordings:list', (_event, projectId?: string) => {
  return recordingService.list(projectId);
});

ipcMain.handle('recordings:save', (_event, payload) => {
  const saved = recordingService.save(payload);
  if (saved.projectId) {
    const project = projectService.getProject(saved.projectId);
    if (project?.syncEnabled) {
      syncService.enqueue(saved.projectId, 'recording', saved.id!, saved);
    }
  }
  return saved;
});

ipcMain.handle('sync:list', (_event, projectId?: string) => {
  return syncService.list(projectId);
});

ipcMain.handle('sync:mark', (_event, id: string) => {
  syncService.markSynced(id);
});

ipcMain.handle('sync:process', (_event, projectId?: string) => {
  return syncService.processPending(projectId);
});

ipcMain.handle('streams:list', (_event, projectId?: string) => {
  return liveStreamingService.list(projectId);
});

ipcMain.handle('streams:save', (_event, payload) => {
  return liveStreamingService.save(payload);
});

ipcMain.handle('streams:delete', (_event, id: string) => {
  liveStreamingService.delete(id);
});

ipcMain.handle('streams:start', (_event, configId: string) => {
  return liveStreamingService.startStreaming(configId);
});

ipcMain.handle('streams:stop', (_event, sessionId: string) => {
  return liveStreamingService.stopStreaming(sessionId);
});

ipcMain.handle('share:slack', (_event, payload) => slackClient.sendMessage(payload));
ipcMain.handle('share:notion', (_event, payload) => notionClient.createPage(payload));
ipcMain.handle('share:trello', (_event, payload) => trelloClient.createCard(payload));

ipcMain.handle('remote:info', () => ({ port: remoteControlPort }));

ipcMain.handle('overlay:update', (_event, payload: { alwaysOnTop: boolean; opacity: number }) => {
  if (!mainWindow) return;
  mainWindow.setAlwaysOnTop(payload.alwaysOnTop, 'screen-saver');
  mainWindow.setOpacity(payload.opacity);
});

const ensureMediaFolder = async () => {
  const base = path.join(app.getPath('videos'), 'teleprompter-ai');
  await fs.mkdir(base, { recursive: true });
  return base;
};

ipcMain.handle('media:save-buffer', async (_event, payload: { data: ArrayBuffer; extension: string; prefix?: string }) => {
  const base = await ensureMediaFolder();
  const filename = `${payload.prefix || 'capture'}-${Date.now()}.${payload.extension.replace('.', '')}`;
  const filePath = path.join(base, filename);
  await fs.writeFile(filePath, Buffer.from(payload.data));
  return filePath;
});

ipcMain.handle('video:apply-eye-contact', async (_event, videoPath: string) => {
  return eyeContactService.applyCorrection(videoPath);
});

ipcMain.handle('video:transcribe', async (_event, mediaPath: string, language: string) => {
  return transcriptionService.transcribe(mediaPath, language);
});

ipcMain.handle('video:wordtrim', async (_event, request: WordTrimRequest) => {
  return videoEditingService.trimByText(request);
});

ipcMain.handle('video:mix', async (
  _event,
  payload: { sourcePath: string; watermark?: { text?: string; imagePath?: string; position?: string }; audio?: { audioPath: string; volume: number } }
) => {
  return videoEditingService.addWatermarkAndAudio(payload.sourcePath, payload.watermark, payload.audio);
});

ipcMain.handle('video:export-vertical', async (_event, payload: { sourcePath: string; start: number; end: number }) => {
  return videoEditingService.exportVerticalClip(payload.sourcePath, payload.start, payload.end);
});

ipcMain.handle('broll:suggest', (_event, script: string) => {
  return brollService.suggest(script);
});

ipcMain.handle('shorts:suggest', (_event, segments: TranscriptionSegment[]) => {
  return videoEditingService.suggestShorts(segments);
});

function registerShortcuts(shortcuts: ShortcutConfig) {
  globalShortcut.unregisterAll();
  currentShortcuts = shortcuts;

  Object.entries(shortcuts).forEach(([action, accelerator]) => {
    if (!accelerator) return;
    const success = globalShortcut.register(accelerator, () => {
      if (mainWindow) {
        mainWindow.webContents.send('shortcut-action', action);
      }
    });

    if (!success) {
      console.warn(`Não foi possível registrar atalho para ${action} (${accelerator})`);
    }
  });
}

ipcMain.handle('shortcuts:register', (_event, shortcuts: ShortcutConfig) => {
  registerShortcuts(shortcuts);
});
