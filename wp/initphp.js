global.require = createRequire(import.meta.url);
global.location = { origin: 'http://example.com' };
import { createRequire } from 'module';
import { loadPHPRuntime, PHP } from '@php-wasm/node';
import fs from 'fs';
import path from 'path'; // ⬅️ REQUIRED: Import the 'path' module

// ❌ OLD: Removed the unreliable 'now__dirname' logic.

// ✅ NEW: Define the project root using process.cwd() for stable path resolution on Vercel
const PROJECT_ROOT = process.cwd();

export async function initPhpWithWp(DOCROOT) {
  // Construct reliable path for the PHP Wasm loader
  const loaderPath = path.join(PROJECT_ROOT, 'vfs', 'newphp8.js');
  
  // ⬅️ CORRECTION: Using global.require() is more robust for assets than dynamic import with absolute paths
  const loader = global.require(loaderPath);
  
  let php;
  try {
    const runtimeId = await loadPHPRuntime(loader, {}, []);
    console.log('worker');
    php = new PHP(runtimeId);
  } catch (e) {
    console.log('?!');
    console.error(e);
    // ⚠️ CRITICAL: Throw the error so it appears in Vercel Logs, which will show the exact cause (e.g., file not found).
    throw new Error(`Failed to load PHP runtime: ${e.message}`);
  }

  console.log({ DOCROOT });
  php.mount({ root: '/home' }, '/home');
  initWp(php);
  return php;
}

export function initWp(php) {
  // Construct reliable path for the WordPress ZIP
  const wordpressZipPath = path.join(PROJECT_ROOT, 'vfs', 'wp.zip');
  
  // This line is often where 'FUNCTION_INVOCATION_FAILED' originates due to path errors.
  const wordpressZip = fs.readFileSync(wordpressZipPath);
  
  php.writeFile('/wordpress.zip', wordpressZip);
  php.mkdirTree('/wordpress');
  const importResult = php.run({
    code: `<?php
      $zip = new ZipArchive;
      $res = $zip->open('/wordpress.zip');
      if ($res !== TRUE) { 
          throw new Exception("Error opening zip file.");
      }
      $zip->extractTo( '/' );
      $zip->close();
      `,
  });
  if (importResult.exitCode !== 0) {
    // ⚠️ CRITICAL: Throw the error for detailed logging in Vercel
    console.error("WordPress unzipping error via PHP:", importResult.errors);
    throw new Error("WordPress initialization failed in PHP-Wasm.");
  }
}