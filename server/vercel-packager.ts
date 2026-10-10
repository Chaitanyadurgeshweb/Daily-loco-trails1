import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

export function createVercelZipBuffer(): Buffer {
  const zip = new AdmZip();
  const rootDir = process.cwd();

  const includeFiles = [
    'vercel.json',
    '.vercelignore',
    '.env.example',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'metadata.json',
    'README.md',
    'VERCEL_DEPLOYMENT_GUIDE.md',
    'server.ts',
  ];

  for (const file of includeFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      zip.addLocalFile(fullPath);
    }
  }

  const includeDirs = ['api', 'server', 'src', 'engine', 'tests'];

  for (const dir of includeDirs) {
    const fullDir = path.join(rootDir, dir);
    if (fs.existsSync(fullDir)) {
      zip.addLocalFolder(fullDir, dir);
    }
  }

  return zip.toBuffer();
}
