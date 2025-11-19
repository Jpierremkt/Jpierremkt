import { v4 as uuid } from 'uuid';
import { db } from './db';
import type { LiveStreamConfig, LiveStreamSession } from '@shared/types';

export class LiveStreamingService {
  private activeSessions: Map<string, LiveStreamSession> = new Map();

  list(projectId?: string): LiveStreamConfig[] {
    if (projectId) {
      return db.prepare('SELECT * FROM live_stream_configs WHERE projectId = ? ORDER BY updatedAt DESC').all(projectId);
    }
    return db.prepare('SELECT * FROM live_stream_configs ORDER BY updatedAt DESC').all();
  }

  save(payload: LiveStreamConfig): LiveStreamConfig {
    const now = new Date().toISOString();
    if (payload.id) {
      db.prepare(
        'UPDATE live_stream_configs SET platform = ?, rtmpUrl = ?, streamKey = ?, description = ?, updatedAt = ? WHERE id = ?'
      ).run(payload.platform, payload.rtmpUrl, payload.streamKey, payload.description || '', now, payload.id);
      return { ...payload, updatedAt: now };
    }

    const id = uuid();
    db.prepare(
      'INSERT INTO live_stream_configs (id, projectId, platform, rtmpUrl, streamKey, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, payload.projectId || null, payload.platform, payload.rtmpUrl, payload.streamKey, payload.description || '', now, now);

    return { ...payload, id, createdAt: now, updatedAt: now };
  }

  delete(id: string) {
    db.prepare('DELETE FROM live_stream_configs WHERE id = ?').run(id);
  }

  startStreaming(configId: string): LiveStreamSession {
    const config = db.prepare('SELECT * FROM live_stream_configs WHERE id = ?').get(configId) as LiveStreamConfig | undefined;
    if (!config) {
      throw new Error('Configuração RTMP não encontrada');
    }

    // Aqui integraríamos ffmpeg ou biblioteca RTMP (por exemplo, node-media-server) para empurrar vídeo/câmera.
    // Para demo, apenas simulamos um streaming ativo e retornamos o endpoint completo.
    const sessionId = uuid();
    const session: LiveStreamSession = {
      id: sessionId,
      configId,
      startedAt: new Date().toISOString(),
      status: 'live',
      outputEndpoint: `${config.rtmpUrl}/${config.streamKey}`
    };
    this.activeSessions.set(sessionId, session);
    console.log('[LiveStreamingService] iniciando streaming RTMP', session.outputEndpoint);
    return session;
  }

  stopStreaming(sessionId: string): LiveStreamSession {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    // Aqui encerraríamos o processo/stream RTMP real.
    const stopped: LiveStreamSession = { ...session, status: 'stopped' };
    this.activeSessions.delete(sessionId);
    console.log('[LiveStreamingService] parando streaming', sessionId);
    return stopped;
  }
}

