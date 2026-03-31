const BACKEND_URLS: Record<string, string> = {
    development: process.env.NEXT_PUBLIC_DEV_BACKEND_URL ?? "http://localhost:8085",
    production: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
};

export const BACKEND_BASE_URL =
    BACKEND_URLS[process.env.NODE_ENV] ?? BACKEND_URLS.production;
