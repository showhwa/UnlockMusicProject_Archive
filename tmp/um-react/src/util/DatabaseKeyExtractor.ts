import { getFileName } from './pathHelper';
import { SQLDatabase, SQLStatic, loadSQL } from './sqlite';
import { KuGou } from '@unlock-music/crypto';

export interface QMAndroidKeyEntry {
  name: string;
  ekey: string;
}

export type KugouKeyEntry = {
  audioHash: string;
  ekey: string;
};

export class DatabaseKeyExtractor {
  private static _instance: DatabaseKeyExtractor;

  static async getInstance() {
    if (!DatabaseKeyExtractor._instance) {
      DatabaseKeyExtractor._instance = new DatabaseKeyExtractor(await loadSQL());
    }
    return DatabaseKeyExtractor._instance;
  }

  constructor(private SQL: SQLStatic) {}

  private hasTable(db: SQLDatabase, name: string): boolean {
    const tables = db.exec('SELECT name FROM sqlite_master WHERE type="table"')[0].values.map((x) => x[0]);
    return tables.includes(name);
  }

  extractQmcV2KeysFromSqliteDb(buffer: ArrayBuffer): null | QMAndroidKeyEntry[] {
    let db: SQLDatabase | null = null;

    try {
      db = new this.SQL.Database(new Uint8Array(buffer));

      let sql: undefined | string;
      if (this.hasTable(db, 'audio_file_ekey_table')) {
        sql = 'select file_path, ekey from audio_file_ekey_table';
      } else if (this.hasTable(db, 'EKeyFileInfo')) {
        sql = 'select filePath, eKey from EKeyFileInfo';
      }
      if (!sql) return null;

      const result = db.exec(sql);
      if (result.length === 0) {
        return [];
      }

      const keys = result[0].values;
      return keys.map(([path, ekey]) => ({
        // strip dir name
        name: getFileName(String(path)),
        ekey: String(ekey),
      }));
    } finally {
      db?.close();
    }
  }

  extractKugouKeyFromEncryptedDb(buffer: ArrayBuffer): null | KugouKeyEntry[] {
    const dbBuffer = new Uint8Array(buffer);
    let db: SQLDatabase | null = null;

    try {
      KuGou.decryptDatabase(dbBuffer);
      db = new this.SQL.Database(dbBuffer);

      let sql: undefined | string;
      if (this.hasTable(db, 'ShareFileItems')) {
        sql = `
          select H, K from (
            select EncryptionKeyId as H, EncryptionKey as K from ShareFileItems
            union all
            select EnHash as H, EnKey as K from DownloadItem
          ) t
          where
                  t.H is not null and t.H != ''
              and t.K is not null and t.K != ''
          group by t.H
        `;
      }
      if (!sql) return null;

      const result = db.exec(sql);
      if (result.length === 0) {
        return [];
      }

      const keys = result[0].values;
      return keys.map(([audioHash, ekey]) => ({
        // strip dir name
        audioHash: String(audioHash).normalize(),
        ekey: String(ekey).normalize(),
      }));
    } finally {
      db?.close();
    }
  }
}
