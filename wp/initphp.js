global.require = createRequire(import.meta.url);
global.location = { origin: 'http://example.com' };
import { createRequire } from 'module';
import { loadPHPRuntime, PHP } from '@php-wasm/node';
import fs from 'fs';
import path from 'path'; // ⬅️ IMPORTANTE: Importar o módulo 'path'

// ⚠️ REMOVER O 'now__dirname' MANUALMENTE CONSTRUÍDO.
// Usamos o process.cwd() (Current Working Directory) que aponta para a raiz
// do deploy da função no Vercel.

// Define a raiz do projeto (onde vfs e wp estão)
const PROJECT_ROOT = process.cwd();

export async function initPhpWithWp(DOCROOT) {
  // Construção de caminho confiável usando 'path.join'
  const loaderPath = path.join(PROJECT_ROOT, 'vfs', 'newphp8.js');
  
  // O Node.js não suporta importação dinâmica via caminho absoluto
  // (a menos que seja um módulo CommonJS), então o 'require' dinâmico é mais seguro
  // ou você pode mover o 'newphp8.js' para um local que o Vercel possa importar.
  // Vamos manter o 'import' dinâmico, mas usando o caminho absoluto.
  const loader = await import('file://' + loaderPath);
  
  let php;
  try {
    const runtimeId = await loadPHPRuntime(loader, {}, []);
    console.log('worker');
    php = new PHP(runtimeId);
  } catch (e) {
    console.log('?!');
    console.error(e);
    // ⚠️ Adicione o throw aqui para o erro aparecer nos logs do Vercel
    throw new Error(`Erro ao carregar runtime PHP: ${e.message}`);
  }

  console.log({ DOCROOT });
  php.mount({ root: '/home' }, '/home');
  initWp(php);
  return php;
}

export function initWp(php) {
  // Construção de caminho confiável usando 'path.join'
  const wordpressZipPath = path.join(PROJECT_ROOT, 'vfs', 'wp.zip');
  
  // A leitura do arquivo é a operação que mais falha se o caminho estiver errado
  const wordpressZip = fs.readFileSync(wordpressZipPath);
  
  php.writeFile('/wordpress.zip', wordpressZip);
  php.mkdirTree('/wordpress');
  const importResult = php.run({
    code: `<?php
      $zip = new ZipArchive;
      $res = $zip->open('/wordpress.zip');
      if ($res !== TRUE) {
          throw new Exception("Erro ao abrir zip.");
      }
      $zip->extractTo( '/' );
      $zip->close();
      `,
  });
  if (importResult.exitCode !== 0) {
    // ⚠️ Se falhar, lançar um erro claro para os logs do Vercel
    console.error("Erro na descompactação do WordPress via PHP:", importResult.errors);
    throw new Error("Falha na inicialização do WordPress no PHP-Wasm.");
  }
}