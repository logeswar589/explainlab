import { lessonMessages, generationSchema, normalizeGeneratedLesson } from './lesson.mjs';

export class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const validModelName = (name) => typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(name);

export function createOllama({
  url = process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  timeoutMs = 120_000,
  modelsTimeoutMs = 5_000,
  maxResponseBytes = 512 * 1024,
} = {}) {
  const base = new URL(url);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('OLLAMA_URL must be an HTTP(S) URL without credentials, query, or fragment.');
  }
  base.pathname = `${base.pathname.replace(/\/$/, '')}/`;

  async function request(path, { body, signal, timeout = timeoutMs } = {}) {
    const timeoutSignal = AbortSignal.timeout(timeout);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    try {
      const response = await fetch(new URL(path, base), {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: combinedSignal,
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 404 && body) {
          throw new ServiceError(400, 'That Ollama model is not available. Choose an installed model in Settings.');
        }
        if (response.status === 429 || response.status === 503) {
          throw new ServiceError(503, 'Ollama is busy. Wait a moment and try again.');
        }
        throw new ServiceError(502, `Ollama returned HTTP ${response.status}. Check Ollama and try again.`);
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > maxResponseBytes) {
          throw new ServiceError(502, 'Ollama returned a response that is too large. Try a shorter source.');
        }
        chunks.push(chunk);
      }
      try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new ServiceError(502, 'Ollama returned invalid JSON. Try another installed model.');
      }
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      if (signal?.aborted) throw new ServiceError(499, 'The request was cancelled.');
      if (timeoutSignal.aborted) throw new ServiceError(504, 'Ollama took too long. Try a smaller model or a shorter source.');
      throw new ServiceError(503, 'Cannot connect to Ollama. Start Ollama, install a text model, and try again.');
    }
  }

  async function models(signal) {
    try {
      const data = await request('api/tags', { signal, timeout: modelsTimeoutMs });
      if (!data || !Array.isArray(data.models)) throw new ServiceError(502, 'Ollama returned an invalid model list.');
      const names = [...new Set(data.models.map((model) => model?.name).filter(validModelName))];
      return {
        available: true, models: names,
        ...(names.length ? {} : { message: 'Ollama is running, but no models are installed. Install a text model, then refresh.' }),
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      return { available: false, models: [], message: error.message };
    }
  }

  async function explain({ paragraphs, audience, depth, model, signal }) {
    const data = await request('api/chat', {
      signal,
      body: {
        model, messages: lessonMessages(paragraphs, audience, depth), stream: false,
        format: generationSchema(paragraphs), options: { temperature: 0, num_predict: 8192 },
      },
    });
    if (!data || typeof data.message?.content !== 'string' || data.done !== true) {
      throw new ServiceError(502, 'Ollama returned an incomplete response. Try another installed text model.');
    }
    let lesson;
    try {
      lesson = JSON.parse(data.message.content);
    } catch {
      throw new ServiceError(502, 'The model did not return a JSON lesson. Try another installed text model.');
    }
    try {
      lesson = normalizeGeneratedLesson(lesson, paragraphs);
    } catch (error) {
      throw new ServiceError(502, `The model returned an invalid lesson: ${error.message} Try again or choose another model.`);
    }
    return { lesson, paragraphs, model };
  }

  return { models, explain };
}
