const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const webpack = require('webpack');
const DevServer = require('webpack-dev-server');
const adapt = require('./dev-server-config');

test('v5 compiles, proxies API requests and preserves middleware order and Host checks', { timeout: 30000 }, async t => {
  const backend = http.createServer((req, res) => res.end(JSON.stringify({ tests: [] })));
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => backend.close(resolve)));
  const compiler = webpack({ mode: 'development', entry: {}, output: { path: '/private/tmp/bitempura-webpack-test' }, infrastructureLogging: { level: 'error' } });
  const server = new DevServer({
    ...adapt({
      https: false, allowedHosts: [undefined], headers: { 'Access-Control-Allow-Origin': '*' },
      proxy: [{ context: ['/test_output'], target: `http://127.0.0.1:${backend.address().port}` }],
      onBeforeSetupMiddleware(devServer) {
        devServer.app.use((req, res, next) => {
          res.setHeader('X-Before', 'yes');
          if (req.url === '/stats') return res.end(String(devServer._stats?.marker));
          next();
        });
      },
      onAfterSetupMiddleware({ app }) { app.use((req, res) => res.end('after')); },
    }),
    port: 0, host: '127.0.0.1', hot: false, client: false, static: false,
  }, compiler);
  t.after(async () => { await server.stop(); await new Promise(resolve => compiler.close(resolve)); });
  await server.start();
  const url = `http://127.0.0.1:${server.server.address().port}`;
  const response = await fetch(`${url}/test_output`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { tests: [] });
  assert.equal(response.headers.get('X-Before'), 'yes');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(await (await fetch(`${url}/missing`)).text(), 'after');
  server._stats = { marker: 'recompiled' };
  assert.equal(await (await fetch(`${url}/stats`)).text(), 'recompiled');
  const status = await new Promise((resolve, reject) => {
    http.get(url, { headers: { Host: 'malicious.example' } }, response => {
      response.resume();
      resolve(response.statusCode);
    }).on('error', reject);
  });
  assert.equal(status, 403);
});

test('HTTPS certificate options survive translation', () => {
  const options = { key: 'key', cert: 'cert' };
  assert.deepEqual(adapt({ https: options }).server, { type: 'https', options });
});

test('patched serialization preserves functions, dates and regexes', () => {
  const serialize = require('serialize-javascript');
  const restored = require('node:vm').runInNewContext(`(${serialize({ fn: x => x + 1, date: new Date(0), regex: /abc/i, text: '</script>' })})`);
  assert.equal(restored.fn(2), 3);
  assert.equal(restored.date.getTime(), 0);
  assert.ok(restored.regex.test('ABC'));
  assert.equal(restored.text, '</script>');
});
