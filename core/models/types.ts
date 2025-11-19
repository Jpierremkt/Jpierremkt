export interface ProjectPayload {
  id?: string;
  name: string;
  description?: string;
  syncEnabled?: boolean;
  syncProvider?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileConfig {
  id?: string;
  projectId?: string;
  name: string;
  baseSpeed: number;
  theme: 'light' | 'dark' | 'custom';
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  overlayPosition: 'top' | 'middle' | 'bottom';
  overlayOpacity: number;
  recordingPreferences?: string;
  createdAt?: string;
}

export interface ScriptPayload {
  id?: string;
  title: string;
  content: string;
  projectId?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface RecordingPayload {
  id?: string;
  projectId?: string;
  scriptId?: string;
  filePath: string;
  durationSeconds: number;
  createdAt?: string;
  notes?: string;
}

export interface SyncChange {
  id: string;
  projectId: string;
  entityType: 'project' | 'script' | 'recording' | 'profile';
  entityId: string;
  payload: any;
  status: 'pending' | 'synced';
  createdAt: string;
}

export interface RealTimePatch {
  scriptId: string;
  content: string;
  author: string;
  timestamp: number;
}

export type ShortcutAction = 'togglePlayPause' | 'speedUp' | 'speedDown' | 'nextParagraph';

export type ShortcutConfig = Record<ShortcutAction, string>;

export interface TranscriptionSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  language?: string;
}

export interface WordTrimRequest {
  sourcePath: string;
  segments: TranscriptionSegment[];
  mode: 'remove' | 'keep';
}

export interface ShortSuggestion {
  id: string;
  start: number;
  end: number;
  reason: string;
  aspectRatio?: '9:16' | '1:1' | '16:9';
}

export interface BrollSuggestion {
  keyword: string;
  clipPath: string;
  confidence: number;
}

export interface RhythmPoint {
  time: number;
  wpm: number;
  label?: string;
}

export interface PerformanceReport {
  totalTimeSeconds: number;
  averageWpm: number;
  pauseCount: number;
  pauseMoments: number[];
  fastSegments: { id: string; text: string; wpm: number; start: number; end: number }[];
  longSentences: string[];
  exclamationCount: number;
  notes: string[];
  rhythmSeries: RhythmPoint[];
}

export interface LiveStreamConfig {
  id?: string;
  projectId?: string;
  platform: 'YouTube' | 'Facebook' | 'Instagram' | 'Custom';
  rtmpUrl: string;
  streamKey: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiveStreamSession {
  id: string;
  configId: string;
  startedAt: string;
  status: 'live' | 'stopped';
  outputEndpoint: string;
}

export interface SharePayload {
  projectId?: string;
  scriptId?: string;
  recordingId?: string;
  title: string;
  summary: string;
  link?: string;
  channel?: string;
}

export interface ShareResult {
  provider: 'slack' | 'notion' | 'trello';
  ok: boolean;
  message: string;
  payload: SharePayload;
}
