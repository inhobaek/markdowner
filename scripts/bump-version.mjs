#!/usr/bin/env node
// Bump the repo-root VERSION file using the project's date-based scheme
// (MAJOR.YYMMDD.PATCH) and propagate it into package.json / tauri.conf.json /
// Cargo.toml via syncVersion(). Touches files only — no git operations.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { syncVersion } from './sync-version.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const versionFile = path.join(projectRoot, 'VERSION');

const versionRe = /^(\d+)\.(\d+)\.(\d+)$/;

function usage() {
  console.log(`Usage:
  pnpm bump refresh   Set the date to today; patch resets to 0 on a new day,
                      otherwise increments (e.g. 0.260528.2 -> 0.260606.0)
  pnpm bump major     Bump the major number; date becomes today, patch resets
                      to 0 (e.g. 0.260606.1 -> 1.260606.0)`);
}

// YYMMDD for the local date.
function todayStamp(date = new Date()) {
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// Pure: derive the next version string from the current one.
function nextVersion(current, command, today = todayStamp()) {
  const m = current.match(versionRe);
  if (!m) {
    throw new Error(`invalid VERSION "${current}" — expected MAJOR.YYMMDD.PATCH`);
  }
  const major = Number(m[1]);
  const date = m[2];
  const patch = Number(m[3]);

  switch (command) {
    case 'refresh':
      return date === today ? `${major}.${date}.${patch + 1}` : `${major}.${today}.0`;
    case 'major':
      return `${major + 1}.${today}.0`;
    default:
      throw new Error(`unknown command "${command}" — expected "refresh" or "major"`);
  }
}

function bumpVersion(command) {
  const current = fs.readFileSync(versionFile, 'utf8').trim();
  const next = nextVersion(current, command);
  fs.writeFileSync(versionFile, `${next}\n`);
  console.log(`VERSION ${current} -> ${next}`);
  syncVersion();
}

function main() {
  const command = process.argv[2];
  if (!command || command === '-h' || command === '--help') {
    usage();
    process.exit(command ? 0 : 1);
  }
  try {
    bumpVersion(command);
  } catch (err) {
    console.error(`error: ${err.message}`);
    usage();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
