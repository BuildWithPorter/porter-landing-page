import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

function filesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Retained styling cannot contain symlinks: ${path}`);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

// Reason: A replay needs the exact CSS and every local font/image/import that
// CSS used. Resolve resource URLs using browser rules, including nested imports.
export function stylesheetReferences(css, stylesheetPath) {
  const base = new URL(stylesheetPath, 'https://retained.invalid/');
  const values = [
    ...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi),
    ...css.matchAll(/@import\s+(?:"([^"]*)"|'([^']*)')/gi),
  ];
  return [...new Set(values.flatMap(match => {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return [];
    const path = decodeURIComponent(new URL(value, base).pathname).slice(1);
    if (path.split('/').includes('..') || path.includes('\\') || path.includes('\0')) {
      throw new Error(`Unsafe stylesheet resource: ${value}`);
    }
    return [path];
  }))];
}

function dependencyGraph(dir, stylesheets) {
  const paths = new Set(stylesheets);
  for (const path of paths) {
    const file = join(dir, path);
    if (!existsSync(file)) throw new Error(`Missing styling resource: /${path}`);
    if (path.endsWith('.css')) {
      for (const ref of stylesheetReferences(readFileSync(file, 'utf8'), path)) paths.add(ref);
    }
  }
  return paths;
}

function saveImmutable(file, bytes) {
  if (existsSync(file)) {
    if (!readFileSync(file).equals(bytes)) throw new Error(`Styling URL changed content: ${file}`);
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
}

export function prepareRetainedStyles({ buildDir, archiveDir, update = false }) {
  const currentCss = filesIn(join(buildDir, 'assets'))
    .filter(path => path.endsWith('.css')).map(path => relative(buildDir, path));
  if (!currentCss.length) throw new Error('Build produced no stylesheets');
  const current = dependencyGraph(buildDir, currentCss);
  for (const path of current) {
    const archived = join(archiveDir, path);
    const bytes = readFileSync(join(buildDir, path));
    if (update) saveImmutable(archived, bytes);
    if (!existsSync(archived)) {
      throw new Error(`Unretained styling resource: /${path}. Run npm run archive:styles and commit retained-styles/files.`);
    }
    if (!readFileSync(archived).equals(bytes)) throw new Error(`Archived styling differs from build: /${path}`);
  }

  // Reason: Vite cleans dist on every build. Restore history only after that
  // clean, at the original public paths, so alias changes cannot strand replays.
  const archivedFiles = filesIn(archiveDir).map(path => relative(archiveDir, path));
  dependencyGraph(archiveDir, archivedFiles.filter(path => path.endsWith('.css')));
  for (const path of archivedFiles) {
    saveImmutable(join(buildDir, path), readFileSync(join(archiveDir, path)));
  }
  return { currentResources: current.size, retainedFiles: archivedFiles.length };
}

export function assertRetainedHistory(root, baseRef) {
  if (!baseRef || /^0+$/.test(baseRef)) throw new Error('A valid baseline commit is required');
  // Reason: Comparing against the PR base catches deletions or edits even if a
  // future change also removes the archived file from its own inventory.
  const paths = execFileSync('git', ['ls-tree', '-rz', '--name-only', baseRef, '--', 'retained-styles/files'], { cwd: root })
    .toString().split('\0').filter(Boolean);
  for (const path of paths) {
    const before = execFileSync('git', ['show', `${baseRef}:${path}`], { cwd: root });
    if (!existsSync(join(root, path)) || !readFileSync(join(root, path)).equals(before)) {
      throw new Error(`Previously shipped styling must be retained unchanged: ${path}`);
    }
  }
  return { preservedBaselineFiles: paths.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.cwd();
  const mode = process.argv[2];
  if (!['check', 'update', 'history'].includes(mode)) throw new Error('Expected check, update, or history');
  const result = mode === 'history'
    ? assertRetainedHistory(root, process.env.RETAINED_STYLES_BASE)
    : prepareRetainedStyles({ buildDir: join(root, 'dist'), archiveDir: join(root, 'retained-styles/files'), update: mode === 'update' });
  console.log(JSON.stringify(result));
}
