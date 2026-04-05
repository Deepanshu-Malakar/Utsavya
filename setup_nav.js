const fs = require('fs');
const path = require('path');
function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            if (!content.includes('navbar.js')) {
                content = content.replace(/<\/body>/i, '<script src="js/navbar.js"></script>\n</body>');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated ' + fullPath);
            }
        }
    });
}
walk('d:/python/github/Utsavya/src/public');
console.log('Done mapping scripts.');
