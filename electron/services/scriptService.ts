import { v4 as uuid } from 'uuid';
import { db } from './db';
import type { ScriptPayload } from '@shared/types';

export class ScriptService {
  listScripts(projectId?: string) {
    if (projectId) {
      const stmt = db.prepare('SELECT * FROM scripts WHERE projectId = ? ORDER BY updatedAt DESC');
      return stmt.all(projectId);
    }
    const stmt = db.prepare('SELECT * FROM scripts ORDER BY updatedAt DESC');
    return stmt.all();
  }

  getScript(id: string) {
    const stmt = db.prepare('SELECT * FROM scripts WHERE id = ?');
    return stmt.get(id);
  }

  saveScript(payload: ScriptPayload) {
    const now = new Date().toISOString();
    if (payload.id) {
      const stmt = db.prepare(
        'UPDATE scripts SET title = ?, content = ?, projectId = ?, updatedAt = ? WHERE id = ?'
      );
      stmt.run(payload.title, payload.content, payload.projectId || '', now, payload.id);
      return { ...payload, updatedAt: now };
    }

    const id = uuid();
    const stmt = db.prepare(
      'INSERT INTO scripts (id, projectId, title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, payload.projectId || '', payload.title, payload.content, now, now);
    return { ...payload, id, createdAt: now, updatedAt: now };
  }

  deleteScript(id: string) {
    const stmt = db.prepare('DELETE FROM scripts WHERE id = ?');
    stmt.run(id);
  }
}
