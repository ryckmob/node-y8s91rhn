global.require = createRequire(import.meta.url);
global.location = { origin: 'http://example.com' };
import { createRequire } from 'module';
import { loadPHPRuntime, PHP } from '@php-wasm/node';
import fs from 'fs';
import path from 'path'; // <--- MUST BE IMPORTED

const PROJECT_ROOT = process.cwd();

export async function initPhpWithWp(DOCROOT) {
  const loaderPath = path.join(PROJECT_ROOT, 'vfs', 'newphp8.js');
  
  // This is the most stable way to load the asset file in Vercel
  const loader = global.require(loaderPath); 
  
  let php;
  try {
    const runtimeId = await loadPHPRuntime(loader, {}, []);
    // ... (rest of the try block)
  } catch (e) {
    // ... (console.logs)
    throw new Error(`Failed to load PHP runtime: ${e.message}`); // <--- IMPORTANT FOR LOGS
  }

  // ... (mount and initWp)
  initWp(php);
  return php;
}

export function initWp(php) {
  const wordpressZipPath = path.join(PROJECT_ROOT, 'vfs', 'wp.zip');
  
  // This line requires the file to be present
  const wordpressZip = fs.readFileSync(wordpressZipPath);
  
  // ... (rest of initWp)
  if (importResult.exitCode !== 0) {
    // ... (console.logs)
    throw new Error("WordPress initialization failed in PHP-Wasm."); // <--- IMPORTANT FOR LOGS
  }
}