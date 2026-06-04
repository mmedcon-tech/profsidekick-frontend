// Configuration for different environments
if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
  throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
}

export const config = {
  // Backend API URL
  isLocal: process.env.NEXT_PUBLIC_IS_LOCAL === 'true',
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
  
  // Frontend URL (for redirects, CORS, etc.)
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Environment flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
   
  // API endpoints
  api: {
    auth: {
      register: '/api/auth/register',
      login: '/api/auth/login',
      verify: '/api/auth/verify-token',
      refresh: '/api/auth/refresh',
      logout: '/api/auth/logout',
    },
    sessions: {
      create: '/api/sessions/create',
      list: '/api/sessions',
      get: (sessionId: string) => `/api/sessions/${sessionId}`,
      runs: (sessionId: string) => `/api/sessions/${sessionId}/runs`,
      runStart: (sessionId: string) => `/api/sessions/${sessionId}/run/start`,
      runStop: (sessionId: string, runId: string) => `/api/sessions/${sessionId}/run/${runId}/stop`,
      update: (sessionId: string) => `/api/sessions/${sessionId}/update`,
      ephemeral: '/api/session/ephemeral',
    },
    prompts: {
      list: '/api/prompts',
      create: '/api/prompts',
      get: (promptId: string) => `/api/prompts/${promptId}`,
      update: (promptId: string) => `/api/prompts/${promptId}`,
      delete: (promptId: string) => `/api/prompts/${promptId}`,
    },
    billing: {
      balance: '/api/billing/balance',
      redeem: '/api/billing/redeem',
      addCredits: '/api/billing/add-credits',
      usage: '/api/billing/usage',
    },
  },
  
  // Get full URL for API calls
  getApiUrl: (endpoint: string) => {
    if (config.isLocal) {
      return `http://localhost:8000${endpoint}`;
    }
    const baseUrl = config.backendUrl.endsWith('/') 
      ? config.backendUrl.slice(0, -1) 
      : config.backendUrl; 
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  },
  
  // Get full frontend URL
  getAppUrl: (path: string = '') => {
    const baseUrl = config.appUrl.endsWith('/') 
      ? config.appUrl.slice(0, -1) 
      : config.appUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  },
};

// Helper function to get image URL
export const getImageUrl = (imagePath: string) => {
  if (!imagePath) return '';
  
  // If it's already a full URL, use it as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Construct URL from backend
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return config.getApiUrl(`/${cleanPath}`);
};

export default config; 