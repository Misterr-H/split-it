const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// Ensure Metro knows the project root is this folder
config.projectRoot = projectRoot;

// Fix for Windows Android release builds in monorepos:
// On Windows the Gradle plugin passes the entry file as a relative path (e.g. "index.js").
// Expo CLI sets unstable_serverRoot to the workspace root (D:/portfolio/split-it) via
// getMetroServerRoot, so Metro tries to resolve "./index.js" from the workspace root instead
// of the project root — failing because index.js lives in apps/mobile-app, not the repo root.
// Pinning unstable_serverRoot to projectRoot ensures the relative entry path resolves correctly.
config.server = {
  ...config.server,
  unstable_serverRoot: projectRoot,
};

module.exports = config;
