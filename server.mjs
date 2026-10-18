import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { AUDIENCES, DEPTHS, splitParagraphs } from './lib/lesson.mjs';
import { createOllama, ServiceError, validModelName } from './lib/ollama.mjs';

const PUBLIC = new URL('./public/', import.meta.url);
const MAX_BODY_BYTES = 128 * 1024;
const STATIC = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store',
};

function json(response, status, body) {
  if (response.destroyed || response.writableEnded) return;
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': payload.length });
  response.end(payload);
}

function checkHost(request, server) {
  let host;
  try { host = new URL(`http://${request.headers.host}`); } catch { throw new ServiceError(403, 'Invalid Host header.'); }
  const port = Number(host.port || 80);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) || host.username || host.password ||
      host.pathname !== '/' || host.search || host.hash || port !== server.address()?.port) {
    throw new ServiceError(403, 'Use the local ExplainLab address shown in your terminal.');
  }
  return host.origin;
}

function checkOrigin(request, origin) {
  if ((request.headers.origin && request.headers.origin !== origin) || request.headers['sec-fetch-site'] === 'cross-site') {
    throw new ServiceError(403, 'Requests must come from this ExplainLab page.');
  }
}

async function readBody(request, maxBytes) {
  const contentType = (request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new ServiceError(415, 'Send the request as application/json.');
  if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') {
    throw new ServiceError(415, 'Compressed request bodies are not supported.');
  }
  if (Number(request.headers['content-length']) > maxBytes) throw new ServiceError(413, 'The request is too large.');
  const chunks = [];
  let size = 0;
  // Manual listeners keep the socket available long enough to send a useful 413 response.
  await new Promise((resolveBody, reject) => {
    const cleanup = () => {
      request.off('data', onData);
      request.off('end', onEnd);
      request.off('error', onError);
      request.off('aborted', onAborted);
    };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        cleanup();
        request.resume();
        reject(new ServiceError(413, 'The request is too large.'));
      } else chunks.push(chunk);
    };
    const onEnd = () => { cleanup(); resolveBody(); };
    const onError = () => { cleanup(); reject(new ServiceError(400, 'Could not read the request body.')); };
    const onAborted = () => { cleanup(); reject(new ServiceError(499, 'The request was cancelled.')); };
    request.on('data', onData);
    request.on('end', onEnd);
    request.on('error', onError);
    request.on('aborted', onAborted);
  });
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ServiceError(400, 'The request body must be valid JSON.'); }
}

function validateRequest(body, defaultModel) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ServiceError(400, 'Send a JSON object.');
  if (Object.keys(body).some((key) => !['source', 'audience', 'depth', 'model'].includes(key))) {
    throw new ServiceError(400, 'The request contains unsupported fields.');
  }
  if (typeof body.source !== 'string' || body.source.trim().length < 80 || body.source.trim().length > 20_000) {
    throw new ServiceError(400, 'Source text must contain 80–20,000 characters.');
  }
  if (!AUDIENCES.includes(body.audience)) throw new ServiceError(400, 'Choose developer, student, or everyday as the audience.');
  if (!DEPTHS.includes(body.depth)) throw new ServiceError(400, 'Choose simple, balanced, or deep as the depth.');
  if (body.model !== undefined && typeof body.model !== 'string') throw new ServiceError(400, 'Choose a valid Ollama model name.');
  const model = body.model?.trim() || defaultModel;
  if (model && !validModelName(model)) throw new ServiceError(400, 'Choose a valid Ollama model name.');
  return { paragraphs: splitParagraphs(body.source), audience: body.audience, depth: body.depth, model };
}

export function createServer({
  ollama = createOllama(),
  defaultModel = process.env.OLLAMA_MODEL || '',
  publicDirectory = PUBLIC,
  maxBodyBytes = MAX_BODY_BYTES,
  maxConcurrentGenerations = 2,
} = {}) {
  let activeGenerations = 0;
  const server = http.createServer(async (request, response) => {
    const controller = new AbortController();
    const abort = () => { if (!response.writableEnded) controller.abort(); };
    request.on('aborted', abort);
    response.on('close', abort);
    try {
      const origin = checkHost(request, server);
      const rawPath = request.url?.split('?')[0] || '/';
      if (!rawPath.startsWith('/') || rawPath.startsWith('//') || rawPath.includes('\\')) throw new ServiceError(400, 'Invalid request path.');
      try { decodeURIComponent(rawPath); } catch { throw new ServiceError(400, 'Invalid request path.'); }
      if (request.method === 'POST' && rawPath === '/api/explain') {
        checkOrigin(request, origin);
        const input = validateRequest(await readBody(request, maxBodyBytes), defaultModel);
        if (activeGenerations >= maxConcurrentGenerations) throw new ServiceError(503, 'Two lessons are already being generated. Wait for one to finish.');
        activeGenerations += 1;
        try {
          if (!input.model) {
            const result = await ollama.models(controller.signal);
            if (!result.available) throw new ServiceError(503, result.message);
            input.model = result.models[0];
            if (!input.model) throw new ServiceError(400, 'No Ollama models are installed. Install a text model, then refresh Settings.');
          }
          json(response, 200, await ollama.explain({ ...input, signal: controller.signal }));
        } finally { activeGenerations -= 1; }
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', rawPath === '/api/explain' ? 'POST' : 'GET, HEAD');
        throw new ServiceError(405, 'This method is not supported.');
      }
      if (rawPath === '/api/health') return json(response, 200, { ok: true, version: '0.1.0' });
      if (rawPath === '/api/models') return json(response, 200, await ollama.models(controller.signal));
      if (rawPath === '/api/examples') {
        const examples = JSON.parse(await readFile(new URL('examples.json', publicDirectory), 'utf8'));
        return json(response, 200, examples);
      }
      if (rawPath === '/api/explain') {
        response.setHeader('Allow', 'POST');
        throw new ServiceError(405, 'Use POST to generate a lesson.');
      }
      const asset = STATIC.get(rawPath);
      if (!asset) throw new ServiceError(404, 'Not found.');
      const data = await readFile(new URL(asset[0], publicDirectory));
      response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': asset[1], 'Content-Length': data.length });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (error) {
      if (!request.complete) request.resume();
      json(response, error instanceof ServiceError ? error.status : 500, {
        error: error instanceof ServiceError ? error.message : 'ExplainLab could not complete this request. Check the local installation and try again.',
      });
    } finally {
      request.off('aborted', abort);
      response.off('close', abort);
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = process.env.PORT === undefined ? 4173 : Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exitCode = 1;
  } else {
    try {
      const server = createServer();
      server.on('error', (error) => {
        console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set PORT to another local port.` : 'ExplainLab could not start. Check your local configuration.');
        process.exitCode = 1;
      });
      server.listen(port, '127.0.0.1', () => console.log(`ExplainLab is ready at http://127.0.0.1:${port}`));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
