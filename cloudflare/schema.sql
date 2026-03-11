-- Main albums table
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  release_group_mbid TEXT UNIQUE,
  release_type TEXT DEFAULT 'Album',
  listen_count INTEGER,
  user_count INTEGER,
  canonical_score INTEGER NOT NULL DEFAULT 0,
  first_release_date TEXT,
  mb_rating REAL,
  mb_rating_count INTEGER
);

-- FTS5 virtual table for fast prefix search
CREATE VIRTUAL TABLE IF NOT EXISTS albums_fts USING fts5(
  title,
  artist_name,
  content='albums',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

-- Triggers to keep FTS index in sync with albums table
CREATE TRIGGER IF NOT EXISTS albums_ai AFTER INSERT ON albums BEGIN
  INSERT INTO albums_fts(rowid, title, artist_name)
  VALUES (new.id, new.title, new.artist_name);
END;

CREATE TRIGGER IF NOT EXISTS albums_ad AFTER DELETE ON albums BEGIN
  INSERT INTO albums_fts(albums_fts, rowid, title, artist_name)
  VALUES ('delete', old.id, old.title, old.artist_name);
END;

CREATE TRIGGER IF NOT EXISTS albums_au AFTER UPDATE ON albums BEGIN
  INSERT INTO albums_fts(albums_fts, rowid, title, artist_name)
  VALUES ('delete', old.id, old.title, old.artist_name);
  INSERT INTO albums_fts(rowid, title, artist_name)
  VALUES (new.id, new.title, new.artist_name);
END;

-- Indexes for ranking and lookups
CREATE INDEX IF NOT EXISTS idx_albums_listen_count ON albums(listen_count DESC);
CREATE INDEX IF NOT EXISTS idx_albums_canonical_score ON albums(canonical_score DESC);
CREATE INDEX IF NOT EXISTS idx_albums_release_group ON albums(release_group_mbid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_title_artist ON albums(title, artist_name);
