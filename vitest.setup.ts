import '@testing-library/jest-dom';

// `src/lib/config.ts` throws at import time if this is unset. Provide a default
// for tests so any module that transitively imports it (e.g. API route handlers)
// can be unit-tested without a real .env file.
if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:8000';
}

// jsdom does not implement scrollIntoView — stub it so components that
// auto-scroll (e.g. chat/transcript panels) don't throw in tests.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
