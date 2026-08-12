// replace-currency.js
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');
const extensions = ['.jsx', '.js'];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (extensions.includes(path.extname(file))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/€/g, 'FC').replace(/ FC /g, 'FC');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`✅ ${fullPath}`);
      }
    }
  }
}

walk(srcDir);
console.log('✅ Remplacement terminé.');