const fs = require('fs');
function minifyCSS(css){
  return css
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\n\s*/g,'')
    .replace(/\s{2,}/g,' ');
}
function minifyJS(js){
  return js
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g,'')
    .replace(/\n\s*/g,'')
    .replace(/\s{2,}/g,' ');
}
const css = fs.readFileSync('api-page/styles.css','utf8');
fs.writeFileSync('api-page/styles.min.css', minifyCSS(css));
const js = fs.readFileSync('api-page/script.js','utf8');
fs.writeFileSync('api-page/script.min.js', minifyJS(js));

