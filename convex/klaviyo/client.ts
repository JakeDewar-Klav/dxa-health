const KLAVIYO_BASE_URL = "https://a.klaviyo.com/api";
const API_REVISION = "2025-04-15";

export type KlaviyoRequestOptions = {
  method?: "GET" | "POST";
  path: string;
  apiKey: string;
  params?: Record<string, string>;
  body?: unknown;
  contentType?: string;
  revision?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  links?: {
    self?: string;
    next?: string;
    prev?: string;
  };
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function klaviyoRequest<T>({
  method = "GET",
  path,
  apiKey,
  params,
  body,
  contentType,
  revision,
}: KlaviyoRequestOptions): Promise<T> {
  const url = new URL(`${KLAVIYO_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    revision: revision ?? API_REVISION,
    Accept: "application/json",
  };

  if (body) {
    headers["Content-Type"] = contentType ?? "application/json";
  }

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 429 || response.status === 504) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
      const baseWait = response.status === 504 ? 5000 : Math.min(retryAfter * 1000, 30000);
      const waitTime = baseWait * Math.pow(2, retries);
      retries++;
      if (retries > maxRetries) {
        throw new Error(`${response.status === 429 ? "Rate limited" : "Gateway timeout"} after ${maxRetries} retries on ${method} ${path}`);
      }
      console.warn(`Klaviyo ${response.status} on ${method} ${path}, retry ${retries}/${maxRetries} in ${waitTime}ms`);
      await sleep(waitTime);
      continue;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Klaviyo API error ${response.status} on ${method} ${path}: ${errorBody}`
      );
    }

    return response.json() as Promise<T>;
  }

  throw new Error(`Exhausted retries on ${path}`);
}

export async function klaviyoFetchAllPages<T>(
  path: string,
  apiKey: string,
  params?: Record<string, string>,
  maxPages = 10
): Promise<T[]> {
  const allData: T[] = [];
  let nextUrl: string | null = null;
  let page = 0;

  const firstResponse = await klaviyoRequest<PaginatedResponse<T>>({
    path,
    apiKey,
    params,
  });
  allData.push(...firstResponse.data);
  nextUrl = firstResponse.links?.next ?? null;
  page++;

  while (nextUrl && page < maxPages) {
    await sleep(250);
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: API_REVISION,
        Accept: "application/json",
      },
    });

    if (!response.ok) break;

    const data = (await response.json()) as PaginatedResponse<T>;
    allData.push(...data.data);
    nextUrl = data.links?.next ?? null;
    page++;
  }

  return allData;
}
