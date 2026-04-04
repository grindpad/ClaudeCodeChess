const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow bundling .wasm files (required for stockfish.wasm on web)
config.resolver.assetExts.push('wasm');

// Zustand v5 ships ESM (.mjs) files that use `import.meta`, which Metro/Hermes
// cannot parse. Force all zustand sub-path imports to their CJS equivalents.
const _resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('zustand')) {
    // e.g. "zustand/middleware" → "<root>/node_modules/zustand/middleware.js"
    const subpath = moduleName.replace('zustand', '').replace(/^\//, '') || 'index';
    const cjsPath = path.resolve(__dirname, 'node_modules/zustand', `${subpath}.js`);
    return { filePath: cjsPath, type: 'sourceFile' };
  }
  if (_resolveRequest) return _resolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
