// 사전(i18n/dict.json: 한국어 → [English, 日本語, 中文])과 런타임을 합쳐 public/i18n.js 를 만들어요.
// 사용: node scripts/i18n-build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dict = JSON.parse(fs.readFileSync(path.join(root, 'i18n/dict.json'), 'utf8'));
const rt = fs.readFileSync(path.join(root, 'i18n/runtime.js'), 'utf8');
fs.writeFileSync(path.join(root, 'public/i18n.js'), rt.replace('__DICT__', JSON.stringify(dict)));
console.log('public/i18n.js', Object.keys(dict).length, 'entries');
