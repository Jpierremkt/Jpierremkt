import { v4 as uuid } from 'uuid';
import { db } from './db';
import type { ProfileConfig } from '@shared/types';

export class ProfileConfigService {
  list(projectId?: string) {
    if (projectId) {
      const stmt = db.prepare('SELECT * FROM profile_configs WHERE projectId = ? ORDER BY createdAt DESC');
      return stmt.all(projectId);
    }
    const stmt = db.prepare('SELECT * FROM profile_configs ORDER BY createdAt DESC');
    return stmt.all();
  }

  save(config: ProfileConfig) {
    const now = new Date().toISOString();
    if (config.id) {
      const stmt = db.prepare(
        'UPDATE profile_configs SET name = ?, projectId = ?, baseSpeed = ?, theme = ?, fontFamily = ?, fontSize = ?, lineHeight = ?, overlayPosition = ?, overlayOpacity = ?, recordingPreferences = ? WHERE id = ?'
      );
      stmt.run(
        config.name,
        config.projectId || '',
        config.baseSpeed,
        config.theme,
        config.fontFamily,
        config.fontSize,
        config.lineHeight,
        config.overlayPosition,
        config.overlayOpacity,
        config.recordingPreferences || '',
        config.id
      );
      return { ...config };
    }

    const id = uuid();
    const stmt = db.prepare(
      'INSERT INTO profile_configs (id, projectId, name, baseSpeed, theme, fontFamily, fontSize, lineHeight, overlayPosition, overlayOpacity, recordingPreferences, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(
      id,
      config.projectId || '',
      config.name,
      config.baseSpeed,
      config.theme,
      config.fontFamily,
      config.fontSize,
      config.lineHeight,
      config.overlayPosition,
      config.overlayOpacity,
      config.recordingPreferences || '',
      now
    );
    return { ...config, id, createdAt: now };
  }
}
