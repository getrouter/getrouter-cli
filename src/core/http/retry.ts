export type RetryOptions = {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: unknown): boolean => {
  // Network errors (fetch failures)
  if (error instanceof TypeError) {
    return true;
  }
  // Errors with status codes
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const status = (error as { status: number }).status;
    // Retry on 5xx server errors, 408 timeout, 429 rate limit
    return status >= 500 || status === 408 || status === 429;
  }
  return false;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = isRetryableError,
    onRetry,
    sleep = defaultSleep,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      onRetry?.(error, attempt + 1, delay);
      await sleep(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }

  throw lastError;
};

export const isServerError = (status: number): boolean =>
  status >= 500 || status === 408 || status === 429;
