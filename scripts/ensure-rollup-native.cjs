'use strict';

const { join } = require('path');
const { execSync } = require('child_process');

// This helper exists to make CI builds deterministic when npm fails to install
// Rollup's platform-specific optional binary package.
// Only run in CI and only on Linux runners.
if (!(process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true')) {
  process.exit(0);
}
if (process.platform !== 'linux') {
  process.exit(0);
}

const root = join(__dirname, '..');

function readPkgVersion(name) {
  try {
    return require(join(root, 'node_modules', name, 'package.json')).version;
  } catch {
    return null;
  }
}

function installExact(pkg, version) {
  execSync(`npm install "${pkg}@${version}" --no-save --loglevel=error`, {
    cwd: root,
    stdio: 'inherit',
  });
}

function readRollupVersion() {
  return readPkgVersion('rollup');
}

function ensureRollupNative() {
  try {
    require(join(root, 'node_modules', 'rollup', 'dist', 'native.js'));
    return;
  } catch (err) {
    const inner = err && err.cause;
    const msg = String((inner && inner.message) || (err && err.message) || '');
    const match = msg.match(/@rollup\/rollup-[\w-]+/);
    if (!match) return;
    const pkg = match[0];
    const version = readRollupVersion();
    if (!version) return;
    try {
      installExact(pkg, version);
    } catch {
      return;
    }
    try {
      require(join(root, 'node_modules', 'rollup', 'dist', 'native.js'));
    } catch {
      return;
    }
  }
}

function ensureLightningCssNative() {
  // lightningcss loads a platform-specific package like lightningcss-linux-x64-gnu
  // that contains the native .node file.
  try {
    require(join(root, 'node_modules', 'lightningcss', 'node', 'index.js'));
    return;
  } catch (err) {
    const msg = String((err && err.message) || '');
    if (!msg.includes('lightningcss')) return;
  }

  const version = readPkgVersion('lightningcss');
  if (!version) return;

  // GitHub Actions ubuntu-latest is glibc, x64.
  const platformPkg = process.arch === 'arm64' ? 'lightningcss-linux-arm64-gnu' : 'lightningcss-linux-x64-gnu';

  try {
    installExact(platformPkg, version);
  } catch {
    return;
  }
}

ensureRollupNative();
ensureLightningCssNative();
