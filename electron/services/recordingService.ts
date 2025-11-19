import { v4 as uuid } from 'uuid';
import { db } from './db';
import type { RecordingPayload } from '@shared/types';

export class RecordingService {
  list(projectId?: string) {
    if (projectId) {
      return db
        .prepare('SELECT * FROM recordings WHERE projectId = ? ORDER BY createdAt DESC')
        .all(projectId);
    }
    return db.prepare('SELECT * FROM recordings ORDER BY createdAt DESC').all();
  }

  save(payload: RecordingPayload) {
    const now = new Date().toISOString();
    if (payload.id) {
      const stmt = db.prepare(
        'UPDATE recordings SET projectId = ?, scriptId = ?, filePath = ?, durationSeconds = ?, notes = ? WHERE id = ?'
      );
      stmt.run(
        payload.projectId || '',
        payload.scriptId || '',
        payload.filePath,
        payload.durationSeconds,
        payload.notes || '',
        payload.id
      );
      return { ...payload };
    }

    const id = uuid();
    const stmt = db.prepare(
      'INSERT INTO recordings (id, projectId, scriptId, filePath, durationSeconds, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(
      id,
      payload.projectId || '',
      payload.scriptId || '',
      payload.filePath,
      payload.durationSeconds,
      payload.notes || '',
      now
    );
    return { ...payload, id, createdAt: now };
  }
}
