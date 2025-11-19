import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useVoiceControl } from './hooks/useVoiceControl';
import {
  BrollSuggestion,
  ProfileConfig,
  ProjectPayload,
  RecordingPayload,
  PerformanceReport,
  RealTimePatch,
  RhythmPoint,
  ScriptPayload,
  ShortcutConfig,
  SyncChange,
  ShortSuggestion,
  TranscriptionSegment,
  LiveStreamConfig,
  LiveStreamSession,
  ShareResult
} from '@shared/types';
import { useRealtimeCollaboration } from './services/realtimeClient';
import { v4 as uuid } from 'uuid';

type ThemePalette = {
  background: string;
  surface: string;
  text: string;
  border: string;
  accent: string;
  muted: string;
  gradient: string;
};

const GlobalStyle = createGlobalStyle<{ palette: ThemePalette }>`
  :root {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --bg: ${({ palette }) => palette.background};
    --surface: ${({ palette }) => palette.surface};
    --text: ${({ palette }) => palette.text};
    --border: ${({ palette }) => palette.border};
    --accent: ${({ palette }) => palette.accent};
    --muted: ${({ palette }) => palette.muted};
  }
  body {
    margin: 0;
    background: ${({ palette }) => palette.gradient};
    color: ${({ palette }) => palette.text};
  }
`;

const Layout = styled.div<{ overlayMode: boolean }>`
  display: grid;
  grid-template-columns: ${({ overlayMode }) => (overlayMode ? '1fr' : '320px 1fr')};
  height: 100vh;
  background: var(--bg);
`;

const Sidebar = styled.aside`
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px;
  overflow: auto;
`;

const Main = styled.main<{ overlayMode: boolean }>`
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: ${({ overlayMode }) => (overlayMode ? '12px' : '24px')};
  gap: 16px;
`;

const SectionCard = styled.section`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
`;

const ChromeButtons = styled.div`
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
`;

const ChromeDot = styled.span<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  background: ${({ color }) => color};
`;

const Teleprompter = styled.div<{
  overlayMode: boolean;
  background: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'flex-start' | 'center' | 'flex-end';
  mirrored: boolean;
}>`
  height: 340px;
  overflow: auto;
  padding: 16px;
  border-radius: ${({ overlayMode }) => (overlayMode ? '8px' : '12px')};
  background: ${({ background }) => background};
  border: 1px solid var(--border);
  transform: ${({ mirrored }) => (mirrored ? 'scaleX(-1)' : 'none')};
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: ${({ verticalAlign }) => verticalAlign};
  text-align: ${({ align }) => align};
`;

const Paragraph = styled.p<{
  active: boolean;
  textColor: string;
  activeColor: string;
  fontSize: number;
  lineHeight: number;
  spacing: number;
}>`
  font-size: ${({ fontSize }) => fontSize}px;
  line-height: ${({ lineHeight }) => lineHeight};
  margin: ${({ spacing }) => spacing}px 0;
  color: ${({ active, textColor, activeColor }) => (active ? activeColor : textColor)};
  transition: color 0.3s, transform 0.3s;
  transform: ${({ active }) => (active ? 'translateX(4px)' : 'none')};
`;

const Button = styled.button<{ variant?: 'primary' | 'ghost' }>`
  background: ${({ variant }) => (variant === 'ghost' ? 'transparent' : 'var(--accent)')};
  color: ${({ variant }) => (variant === 'ghost' ? 'var(--text)' : '#0b1021')};
  border: 1px solid var(--border);
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(91, 231, 196, 0.18);
  }
`;

const ScriptCard = styled.div<{ active: boolean }>`
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  border: 1px solid ${({ active }) => (active ? 'var(--accent)' : 'var(--border)')};
  background: ${({ active }) => (active ? 'rgba(126, 240, 255, 0.12)' : 'rgba(255,255,255,0.02)')};
`;

const Editor = styled.textarea`
  width: 100%;
  min-height: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  color: var(--text);
  font-size: 16px;
`;

const StatusPill = styled.span<{ state: string }>`
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ state }) => (state === 'gravando' ? 'var(--accent)' : '#ffa62b')};
  color: #0b1021;
  font-weight: 700;
`;

const StatusDot = styled.span<{ online: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ online }) => (online ? '#22c55e' : '#f87171')};
  display: inline-block;
  margin-right: 8px;
`;

const TutorialOverlay = styled.div`
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 30;
  max-width: 360px;
`;

const TutorialCard = styled.div`
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

const ControlRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ value: number }>`
  width: ${({ value }) => Math.min(100, Math.max(0, value))}%;
  height: 100%;
  background: linear-gradient(90deg, #5be7c4 0%, #61e4ff 100%);
  transition: width 0.25s ease;
`;

const InlineField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
`;

const NoDrag = styled.div`
  -webkit-app-region: no-drag;
`;

const Subtle = styled.small`
  color: rgba(247, 250, 255, 0.7);
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const RhythmChart = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  height: 140px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
`;

const RhythmBar = styled.div<{ value: number }>`
  flex: 1;
  height: ${({ value }) => Math.max(6, value)}%;
  background: linear-gradient(180deg, #5be7c4 0%, #4ad1ff 100%);
  border-radius: 8px 8px 4px 4px;
  position: relative;
  min-width: 8px;
  transition: height 0.25s ease;
  &::after {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    background: #f8fbff;
    border-radius: 50%;
    opacity: 0.8;
  }
`;

const NoteBox = styled.div`
  background: rgba(91, 231, 196, 0.08);
  border: 1px solid rgba(91, 231, 196, 0.25);
  border-radius: 12px;
  padding: 12px;
  color: #eafff7;
`;

const AvatarBubble = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const VideoPreview = styled.video`
  width: 100%;
  max-height: 260px;
  background: #000;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Pill = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(91, 231, 196, 0.15);
  border: 1px solid rgba(91, 231, 196, 0.4);
  font-weight: 700;
  color: #5be7c4;
`;

interface ScriptRecord extends ScriptPayload {
  id: string;
}

const initialScript: ScriptPayload = {
  title: 'Roteiro de demonstração',
  content: 'Bem-vindo ao Teleprompter IA.\n\n[CENA 1] Apresente a pauta do dia com energia.\n\n[CORTE] Destaque a oferta especial e convide o público para se inscrever.',
  id: undefined
};

function App() {
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [currentScript, setCurrentScript] = useState<ScriptRecord | ScriptPayload>(initialScript);
  const [projects, setProjects] = useState<ProjectPayload[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [profiles, setProfiles] = useState<ProfileConfig[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined);
  const [profileName, setProfileName] = useState('Ao vivo');
  const [experienceMode, setExperienceMode] = useState<'beginner' | 'advanced'>('advanced');
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'highContrast'>('dark');
  const [colorBlindFriendly, setColorBlindFriendly] = useState(false);
  const [recordings, setRecordings] = useState<RecordingPayload[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncChange[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [backupStatus, setBackupStatus] = useState('');
  const [remotePort, setRemotePort] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [streamConfigs, setStreamConfigs] = useState<LiveStreamConfig[]>([]);
  const [streamSession, setStreamSession] = useState<LiveStreamSession | null>(null);
  const [streamForm, setStreamForm] = useState<LiveStreamConfig>({
    platform: 'YouTube',
    rtmpUrl: 'rtmp://',
    streamKey: '',
    description: '',
    projectId: undefined
  });
  const [shareSummary, setShareSummary] = useState('Resumo rápido para o time');
  const [shareChannel, setShareChannel] = useState('#marketing');
  const [shareLog, setShareLog] = useState<ShareResult | null>(null);
  const [activeParagraph, setActiveParagraph] = useState(0);
  const [status, setStatus] = useState<'pausado' | 'gravando'>('pausado');
  const [transcript, setTranscript] = useState('');
  const [readingSpeedWpm, setReadingSpeedWpm] = useState(130);
  const [shortcutConfig, setShortcutConfig] = useState<ShortcutConfig>({
    togglePlayPause: 'CommandOrControl+Shift+P',
    speedUp: 'CommandOrControl+Shift+Up',
    speedDown: 'CommandOrControl+Shift+Down',
    nextParagraph: 'CommandOrControl+Shift+Right'
  });
  const [overlaySettings, setOverlaySettings] = useState({
    overlayMode: false,
    alwaysOnTop: true,
    windowOpacity: 0.94,
    mirrored: false,
    backgroundColor: '#080b16',
    backgroundOpacity: 0.82,
    textColor: '#e7ecf7',
    fontSize: 22,
    fontFamily: 'Inter, system-ui, sans-serif',
    lineHeight: 1.7,
    align: 'center' as 'left' | 'center' | 'right',
    verticalAlign: 'center' as 'flex-start' | 'center' | 'flex-end'
  });
  const [paragraphSpacing, setParagraphSpacing] = useState(12);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordedRef = useRef<HTMLVideoElement | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordedPath, setRecordedPath] = useState('');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartRef = useRef<number | null>(null);
  const [captureSettings, setCaptureSettings] = useState({
    resolution: '1920x1080',
    fps: 30,
    videoDeviceId: '',
    audioDeviceId: ''
  });
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [applyEyeContact, setApplyEyeContact] = useState(true);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('pt-BR');
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set());
  const [trimMode, setTrimMode] = useState<'remove' | 'keep'>('remove');
  const [watermarkText, setWatermarkText] = useState('Sua marca aqui');
  const [watermarkImagePath, setWatermarkImagePath] = useState('');
  const [audioTrackPath, setAudioTrackPath] = useState('');
  const [audioVolume, setAudioVolume] = useState(0.35);
  const [brollSuggestions, setBrollSuggestions] = useState<BrollSuggestion[]>([]);
  const [shortSuggestions, setShortSuggestions] = useState<ShortSuggestion[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const themePalette = useMemo<ThemePalette>(() => {
    const base = colorBlindFriendly
      ? {
          accent: '#ff9f1c',
          border: '#94a3b8',
          muted: '#cbd5e1'
        }
      : {
          accent: '#7ef0ff',
          border: '#1f2a44',
          muted: '#c7d2fe'
        };

    if (themeMode === 'light') {
      return {
        background: '#f5f7fb',
        surface: '#ffffff',
        text: '#0b1021',
        border: '#d1d5db',
        accent: base.accent,
        muted: '#6b7280',
        gradient: 'linear-gradient(120deg, #e0e7ff 0%, #f5f3ff 50%, #e0e7ff 100%)'
      };
    }

    if (themeMode === 'highContrast') {
      return {
        background: '#0a0a0f',
        surface: '#0f172a',
        text: '#fefefe',
        border: '#a855f7',
        accent: colorBlindFriendly ? '#fbbf24' : '#22d3ee',
        muted: '#e0f2fe',
        gradient: 'linear-gradient(135deg, #000000 0%, #0f172a 50%, #000000 100%)'
      };
    }

    return {
      background: '#080b16',
      surface: 'rgba(255, 255, 255, 0.03)',
      text: '#f8fbff',
      border: '#111827',
      accent: base.accent,
      muted: base.muted,
      gradient: 'linear-gradient(120deg, #0b1021 0%, #0f1630 50%, #0b1021 100%)'
    };
  }, [colorBlindFriendly, themeMode]);
  const [avatarVoice, setAvatarVoice] = useState('Avatar Aurora (calma)');
  const [avatarRate, setAvatarRate] = useState(1);
  const [avatarPitch, setAvatarPitch] = useState(1);
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'playing'>('idle');
  const [avatarLog, setAvatarLog] = useState<string[]>([]);
  const rehearsalInterval = useRef<NodeJS.Timeout | null>(null);
  const teleprompterRef = useRef<HTMLDivElement | null>(null);

  // Base: permite rolagem manual do teleprompter além das automações de voz/atalhos.
  const scrollTeleprompter = useCallback((direction: 'up' | 'down') => {
    const el = teleprompterRef.current;
    if (!el) return;
    el.scrollBy({ top: direction === 'up' ? -80 : 80, behavior: 'smooth' });
  }, []);

  const hexToRgba = useCallback((color: string, alpha: number) => {
    if (!color.startsWith('#')) return color;
    const hex = color.replace('#', '');
    const bigint = parseInt(hex.length === 3 ? hex.repeat(2) : hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  const refreshProjects = useCallback(async () => {
    const data = (await window.electronAPI.listProjects()) as ProjectPayload[];
    setProjects(data);
    if (!selectedProjectId && data.length) {
      setSelectedProjectId(data[0].id);
      setCurrentScript((prev) => ({ ...prev, projectId: data[0].id }));
    }
  }, [selectedProjectId]);

  const refreshScripts = useCallback(
    async (projectId?: string) => {
      const data = (await window.electronAPI.listScripts(projectId)) as ScriptRecord[];
      setScripts(data);
    },
    []
  );

  const refreshProfiles = useCallback(
    async (projectId?: string) => {
      const data = (await window.electronAPI.listProfiles(projectId)) as ProfileConfig[];
      setProfiles(data);
    },
    []
  );

  const refreshRecordings = useCallback(
    async (projectId?: string) => {
      const data = (await window.electronAPI.listRecordings(projectId)) as RecordingPayload[];
      setRecordings(data);
    },
    []
  );

  const refreshSyncQueue = useCallback(
    async (projectId?: string) => {
      const data = (await window.electronAPI.listSyncQueue(projectId)) as SyncChange[];
      setSyncQueue(data);
    },
    []
  );

  const refreshStreams = useCallback(
    async (projectId?: string) => {
      const data = (await window.electronAPI.listStreamConfigs(projectId)) as LiveStreamConfig[];
      setStreamConfigs(data);
    },
    []
  );

  const processBackup = useCallback(
    async (reason: string) => {
      if (!isOnline) {
        setBackupStatus('Offline: mantendo fila local.');
        return;
      }
      const result = await window.electronAPI.processSyncQueue(selectedProjectId);
      setBackupStatus(
        `Backup ${reason} • ${result.processed} itens às ${new Date(result.processedAt).toLocaleTimeString('pt-BR')}`
      );
      await refreshSyncQueue(selectedProjectId);
    },
    [isOnline, refreshSyncQueue, selectedProjectId]
  );

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    window.electronAPI.getRemoteInfo().then((info) => setRemotePort(info.port));
  }, []);

  useEffect(() => {
    refreshScripts(selectedProjectId);
    refreshProfiles(selectedProjectId);
    refreshRecordings(selectedProjectId);
    refreshSyncQueue(selectedProjectId);
    refreshStreams(selectedProjectId);
    setCurrentScript((prev) => ({ ...prev, projectId: selectedProjectId }));
    setStreamForm((prev) => ({ ...prev, projectId: selectedProjectId }));
  }, [selectedProjectId, refreshProfiles, refreshProjects, refreshRecordings, refreshScripts, refreshSyncQueue, refreshStreams]);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((all) => {
        setDevices({ audio: all.filter((d) => d.kind === 'audioinput'), video: all.filter((d) => d.kind === 'videoinput') });
        const firstVideo = all.find((d) => d.kind === 'videoinput');
        const firstAudio = all.find((d) => d.kind === 'audioinput');
        setCaptureSettings((prev) => ({ ...prev, videoDeviceId: prev.videoDeviceId || firstVideo?.deviceId || '', audioDeviceId: prev.audioDeviceId || firstAudio?.deviceId || '' }));
      })
      .catch(() => {
        // Ignore errors silently in ambientes sem mediaDevices
      });
  }, []);

  useEffect(() => {
    window.electronAPI.updateOverlay({ alwaysOnTop: overlaySettings.alwaysOnTop, opacity: overlaySettings.windowOpacity });
    document.body.style.backgroundColor = overlaySettings.overlayMode ? 'transparent' : themePalette.background;
  }, [overlaySettings.alwaysOnTop, overlaySettings.overlayMode, overlaySettings.windowOpacity, themePalette.background]);

  useEffect(() => {
    window.electronAPI.registerShortcuts(shortcutConfig);
  }, [shortcutConfig]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      processBackup('automático');
    }
  }, [isOnline, processBackup]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === ' ' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setStatus((prev) => (prev === 'gravando' ? 'pausado' : 'gravando'));
      }
      if (event.key === 'ArrowUp' && event.ctrlKey) {
        event.preventDefault();
        setReadingSpeedWpm((prev) => prev + 5);
      }
      if (event.key === 'ArrowDown' && event.ctrlKey) {
        event.preventDefault();
        setReadingSpeedWpm((prev) => Math.max(40, prev - 5));
      }
      if (event.key === 'PageDown') {
        setActiveParagraph((prev) => Math.min(paragraphs.length - 1, prev + 1));
      }
      if (event.key === 'PageUp') {
        setActiveParagraph((prev) => Math.max(0, prev - 1));
      }
      if (event.altKey && event.key.toLowerCase() === 'b') {
        setExperienceMode('beginner');
      }
      if (event.altKey && event.key.toLowerCase() === 'a') {
        setExperienceMode('advanced');
      }
      if (event.altKey && event.key.toLowerCase() === 'k') {
        processBackup('manual via teclado');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paragraphs.length, processBackup]);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  const paragraphs = useMemo(() => currentScript.content.split(/\n\n+/), [currentScript.content]);
  const teleprompterBackground = useMemo(() => {
    const normalized = hexToRgba(overlaySettings.backgroundColor, overlaySettings.backgroundOpacity);
    if (overlaySettings.overlayMode) return normalized;
    return `linear-gradient(120deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%), ${normalized}`;
  }, [hexToRgba, overlaySettings.backgroundColor, overlaySettings.backgroundOpacity, overlaySettings.overlayMode]);
  const totalWords = useMemo(() => currentScript.content.split(/\s+/).filter(Boolean).length, [currentScript.content]);
  const wordsRead = useMemo(
    () => paragraphs.slice(0, activeParagraph).join(' ').split(/\s+/).filter(Boolean).length,
    [paragraphs, activeParagraph]
  );
  const percentRead = useMemo(() => (totalWords ? (wordsRead / totalWords) * 100 : 0), [totalWords, wordsRead]);
  const remainingSeconds = useMemo(() => {
    if (!totalWords) return 0;
    const remainingWords = Math.max(0, totalWords - wordsRead);
    return Math.round((remainingWords / Math.max(readingSpeedWpm, 1)) * 60);
  }, [readingSpeedWpm, totalWords, wordsRead]);
  const remainingLabel = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  const rehearsalSentences = useMemo(
    () => currentScript.content.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean),
    [currentScript.content]
  );

  const prosodyHints = useMemo(
    () =>
      rehearsalSentences.slice(0, 8).map((sentence, index) => {
        const words = sentence.split(/\s+/).filter(Boolean).length;
        const needsPause = words > 18 || sentence.includes(',') || sentence.includes(';');
        const emphatic = (sentence.match(/!/g) || []).length > 0;
        return { sentence, needsPause, emphatic, index };
      }),
    [rehearsalSentences]
  );

  const buildPerformanceReport = useCallback(
    (items: TranscriptionSegment[]): PerformanceReport | null => {
      if (!items.length) return null;
      const totalTime = Math.max(0, items[items.length - 1].end - items[0].start);
      const totalWords = items.reduce(
        (sum, seg) => sum + seg.text.split(/\s+/).filter(Boolean).length,
        0
      );
      const averageWpm = totalTime ? Math.round((totalWords / totalTime) * 60) : 0;
      const pauseMoments: number[] = [];

      items.forEach((seg, idx) => {
        const next = items[idx + 1];
        if (next) {
          const gap = next.start - seg.end;
          if (gap > 1.2) pauseMoments.push(seg.end);
        }
      });

      const longSentences = (currentScript.content.match(/[^.!?]+[.!?]/g) || [])
        .map((s) => s.trim())
        .filter((s) => s.split(/\s+/).length > 20)
        .slice(0, 4);
      const exclamationCount = (currentScript.content.match(/!/g) || []).length;

      const rhythmSeries: RhythmPoint[] = items.map((seg) => {
        const duration = Math.max(seg.end - seg.start, 0.5);
        const words = seg.text.split(/\s+/).filter(Boolean).length || 1;
        return {
          time: seg.end,
          wpm: Math.round((words / duration) * 60),
          label: seg.text.slice(0, 40)
        } as RhythmPoint;
      });

      const fastSegments = items
        .map((seg) => {
          const duration = Math.max(seg.end - seg.start, 0.5);
          const words = seg.text.split(/\s+/).filter(Boolean).length || 1;
          const wpm = Math.round((words / duration) * 60);
          return { id: seg.id, text: seg.text, wpm, start: seg.start, end: seg.end, duration };
        })
        .filter((item) => item.wpm > 170)
        .map(({ duration, ...rest }) => rest);

      const notes: string[] = [];
      if (averageWpm > 170) notes.push('Bom ritmo geral, mas você acelerou acima de 170 wpm.');
      if (fastSegments.length) notes.push('Use mais pausas nos trechos destacados para evitar atropelar palavras.');
      if (pauseMoments.length < Math.max(1, Math.floor(items.length / 3))) {
        notes.push('Inclua pausas mais frequentes para dar ênfase e respiro.');
      }
      if (exclamationCount > 3) notes.push('Há muitos pontos de exclamação; reduza para não soar exagerado.');
      if (!notes.length) notes.push('Ritmo equilibrado, mantenha esse padrão!');

      return {
        totalTimeSeconds: Math.round(totalTime),
        averageWpm,
        pauseCount: pauseMoments.length,
        pauseMoments,
        fastSegments,
        longSentences,
        exclamationCount,
        notes,
        rhythmSeries
      };
    },
    [currentScript.content]
  );

  const performanceReport = useMemo(
    () => buildPerformanceReport(segments),
    [buildPerformanceReport, segments]
  );

  const maxRhythmValue = useMemo(
    () => Math.max(140, ...(performanceReport?.rhythmSeries.map((p) => p.wpm) || [])),
    [performanceReport]
  );

  const onCommand = useCallback(
    (command) => {
      if (command === 'start' || command === 'resume') setStatus('gravando');
      if (command === 'pause') setStatus('pausado');
      if (command === 'nextParagraph') setActiveParagraph((p) => Math.min(p + 1, paragraphs.length - 1));
      if (command === 'previousParagraph') setActiveParagraph((p) => Math.max(p - 1, 0));
    },
    [paragraphs.length]
  );

  const { isListening, pause, resume } = useVoiceControl({
    onCommand,
    onTranscript: setTranscript
  });

  useEffect(() => {
    const handler = (action: string) => {
      if (action === 'togglePlayPause') setStatus((prev) => (prev === 'gravando' ? 'pausado' : 'gravando'));
      if (action === 'speedUp') setReadingSpeedWpm((w) => Math.min(w + 10, 260));
      if (action === 'speedDown') setReadingSpeedWpm((w) => Math.max(60, w - 10));
      if (action === 'nextParagraph') setActiveParagraph((p) => Math.min(p + 1, paragraphs.length - 1));
      if (action === 'prevParagraph') setActiveParagraph((p) => Math.max(p - 1, 0));
    };
    window.electronAPI.onShortcutAction(handler);
    window.electronAPI.onRemoteAction(handler);
  }, [paragraphs.length]);

  useEffect(() => {
    const target = teleprompterRef.current?.querySelectorAll('p')[activeParagraph];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeParagraph]);

  const stopAvatarPlayback = useCallback(() => {
    if (rehearsalInterval.current) {
      clearInterval(rehearsalInterval.current);
      rehearsalInterval.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAvatarStatus('idle');
  }, []);

  useEffect(() => {
    return () => stopAvatarPlayback();
  }, [stopAvatarPlayback]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('onboardingComplete') !== 'true') {
      setShowTutorial(true);
    }
  }, []);

  const startAvatarPlayback = useCallback(() => {
    if (!currentScript.content.trim()) return;
    stopAvatarPlayback();
    const sentences = rehearsalSentences.length ? rehearsalSentences : [currentScript.content];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(currentScript.content);
      utterance.rate = avatarRate;
      utterance.pitch = avatarPitch;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.name.toLowerCase().includes(avatarVoice.toLowerCase().split(' ')[1] || ''));
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setAvatarStatus('playing');
      utterance.onend = () => setAvatarStatus('idle');
      utterance.onboundary = (event: any) => {
        if (event.name === 'word' || event.name === 'sentence') {
          const snippet = currentScript.content.slice(event.charIndex, event.charIndex + 80);
          setAvatarLog((prev) => [`${avatarVoice}: ${snippet}`, ...prev].slice(0, 5));
        }
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

    let idx = 0;
    setAvatarStatus('playing');
    rehearsalInterval.current = setInterval(() => {
      const snippet = sentences[idx] || '...';
      setAvatarLog((prev) => [`${avatarVoice} enfatizou: ${snippet.slice(0, 80)}`, ...prev].slice(0, 5));
      idx += 1;
      if (idx >= sentences.length) {
        stopAvatarPlayback();
      }
    }, Math.max(900, 2200 / Math.max(avatarRate, 0.5)));
  }, [avatarPitch, avatarRate, avatarVoice, currentScript.content, rehearsalSentences, stopAvatarPlayback]);

  const { broadcast } = useRealtimeCollaboration(
    (currentScript as ScriptRecord).id || '',
    (patch: RealTimePatch) => {
      setCurrentScript((prev) => ({ ...prev, content: patch.content }));
    }
  );

  const saveScript = async () => {
    const saved = await window.electronAPI.saveScript({ ...currentScript, projectId: selectedProjectId });
    setCurrentScript(saved);
    await refreshScripts(selectedProjectId);
    await refreshSyncQueue(selectedProjectId);
  };

  const newScript = () => {
    setCurrentScript({ id: undefined, title: 'Novo roteiro', content: '', projectId: selectedProjectId });
    setActiveParagraph(0);
  };

  const deleteScript = async (id: string) => {
    await window.electronAPI.deleteScript(id);
    await refreshScripts(selectedProjectId);
    newScript();
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    const saved = await window.electronAPI.saveProject({
      name: newProjectName,
      description: newProjectDescription,
      syncEnabled: true
    });
    setNewProjectName('');
    setNewProjectDescription('');
    await refreshProjects();
    setSelectedProjectId(saved.id);
  };

  const toggleProjectSync = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    await window.electronAPI.saveProject({ ...project, syncEnabled: !project.syncEnabled });
    await refreshProjects();
    await refreshSyncQueue(projectId);
  };

  const saveProfileConfig = async () => {
    const payload: ProfileConfig = {
      id: selectedProfileId,
      projectId: selectedProjectId,
      name: profileName || 'Perfil rápido',
      baseSpeed: readingSpeedWpm,
      theme: overlaySettings.backgroundColor === '#080b16' ? 'dark' : 'custom',
      fontFamily: overlaySettings.fontFamily,
      fontSize: overlaySettings.fontSize,
      lineHeight: overlaySettings.lineHeight,
      overlayPosition:
        overlaySettings.verticalAlign === 'flex-start'
          ? 'top'
          : overlaySettings.verticalAlign === 'flex-end'
          ? 'bottom'
          : 'middle',
      overlayOpacity: overlaySettings.windowOpacity,
      recordingPreferences: applyEyeContact ? 'Eye contact habilitado' : 'Sem pós-processamento'
    };
    const saved = await window.electronAPI.saveProfile(payload);
    setSelectedProfileId(saved.id);
    await refreshProfiles(selectedProjectId);
    await refreshSyncQueue(selectedProjectId);
  };

  const applyProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setSelectedProfileId(profile.id);
    setProfileName(profile.name);
    setReadingSpeedWpm(profile.baseSpeed);
    setOverlaySettings((prev) => ({
      ...prev,
      fontFamily: profile.fontFamily,
      fontSize: profile.fontSize,
      lineHeight: profile.lineHeight,
      windowOpacity: profile.overlayOpacity,
      verticalAlign:
        profile.overlayPosition === 'top' ? 'flex-start' : profile.overlayPosition === 'bottom' ? 'flex-end' : 'center'
    }));
  };

  const markSyncItem = async (id: string) => {
    await window.electronAPI.markSynced(id);
    await refreshSyncQueue(selectedProjectId);
  };

  const saveStreamConfig = async () => {
    const saved = await window.electronAPI.saveStreamConfig({ ...streamForm, projectId: selectedProjectId });
    setStreamForm((prev) => ({ ...prev, id: saved.id }));
    await refreshStreams(selectedProjectId);
  };

  const deleteStreamConfig = async (id: string) => {
    await window.electronAPI.deleteStreamConfig(id);
    await refreshStreams(selectedProjectId);
  };

  const startStreaming = async (configId: string) => {
    const session = await window.electronAPI.startStreaming(configId);
    setStreamSession(session);
  };

  const stopStreaming = async () => {
    if (!streamSession) return;
    const stopped = await window.electronAPI.stopStreaming(streamSession.id);
    setStreamSession(stopped);
  };

  const buildSharePayload = () => {
    const projectRecordings = recordings.filter((rec) => !selectedProjectId || rec.projectId === selectedProjectId);
    const lastRecording = projectRecordings[projectRecordings.length - 1];
    return {
      projectId: selectedProjectId,
      scriptId: (currentScript as ScriptRecord).id,
      recordingId: lastRecording?.id,
      title: currentScript.title,
      summary: shareSummary,
      link: recordedPath || lastRecording?.filePath,
      channel: shareChannel
    };
  };

  const sendShare = async (provider: 'slack' | 'notion' | 'trello') => {
    const payload = buildSharePayload();
    let result: ShareResult | null = null;
    if (provider === 'slack') result = await window.electronAPI.sendToSlack(payload);
    if (provider === 'notion') result = await window.electronAPI.sendToNotion(payload);
    if (provider === 'trello') result = await window.electronAPI.sendToTrello(payload);
    if (result) setShareLog(result);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCurrentScript({ id: undefined, title: file.name, content: reader.result as string });
    };
    reader.readAsText(file);
  };

  const exportTxt = () => {
    const blob = new Blob([currentScript.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentScript.title || 'roteiro'}.txt`;
    link.click();
  };

  const exportPdf = () => {
    // Simplificado: download como txt e comentário indicando integração com geradores PDF.
    exportTxt();
  };

  const parseResolution = (res: string) => {
    const [width, height] = res.split('x').map(Number);
    return { width, height };
  };

  const startPreview = async () => {
    if (!navigator.mediaDevices) return undefined;
    const { width, height } = parseResolution(captureSettings.resolution);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: captureSettings.videoDeviceId ? { exact: captureSettings.videoDeviceId } : undefined,
        width,
        height,
        frameRate: captureSettings.fps
      },
      audio: captureSettings.audioDeviceId ? { deviceId: { exact: captureSettings.audioDeviceId } } : true
    });
    setMediaStream(stream);
    return stream;
  };

  const stopPreview = () => {
    mediaStream?.getTracks().forEach((t) => t.stop());
    setMediaStream(null);
  };

  const startRecording = async () => {
    let activeStream = mediaStream;
    if (!activeStream) {
      activeStream = await startPreview();
    }
    if (!activeStream) return;

    const recorder = new MediaRecorder(activeStream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks: Blob[] = [];
    recordingStartRef.current = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordingUrl(url);
      const buffer = await blob.arrayBuffer();
      const savedPath = await window.electronAPI.saveMediaBuffer({ data: buffer, extension: 'webm', prefix: 'capture' });
      let finalPath = savedPath;
      if (applyEyeContact) {
        finalPath = await window.electronAPI.applyEyeContact(savedPath);
      }
      setRecordedPath(finalPath);
      if (recordingStartRef.current) {
        const durationSeconds = Math.round((Date.now() - recordingStartRef.current) / 1000);
        setRecordingDuration(durationSeconds);
        await window.electronAPI.saveRecording({
          projectId: selectedProjectId,
          scriptId: (currentScript as ScriptRecord).id,
          filePath: finalPath,
          durationSeconds,
          notes: applyEyeContact ? 'Correção de olhar aplicada (stub).' : 'Captura bruta'
        });
        refreshRecordings(selectedProjectId);
        refreshSyncQueue(selectedProjectId);
      }
    };
    recorder.start();
    setIsRecordingVideo(true);
    recorderRef.current = recorder;
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecordingVideo(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const runTranscription = async () => {
    if (!recordedPath) return;
    const result = (await window.electronAPI.transcribeVideo(recordedPath, transcriptionLanguage)) as TranscriptionSegment[];
    setSegments(result);
    const shorts = (await window.electronAPI.suggestShorts(result)) as ShortSuggestion[];
    setShortSuggestions(shorts);
    const brolls = (await window.electronAPI.suggestBroll(currentScript.content)) as BrollSuggestion[];
    setBrollSuggestions(brolls);
  };

  const toggleSegmentSelection = (segmentId: string) => {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(segmentId)) next.delete(segmentId);
      else next.add(segmentId);
      return next;
    });
  };

  const runWordTrim = async () => {
    if (!recordedPath || selectedSegmentIds.size === 0) return;
    const chosen = segments.filter((seg) => selectedSegmentIds.has(seg.id));
    const output = await window.electronAPI.wordTrim({ sourcePath: recordedPath, segments: chosen, mode: trimMode });
    setRecordedPath(output);
    setRecordingUrl('');
  };

  const exportSubtitles = (format: 'srt' | 'vtt') => {
    if (!segments.length) return;
    const toTimestamp = (value: number) => {
      const hours = String(Math.floor(value / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
      const seconds = String(Math.floor(value % 60)).padStart(2, '0');
      const millis = String(Math.floor((value % 1) * 1000)).padStart(3, '0');
      return `${hours}:${minutes}:${seconds},${millis}`;
    };

    const content = segments
      .map((seg, index) => {
        const start = toTimestamp(seg.start);
        const end = toTimestamp(seg.end);
        if (format === 'srt') return `${index + 1}\n${start} --> ${end}\n${seg.text}\n`;
        return `${index + 1}\n${start.replace(',', '.')} --> ${end.replace(',', '.')}\n${seg.text}\n`;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `legendagem.${format}`;
    link.click();
  };

  const handleAssetUpload = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop() || 'dat';
    return window.electronAPI.saveMediaBuffer({ data: buffer, extension, prefix: 'asset' });
  };

  const onAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const savedPath = await handleAssetUpload(file);
    setAudioTrackPath(savedPath);
  };

  const onWatermarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const savedPath = await handleAssetUpload(file);
    setWatermarkImagePath(savedPath);
  };

  const mixVideo = async () => {
    if (!recordedPath) return;
    const output = await window.electronAPI.mixVideo({
      sourcePath: recordedPath,
      watermark: { text: watermarkText, imagePath: watermarkImagePath },
      audio: audioTrackPath ? { audioPath: audioTrackPath, volume: audioVolume } : undefined
    });
    setRecordedPath(output);
  };

  const exportShort = async (suggestion: ShortSuggestion) => {
    if (!recordedPath) return;
    const output = await window.electronAPI.exportVertical({
      sourcePath: recordedPath,
      start: suggestion.start,
      end: suggestion.end
    });
    setRecordedPath(output);
  };

  const onContentChange = (value: string) => {
    const payload = { ...currentScript, content: value };
    setCurrentScript(payload);
    const patch: RealTimePatch = {
      scriptId: (payload as ScriptRecord).id || 'draft-' + uuid(),
      content: value,
      author: 'local-user',
      timestamp: Date.now()
    };
    broadcast(patch);
  };

  const selectScript = async (id: string) => {
    const script = await window.electronAPI.getScript(id);
    setCurrentScript(script);
    setActiveParagraph(0);
  };

  const isAdvanced = experienceMode === 'advanced';
  const tutorialSteps = [
    {
      title: 'Crie ou selecione um projeto',
      body: 'Centralize scripts e gravações por cliente. No modo iniciante mostramos apenas o essencial.'
    },
    { title: 'Edite e leia seu roteiro', body: 'Use o teleprompter com voz ou teclado (PageUp/PageDown) e ajuste fonte/contraste.' },
    {
      title: 'Grave e revise',
      body: 'Grave com câmera/mic, gere legendas e veja o painel de performance para ritmo e pausas.'
    }
  ];
  const completeTutorial = () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('onboardingComplete', 'true');
    setShowTutorial(false);
  };
  const nextTutorial = () => {
    if (tutorialStep < tutorialSteps.length - 1) setTutorialStep((prev) => prev + 1);
    else completeTutorial();
  };
  const prevTutorial = () => setTutorialStep((prev) => Math.max(0, prev - 1));

  return (
    <>
      <GlobalStyle palette={themePalette} />
      <TopBar>
        <NoDrag>
          <strong>Teleprompter IA Overlay</strong>
        </NoDrag>
        <NoDrag>
          <ControlRow>
            <ToggleRow>
              <input
                type="checkbox"
                checked={overlaySettings.overlayMode}
                onChange={(e) => setOverlaySettings((prev) => ({ ...prev, overlayMode: e.target.checked }))}
                aria-label="Ativar modo overlay"
              />
              Modo overlay (sem bordas)
            </ToggleRow>
            <ToggleRow>
              <input
                type="checkbox"
                checked={overlaySettings.alwaysOnTop}
                onChange={(e) => setOverlaySettings((prev) => ({ ...prev, alwaysOnTop: e.target.checked }))}
                aria-label="Janela sempre no topo"
              />
              Sempre no topo
            </ToggleRow>
            <InlineField>
              <label>Opacidade da janela</label>
              <input
                type="range"
                min={0.4}
                max={1}
                step={0.01}
                value={overlaySettings.windowOpacity}
                onChange={(e) => setOverlaySettings((prev) => ({ ...prev, windowOpacity: parseFloat(e.target.value) }))}
              />
            </InlineField>
            <InlineField>
              <label>Tema e contraste</label>
              <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as any)} aria-label="Escolher tema">
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="highContrast">Alto contraste</option>
              </select>
            </InlineField>
            <ToggleRow>
              <input
                type="checkbox"
                checked={colorBlindFriendly}
                onChange={(e) => setColorBlindFriendly(e.target.checked)}
                aria-label="Ativar modo amigável para daltônicos"
              />
              Modo daltônico friendly
            </ToggleRow>
            <InlineField>
              <label>Modo</label>
              <select
                value={experienceMode}
                onChange={(e) => setExperienceMode(e.target.value as 'beginner' | 'advanced')}
                aria-label="Alternar modo iniciante ou avançado"
              >
                <option value="beginner">Iniciante (simplificado)</option>
                <option value="advanced">Avançado</option>
              </select>
            </InlineField>
          </ControlRow>
        </NoDrag>
        <NoDrag>
          <ControlRow>
            <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusDot online={isOnline} aria-label={isOnline ? 'Online' : 'Offline'} />
              <Subtle>{isOnline ? 'Online para backup' : 'Offline — mantendo tudo local'}</Subtle>
            </div>
            <Button variant="ghost" onClick={() => processBackup('manual')} aria-label="Forçar backup agora">
              Backup agora
            </Button>
          </ControlRow>
        </NoDrag>
        <ChromeButtons>
          <ChromeDot color="#ff5f56" />
          <ChromeDot color="#ffbd2e" />
          <ChromeDot color="#27c93f" />
        </ChromeButtons>
      </TopBar>
      <Layout overlayMode={overlaySettings.overlayMode}>
        {!overlaySettings.overlayMode && (
          <Sidebar>
            <SectionCard>
              <h3>Projetos</h3>
              <InlineField>
                <label>Nome</label>
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex.: Podcast de segunda"
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                />
              </InlineField>
              <InlineField>
                <label>Descrição</label>
                <input
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Scripts, gravações e perfis deste cliente"
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                />
              </InlineField>
              <Button onClick={createProject}>Criar projeto</Button>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.map((project) => (
                  <ScriptCard key={project.id} active={selectedProjectId === project.id} onClick={() => setSelectedProjectId(project.id)}>
                    <strong>{project.name}</strong>
                    <Subtle>{project.description || 'Sem descrição'}</Subtle>
                    <ToggleRow>
                      <input type="checkbox" checked={!!project.syncEnabled} onChange={(e) => { e.stopPropagation(); toggleProjectSync(project.id!); }} />
                      <span>Sync ativo</span>
                    </ToggleRow>
                  </ScriptCard>
                ))}
              </div>
            </SectionCard>
            <SectionCard>
              <h4>Roteiros do projeto</h4>
              <Button onClick={newScript}>Novo roteiro</Button>
              <Subtle>Edição remota: compartilhe o WebSocket ws://seu-ip:4455 para que outro editor colabore.</Subtle>
              <div style={{ marginTop: 10 }}>
                {scripts.map((script) => (
                  <ScriptCard key={script.id} active={(currentScript as ScriptRecord).id === script.id} onClick={() => selectScript(script.id)}>
                    <strong>{script.title}</strong>
                    <div>
                      <Subtle>{new Date(script.updatedAt).toLocaleString('pt-BR')}</Subtle>
                    </div>
                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); deleteScript(script.id); }}>Excluir</Button>
                  </ScriptCard>
                ))}
              </div>
            </SectionCard>
            {isAdvanced && (
              <SectionCard>
                <h4>Perfis de teleprompter</h4>
                <InlineField>
                  <label>Nome do perfil</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Ao vivo, Reels, Podcast..."
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                  />
                </InlineField>
                <ControlRow>
                  <Button onClick={saveProfileConfig}>Salvar perfil</Button>
                  <Button variant="ghost" onClick={() => selectedProfileId && applyProfile(selectedProfileId)}>Aplicar selecionado</Button>
                </ControlRow>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {profiles.map((profile) => (
                    <Chip key={profile.id} onClick={() => applyProfile(profile.id!)} style={{ cursor: 'pointer' }}>
                      {profile.name}
                    </Chip>
                  ))}
                </div>
              </SectionCard>
            )}
            {isAdvanced && (
              <SectionCard>
                <h4>Fila de sync</h4>
                {syncQueue.filter((item) => item.status === 'pending').map((item) => (
                  <div key={item.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{item.entityType}</strong> → {item.entityId}
                      <Subtle style={{ display: 'block' }}>{new Date(item.createdAt).toLocaleTimeString('pt-BR')}</Subtle>
                    </div>
                    <Button variant="ghost" onClick={() => markSyncItem(item.id)}>Marcar como sincronizado</Button>
                  </div>
                ))}
                {!syncQueue.filter((item) => item.status === 'pending').length && <Subtle>Nenhuma mudança pendente.</Subtle>}
                {backupStatus && <Subtle>{backupStatus}</Subtle>}
              </SectionCard>
            )}
            <SectionCard>
              <h4>Acessibilidade</h4>
              <Subtle>Ajuste espaçamento de linhas, margens e feedback para leitores de tela.</Subtle>
              <InlineField>
                <label>Espaçamento entre parágrafos</label>
                <input
                  type="range"
                  min={4}
                  max={40}
                  value={paragraphSpacing}
                  onChange={(e) => setParagraphSpacing(parseInt(e.target.value))}
                  aria-label="Espaço vertical entre parágrafos"
                />
                <Subtle>{paragraphSpacing}px</Subtle>
              </InlineField>
              <InlineField>
                <label>Espaçamento de linha</label>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={overlaySettings.lineHeight}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                  aria-label="Line-height do teleprompter"
                />
                <Subtle>{overlaySettings.lineHeight.toFixed(2)}x</Subtle>
              </InlineField>
            </SectionCard>
            {isAdvanced && (
              <SectionCard>
                <h4>Importar / Exportar</h4>
                <InlineField>
                  <label>Importar</label>
                  <input type="file" accept=".txt,.docx,.pdf" onChange={handleImport} />
                  <Subtle>Docx/PDF usam stub; conecte aqui com parser real.</Subtle>
                </InlineField>
                <ControlRow>
                  <Button onClick={exportTxt}>Exportar .txt</Button>
                  <Button variant="ghost" onClick={exportPdf}>Exportar .pdf</Button>
                </ControlRow>
              </SectionCard>
            )}
            {isAdvanced && (
              <SectionCard>
                <h4>Atalhos globais</h4>
              <Subtle>Mapeie teclas para start/pause, velocidade e pular parágrafo.</Subtle>
              {([
                ['togglePlayPause', 'Iniciar/Pausar'],
                ['speedUp', 'Aumentar velocidade'],
                ['speedDown', 'Diminuir velocidade'],
                ['nextParagraph', 'Próximo parágrafo']
              ] as [keyof ShortcutConfig, string][]).map(([key, label]) => (
                <InlineField key={key}>
                  <label>{label}</label>
                  <input
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                    value={shortcutConfig[key]}
                    onChange={(e) => setShortcutConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="Ex.: CommandOrControl+Shift+P"
                  />
                </InlineField>
              ))}
              </SectionCard>
            )}
          </Sidebar>
        )}
        <Main overlayMode={overlaySettings.overlayMode}>
          <SectionCard>
            <Grid>
              <div>
                <label>Título</label>
                <input
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                  value={currentScript.title}
                  onChange={(e) => setCurrentScript({ ...currentScript, title: e.target.value })}
                />
              </div>
              <div>
                <label>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusPill state={status === 'gravando' ? 'gravando' : 'pausa'}>
                    {status === 'gravando' ? 'Gravando' : 'Pausado'}
                  </StatusPill>
                  <Subtle>Mic: {isListening ? 'ouvindo' : 'desligado'}</Subtle>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <Button onClick={() => setStatus((prev) => (prev === 'gravando' ? 'pausado' : 'gravando'))}>
                  {status === 'gravando' ? 'Pausar rolagem' : 'Iniciar rolagem'}
                </Button>
                <Button variant="ghost" onClick={status === 'gravando' ? pause : resume}>
                  {status === 'gravando' ? 'Pausar voz' : 'Retomar voz'}
                </Button>
                <Button onClick={saveScript}>Salvar</Button>
              </div>
            </Grid>
            <ControlRow style={{ marginTop: 12 }}>
              <InlineField>
                <label>Velocidade de leitura estimada</label>
                <input
                  type="range"
                  min={60}
                  max={260}
                  step={5}
                  value={readingSpeedWpm}
                  onChange={(e) => setReadingSpeedWpm(parseInt(e.target.value))}
                />
                <Subtle>{readingSpeedWpm} wpm</Subtle>
              </InlineField>
              <InlineField style={{ minWidth: 180 }}>
                <label>Progresso</label>
                <ProgressBar>
                  <ProgressFill value={percentRead} />
                </ProgressBar>
                <Subtle>{percentRead.toFixed(0)}% lido • {remainingLabel} restantes</Subtle>
              </InlineField>
            </ControlRow>
          </SectionCard>

          {isAdvanced && (
            <SectionCard>
              <h3>Controle remoto e gravações do projeto</h3>
            <Grid>
              <div>
                <p>
                  Ative o modo "Remote Control" abrindo <strong>http://{'{'}seu-ip-local{'}'}:{remotePort || '4777'}</strong> em um
                  smartphone/tablet. Os botões enviam play/pause, velocidade e navegação via WebSocket local.
                </p>
                <Subtle>
                  O mesmo servidor aceita colaborações remotas de script via ws://seu-ip:4455 (usa o mesmo mecanismo do painel de colaboração interno).
                </Subtle>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  <Chip>Play/Pause</Chip>
                  <Chip>+/- Velocidade</Chip>
                  <Chip>Próx./Ant. parágrafo</Chip>
                </div>
              </div>
              <div>
                <h4>Gravações registradas</h4>
                <Subtle>Projetos agrupam scripts, gravações e preferências.</Subtle>
                <div style={{ maxHeight: 160, overflow: 'auto', marginTop: 8 }}>
                  {recordings
                    .filter((rec) => !selectedProjectId || rec.projectId === selectedProjectId)
                    .map((rec) => (
                      <SectionCard key={rec.id} style={{ marginBottom: 8 }}>
                        <strong>{rec.filePath.split('/').pop()}</strong>
                        <Subtle>{formatTime(rec.durationSeconds || 0)} • {rec.notes}</Subtle>
                      </SectionCard>
                    ))}
                  {!recordings.filter((rec) => !selectedProjectId || rec.projectId === selectedProjectId).length && (
                    <Subtle>Nenhuma gravação para este projeto ainda.</Subtle>
                  )}
                </div>
              </div>
            </Grid>
            </SectionCard>
          )}

          {isAdvanced && (
            <SectionCard>
              <h3>Live streaming RTMP + distribuição colaborativa</h3>
            <Grid>
              <div>
                <h4>Configuração RTMP</h4>
                <InlineField>
                  <label>Plataforma</label>
                  <select
                    style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                    value={streamForm.platform}
                    onChange={(e) => setStreamForm((prev) => ({ ...prev, platform: e.target.value as LiveStreamConfig['platform'] }))}
                  >
                    <option value="YouTube">YouTube Live</option>
                    <option value="Facebook">Facebook Live</option>
                    <option value="Instagram">Instagram (RTMP)</option>
                    <option value="Custom">RTMP personalizado</option>
                  </select>
                </InlineField>
                <InlineField>
                  <label>Endpoint RTMP</label>
                  <input
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                    value={streamForm.rtmpUrl}
                    onChange={(e) => setStreamForm((prev) => ({ ...prev, rtmpUrl: e.target.value }))}
                    placeholder="rtmp://a.rtmp.youtube.com/live2"
                  />
                </InlineField>
                <InlineField>
                  <label>Chave do streaming</label>
                  <input
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                    value={streamForm.streamKey}
                    onChange={(e) => setStreamForm((prev) => ({ ...prev, streamKey: e.target.value }))}
                    placeholder="abcd-1234-xyz"
                  />
                </InlineField>
                <InlineField>
                  <label>Descrição</label>
                  <textarea
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                    value={streamForm.description}
                    onChange={(e) => setStreamForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Resumo do live / chamada para ação"
                  />
                </InlineField>
                <ControlRow>
                  <Button onClick={saveStreamConfig}>Salvar config RTMP</Button>
                  {streamSession?.status === 'live' ? (
                    <Button variant="ghost" onClick={stopStreaming}>Encerrar streaming</Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => streamConfigs[0]?.id && startStreaming(streamConfigs[0].id)}
                      disabled={!streamConfigs.length}
                    >
                      Iniciar com a primeira config
                    </Button>
                  )}
                </ControlRow>
                <Subtle>Stub: aqui plugar ffmpeg/node-media-server para empurrar a câmera para o endpoint RTMP.</Subtle>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {streamConfigs.map((cfg) => (
                    <Chip key={cfg.id}>
                      <strong>{cfg.platform}</strong> → {cfg.rtmpUrl}/{cfg.streamKey}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <Button variant="ghost" onClick={() => startStreaming(cfg.id!)}>Entrar ao vivo</Button>
                        <Button variant="ghost" onClick={() => deleteStreamConfig(cfg.id!)}>Excluir</Button>
                      </div>
                    </Chip>
                  ))}
                  {!streamConfigs.length && <Subtle>Nenhuma configuração salva ainda.</Subtle>}
                </div>
                {streamSession && (
                  <Pill>
                    {streamSession.status === 'live' ? 'Live ativo' : 'Live encerrado'} • {streamSession.outputEndpoint}
                  </Pill>
                )}
              </div>
              <div>
                <h4>Compartilhar com o time</h4>
                <Subtle>Simulação de Slack/Notion/Trello com logs do payload HTTP.</Subtle>
                <InlineField>
                  <label>Resumo</label>
                  <textarea
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff', minHeight: 90 }}
                    value={shareSummary}
                    onChange={(e) => setShareSummary(e.target.value)}
                  />
                </InlineField>
                <InlineField>
                  <label>Canal / Lista / Página</label>
                  <input
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                    value={shareChannel}
                    onChange={(e) => setShareChannel(e.target.value)}
                    placeholder="#marketing ou ID da lista"
                  />
                </InlineField>
                <ControlRow>
                  <Button onClick={() => sendShare('slack')}>Enviar para Slack</Button>
                  <Button variant="ghost" onClick={() => sendShare('notion')}>Salvar no Notion</Button>
                  <Button variant="ghost" onClick={() => sendShare('trello')}>Criar card Trello</Button>
                </ControlRow>
                {shareLog && (
                  <Subtle>
                    {shareLog.message} • payload: {shareLog.payload.title} ({shareLog.payload.link || 'sem arquivo'}).
                  </Subtle>
                )}
              </div>
            </Grid>
            </SectionCard>
          )}

          <SectionCard>
            <h3>Teleprompter dinâmico</h3>
            <ControlRow>
              <ToggleRow>
                <input
                  type="checkbox"
                  checked={overlaySettings.mirrored}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, mirrored: e.target.checked }))}
                />
                Modo espelhado
              </ToggleRow>
              <InlineField>
                <label>Tamanho da fonte</label>
                <input
                  type="range"
                  min={14}
                  max={48}
                  value={overlaySettings.fontSize}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                />
                <Subtle>{overlaySettings.fontSize}px</Subtle>
              </InlineField>
              <InlineField>
                <label>Fonte</label>
                <select
                  style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                  value={overlaySettings.fontFamily}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, fontFamily: e.target.value }))}
                >
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="'Source Serif Pro', serif">Source Serif Pro</option>
                </select>
              </InlineField>
              <InlineField>
                <label>Espaçamento</label>
                <input
                  type="range"
                  min={1.2}
                  max={2}
                  step={0.05}
                  value={overlaySettings.lineHeight}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                />
                <Subtle>{overlaySettings.lineHeight.toFixed(2)}x</Subtle>
              </InlineField>
              <InlineField>
                <label>Alinhamento</label>
                <select
                  style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                  value={overlaySettings.align}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, align: e.target.value as 'left' | 'center' | 'right' }))}
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centralizado</option>
                  <option value="right">Direita</option>
                </select>
              </InlineField>
              <InlineField>
                <label>Centralização vertical</label>
                <select
                  style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                  value={overlaySettings.verticalAlign}
                  onChange={(e) =>
                    setOverlaySettings((prev) => ({ ...prev, verticalAlign: e.target.value as 'flex-start' | 'center' | 'flex-end' }))
                  }
                >
                  <option value="flex-start">Topo</option>
                  <option value="center">Centro</option>
                  <option value="flex-end">Base</option>
                </select>
              </InlineField>
            </ControlRow>
            <ControlRow>
              <InlineField>
                <label>Cor do texto</label>
                <input
                  type="color"
                  value={overlaySettings.textColor}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, textColor: e.target.value }))}
                />
              </InlineField>
              <InlineField>
                <label>Cor do fundo</label>
                <input
                  type="color"
                  value={overlaySettings.backgroundColor}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                />
              </InlineField>
              <InlineField>
                <label>Transparência do fundo</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={overlaySettings.backgroundOpacity}
                  onChange={(e) => setOverlaySettings((prev) => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
                />
                <Subtle>{Math.round(overlaySettings.backgroundOpacity * 100)}%</Subtle>
              </InlineField>
            </ControlRow>
            <ControlRow>
              <Button onClick={() => scrollTeleprompter('up')}>Subir texto</Button>
              <Button onClick={() => scrollTeleprompter('down')}>Descer texto</Button>
              <Subtle>Rolagem manual rápida (independente de voz ou atalhos).</Subtle>
            </ControlRow>
            <Teleprompter
              ref={teleprompterRef}
              overlayMode={overlaySettings.overlayMode}
              background={teleprompterBackground}
              align={overlaySettings.align}
              verticalAlign={overlaySettings.verticalAlign}
              mirrored={overlaySettings.mirrored}
            >
              {paragraphs.map((text, index) => (
                <Paragraph
                  key={index}
                  active={index === activeParagraph}
                  textColor={overlaySettings.textColor}
                  activeColor={themePalette.accent}
                  fontSize={overlaySettings.fontSize}
                  lineHeight={overlaySettings.lineHeight}
                  spacing={paragraphSpacing}
                >
                  {text}
                </Paragraph>
              ))}
            </Teleprompter>
            <ProgressBar style={{ marginTop: 12 }}>
              <ProgressFill value={percentRead} />
            </ProgressBar>
            <Subtle>
              Comandos de voz: "iniciar teleprompter", "pausar", "retomar", "pular para próximo parágrafo", "voltar um parágrafo".
              Progresso: {percentRead.toFixed(0)}% lido, {remainingLabel} restantes.
            </Subtle>
          </SectionCard>

          {isAdvanced && (
            <SectionCard>
              <h3>Painel de performance do apresentador</h3>
            <Grid>
              <div>
                <h4>Avatares de IA para ensaio</h4>
                <Subtle>
                  Simule a fala do roteiro com um avatar virtual. Para agora usamos Speech Synthesis do navegador (ou logs), mas a
                  UI já prevê troca por TTS real.
                </Subtle>
                <AvatarBubble>
                  <div>
                    <strong>{avatarVoice}</strong>
                    <Subtle>{avatarStatus === 'playing' ? 'Falando roteiro…' : 'Pronto para ensaiar'}</Subtle>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Chip>Velocidade {avatarRate.toFixed(1)}x</Chip>
                    <Chip>Tom {avatarPitch.toFixed(1)}</Chip>
                  </div>
                </AvatarBubble>
                <InlineField style={{ marginTop: 10 }}>
                  <label>Avatar</label>
                  <select
                    style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                    value={avatarVoice}
                    onChange={(e) => setAvatarVoice(e.target.value)}
                  >
                    <option>Avatar Aurora (calma)</option>
                    <option>Avatar Volt (energético)</option>
                    <option>Avatar Studio (neutro)</option>
                  </select>
                </InlineField>
                <ControlRow>
                  <InlineField style={{ minWidth: 200 }}>
                    <label>Velocidade</label>
                    <input
                      type="range"
                      min={0.6}
                      max={1.6}
                      step={0.1}
                      value={avatarRate}
                      onChange={(e) => setAvatarRate(parseFloat(e.target.value))}
                    />
                    <Subtle>Use para simular ritmo mais lento ou acelerado.</Subtle>
                  </InlineField>
                  <InlineField style={{ minWidth: 200 }}>
                    <label>Tom (pitch)</label>
                    <input
                      type="range"
                      min={0.6}
                      max={1.4}
                      step={0.1}
                      value={avatarPitch}
                      onChange={(e) => setAvatarPitch(parseFloat(e.target.value))}
                    />
                    <Subtle>Marque pausas e entonação para testar clareza.</Subtle>
                  </InlineField>
                </ControlRow>
                <ControlRow>
                  <Button onClick={startAvatarPlayback} disabled={avatarStatus === 'playing'}>
                    Ensaiar com avatar
                  </Button>
                  <Button variant="ghost" onClick={stopAvatarPlayback} disabled={avatarStatus === 'idle'}>
                    Parar ensaio
                  </Button>
                </ControlRow>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {prosodyHints.map((hint) => (
                    <Chip key={hint.index}>
                      {hint.needsPause ? '⏸️ Pausa sugerida' : '🎯'} {hint.sentence.slice(0, 60)}
                    </Chip>
                  ))}
                </div>
                <Subtle style={{ display: 'block', marginTop: 8 }}>
                  Logs/visualização: {avatarLog[0] || 'O avatar narra e destaca pausas aqui.'}
                </Subtle>
              </div>

              <div>
                <h4>Dicas de entonação e ritmo</h4>
                <Subtle>Regras rápidas aplicadas ao roteiro e às gravações.</Subtle>
                <NoteBox style={{ marginTop: 8 }}>
                  <ul>
                    <li>
                      Frases longas: {prosodyHints.filter((h) => h.needsPause).length || 'nenhuma'} com sugestão de pausa.
                    </li>
                    <li>
                      Pontos de exclamação: {(currentScript.content.match(/!/g) || []).length} → evite exageros.
                    </li>
                    <li>
                      Ritmo atual: {performanceReport?.averageWpm ? `${performanceReport.averageWpm} wpm` : `${readingSpeedWpm} wpm estimados`}.
                      {performanceReport?.averageWpm && performanceReport.averageWpm > 170
                        ? ' Recomenda-se reduzir a velocidade.'
                        : ' Dentro de uma faixa confortável.'}
                    </li>
                  </ul>
                  {prosodyHints.filter((h) => h.needsPause).length > 0 && (
                    <Subtle>Use pequenas pausas após frases longas para evitar atropelar ideias.</Subtle>
                  )}
                </NoteBox>
                {prosodyHints.slice(0, 3).map((hint) => (
                  <div key={hint.index} style={{ marginTop: 6 }}>
                    <strong>{hint.needsPause ? 'Pausa sugerida' : 'Ênfase leve'}:</strong> {hint.sentence}
                  </div>
                ))}
              </div>

              <div>
                <h4>Análise de Performance</h4>
                <Subtle>Mostra ritmo ao longo do tempo e feedback após cada gravação.</Subtle>
                {performanceReport ? (
                  <>
                    <Grid style={{ marginTop: 8 }}>
                      <div>
                        <strong>Tempo total</strong>
                        <div>{formatTime(performanceReport.totalTimeSeconds)}</div>
                      </div>
                      <div>
                        <strong>Velocidade média</strong>
                        <div>{performanceReport.averageWpm} wpm</div>
                      </div>
                      <div>
                        <strong>Pausas percebidas</strong>
                        <div>{performanceReport.pauseCount}</div>
                      </div>
                      <div>
                        <strong>Trechos acelerados</strong>
                        <div>{performanceReport.fastSegments.length}</div>
                      </div>
                    </Grid>
                    <RhythmChart style={{ marginTop: 10 }}>
                      {performanceReport.rhythmSeries.map((point) => (
                        <RhythmBar
                          key={point.time}
                          value={Math.round((point.wpm / maxRhythmValue) * 100)}
                          title={`${point.wpm} wpm em ${formatTime(Math.round(point.time))}`}
                        />
                      ))}
                    </RhythmChart>
                    <NoteBox style={{ marginTop: 10 }}>
                      {performanceReport.notes.map((note, idx) => (
                        <div key={idx}>• {note}</div>
                      ))}
                    </NoteBox>
                    {performanceReport.fastSegments.length > 0 && (
                      <Subtle style={{ display: 'block', marginTop: 8 }}>
                        Ex.: {performanceReport.fastSegments[0].text} ({performanceReport.fastSegments[0].wpm} wpm)
                      </Subtle>
                    )}
                  </>
                ) : (
                  <Subtle>Grave um vídeo e gere legendas para liberar o relatório automático.</Subtle>
                )}
              </div>
            </Grid>
            </SectionCard>
          )}

          {isAdvanced && (
            <SectionCard>
              <h3>Editor colaborativo</h3>
              <Editor
                value={currentScript.content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Use [CENA], [CORTE] e marcações de ênfase para guiar o apresentador"
                style={{ fontFamily: overlaySettings.fontFamily }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button onClick={() => setActiveParagraph((p) => Math.max(p - 1, 0))}>Voltar parágrafo</Button>
                <Button onClick={() => setActiveParagraph((p) => Math.min(p + 1, paragraphs.length - 1))}>Avançar parágrafo</Button>
              </div>
            </SectionCard>
          )}

          <SectionCard>
            <Grid>
              <div>
                <h4>VoiceTrack</h4>
                <Subtle>
                  O texto rola conforme a fala reconhecida. Troque o engine na hook `useVoiceControl` para usar outra API.
                </Subtle>
              </div>
              <div>
                <h4>Transcrição ao vivo</h4>
                <p>{transcript || 'Aguardando fala...'}</p>
              </div>
              <div>
                <h4>Colaboração via WebSocket</h4>
                <Subtle>Outras instâncias na mesma máquina receberão patches em tempo real.</Subtle>
              </div>
              <div>
                <h4>Atalhos rápidos</h4>
                <Subtle>
                  {shortcutConfig.togglePlayPause}: iniciar/pausar • {shortcutConfig.speedUp}/{shortcutConfig.speedDown}: velocidade •
                  {` ${shortcutConfig.nextParagraph}: próximo parágrafo`}
                </Subtle>
              </div>
            </Grid>
          </SectionCard>

          <SectionCard>
            <h3>Captura de vídeo + edição assistida</h3>
            <Grid>
              <div>
                <h4>Gravação até 4K</h4>
                <InlineField>
                  <label>Resolução</label>
                  <select
                    style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                    value={captureSettings.resolution}
                    onChange={(e) => setCaptureSettings((prev) => ({ ...prev, resolution: e.target.value }))}
                  >
                    <option value="1280x720">720p</option>
                    <option value="1920x1080">1080p</option>
                    <option value="3840x2160">4K</option>
                  </select>
                </InlineField>
                <InlineField>
                  <label>FPS</label>
                  <input
                    type="number"
                    min={24}
                    max={60}
                    value={captureSettings.fps}
                    onChange={(e) => setCaptureSettings((prev) => ({ ...prev, fps: parseInt(e.target.value) }))}
                    style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                  />
                </InlineField>
                <InlineField>
                  <label>Câmera</label>
                  <select
                    style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                    value={captureSettings.videoDeviceId}
                    onChange={(e) => setCaptureSettings((prev) => ({ ...prev, videoDeviceId: e.target.value }))}
                  >
                    {devices.video.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || 'Câmera'}
                      </option>
                    ))}
                  </select>
                </InlineField>
                <InlineField>
                  <label>Microfone</label>
                  <select
                    style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                    value={captureSettings.audioDeviceId}
                    onChange={(e) => setCaptureSettings((prev) => ({ ...prev, audioDeviceId: e.target.value }))}
                  >
                    {devices.audio.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || 'Microfone'}
                      </option>
                    ))}
                  </select>
                </InlineField>
                <ToggleRow>
                  <input type="checkbox" checked={applyEyeContact} onChange={(e) => setApplyEyeContact(e.target.checked)} />
                  Aplicar correção de olhar após salvar (stub IA)
                </ToggleRow>
                <ControlRow>
                  <Button onClick={startPreview}>Pré-visualizar</Button>
                  <Button variant="ghost" onClick={stopPreview}>Parar prévia</Button>
                </ControlRow>
                <ControlRow>
                  <Button onClick={isRecordingVideo ? stopRecording : startRecording}>
                    {isRecordingVideo ? 'Parar gravação' : 'Gravar agora'}
                  </Button>
                  <Pill>{captureSettings.resolution} • {captureSettings.fps} fps</Pill>
                </ControlRow>
              </div>
              <div>
                <h4>Prévia</h4>
                <VideoPreview ref={videoRef} autoPlay muted playsInline />
                <Subtle>Use iniciar/parar para ver o overlay sobre qualquer app (janela sem bordas + opacidade configurável).</Subtle>
              </div>
              <div>
                <h4>Última captura</h4>
                {recordingUrl || recordedPath ? (
                  <>
                    <VideoPreview ref={recordedRef} src={recordingUrl || recordedPath} controls playsInline />
                    <Subtle>{recordedPath ? `Arquivo salvo em: ${recordedPath}` : 'Prévia em memória'}</Subtle>
                  </>
                ) : (
                  <Subtle>Nenhum vídeo gravado ainda.</Subtle>
                )}
                <ControlRow>
                  <InlineField>
                    <label>Idioma das legendas</label>
                    <select
                      style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                      value={transcriptionLanguage}
                      onChange={(e) => setTranscriptionLanguage(e.target.value)}
                    >
                      <option value="pt-BR">Português</option>
                      <option value="en">Inglês</option>
                      <option value="es">Espanhol</option>
                    </select>
                  </InlineField>
                  <Button onClick={runTranscription}>Gerar legendas</Button>
                  <Button variant="ghost" onClick={() => exportSubtitles('srt')}>Exportar .srt</Button>
                  <Button variant="ghost" onClick={() => exportSubtitles('vtt')}>Exportar .vtt</Button>
                </ControlRow>
              </div>
            </Grid>

            {isAdvanced && (
              <Grid style={{ marginTop: 16 }}>
              <div>
                <h4>WordTrim (cortes por texto)</h4>
                <Subtle>Selecione trechos a {trimMode === 'remove' ? 'remover' : 'manter'}; o stub usa o primeiro trecho como demo com ffmpeg.</Subtle>
                <ControlRow>
                  <label>
                    <input
                      type="radio"
                      checked={trimMode === 'remove'}
                      onChange={() => setTrimMode('remove')}
                    />
                    Remover selecionados
                  </label>
                  <label>
                    <input type="radio" checked={trimMode === 'keep'} onChange={() => setTrimMode('keep')} />
                    Manter selecionados
                  </label>
                  <Button onClick={runWordTrim} disabled={!segments.length}>
                    Gerar corte
                  </Button>
                </ControlRow>
                <div style={{ maxHeight: 180, overflow: 'auto' }}>
                  {segments.map((seg) => (
                    <ToggleRow key={seg.id}>
                      <input type="checkbox" checked={selectedSegmentIds.has(seg.id)} onChange={() => toggleSegmentSelection(seg.id)} />
                      <div>
                        <strong>
                          {formatTime(seg.start)} - {formatTime(seg.end)}
                        </strong>
                        <div>{seg.text}</div>
                      </div>
                    </ToggleRow>
                  ))}
                </div>
              </div>

              <div>
                <h4>Marca d'água, trilha e B-roll</h4>
                <InlineField>
                  <label>Texto da marca d'água</label>
                  <input
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff' }}
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                  />
                </InlineField>
                <InlineField>
                  <label>Imagem (upload)</label>
                  <input type="file" accept="image/*" onChange={onWatermarkUpload} />
                  <Subtle>{watermarkImagePath || 'Nenhuma imagem carregada (stub usa drawtext)'} </Subtle>
                </InlineField>
                <InlineField>
                  <label>Trilha sonora</label>
                  <input type="file" accept="audio/*" onChange={onAudioUpload} />
                  <Subtle>{audioTrackPath || 'Sem trilha importada'}</Subtle>
                </InlineField>
                <InlineField>
                  <label>Volume trilha</label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                  />
                </InlineField>
                <Button onClick={mixVideo} disabled={!recordedPath}>
                  Aplicar mix (stub ffmpeg)
                </Button>

                <h4 style={{ marginTop: 12 }}>Sugestão de B-roll (stub por palavra-chave)</h4>
                {brollSuggestions.length ? (
                  brollSuggestions.map((item) => (
                    <div key={item.keyword} style={{ marginBottom: 8 }}>
                      <strong>{item.keyword}</strong> → {item.clipPath} ({Math.round(item.confidence * 100)}%)
                    </div>
                  ))
                ) : (
                  <Subtle>Gere legendas para ativar sugestões a partir do roteiro.</Subtle>
                )}
              </div>

              <div>
                <h4>Shorts/Reels automáticos</h4>
                <Subtle>Detectamos trechos de 15–60s com palavras-chave e sugerimos exportar 9:16.</Subtle>
                {shortSuggestions.length ? (
                  shortSuggestions.map((short) => (
                    <SectionCard key={short.id} style={{ marginTop: 8 }}>
                      <strong>{formatTime(short.start)} - {formatTime(short.end)}</strong>
                      <p>{short.reason}</p>
                      <Button onClick={() => exportShort(short)}>Exportar vertical 9:16</Button>
                    </SectionCard>
                  ))
                ) : (
                  <Subtle>Gere legendas para montar a lista de shorts automaticamente.</Subtle>
                )}
              </div>
              </Grid>
            )}
          </SectionCard>
        </Main>
      </Layout>
      {showTutorial && (
        <TutorialOverlay>
          <TutorialCard>
            <strong>{tutorialSteps[tutorialStep].title}</strong>
            <p>{tutorialSteps[tutorialStep].body}</p>
            <ControlRow>
              <Button variant="ghost" onClick={prevTutorial} aria-label="Passo anterior">
                Anterior
              </Button>
              <Button onClick={nextTutorial} aria-label="Próximo passo do tour">
                {tutorialStep === tutorialSteps.length - 1 ? 'Concluir' : 'Próximo'}
              </Button>
              <Button variant="ghost" onClick={completeTutorial} aria-label="Pular tour">
                Pular
              </Button>
            </ControlRow>
          </TutorialCard>
        </TutorialOverlay>
      )}
    </>
  );
}

export default App;
