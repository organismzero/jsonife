#!/usr/bin/env node
/**
 * Package Jsonife installers for distribution.
 *
 * Usage:
 *   npm run release                    # package for current OS
 *   npm run release -- --platform win  # Windows (NSIS) — on Linux needs Wine
 *   npm run release -- --platform mac
 *   npm run release -- --platform linux
 *   npm run release -- --platform all  # all targets the host can build
 *
 * Options:
 *   --platform <linux|win|mac|all>   Target OS (default: host OS)
 *   --skip-test                      Skip `npm test`
 *   --skip-build                     Skip `npm run build` (reuse existing dist/)
 *   --publish                        Pass through to electron-builder (-p always)
 *   --help                           Show help
 *
 * Artifacts are written to ./release/
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { platform as osPlatform } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = join(root, 'release')

const PLATFORMS = ['linux', 'win', 'mac', 'all']

function usage() {
  console.log(`Jsonife release packager

Usage:
  node scripts/release.mjs [options]

Options:
  --platform <linux|win|mac|all>   Target platform (default: ${hostPlatform()})
  --skip-test                      Skip unit tests
  --skip-build                     Skip electron-vite production build
  --publish                        Publish via electron-builder (requires credentials)
  --help                           Show this message

Output directory: release/
`)
}

function hostPlatform() {
  switch (osPlatform()) {
    case 'win32':
      return 'win'
    case 'darwin':
      return 'mac'
    default:
      return 'linux'
  }
}

function parseArgs(argv) {
  const opts = {
    platform: hostPlatform(),
    skipTest: false,
    skipBuild: false,
    publish: false,
    help: false
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      opts.help = true
    } else if (arg === '--skip-test') {
      opts.skipTest = true
    } else if (arg === '--skip-build') {
      opts.skipBuild = true
    } else if (arg === '--publish') {
      opts.publish = true
    } else if (arg === '--platform') {
      const value = argv[++i]
      if (!value || !PLATFORMS.includes(value)) {
        console.error(`Invalid --platform. Expected one of: ${PLATFORMS.join(', ')}`)
        process.exit(1)
      }
      opts.platform = value
    } else {
      console.error(`Unknown option: ${arg}`)
      usage()
      process.exit(1)
    }
  }

  return opts
}

function run(label, command, args, extraEnv = {}) {
  console.log(`\n▶ ${label}\n`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  })
  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${result.status ?? 1})`)
    process.exit(result.status ?? 1)
  }
}

function readVersion() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  return pkg.version
}

function builderArgs(platform, publish) {
  const args = ['electron-builder', '--config', 'electron-builder.yml']
  if (publish) {
    args.push('-p', 'always')
  } else {
    args.push('-p', 'never')
  }

  if (platform === 'all') {
    args.push('--linux', '--win', '--mac')
  } else if (platform === 'linux') {
    args.push('--linux')
  } else if (platform === 'win') {
    args.push('--win')
  } else if (platform === 'mac') {
    args.push('--mac')
  }

  return args
}

function warnCrossCompile(platform) {
  const host = hostPlatform()
  if (platform === 'all') {
    console.log(
      '\nNote: --platform all builds every target your host supports.\n' +
        '  • Windows installers on Linux require Wine + NSIS (electron-builder will prompt or skip).\n' +
        '  • macOS DMG requires a Mac (or a macOS CI runner).\n'
    )
    return
  }
  if (platform !== host) {
    console.log(
      `\nNote: packaging for ${platform} on a ${host} host may need extra tooling (Wine for win on Linux, macOS for mac).\n`
    )
  }
}

function listArtifacts() {
  if (!existsSync(releaseDir)) return
  const entries = readdirSync(releaseDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort()
  if (entries.length === 0) {
    console.log('\nNo files in release/ (check electron-builder logs).')
    return
  }
  console.log('\nRelease artifacts:')
  for (const name of entries) {
    console.log(`  release/${name}`)
  }
}

const opts = parseArgs(process.argv.slice(2))
if (opts.help) {
  usage()
  process.exit(0)
}

const version = readVersion()
console.log(`Jsonife v${version} — packaging for: ${opts.platform}`)
warnCrossCompile(opts.platform)

if (!opts.skipTest) {
  run('Unit tests', 'npm', ['test'])
}

if (!opts.skipBuild) {
  run('Production build', 'npm', ['run', 'build'])
}

run('electron-builder', 'npx', builderArgs(opts.platform, opts.publish))

listArtifacts()
console.log('\n✓ Release packaging finished.\n')
