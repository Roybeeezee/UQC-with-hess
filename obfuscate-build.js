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

const options = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
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
