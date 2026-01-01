const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|token|password|passwd|pwd|auth|credential)[s]?[\s]*[=:]\s*['"]?([^'"\s]{8,})['"]?/gi,
  /(?:bearer|basic)\s+[a-zA-Z0-9._-]{20,}/gi,
  /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/g,
  /sk-[a-zA-Z0-9]{32,}/g,
  /AIza[a-zA-Z0-9_-]{35}/g,
  /[a-zA-Z0-9]{24}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27}/g,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

export function sanitizeForLogging(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return redactSecrets(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('credential') ||
        lowerKey.includes('auth')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    return sanitized;
  }

  return obj;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

export function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>'")\]]+/gi;
  const matches = text.match(urlPattern);
  return matches ? [...new Set(matches)] : [];
}

export function sanitizeMessageContent(content: string, maxLength: number = 500): string {
  let sanitized = redactSecrets(content);
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  sanitized = sanitized.trim();
  return truncateText(sanitized, maxLength);
}
