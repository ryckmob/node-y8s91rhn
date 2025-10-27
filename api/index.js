// Este arquivo deve estar no caminho que você definiu no "builds" do vercel.json
import { initPhpWithWp } from '../initphp.js'; // Ajuste o caminho conforme a estrutura
import path from 'path';

// O DOCROOT deve ser o caminho para o seu WordPress
const DOCROOT = path.join(process.cwd(), 'wp', 'wordpress'); 
let phpInstance = null;

// Função para processar a requisição
export default async function handler(request, response) {
  try {
    // 1. Inicialize a instância PHP/WordPress (faça isso uma vez)
    if (!phpInstance) {
      phpInstance = await initPhpWithWp(DOCROOT);
    }

    // 2. Prepare os headers/dados da requisição para o ambiente PHP
    const url = new URL(request.url, `http://${request.headers.host}`);
    
    // 3. Rode a requisição no PHP (simulando um servidor web)
    const phpResponse = await phpInstance.request({
      method: request.method,
      url: url.pathname + url.search,
      // ... headers, body, etc.
    });

    // 4. Envie a resposta do PHP de volta ao cliente
    response.writeHead(phpResponse.httpCode, phpResponse.headers);
    response.end(phpResponse.body);

  } catch (error) {
    console.error('PHP WASM Error:', error);
    response.statusCode = 500;
    response.end('Internal Server Error while running PHP.');
  }
}