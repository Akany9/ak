#!/usr/bin/env node
// Assemble le fichier unique dist/solfege-quest.html (remplace build.py + tools/opt/minify.mjs).
//
//   node tools/build.mjs          → dist/solfege-quest.html
//   node tools/build.mjs --exe    → idem + ../solfegequest-cpp/res/app.html.gz (signal de vie de l'exe ajouté)
//
// Prérequis : npm install (esbuild) dans ce dossier.
//
// src/index.html     gabarit : /*{{FONTS}}*/ /*{{CSS}}*/ <!--{{SPRITE}}--> /*{{JS}}*/
// src/css/*.css      concaténés dans l'ordre alphabétique
// src/js/*.js        concaténés dans l'ordre alphabétique (une seule portée de script)
// vendor/fonts/      fonts.css ({{FILE:x.woff2}} → base64) ; polices optionnelles : voir vendor/fonts/LISEZMOI.md
// vendor/data/*.js   gros littéraux (échantillons, pdf.js, glyphes Bravura) réinjectés à la place de /*{{NOM}}*/{}
// vendor/icons/*.json sprite d'icônes (Feather + icônes musique Lucide/Tabler + icônes maison)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(R, p), 'utf8');
const list = (dir, ext) => fs.readdirSync(path.join(R, dir)).filter((f) => f.endsWith(ext)).sort().map((f) => path.join(dir, f));
const exe = process.argv.includes('--exe');

// --- polices : fonts.css + polices facultatives déposées par l'utilisateur (SF Pro, Valky, Ogg)
const FONT_DIR = 'vendor/fonts';
let fonts = rd(`${FONT_DIR}/fonts.css`).replace(/\{\{FILE:([^}]+)\}\}/g, (_, f) =>
  fs.readFileSync(path.join(R, FONT_DIR, f)).toString('base64'));
const optional = [
  // [famille CSS, motif de nom de fichier, graisse, style]
  ['SF Pro Display', /^SF-?Pro-?Display-?Regular\.(woff2|otf|ttf)$/i, '400', 'normal'],
  ['SF Pro Display', /^SF-?Pro-?Display-?Medium\.(woff2|otf|ttf)$/i, '500', 'normal'],
  ['SF Pro Display', /^SF-?Pro-?Display-?Semibold\.(woff2|otf|ttf)$/i, '600', 'normal'],
  ['SF Pro Display', /^SF-?Pro-?Display-?Bold\.(woff2|otf|ttf)$/i, '700', 'normal'],
  ['Valky', /^Valky.*\.(woff2|otf|ttf)$/i, '400', 'normal'],
  ['Ogg', /^Ogg-?(Regular|Roman)?\.(woff2|otf|ttf)$/i, '400', 'normal'],
  ['Ogg', /^Ogg-?Italic\.(woff2|otf|ttf)$/i, '400', 'italic'],
];
const userFonts = path.join(R, FONT_DIR, 'user');
const found = [];
if (fs.existsSync(userFonts)) {
  for (const f of fs.readdirSync(userFonts)) {
    const m = optional.find(([, re]) => re.test(f));
    if (!m) continue;
    const ext = f.split('.').pop().toLowerCase();
    const fmt = ext === 'woff2' ? 'woff2' : ext === 'otf' ? 'opentype' : 'truetype';
    const b64 = fs.readFileSync(path.join(userFonts, f)).toString('base64');
    fonts += `\n@font-face{font-family:'${m[0]}';src:url(data:font/${ext};base64,${b64}) format('${fmt}');font-weight:${m[2]};font-style:${m[3]};font-display:swap}`;
    found.push(`${m[0]} (${f})`);
  }
}

// --- sprite d'icônes
const icons = {};
for (const f of list('vendor/icons', '.json')) Object.assign(icons, JSON.parse(rd(f)));
const sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>' +
  Object.entries(icons).map(([k, v]) => {
    const vb = typeof v === 'object' ? v.vb : '0 0 24 24';
    const body = typeof v === 'object' ? v.d : v;
    return `<symbol id="i-${k}" viewBox="${vb}">${body}</symbol>`;
  }).join('') + '</defs></svg>';

// --- CSS
const cssSrc = list('src/css', '.css').map(rd).join('\n');
const css = (await esbuild.transform(cssSrc, { loader: 'css', minify: true, charset: 'utf8', target: ['chrome100', 'safari15', 'firefox100'] })).code;

// --- JS : données remplacées par des identifiants pendant la minification
let jsSrc = list('src/js', '.js').map(rd).join('\n;\n');
const data = {};
jsSrc = jsSrc.replace(/\/\*\{\{([A-Z_]+)\}\}\*\/\s*\{\}/g, (_, name) => {
  data[name] = rd(`vendor/data/${name.toLowerCase()}.js`);
  return `__SQDATA_${name}__`;
});
if ('HOME_IMG' in data) throw new Error('HOME_IMG : les photos du menu ont été retirées');
let js = (await esbuild.transform(jsSrc, { loader: 'js', minify: true, charset: 'utf8', target: 'es2020' })).code;
for (const [name, val] of Object.entries(data)) {
  const id = `__SQDATA_${name}__`;
  if (!js.includes(id)) throw new Error(`marqueur ${name} perdu à la minification`);
  js = js.split(id).join(`(${val})`);
}

let html = rd('src/index.html')
  .replace('/*{{FONTS}}*/', () => fonts)
  .replace('/*{{CSS}}*/', () => css)
  .replace('<!--{{SPRITE}}-->', () => sprite)
  .replace('/*{{JS}}*/', () => js.replace(/<\/script/gi, '<\\/script'));

fs.mkdirSync(path.join(R, 'dist'), { recursive: true });
fs.writeFileSync(path.join(R, 'dist/solfege-quest.html'), html);
console.log(`dist/solfege-quest.html : ${Math.round(html.length / 1024)} Ko, ${Object.keys(icons).length} icônes`);
console.log(found.length ? `polices ajoutées : ${found.join(', ')}` : 'polices SF Pro / Valky / Ogg non fournies : polices système puis Inter / Fraunces');

if (exe) {
  // Équivalent de tools/exe/prepare.py : icône + signal de vie pour le lanceur, puis gzip.
  const ping = '<link rel="icon" type="image/png" href="/icon.png"><script>(function(){try{window.SQ_EXE=1;var p=function(){fetch("/__sq/ping",{method:"POST",keepalive:true,cache:"no-store"}).catch(function(){})};p();setInterval(p,15000);document.addEventListener("visibilitychange",p);if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){})}catch(e){}})()</script>';
  const exeHtml = html.replace('<head>', '<head>' + ping);
  const out = path.join(R, '../solfegequest-cpp/res/app.html.gz');
  fs.writeFileSync(out, zlib.gzipSync(exeHtml, { level: 9 }));
  console.log(`${path.relative(R, out)} : ${Math.round(fs.statSync(out).size / 1024)} Ko`);
}
