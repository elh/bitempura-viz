process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';
require('react-scripts/config/env');

const adapt = require('./dev-server-config');
const configPath = require.resolve('react-scripts/config/webpackDevServer.config');
const createConfig = require(configPath);
require.cache[configPath].exports = (...args) => adapt(createConfig(...args));
require('react-scripts/scripts/start');
