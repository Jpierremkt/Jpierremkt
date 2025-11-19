import { db } from '../services/db';
import { v4 as uuid } from 'uuid';

const now = new Date().toISOString();

const clear = db.transaction(() => {
  db.exec('DELETE FROM recordings');
  db.exec('DELETE FROM scripts');
  db.exec('DELETE FROM profile_configs');
  db.exec('DELETE FROM live_stream_configs');
  db.exec('DELETE FROM projects');
  db.exec('DELETE FROM sync_queue');
});

const seed = db.transaction(() => {
  const projectId = uuid();
  const scriptId = uuid();
  const recordingId = uuid();
  const profileId = uuid();

  db.prepare(
    `INSERT INTO projects (id, name, description, syncEnabled, createdAt, updatedAt)
     VALUES (@id, @name, @description, @syncEnabled, @createdAt, @updatedAt)`
  ).run({
    id: projectId,
    name: 'Demo Studio',
    description: 'Projeto de exemplo com roteiro e gravação fictícia',
    syncEnabled: 0,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `INSERT INTO scripts (id, projectId, title, content, createdAt, updatedAt)
     VALUES (@id, @projectId, @title, @content, @createdAt, @updatedAt)`
  ).run({
    id: scriptId,
    projectId,
    title: 'Roteiro de boas-vindas',
    content: `Olá, criadores!\n\nEste é um roteiro de demonstração para testar o teleprompter.\n\nUse os botões de rolagem manual, ajuste velocidade e alterne para overlay para testar.`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `INSERT INTO profile_configs (id, projectId, name, baseSpeed, theme, fontFamily, fontSize, lineHeight, overlayPosition, overlayOpacity, recordingPreferences, createdAt)
     VALUES (@id, @projectId, @name, @baseSpeed, @theme, @fontFamily, @fontSize, @lineHeight, @overlayPosition, @overlayOpacity, @recordingPreferences, @createdAt)`
  ).run({
    id: profileId,
    projectId,
    name: 'Demo Overlay',
    baseSpeed: 120,
    theme: 'dark',
    fontFamily: 'Inter',
    fontSize: 22,
    lineHeight: 1.4,
    overlayPosition: 'center',
    overlayOpacity: 0.85,
    recordingPreferences: JSON.stringify({
      resolution: '1080p',
      fps: 30,
      audioDevice: 'default',
    }),
    createdAt: now,
  });

  db.prepare(
    `INSERT INTO recordings (id, projectId, scriptId, filePath, durationSeconds, notes, createdAt)
     VALUES (@id, @projectId, @scriptId, @filePath, @durationSeconds, @notes, @createdAt)`
  ).run({
    id: recordingId,
    projectId,
    scriptId,
    filePath: '/tmp/demo-recording.mp4',
    durationSeconds: 95,
    notes: 'Gravação fictícia para testar painel de performance e compartilhamento.',
    createdAt: now,
  });

  db.prepare(
    `INSERT INTO live_stream_configs (id, projectId, platform, rtmpUrl, streamKey, description, createdAt, updatedAt)
     VALUES (@id, @projectId, @platform, @rtmpUrl, @streamKey, @description, @createdAt, @updatedAt)`
  ).run({
    id: uuid(),
    projectId,
    platform: 'YouTube',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: 'demo-stream-key',
    description: 'Live de exemplo para testes de fluxo RTMP',
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `INSERT INTO sync_queue (id, projectId, entityType, entityId, payload, status, createdAt)
     VALUES (@id, @projectId, @entityType, @entityId, @payload, @status, @createdAt)`
  ).run({
    id: uuid(),
    projectId,
    entityType: 'project',
    entityId: projectId,
    payload: JSON.stringify({ action: 'upsert', entity: 'project', projectId }),
    status: 'pending',
    createdAt: now,
  });

  return { projectId, scriptId, recordingId, profileId };
});

clear();
const ids = seed();
console.log('Base demo carregada com sucesso:', ids);
console.log('Abra o app com "npm run dev" e selecione o projeto "Demo Studio".');
