const fs = require('fs');
const content = fs.readFileSync('src/components/BrowserHtmlFrame.tsx', 'utf8');
const scriptStart = content.indexOf('<script>');
const scriptEnd = content.indexOf('</script>', scriptStart);
let scriptContent = content.substring(scriptStart + 8, scriptEnd);
scriptContent = scriptContent.replace(/\$\{JSON\.stringify\(chapterId \|\| ''\)\}/g, '"dummy"');
fs.writeFileSync('/tmp/test_script.js', scriptContent);
const { execSync } = require('child_process');
try {
  const out = execSync('node --check /tmp/test_script.js 2>&1');
  console.log('Result:', out.toString());
} catch (e) {
  console.log('Error output:\n', e.stdout?.toString(), e.stderr?.toString());
}
