const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow bundling .wasm files (required for stockfish.wasm on web)
config.resolver.assetExts.push('wasm');

module.exports = config;
