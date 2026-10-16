// Metro only watches the project directory by default. The shared package is linked in
// from ../packages/core, so Metro has to watch that folder too.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, "../packages/core")];

module.exports = config;
