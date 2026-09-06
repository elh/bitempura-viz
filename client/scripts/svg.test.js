const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transform } = require('@svgr/core');

test('upgraded SVGR keeps the CRA SVG component contract', async () => {
  const result = await transform('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0h20v20H0z"/></svg>', {
    plugins: ['@svgr/plugin-jsx'],
    svgo: false, titleProp: true, ref: true,
    exportType: 'named', namedExport: 'ReactComponent',
  }, { componentName: 'Icon' });
  assert.match(result, /ReactComponent/);
  assert.match(result, /forwardRef/);
  assert.match(result, /viewBox="0 0 20 20"/);
});
