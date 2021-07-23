#!/usr/bin/env node
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const Juke = require('./.yarn/juke/index.cjs');

process.chdir(new URL('.', import.meta.url).pathname);

Juke.setup({
  file: import.meta.url,
});

const yarn = (...args) => Juke.exec('node', [
  '.yarn/releases/yarn-3.0.0-rc.12.cjs',
  ...args,
]);

const rm = (...args) => Juke.exec('rm', args);

export const YarnTarget = Juke.createTarget({
  executes: async () => {
    await yarn('install');
    const pnpApi = require('./.pnp.cjs');
    pnpApi.setup();
  },
});

export const DtsTarget = Juke.createTarget({
  dependsOn: [YarnTarget],
  executes: () => yarn(
    'dts-bundle-generator',
      '-o', 'dist/index.d.ts',
      'src/index.ts'
  ),
});

export const BundleTarget = Juke.createTarget({
  dependsOn: [YarnTarget],
  executes: async () => {
    const { build } = require('esbuild');
    const { pnpPlugin } = require('@yarnpkg/esbuild-plugin-pnp');
    await build({
      bundle: true,
      format: 'cjs',
      platform: 'node',
      plugins: [pnpPlugin()],
      entryPoints: ['src/index.ts'],
      outfile: 'dist/index.cjs',
    });
    const content = fs.readFileSync('dist/index.cjs', 'utf-8')
      .replaceAll(process.cwd() + '/.yarn/cache/', '');
    fs.writeFileSync('dist/index.cjs', content);
  },
});

export const TscTarget = Juke.createTarget({
  dependsOn: [YarnTarget],
  executes: () => yarn('tsc'),
});

export const UpdateLocalParameter = Juke.createParameter({
  type: 'boolean',
  alias: 'u',
});

export const BuildTarget = Juke.createTarget({
  dependsOn: [TscTarget, DtsTarget, BundleTarget],
  executes: async ({ get }) => {
    if (get(UpdateLocalParameter)) {
      Juke.logger.info('Updating local Juke version');
      for (const file of ['index.cjs', 'index.d.ts', 'package.json']) {
        fs.copyFileSync(`dist/${file}`, `.yarn/juke/${file}`);
      }
    }
  },
});

export const CleanTarget = Juke.createTarget({
  executes: async () => {
    await rm('-rf', '.yarn/cache');
    await rm('-rf', '.yarn/install-state.gz');
    await rm('-f', '.pnp.js');
    await rm('-rf', 'dist');
    await rm('-rf', 'node_modules');
  },
});

export default BuildTarget;
