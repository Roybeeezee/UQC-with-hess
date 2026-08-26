// Obfuscates the inline <script> blocks in one or more HTML files, in place.
// Run automatically as a build step before packaging - runs against the CI runner's checkout only,
// so the source files pushed to GitHub (what you edit in Notepad) are never touched or overwritten.
// Usage: node obfuscate-build.js file1.html file2.html ...
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

const files = process.argv.slice(2);
if(files.length === 0){
  console.error('Usage: node obfuscate-build.js <file1.html> [file2.html ...]');
  process.exit(1);
}

// NOTE ON THESE SETTINGS (updated August 2026):
// controlFlowFlattening and selfDefending were previously enabled and are now OFF.
// Both are documented by the obfuscator's own maintainers to cause serious problems:
//   - controlFlowFlattening: "very bad runtime performance degradation" in tight loops
//     (javascript-obfuscator/javascript-obfuscator issue #177). UQC's per-row check functions
//     are exactly this kind of tight loop, run thousands of times per file. This was very likely
//     the real cause of QC Check hanging in the packaged .exe on large real-world files, even
//     after the underlying JS logic itself was confirmed fast in plain, unobfuscated testing.
//   - selfDefending: has a documented history of causing the obfuscated code to hang outright
//     (fixed for one specific runtime in v5.4.1 "Fixed obfuscated code hanging... when
//     selfDefending is enabled" - evidence the feature is fragile in general).
//
// UPDATE (August 2026, round 2): deadCodeInjection, stringArrayEncoding:['base64'], and
// identifierNamesGenerator:'hexadecimal' have now ALSO been turned off/changed, after users
// reported Google Drive's scanner flagging the built .exe as "contains virus or potentially
// unwanted software." All three are well-documented heuristic triggers for exactly this kind
// of content-based scanning, independent of code-signing:
//   - identifierNamesGenerator:'hexadecimal' produces _0x4a2b-style names, a naming pattern
//     strongly associated with obfuscated malware specifically. Switched to 'mangled', which
//     produces short a/b/c-style names - the same style ordinary minifiers (Terser, UglifyJS)
//     already produce as standard practice, not a red flag on its own.
//   - stringArrayEncoding:['base64'] hides every string literal behind base64, a classic
//     evasion technique. Removed - stringArray alone (plain array extraction, no encoding
//     layer) still meaningfully obscures string literals without this specific pattern.
//   - deadCodeInjection injects junk code blocks purely for obscurity, another common
//     evasion signature, and provided the least actual protection of the three. Turned off.
// Net effect: less aggressive obfuscation, but a build that shouldn't pattern-match to
// content-based malware heuristics the same way. If code-hiding needs to be stronger again in
// the future, re-enable these deliberately and expect to deal with scanner false-positives as
// a real, recurring cost of doing so - it's not a one-time fix.
const options = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayThreshold: 0.75,
  identifierNamesGenerator: 'mangled',
  renameGlobals: false,
  selfDefending: false,
  disableConsoleOutput: false
};

files.forEach(file => {
  if(!fs.existsSync(file)){
    console.error('Skipping (not found):', file);
    return;
  }
  let html = fs.readFileSync(file, 'utf8');

  // IMPORTANT: all <script> blocks in an HTML file share one global scope at runtime, executed
  // in document order - functionally equivalent to one combined script. But obfuscating each
  // block SEPARATELY (as this used to do) lets identifierNamesGenerator:'mangled' independently
  // restart short-name generation (a, b, c...) in each block, so two blocks can easily generate
  // the same top-level name for two completely different internal functions - the second
  // silently overwrites the first at runtime, corrupting its string-decoder and causing the
  // obfuscator's own internal verification loop to spin forever. Confirmed directly: this
  // produced a real, reproducible infinite hang on this exact file (4 script blocks) the first
  // time 'mangled' was tried here. Obfuscating all blocks together in one pass gives the
  // generator a single shared namespace to avoid collisions in, which is what it's designed for.
  // Some <script> blocks are tiny CDN-loader snippets (window.XLSX||document.write('<script src=...'))
  // that MUST stay exactly where they are and run untouched - they rely on document.write() executing
  // synchronously, inline, during the browser's normal HTML parse to correctly pause and block on
  // fetching the external library before the rest of the page continues. Combining them into the same
  // obfuscated bundle as the application code (which was tried first) breaks that timing guarantee in
  // a way that only shows up in a real browser/Electron environment, not in Node.js-based testing -
  // this was the actual root cause of KIT Check's Run button silently failing in the packaged .exe
  // despite working perfectly when run as plain, unobfuscated source. Confirmed and fixed August 2026.
  const isCdnLoader = (code) => /document\.write\(/.test(code) && code.length < 300;

  const blocks = [];
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (match, code) => {
    if (isCdnLoader(code)) {
      return match; // leave completely untouched, in its original position
    }
    blocks.push(code);
    return '\u0000SCRIPT_BLOCK_' + (blocks.length - 1) + '\u0000';
  });

  if(blocks.length === 0){
    console.error('No obfuscatable <script> blocks found in', file);
    return;
  }

  const combined = blocks.join('\n;\n'); // ';' separator guards against ASI edge cases at block boundaries
  const result = JavaScriptObfuscator.obfuscate(combined, options);
  const obfuscatedCombined = result.getObfuscatedCode();

  // Put the full combined, obfuscated code in the FIRST script tag's position; make every other
  // original script tag position empty. Execution order and shared scope are unaffected - this
  // is exactly equivalent to how the blocks already ran together at runtime.
  let first = true;
  html = html.replace(/\u0000SCRIPT_BLOCK_\d+\u0000/g, () => {
    if(first){ first = false; return '<script>' + obfuscatedCombined + '</script>'; }
    return '';
  });

  fs.writeFileSync(file, html, 'utf8');
  console.log('Obfuscated ' + blocks.length + ' inline script block(s) in ' + file + ' (combined into one pass)');
});
