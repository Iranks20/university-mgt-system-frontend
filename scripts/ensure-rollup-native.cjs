'use strict';

const { join } = require('path');
const { execSync } = require('child_process');

if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
  process.exit(0);
}

const root = join(__dirname, '..');

function readRollupVersion() {
  try {
    return require(join(root, 'node_modules', 'rollup', 'package.json')).version;
  } catch {
    return null;
  }
}

try {
  require(join(root, 'node_modules', 'rollup', 'dist', 'native.js'));
  process.exit(0);
} catch (err) {
  const inner = err && err.cause;
  const msg = String((inner && inner.message) || (err && err.message) || '');
  const match = msg.match(/@rollup\/rollup-[\w-]+/);
  if (!match) {
    process.exit(0);
  }
  const pkg = match[0];
  const version = readRollupVersion();
  if (!version) {
    process.exit(0);
  }
  try {
    execSync(`npm install "${pkg}@${version}" --no-save --loglevel=error`, {
      cwd: root,
      stdio: 'inherit',
    });
  } catch {
    process.exit(0);
  }
  try {
    require(join(root, 'node_modules', 'rollup', 'dist', 'native.js'));
  } catch {
    process.exit(0);
  }
}
