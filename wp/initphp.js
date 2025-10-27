global.require = createRequire(import.meta.url);
global.location = { origin: 'http://example.com' };
import { createRequire } from 'module';
import { loadPHPRuntime, PHP } from '@php-wasm/node';
import fs from 'fs';
import path from 'path'; // ⬅️ IMPORTADO: Módulo 'path' é necessário

// ❌ REMOVIDO: A lógica de 'now__dirname' é instável em Serverless Functions
// const now__dirname = new URL('./', import.meta.url).href
//   .replace('file://', '')
//   .replace('file:', '');

// ✅ NOVO: Define a raiz do projeto para caminhos absolutos
const PROJECT_ROOT = process.cwd();

export async function initPhpWithWp(DOCROOT) {
  // Construção do caminho confiável com 'path.join'
  const loaderPath = path.join(PROJECT_ROOT, 'vfs', 'newphp8.js');

  // ⬅️ CORREÇÃO: Usando 'global.require' (mais robusto que 'import' dinâmico com path absoluto)
  const loader = global.require(loaderPath);
  
  let php;
  try {
    const runtimeId = await loadPHPRuntime(loader, {}, []);
    console.log('worker');
    php = new PHP(runtimeId);
  } catch (e) {
    console.log('?!');
    console.error(e);
    // ⬅️ MELHORIA: Lança erro para aparecer nos Logs do Vercel
    throw new Error(`Erro ao carregar runtime PHP: ${e.message}`);
  }

  // const DOCROOT = path.join(now__dirname, 'wp', 'wordpress');
  console.log({ DOCROOT });
  php.mount({ root: '/home' }, '/home');
  initWp(php);
  return php;
}

export function initWp(php) {
  // Construção do caminho confiável para o ZIP
  const wordpressZipPath = path.join(PROJECT_ROOT, 'vfs', 'wp.zip');
  
  const wordpressZip = fs.readFileSync(wordpressZipPath);
  php.writeFile('/wordpress.zip', wordpressZip);
  php.mkdirTree('/wordpress');
  const importResult = php.run({
    code: `<?php
      $zip = new ZipArchive;
      $res = $zip->open('/wordpress.zip');
      // ⬅️ MELHORIA: Adiciona checagem de erro no PHP
      if ($res !== TRUE) { 
          throw new Exception("Erro ao abrir zip.");
      }
      $zip->extractTo( '/' );
      $zip->close();
      `,
  });
  if (importResult.exitCode !== 0) {
    // ⬅️ MELHORIA: Lança erro para aparecer nos Logs do Vercel
    console.error("Erro na descompactação do WordPress via PHP:", importResult.errors);
    throw new Error("Falha na inicialização do WordPress no PHP-Wasm.");
  }
}