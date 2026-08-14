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
// The remaining settings (string array encoding, hexadecimal identifiers, light dead code
// injection) still meaningfully obscure the governance rules from casual reading, without
// the performance/hang risk of the two settings above.
const options = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.1,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  identifierNamesGenerator: 'hexadecimal',
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
  let count = 0;
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (match, code) => {
    count++;
    const result = JavaScriptObfuscator.obfuscate(code, options);
    return '<script>' + result.getObfuscatedCode() + '</script>';
  });
  fs.writeFileSync(file, html, 'utf8');
  console.log('Obfuscated ' + count + ' inline script block(s) in ' + file);
});
