// CRA 5 emits webpack-dev-server 4 options. Translate the removed options for v5.
const express = require('express');

module.exports = function adaptDevServerConfig(config) {
  const { https, onBeforeSetupMiddleware, onAfterSetupMiddleware, headers, ...options } = config;
  return {
    ...options,
    allowedHosts: Array.isArray(options.allowedHosts)
      ? options.allowedHosts.filter(Boolean).concat('localhost', '127.0.0.1')
      : options.allowedHosts,
    // Use v5's same-origin defaults rather than CRA's wildcard CORS headers.
    server: https ? { type: 'https', options: https === true ? {} : https } : 'http',
    setupMiddlewares(middlewares, devServer) {
      const before = express.Router();
      const after = express.Router();
      // Inherit live server state: the error-overlay middleware reads _stats
      // after compilation, so copying the current properties would become stale.
      onBeforeSetupMiddleware?.(Object.assign(Object.create(devServer), { app: before }));
      onAfterSetupMiddleware?.(Object.assign(Object.create(devServer), { app: after }));
      // Keep v5's Host/Origin checks ahead of user and CRA middleware.
      const index = middlewares.findIndex(item => item.name === 'webpack-dev-middleware');
      const result = [...middlewares];
      result.splice(index < 0 ? result.length : index, 0, before);
      return [...result, after];
    },
  };
};
