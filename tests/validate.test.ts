// Run with `npm test` (Node ≥ 22.18 runs TypeScript files directly).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAdCode, isReservedSlug, jsonForScript, safeHttpUrl, safeImagePath, slugify, slugProblem } from '../src/lib/validate.ts';

test('safeHttpUrl accepts plain http(s) URLs', () => {
  assert.equal(safeHttpUrl('https://example.com/a?b=1#c'), 'https://example.com/a?b=1#c');
  assert.equal(safeHttpUrl('http://example.com'), 'http://example.com/');
  assert.equal(safeHttpUrl('  https://example.com/x  '), 'https://example.com/x');
  assert.equal(safeHttpUrl('HTTPS://EXAMPLE.com/'), 'https://example.com/');
});

test('safeHttpUrl rejects dangerous or malformed URLs', () => {
  const bad = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'vbscript:msgbox(1)',
    'blob:https://example.com/uuid',
    'ftp://example.com/file',
    '//evil.example.com',
    '/relative/path',
    'example.com',
    'https://user:pass@example.com/',
    'https://exa mple.com/',
    'https://example.com/\nheader',
    'https://',
    '',
    null,
    42,
  ];
  for (const value of bad) assert.equal(safeHttpUrl(value), null, `should reject ${String(value)}`);
});

test('safeHttpUrl httpsOnly mode', () => {
  assert.equal(safeHttpUrl('http://example.com', { httpsOnly: true }), null);
  assert.equal(safeHttpUrl('https://example.com', { httpsOnly: true }), 'https://example.com/');
});

test('safeImagePath', () => {
  assert.equal(safeImagePath('/images/uploads/a.png'), '/images/uploads/a.png');
  assert.equal(safeImagePath('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
  for (const bad of ['http://x.com/a.png', '//x.com/a.png', '/images/../secret.png', 'images/a.png', '/a.png" onerror="x', 'javascript:x.png', '/images/a.exe']) {
    assert.equal(safeImagePath(bad), null, bad);
  }
});

test('slugify builds automatic slugs', () => {
  assert.equal(slugify('Download Guide (2026)!'), 'download-guide-2026');
  assert.equal(slugify('Café & Crème'), 'cafe-and-creme');
  assert.equal(slugify('  --Hello__World--  '), 'hello-world');
  assert.equal(slugify('a'.repeat(100)).length, 80);
});

test('slugProblem and reserved names', () => {
  assert.equal(slugProblem('my-link'), null);
  assert.ok(slugProblem('My-Link'));
  assert.ok(slugProblem('my--link'));
  assert.ok(slugProblem('-link'));
  assert.ok(slugProblem('a/b'));
  assert.ok(slugProblem(''));
  for (const reserved of ['admin', 'links', 'images', '_astro', '404', 'sitemap']) {
    assert.ok(isReservedSlug(reserved), reserved);
    assert.ok(slugProblem(reserved), reserved);
  }
});

test('checkAdCode accepts a typical banner from an allowed host', () => {
  const code = `<script type="text/javascript">
  atOptions = { 'key' : 'abc123', 'format' : 'iframe', 'height' : 90, 'width' : 728, 'params' : {} };
</script>
<script type="text/javascript" src="//www.highperformanceformat.com/abc123/invoke.js"></script>`;
  const report = checkAdCode(code, ['highperformanceformat.com']);
  assert.equal(report.ok, true, report.problems.join('\n'));
  assert.deepEqual(report.scriptHosts, ['www.highperformanceformat.com']);
});

test('checkAdCode rejects unapproved hosts, hidden ads and auto-clicks', () => {
  const allowed = ['highperformanceformat.com'];
  assert.equal(checkAdCode('<script src="https://evil.example/x.js"></script>', allowed).ok, false);
  assert.equal(checkAdCode('<script src="javascript:alert(1)"></script>', allowed).ok, false);
  assert.equal(checkAdCode('<iframe src="https://www.highperformanceformat.com/x" width="0" height="0"></iframe>', allowed).ok, false);
  assert.equal(checkAdCode('<div style="display:none"><script src="//highperformanceformat.com/a.js"></script></div>', allowed).ok, false);
  assert.equal(checkAdCode('<div hidden>ad</div>', allowed).ok, false);
  assert.equal(checkAdCode('<script>document.querySelector("a").click()</script>', allowed).ok, false);
  assert.equal(checkAdCode('<script>window.open("https://x")</script>', allowed).ok, false);
  assert.equal(checkAdCode('<script>location.href = "https://x"</script>', allowed).ok, false);
  // Suffix tricks must not pass the host allow-list.
  assert.equal(checkAdCode('<script src="https://highperformanceformat.com.evil.io/a.js"></script>', allowed).ok, false);
  assert.equal(checkAdCode('<script src="https://evilhighperformanceformat.com/a.js"></script>', allowed).ok, false);
  // Legit layout CSS is fine.
  assert.equal(checkAdCode('<div style="overflow:hidden;max-width:728px">ad</div>', allowed).ok, true);
  assert.equal(checkAdCode('', allowed).ok, true);
});

test('jsonForScript cannot break out of a <script> element', () => {
  const out = jsonForScript('https://x.com/</script><script>alert(1)</script> ');
  assert.ok(!out.includes('</script'));
  assert.ok(!out.includes('<'));
  assert.ok(!out.includes(' '));
  assert.equal(JSON.parse(out), 'https://x.com/</script><script>alert(1)</script> ');
});
