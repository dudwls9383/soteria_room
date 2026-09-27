-- 여러 번 실행해도 기존 데이터를 지우지 않는 로컬 초기화 스키마입니다.
CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, tracks TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY NOT NULL, visitor TEXT NOT NULL, playlist_id TEXT NOT NULL, tracks TEXT NOT NULL, created_at INTEGER NOT NULL, completed_at INTEGER, results TEXT, winners TEXT);
CREATE INDEX IF NOT EXISTS idx_games_visitor_created ON games(visitor,created_at);
CREATE TABLE IF NOT EXISTS recommendations (id TEXT PRIMARY KEY NOT NULL, visitor TEXT NOT NULL, nickname TEXT NOT NULL, title TEXT NOT NULL, artist TEXT NOT NULL, url TEXT NOT NULL, note TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_recommendations_created ON recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_visitor_created ON recommendations(visitor,created_at);
