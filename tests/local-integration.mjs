import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const base = 'http://localhost:5173';
async function post(path, data, cookie = '') {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(data) });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie };
}
const created = [];
try {
  const library = await (await fetch(base + '/api/library')).json();
  assert.ok(library.playlists.length > 0);
  const playlist = library.playlists.find(p => p.tracks.length >= 4 && p.tracks.length < 2048);
  assert.ok(playlist);
  assert.equal((await post('/api/playlist', { url: 'https://example.com/?list=PL123456789abc' })).status, 400);
  assert.equal((await post('/api/games', { playlistId: playlist.id, size: 2048 })).status, 400);
  const before = await (await fetch(base + '/api/ranking')).json();
  const game = await post('/api/games', { playlistId: playlist.id, size: 4 });
  assert.equal(game.status, 200); created.push(game.data.id);
  assert.equal(new Set(game.data.tracks.map(t => t.id)).size, 4);
  assert.equal((await post('/api/games/' + game.data.id, { winners: [] }, game.cookie)).status, 400);
  const winners = [game.data.tracks[0].id, game.data.tracks[2].id, game.data.tracks[0].id];
  assert.equal((await post('/api/games/' + game.data.id, { winners })).status, 404);
  assert.equal((await post('/api/games/' + game.data.id, { winners }, game.cookie)).status, 200);
  assert.equal((await post('/api/games/' + game.data.id, { winners }, game.cookie)).status, 200);
  const after = await (await fetch(base + '/api/ranking')).json();
  const sum = data => data.tracks.reduce((n, t) => n + t.crowns, 0);
  assert.equal(sum(after) - sum(before), 1);
  for (const source of ['blog', 'somunia', 'moesound']) {
    const response = await fetch(`${base}/api/posts?source=${source}`); const data = await response.json();
    assert.equal(response.status, 200); assert.ok(data.posts.length > 0);
  }
  console.log('PASS: real library, URL validation, tournament size, ownership, result validation, idempotency, three live feeds.');
} finally {
  // 이 검사에서 방금 생성한 게임만 제거하여 사용자 랭킹을 오염시키지 않습니다.
  for (const id of created) {
    assert.match(id, /^[a-f0-9-]{36}$/);
    const cleanup = spawnSync(process.execPath, ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', 'wrangler.local.json', '--persist-to', '.wrangler/state', '--command', `DELETE FROM games WHERE id='${id}'`], { encoding: 'utf8' });
    if (cleanup.status !== 0) throw new Error('Test record cleanup failed: ' + cleanup.stderr);
  }
}
