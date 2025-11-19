import { v4 as uuid } from 'uuid';
import { db } from './db';
import type { ProjectPayload } from '@shared/types';

export class ProjectService {
  listProjects() {
    const stmt = db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC');
    return stmt.all();
  }

  getProject(id: string) {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id);
  }

  saveProject(payload: ProjectPayload) {
    const now = new Date().toISOString();
    if (payload.id) {
      const stmt = db.prepare(
        'UPDATE projects SET name = ?, description = ?, syncEnabled = ?, syncProvider = ?, updatedAt = ? WHERE id = ?'
      );
      stmt.run(payload.name, payload.description || '', payload.syncEnabled ? 1 : 0, payload.syncProvider || '', now, payload.id);
      return { ...payload, updatedAt: now };
    }

    const id = uuid();
    const stmt = db.prepare(
      'INSERT INTO projects (id, name, description, syncEnabled, syncProvider, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, payload.name, payload.description || '', payload.syncEnabled ? 1 : 0, payload.syncProvider || '', now, now);
    return { ...payload, id, createdAt: now, updatedAt: now };
  }

  deleteProject(id: string) {
    db.prepare('DELETE FROM scripts WHERE projectId = ?').run(id);
    db.prepare('DELETE FROM recordings WHERE projectId = ?').run(id);
    db.prepare('DELETE FROM profile_configs WHERE projectId = ?').run(id);
    db.prepare('DELETE FROM sync_queue WHERE projectId = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }
}
