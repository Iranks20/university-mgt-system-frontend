'use strict';

const { join } = require('path');
const { execSync } = require('child_process');

// This helper makes CI installs/builds deterministic when npm fails to install
// platform-specific optional native packages (Rollup, LightningCSS, Tailwind Oxide).
//
// We intentionally run this in CI only. Running it on developer machines can
// surface local Node/CPU-architecture mismatches (e.g. arm64 Node on x64 OS).
if (!(process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true')) {
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
  // Avoid recursive lifecycle execution by skipping scripts.
  execSync(`npm install "${pkg}@${version}" --no-save --ignore-scripts --no-audit --loglevel=error`, {
    cwd: root,
    stdio: 'inherit',
  });
}

function readRollupVersion() {
  return readPkgVersion('rollup');
}

function detectLibc() {
  if (process.platform !== 'linux') return null;
  try {
    const out = execSync('ldd --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return /musl/i.test(out) ? 'musl' : 'gnu';
  } catch {
    // Best effort: assume glibc on most distros (ubuntu-latest, debian, etc.)
    return 'gnu';
  }
}

function platformSuffix({ includeLibc } = { includeLibc: false }) {
  const plat = process.platform;
  const arch = process.arch;

  // Map Node arch to package arch segments where they differ.
  const a = arch === 'x64' ? 'x64' : arch === 'arm64' ? 'arm64' : arch;

  if (plat === 'linux') {
    const libc = detectLibc() || 'gnu';
    return includeLibc ? `linux-${a}-${libc}` : `linux-${a}-${libc}`;
  }
  if (plat === 'darwin') return `darwin-${a}`;
  if (plat === 'win32') return `win32-${a}-msvc`;
  if (plat === 'freebsd') return `freebsd-${a}`;
  if (plat === 'android') return `android-${a}`;
  return null;
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
  try {
    require(join(root, 'node_modules', 'lightningcss', 'node', 'index.js'));
    return;
  } catch (err) {
    const msg = String((err && err.message) || '');
    if (!msg.includes('lightningcss')) return;
  }

  const version = readPkgVersion('lightningcss');
  if (!version) return;

  const suffix = platformSuffix();
  if (!suffix) return;
  const platformPkg = `lightningcss-${suffix}`;

  try {
    installExact(platformPkg, version);
  } catch {
    return;
  }
}

function ensureTailwindOxideNative() {
  // @tailwindcss/oxide throws "Cannot find native binding" when its optional dep is missing.
  try {
    require(join(root, 'node_modules', '@tailwindcss', 'oxide', 'index.js'));
    return;
  } catch (err) {
    const msg = String((err && err.message) || '');
    if (!msg.toLowerCase().includes('native binding')) return;
  }

  const version = readPkgVersion('@tailwindcss/oxide');
  if (!version) return;

  const suffix = platformSuffix({ includeLibc: true });
  if (!suffix) return;

  // Special case: oxide also has wasm32-wasi; we only pick that if explicitly running wasm (not our case).
  const pkg = `@tailwindcss/oxide-${suffix}`;
  try {
    installExact(pkg, version);
  } catch {
    return;
  }
}

ensureRollupNative();
ensureLightningCssNative();
ensureTailwindOxideNative();
