// 실행 파일과 프로젝트 위치를 기준으로 경로를 정해 공백·한글 폴더에서도 실행합니다.
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
if (!existsSync('node_modules/vinext/dist/cli.js')) {
  const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  if (!existsSync(npm)) throw new Error('Node.js와 npm을 설치한 다음 다시 실행해 주세요.');
  const installed = spawnSync(process.execPath, [npm, 'ci', '--no-audit', '--no-fund'], { stdio: 'inherit', cwd: root });
  if (installed.status !== 0) process.exit(installed.status || 1);
}
const initialized = spawnSync(process.execPath, ['scripts/local-init.mjs'], { stdio: 'inherit', cwd: root });
if (initialized.status !== 0) process.exit(initialized.status || 1);
console.log('\nSOTERIA ROOM: http://localhost:5173/\n');
const child = spawn(process.execPath, ['scripts/run-framework.mjs', 'dev', '--host', '127.0.0.1'], { stdio: 'inherit', cwd: root });
child.on('exit', code => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
