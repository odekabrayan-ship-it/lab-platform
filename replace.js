const fs = require('fs');
const path = require('path');

const walkSync = (dir, callback) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    var filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath);
    }
  });
};

const replaceInFile = (filePath) => {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // For frontend files (Vite)
  if (filePath.includes('frontend')) {
    content = content.replace(/['"`]http:\/\/localhost:3000([^'"`]*)['"`]/g, "(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}$1`)");
    content = content.replace(/['"`]http:\/\/localhost:3001([^'"`]*)['"`]/g, "(`${import.meta.env.VITE_PORTAL_URL || 'http://localhost:3001'}$1`)");
  }
  
  // For public-portal files (Next.js)
  if (filePath.includes('public-portal')) {
    content = content.replace(/['"`]http:\/\/localhost:3000([^'"`]*)['"`]/g, "(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}$1`)");
    content = content.replace(/['"`]http:\/\/localhost:5173([^'"`]*)['"`]/g, "(`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:5173'}$1`)");
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
};

walkSync(path.join(__dirname, 'frontend', 'src'), replaceInFile);
walkSync(path.join(__dirname, 'public-portal', 'src'), replaceInFile);
