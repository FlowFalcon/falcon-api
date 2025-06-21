const fs = require('fs');
function minifyCSS(inputPath, outputPath){
  let css = fs.readFileSync(inputPath, 'utf8');
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  css = css.replace(/\s+/g, ' ');
  css = css.replace(/\s*([{}:;,])\s*/g, '$1');
  css = css.replace(/;}/g, '}');
  fs.writeFileSync(outputPath, css.trim());
}
function minifyJS(inputPath, outputPath){
  let js = fs.readFileSync(inputPath, 'utf8');
  js = js.replace(/\/\*[\s\S]*?\*\//g, '');
  js = js.replace(/\n+/g, '\n');
  js = js.replace(/\r/g, '');
  const lines = js.split('\n').map(l => l.trim());
  js = lines.map(l => l.replace(/\/\/.*$/, '')).join(' ');
  js = js.replace(/\s+/g, ' ');
  fs.writeFileSync(outputPath, js.trim());
}
minifyCSS('api-page/styles.css', 'api-page/styles.min.css');
minifyJS('api-page/script.js', 'api-page/script.min.js');
