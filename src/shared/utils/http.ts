// Common HTTP headers
const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded" } as const;

export { JSON_HEADERS, FORM_HEADERS };
