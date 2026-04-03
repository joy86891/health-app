/**
 * 带超时和重试功能的请求工具
 * 用于处理网络不稳定的情况
 */

interface FetchOptions extends RequestInit {
  timeout?: number;  // 超时时间（毫秒），默认 15000
  retries?: number;  // 重试次数，默认 2
  retryDelay?: number; // 重试间隔（毫秒），默认 1000
}

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 带超时和重试的 fetch 请求
 * 
 * @param url 请求地址
 * @param options 请求选项
 * @returns Promise<Response>
 * 
 * @example
 * const response = await fetchWithRetry('https://api.example.com/login', {
 *   method: 'POST',
 *   body: JSON.stringify({ username, password }),
 *   timeout: 10000,  // 10秒超时
 *   retries: 3,      // 重试3次
 * });
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retries = 2, retryDelay = 1000, ...fetchOptions } = options;
  
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Fetch] 第 ${attempt + 1} 次重试: ${url}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
      const response = await fetchWithTimeout(url, fetchOptions);
      return response;
    } catch (error) {
      lastError = error as Error;
      const isAbortError = (error as Error).name === 'AbortError';
      const errorMessage = isAbortError 
        ? `请求超时 (${options.timeout || 15000}ms)` 
        : (error as Error).message;
      
      console.log(`[Fetch] 第 ${attempt + 1} 次请求失败: ${errorMessage}`);
      
      // 如果是超时错误或者网络错误，继续重试
      // 如果是其他错误（如参数错误），不再重试
      if (!isAbortError && !(error as Error).message.includes('network')) {
        throw error;
      }
    }
  }

  // 所有重试都失败了
  throw lastError || new Error('请求失败');
}

/**
 * 带超时和重试的 JSON 请求
 * 
 * @param url 请求地址
 * @param options 请求选项
 * @returns Promise<any> 解析后的 JSON 数据
 */
export async function fetchJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
