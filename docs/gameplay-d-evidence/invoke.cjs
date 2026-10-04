'use strict';
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const logDir = path.join(__dirname, 'logs');
fs.mkdirSync(logDir, {recursive: true});
const commands = [
  ['node', ['tests/ui-interaction.cjs']],
  ['node', ['tests/acceptance-final.cjs']],
  ['node', ['tests/acceptance-supplement.cjs']],
  ['node', ['tests/av-audio.cjs']],
  ['node', ['tests/av-integration.cjs', '--idle', '60']],
  ['node', ['tests/av-visual.cjs']],
  ['node', ['tests/milestone-b-edge.cjs']],
  ['node', ['tests/milestone-b-edge-migrate.cjs']],
  ['node', ['tests/milestone-b-edge-review.cjs']]
];
(async () => {
  const summary = [];
  for (const [cmd, args] of commands) {
    const name = args[0].replace(/^tests\//, '').replace(/\.cjs$/, '') + (args.includes('--idle') ? '-idle60' : '');
    const outPath = path.join(logDir, name + '.txt');
    const started = Date.now();
    const code = await new Promise(resolve => {
      const chunks = [];
      const child = spawn(cmd, args, {cwd: root, env: {...process.env, ACCEPTANCE_DIR: 'gameplay-d-evidence'}, windowsHide: true});
      child.stdout.on('data', d => chunks.push(d));
      child.stderr.on('data', d => chunks.push(d));
      child.on('error', e => { chunks.push(Buffer.from(String(e.stack || e))); resolve(1); });
      child.on('close', code => {
        fs.writeFileSync(outPath, Buffer.concat(chunks));
        resolve(code === null ? 1 : code);
      });
    });
    const row = {command: [cmd, ...args].join(' '), exitCode: code, ms: Date.now() - started, log: outPath};
    summary.push(row);
    console.log(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(__dirname, 'exit-codes.json'), JSON.stringify(summary, null, 2));
})();
