#!/usr/bin/env node
// Importe une sélection d'icônes musicales de Lucide (ISC) et Tabler (MIT) dans vendor/icons/sprite-music.json.
// Usage : npm i --no-save lucide-static @tabler/icons && node tools/import_icons.mjs
import fs from 'node:fs';
import path from 'node:path';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const nm = path.join(R, 'node_modules');
const lucide = path.join(nm, 'lucide-static/icons');
const tabler = path.join(nm, '@tabler/icons/icons/outline');

const LUCIDE = ['piano', 'guitar', 'drum', 'mic-vocal', 'audio-waveform', 'audio-lines', 'music-2', 'music-3', 'music-4', 'disc-3',
  'headphones', 'sliders-vertical', 'sliders-horizontal', 'list-music', 'keyboard-music', 'graduation-cap', 'book-open-text', 'pen-tool',
  'file-music', 'cassette-tape', 'radio', 'speaker', 'ear', 'library', 'layers-3', 'waves', 'notebook-pen', 'book-headphones'];
const TABLER = ['metronome', 'vinyl', 'guitar-pick', 'microphone-2', 'playlist', 'wave-sine', 'wave-square', 'wave-saw-tool', 'note',
  'notes', 'adjustments-horizontal', 'device-speaker', 'school', 'player-record', 'music', 'piano', 'clock-record', 'adjustments'];

const inner = (file) => fs.readFileSync(file, 'utf8')
  .replace(/<!--.*?-->/gs, '')
  .replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '')
  .replace(/\s+/g, ' ').trim();
const out = {};
for (const n of LUCIDE) out['lu-' + n] = inner(`${lucide}/${n}.svg`);
for (const n of TABLER) out['tb-' + n] = inner(`${tabler}/${n}.svg`);
fs.writeFileSync(path.join(R, 'vendor/icons/sprite-music.json'), JSON.stringify(out, null, 0));
console.log(Object.keys(out).length, 'icônes importées');
