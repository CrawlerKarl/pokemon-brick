// Downloads every Pokémon sprite the game uses into assets/sprites/ so the
// game doesn't depend on externally hosted artwork at play time.
// Usage: node tools/fetch-sprites.js
// Re-run after adding new Pokémon to the rosters in js/data.js (skips files
// that already exist). Optionally shrink afterwards, e.g. on macOS:
//   sips -Z 256 assets/sprites/*.png
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets', 'sprites');
fs.mkdirSync(outDir, { recursive: true });

// scrape every id out of the rosters + bosses, plus the easter-egg mons
const data = fs.readFileSync(path.join(root, 'js', 'data.js'), 'utf8');
const ids = new Set([132, 151]); // Ditto reveal, Konami Mew
for (const m of data.matchAll(/\[(\d+),'/g)) ids.add(+m[1]);
for (const m of data.matchAll(/id: (\d+)/g)) ids.add(+m[1]);

const REMOTE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';

function fetch(url, dest, retries = 2) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        res.resume();
        if (retries > 0) return resolve(fetch(url, dest, retries - 1));
        return reject(new Error(url + ' -> HTTP ' + res.statusCode));
      }
      const tmp = dest + '.part';
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => { fs.renameSync(tmp, dest); resolve(); });
      out.on('error', reject);
    }).on('error', err => {
      if (retries > 0) return resolve(fetch(url, dest, retries - 1));
      reject(err);
    });
  });
}

(async () => {
  const todo = [...ids].sort((a, b) => a - b)
    .filter(id => !fs.existsSync(path.join(outDir, id + '.png')));
  console.log(ids.size + ' sprites referenced, ' + todo.length + ' to download');
  let done = 0, failed = [];
  const workers = Array.from({ length: 12 }, async () => {
    while (todo.length) {
      const id = todo.shift();
      try {
        await fetch(REMOTE + id + '.png', path.join(outDir, id + '.png'));
        if (++done % 25 === 0) console.log(done + ' downloaded...');
      } catch (e) {
        failed.push(id);
        console.error('FAILED ' + id + ': ' + e.message);
      }
    }
  });
  await Promise.all(workers);
  console.log('done: ' + done + ' downloaded, ' + failed.length + ' failed' +
    (failed.length ? ' (' + failed.join(', ') + ')' : ''));
  process.exit(failed.length ? 1 : 0);
})();
