import { v4 as uuid } from 'uuid';
import { db } from './db';
import type { SyncChange } from '@shared/types';

export class SyncService {
  enqueue(projectId: string, entityType: SyncChange['entityType'], entityId: string, payload: any) {
    const id = uuid();
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT INTO sync_queue (id, projectId, entityType, entityId, payload, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, projectId, entityType, entityId, JSON.stringify(payload), 'pending', createdAt);
    return { id, projectId, entityType, entityId, payload, status: 'pending', createdAt } as SyncChange;
  }

  list(projectId?: string) {
    if (projectId) {
      return db
        .prepare('SELECT * FROM sync_queue WHERE projectId = ? ORDER BY createdAt DESC')
        .all(projectId)
        .map(this.deserialize);
    }
    return db.prepare('SELECT * FROM sync_queue ORDER BY createdAt DESC').all().map(this.deserialize);
  }

  markSynced(id: string) {
    db.prepare('UPDATE sync_queue SET status = ? WHERE id = ?').run('synced', id);
  }

  processPending(projectId?: string) {
    const filter = projectId ? 'WHERE projectId = ? AND status = ?' : 'WHERE status = ?';
    const stmt = db.prepare(`SELECT * FROM sync_queue ${filter}`);
    const rows = projectId ? stmt.all(projectId, 'pending') : stmt.all('pending');
    const ids = rows.map((row: any) => row.id as string);
    const updateStmt = db.prepare(`UPDATE sync_queue SET status = ? WHERE id = ?`);
    db.transaction((toMark: string[]) => {
      toMark.forEach((id) => updateStmt.run('synced', id));
    })(ids);

    return { processed: ids.length, processedAt: new Date().toISOString() };
  }

  private deserialize(row: any): SyncChange {
    return { ...row, payload: JSON.parse(row.payload) } as SyncChange;
  }
}
