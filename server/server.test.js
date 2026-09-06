const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const http = require('node:http');

test('serves fixture histories over HTTP with the upgraded query parser', { timeout: 15000 }, async t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'bitempura-api-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const fixture = { TestName: 'smoke', Passed: true, Histories: { A: [] } };
  writeFileSync(path.join(directory, 'test.json'), JSON.stringify(fixture));
  // Reserve a free port; the child owns the actual application listener.
  const probe = http.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: __dirname, env: { ...process.env, TEST_OUTPUT_DIR: directory, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Server exited: ${code}`)));
    child.stdout.once('data', resolve);
  });
  const response = await fetch(`http://127.0.0.1:${port}/test_output?a[b]=1`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { tests: [fixture], test_output_dir: directory });
  assert.equal((await fetch(`http://127.0.0.1:${port}/missing`)).status, 404);
});
