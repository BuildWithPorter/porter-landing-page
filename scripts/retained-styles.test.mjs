import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { assertRetainedHistory, prepareRetainedStyles, stylesheetReferences } from './retained-styles.mjs';

// Reason: Reproduce deployment cleanup with real temporary files. A same-build
// existence check would miss the original failure after the next deployment.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'porter-retained-styles-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const options = { buildDir: join(root, 'dist'), archiveDir: join(root, 'retained-styles/files') };
  function put(dir, path, value) {
    const file = join(dir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, value);
  }
  put(options.buildDir, 'assets/app-first.css', '@font-face{src:url(/assets/font-first.woff2)}');
  put(options.buildDir, 'assets/font-first.woff2', Buffer.from([119, 79, 70, 50]));
  return { root, options, put };
}

test('resolves local CSS URLs and quoted imports, excluding remote and inline resources', () => {
  assert.deepEqual(stylesheetReferences(
    '@import "nested/theme.css";@font-face{src:url(../font.woff2?v=2)}.a{background:url("/image.png#x");mask:url(data:image/svg+xml;base64,ABC)}.b{background:url(https://example.com/x)}.c{filter:url(#local)}',
    'assets/app.css',
  ), ['font.woff2', 'image.png', 'assets/nested/theme.css']);
});

test('missing current CSS retention fails the production build', t => {
  const { options } = fixture(t);
  assert.throws(() => prepareRetainedStyles(options), /Unretained styling resource: \/assets\/app-first.css/);
});

test('missing font retention also fails the build', t => {
  const { options, put } = fixture(t);
  put(options.archiveDir, 'assets/app-first.css', readFileSync(join(options.buildDir, 'assets/app-first.css')));
  assert.throws(() => prepareRetainedStyles(options), /Unretained styling resource: \/assets\/font-first.woff2/);
});

test('a second clean build restores original CSS and fonts at their original URLs', t => {
  const { options, put } = fixture(t);
  prepareRetainedStyles({ ...options, update: true });
  const firstCss = readFileSync(join(options.buildDir, 'assets/app-first.css'));
  const firstFont = readFileSync(join(options.buildDir, 'assets/font-first.woff2'));
  rmSync(options.buildDir, { recursive: true });
  put(options.buildDir, 'assets/app-second.css', '@font-face{src:url(/assets/font-second.woff2)}');
  put(options.buildDir, 'assets/font-second.woff2', 'new-font');
  assert.throws(() => prepareRetainedStyles(options), /Unretained styling/);
  prepareRetainedStyles({ ...options, update: true });
  assert.deepEqual(readFileSync(join(options.buildDir, 'assets/app-first.css')), firstCss);
  assert.deepEqual(readFileSync(join(options.buildDir, 'assets/font-first.woff2')), firstFont);
  assert.ok(existsSync(join(options.buildDir, 'assets/app-second.css')));
});

test('missing build dependency is rejected before archiving', t => {
  const { options } = fixture(t);
  rmSync(join(options.buildDir, 'assets/font-first.woff2'));
  assert.throws(() => prepareRetainedStyles({ ...options, update: true }), /Missing styling resource/);
});

test('missing historical dependency is rejected even when current styling is retained', t => {
  const { options, put } = fixture(t);
  prepareRetainedStyles({ ...options, update: true });
  put(options.archiveDir, 'assets/old.css', '.old{background:url(/assets/lost-image.png)}');
  assert.throws(() => prepareRetainedStyles(options), /Missing styling resource: \/assets\/lost-image.png/);
});

test('nested historical CSS imports keep their dependencies', t => {
  const { options, put } = fixture(t);
  put(options.buildDir, 'assets/nested/theme.css', '.a{background:url(../art.svg)}');
  put(options.buildDir, 'assets/art.svg', '<svg/>');
  put(options.buildDir, 'assets/app-first.css', '@import "nested/theme.css";');
  prepareRetainedStyles({ ...options, update: true });
  assert.ok(existsSync(join(options.archiveDir, 'assets/art.svg')));
});

test('the same styling URL cannot silently change content', t => {
  const { options, put } = fixture(t);
  prepareRetainedStyles({ ...options, update: true });
  put(options.buildDir, 'assets/app-first.css', '.changed{}');
  assert.throws(() => prepareRetainedStyles(options), /Archived styling differs/);
  assert.throws(() => prepareRetainedStyles({ ...options, update: true }), /Styling URL changed content/);
});

test('historical assets cannot overwrite a conflicting current output', t => {
  const { options, put } = fixture(t);
  prepareRetainedStyles({ ...options, update: true });
  put(options.archiveDir, 'assets/extra.woff2', 'historical');
  put(options.buildDir, 'assets/extra.woff2', 'different');
  assert.throws(() => prepareRetainedStyles(options), /Styling URL changed content/);
});

test('CI baseline detects removal and alteration of previously retained files', t => {
  const { root, options, put } = fixture(t);
  prepareRetainedStyles({ ...options, update: true });
  const git = args => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git(['init']);
  git(['add', 'retained-styles']);
  git(['-c', 'user.name=Retention test', '-c', 'user.email=test@example.com', 'commit', '-m', 'baseline']);
  const base = git(['rev-parse', 'HEAD']).toString().trim();
  assert.equal(assertRetainedHistory(root, base).preservedBaselineFiles, 2);
  const css = readFileSync(join(options.archiveDir, 'assets/app-first.css'));
  rmSync(join(options.archiveDir, 'assets/app-first.css'));
  assert.throws(() => assertRetainedHistory(root, base), /must be retained unchanged/);
  put(options.archiveDir, 'assets/app-first.css', 'tampered');
  assert.throws(() => assertRetainedHistory(root, base), /must be retained unchanged/);
  put(options.archiveDir, 'assets/app-first.css', css);
  assert.equal(assertRetainedHistory(root, base).preservedBaselineFiles, 2);
});

test('CI history check cannot silently skip a missing baseline', t => {
  const { root } = fixture(t);
  assert.throws(() => assertRetainedHistory(root, ''), /valid baseline/);
});
