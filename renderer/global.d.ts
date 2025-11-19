import type {
  LiveStreamConfig,
  LiveStreamSession,
  ProfileConfig,
  ProjectPayload,
  RecordingPayload,
  ScriptPayload,
  SharePayload,
  ShareResult,
  ShortcutConfig,
  SyncChange
} from '@shared/types';

declare global {
  interface Window {
    electronAPI: {
      listScripts: () => Promise<any[]>;
      saveScript: (payload: ScriptPayload) => Promise<any>;
      deleteScript: (id: string) => Promise<void>;
      getScript: (id: string) => Promise<any>;
      listProjects: () => Promise<ProjectPayload[]>;
      saveProject: (payload: ProjectPayload) => Promise<ProjectPayload>;
      deleteProject: (id: string) => Promise<void>;
      listProfiles: (projectId?: string) => Promise<ProfileConfig[]>;
      saveProfile: (payload: ProfileConfig) => Promise<ProfileConfig>;
      listRecordings: (projectId?: string) => Promise<RecordingPayload[]>;
      saveRecording: (payload: RecordingPayload) => Promise<RecordingPayload>;
      listSyncQueue: (projectId?: string) => Promise<SyncChange[]>;
      markSynced: (id: string) => Promise<void>;
      processSyncQueue: (projectId?: string) => Promise<{ processed: number; processedAt: string }>;
      listStreamConfigs: (projectId?: string) => Promise<LiveStreamConfig[]>;
      saveStreamConfig: (payload: LiveStreamConfig) => Promise<LiveStreamConfig>;
      deleteStreamConfig: (id: string) => Promise<void>;
      startStreaming: (configId: string) => Promise<LiveStreamSession>;
      stopStreaming: (sessionId: string) => Promise<LiveStreamSession>;
      sendToSlack: (payload: SharePayload) => Promise<ShareResult>;
      sendToNotion: (payload: SharePayload) => Promise<ShareResult>;
      sendToTrello: (payload: SharePayload) => Promise<ShareResult>;
      getRemoteInfo: () => Promise<{ port: number | null }>;
      updateOverlay: (payload: { alwaysOnTop: boolean; opacity: number }) => Promise<void>;
      registerShortcuts: (payload: ShortcutConfig) => Promise<void>;
      onShortcutAction: (callback: (action: string) => void) => void;
      onRemoteAction: (callback: (action: string) => void) => void;
      saveMediaBuffer: (payload: { data: ArrayBuffer; extension: string; prefix?: string }) => Promise<string>;
      applyEyeContact: (videoPath: string) => Promise<string>;
      transcribeVideo: (videoPath: string, language: string) => Promise<any>;
      wordTrim: (payload: any) => Promise<string>;
      mixVideo: (payload: any) => Promise<string>;
      exportVertical: (payload: any) => Promise<string>;
      suggestBroll: (script: string) => Promise<any>;
      suggestShorts: (segments: any) => Promise<any>;
    };
  }
}

export {};
