// Builds src/data/progress-manifest.json: every module with its lessons and quizzes,
// read from the quiz pages in src/pages/tests (one quiz per lesson). Runs before
// `npm start` and `npm run build`, so new lessons and quizzes appear in "My progress"
// without any extra step.
import {readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = join(root, 'src', 'pages', 'tests');
const docsDir = join(root, 'docs');

const h1 = (file) => {
  const m = readFileSync(file, 'utf8').match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
};

const modules = [];
for (const folder of readdirSync(testsDir, {withFileTypes: true}).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const num = Number(folder.match(/^module-(\d+)-/)?.[1]);
  if (!num) continue;
  const indexFile = join(testsDir, `module-${String(num).padStart(2, '0')}-test.mdx`);
  const title = (existsSync(indexFile) ? h1(indexFile) : folder)
    .replace(/\s+[—-]\s+Tests?$/i, '')
    .replace(/^Module\s+\d+:\s*/i, '');
  const lessons = [];
  for (const f of readdirSync(join(testsDir, folder)).filter((x) => x.endsWith('.mdx')).sort()) {
    const id = f.replace(/\.mdx$/, '');
    if (!existsSync(join(docsDir, folder, `${id}.md`)) && !existsSync(join(docsDir, folder, `${id}.mdx`))) {
      console.warn(`progress manifest: no lesson doc for quiz ${folder}/${id}`);
    }
    lessons.push({
      title: h1(join(testsDir, folder, f)).replace(/^Quiz:\s*/i, ''),
      doc: `/docs/${folder}/${id}`,
      quiz: `/tests/${folder}/${id}`,
    });
  }
  modules.push({module: num, title, lessons});
}
modules.sort((a, b) => a.module - b.module);

const out = join(root, 'src', 'data', 'progress-manifest.json');
mkdirSync(dirname(out), {recursive: true});
const json = JSON.stringify({modules}, null, 2) + '\n';
if (!existsSync(out) || readFileSync(out, 'utf8') !== json) writeFileSync(out, json);
console.log(`progress manifest: ${modules.length} modules, ${modules.reduce((n, m) => n + m.lessons.length, 0)} lessons`);
