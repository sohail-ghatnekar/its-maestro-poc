import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

type UiPathDefaults = {
  clientId?: string;
  orgName?: string;
  tenantName?: string;
  baseUrl?: string;
  portalBaseUrl?: string;
  redirectUri?: string;
  scope?: string;
};

function readUiPathJson(rootDir: string): Partial<UiPathDefaults> {
  const configPath = path.join(rootDir, 'uipath.json');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<UiPathDefaults>;
  } catch {
    return {};
  }
}

function parseUiPathUrl(value?: string): Partial<UiPathDefaults> {
  if (!value) {
    return {};
  }

  try {
    const parsed = new URL(value);
    const [orgName, tenantName] = parsed.pathname.split('/').filter(Boolean);

    return {
      baseUrl: parsed.origin,
      orgName,
      tenantName,
    };
  } catch {
    return {};
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim());
}

function readPortFromUrl(value: string | undefined, fallbackPort: number): number {
  if (!value) {
    return fallbackPort;
  }

  try {
    const parsed = new URL(value);
    const port = Number(parsed.port);
    return Number.isInteger(port) && port > 0 ? port : fallbackPort;
  } catch {
    return fallbackPort;
  }
}

export default defineConfig(({ mode }) => {
  const rootDir = process.cwd();
  const env = loadEnv(mode, rootDir, '');
  const fileDefaults = readUiPathJson(rootDir);
  const urlDefaults = parseUiPathUrl(env.UIPATH_URL);

  const defaults: UiPathDefaults = {
    clientId: firstNonEmpty(env.VITE_UIPATH_CLIENT_ID, env.UIPATH_CLIENT_ID, fileDefaults.clientId),
    orgName: firstNonEmpty(env.VITE_UIPATH_ORG_NAME, fileDefaults.orgName, urlDefaults.orgName),
    tenantName: firstNonEmpty(env.VITE_UIPATH_TENANT_NAME, fileDefaults.tenantName, urlDefaults.tenantName),
    baseUrl: firstNonEmpty(env.VITE_UIPATH_BASE_URL, env.UIPATH_BASE_URL, fileDefaults.baseUrl, urlDefaults.baseUrl),
    portalBaseUrl: firstNonEmpty(env.VITE_UIPATH_PORTAL_BASE_URL, fileDefaults.portalBaseUrl, 'https://staging.uipath.com'),
    redirectUri: firstNonEmpty(env.VITE_UIPATH_REDIRECT_URI, fileDefaults.redirectUri),
    scope: firstNonEmpty(env.VITE_UIPATH_SCOPE, env.VITE_UIPATH_SCOPES, env.UIPATH_SCOPE, fileDefaults.scope),
  };
  const devServerPort = readPortFromUrl(defaults.redirectUri, 5173);
  const proxy: Record<string, string | ProxyOptions> = {};

  if (defaults.orgName && defaults.baseUrl) {
    proxy[`/${defaults.orgName}`] = {
      target: defaults.baseUrl,
      changeOrigin: true,
      secure: true,
    };
    proxy['/socket.io'] = {
      target: defaults.baseUrl,
      changeOrigin: true,
      secure: true,
      ws: true,
    };
  }

  if (defaults.portalBaseUrl) {
    proxy['/uipath-portal-api'] = {
      target: defaults.portalBaseUrl,
      changeOrigin: true,
      secure: true,
      rewrite: (proxyPath: string) => proxyPath.replace(/^\/uipath-portal-api/, ''),
    };
  }

  return {
    base: './',
    plugins: [react()],
    define: {
      global: 'globalThis',
      __UIPATH_DEFAULTS__: JSON.stringify(defaults),
    },
    resolve: {
      alias: {
        path: 'path-browserify',
      },
    },
    optimizeDeps: {
      include: ['@uipath/uipath-typescript'],
    },
    server: {
      host: '0.0.0.0',
      port: devServerPort,
      strictPort: Boolean(defaults.redirectUri),
      proxy: Object.keys(proxy).length > 0 ? proxy : undefined,
    },
  };
});
