#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// T16 — cross-platform gradle runner for the Capacitor android shell. The
// host JDK is 17 (Capacitor 8 needs 21), so every invocation pins JAVA_HOME
// to the documented JDK 21 install. Usage:
//   node scripts/android-build.mjs <task>   e.g. bundleRelease | assembleDebug
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const task = process.argv[2];
if (!task) {
  console.error('usage: node scripts/android-build.mjs <gradle-task>');
  process.exit(1);
}
const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const androidDir = join(root, 'android');
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
const JAVA_HOME = 'C:\\Users\\raghu\\.jdks\\jdk21\\jdk-21.0.13+9';
if (process.platform !== 'win32' || !existsSync(join(JAVA_HOME, 'bin', 'java.exe'))) {
  console.error('[android-build] JDK 21 not found at the documented path — see docs/BUILD-STORES.md');
  process.exit(1);
}
// Windows: node >=18.20 refuses to spawn .bat/.cmd directly (CVE-2024-27980,
// EINVAL) — go through the shell there, quoting the batch path defensively.
// POSIX: exec ./gradlew directly, no shell.
const win = process.platform === 'win32';
const res = spawnSync(win ? `"${join(androidDir, gradlew)}"` : join(androidDir, gradlew), [task], {
  cwd: androidDir,
  env: { ...process.env, JAVA_HOME },
  stdio: 'inherit',
  shell: win,
});
process.exit(res.status ?? 1);
