const BACKEND_URLS: Record<string, string> = {
    development: "http://localhost:8000",
    production: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
};

export const BACKEND_BASE_URL =
    BACKEND_URLS[process.env.NODE_ENV] ?? BACKEND_URLS.production;
