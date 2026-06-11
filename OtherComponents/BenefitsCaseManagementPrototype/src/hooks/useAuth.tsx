import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { UiPath } from '@uipath/uipath-typescript';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdk: UiPath;
  currentUserEmail: string | null;
  currentUserName: string | null;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
  missingFields: string[];
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const authConfigFingerprintKey = 'uipath_sdk_auth_config_fingerprint';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getCurrentUserProfile(clientId?: string): { email: string | null; name: string | null } {
  if (!clientId) {
    return { email: null, name: null };
  }

  const rawTokenEntry = sessionStorage.getItem(`uipath_sdk_user_token-${clientId}`);
  if (!rawTokenEntry) {
    return { email: null, name: null };
  }

  try {
    const parsedEntry = JSON.parse(rawTokenEntry) as {
      token?: string;
      id_token?: string;
      access_token?: string;
    };

    const payload = decodeJwtPayload(parsedEntry.token || parsedEntry.id_token || parsedEntry.access_token || '');
    const email = payload?.email || payload?.preferred_username || payload?.upn || payload?.unique_name;
    const firstName = typeof payload?.first_name === 'string' ? payload.first_name.trim() : '';
    const lastName = typeof payload?.last_name === 'string' ? payload.last_name.trim() : '';
    const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const fallbackName = typeof payload?.name === 'string' ? payload.name : null;

    return {
      email: typeof email === 'string' ? email : null,
      name: combinedName || fallbackName,
    };
  } catch {
    return { email: null, name: null };
  }
}

function clearOAuthSession(clientId?: string) {
  if (!clientId) {
    return;
  }

  sessionStorage.removeItem(`uipath_sdk_user_token-${clientId}`);
  sessionStorage.removeItem('uipath_sdk_oauth_context');
  sessionStorage.removeItem('uipath_sdk_code_verifier');
  sessionStorage.removeItem(authConfigFingerprintKey);
}

function hasStoredOAuthSession(clientId?: string): boolean {
  return Boolean(clientId && sessionStorage.getItem(`uipath_sdk_user_token-${clientId}`));
}

function getAuthConfigFingerprint(config: UiPathSDKConfig): string {
  return JSON.stringify({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    baseUrl: config.baseUrl,
    orgName: config.orgName,
    tenantName: config.tenantName,
    scope: config.scope,
  });
}

function rememberAuthConfig(config: UiPathSDKConfig) {
  sessionStorage.setItem(authConfigFingerprintKey, getAuthConfigFingerprint(config));
}

function hasMismatchedStoredAuthConfig(config: UiPathSDKConfig, clientId?: string): boolean {
  if (!hasStoredOAuthSession(clientId)) {
    return false;
  }

  return sessionStorage.getItem(authConfigFingerprintKey) !== getAuthConfigFingerprint(config);
}

function clearOAuthCallbackParams() {
  const url = new URL(window.location.href);
  const callbackParams = ['code', 'state', 'error', 'error_description'];
  const hasCallbackParam = callbackParams.some((param) => url.searchParams.has(param));

  if (!hasCallbackParam) {
    return;
  }

  callbackParams.forEach((param) => url.searchParams.delete(param));
  window.history.replaceState({}, '', url.toString());
}

function getStoredOAuthContext(): Record<string, unknown> | null {
  const rawContext = sessionStorage.getItem('uipath_sdk_oauth_context');

  if (!rawContext) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawContext);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function hasMismatchedOAuthContext(config: UiPathSDKConfig): boolean {
  const context = getStoredOAuthContext();

  if (!context) {
    return false;
  }

  return (
    context.clientId !== config.clientId ||
    context.redirectUri !== config.redirectUri ||
    context.baseUrl !== config.baseUrl ||
    context.orgName !== config.orgName ||
    context.tenantName !== config.tenantName ||
    context.scope !== config.scope
  );
}

export function AuthProvider({
  children,
  config,
  missingFields,
}: {
  children: ReactNode;
  config: UiPathSDKConfig;
  missingFields: string[];
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk, setSdk] = useState<UiPath>(() => new UiPath(config));
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const hasRequiredConfig = missingFields.length === 0;
  const clientId = typeof config.clientId === 'string' ? config.clientId : undefined;

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);

      if (!hasRequiredConfig) {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        setCurrentUserName(null);
        setIsLoading(false);
        return;
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const oauthError = urlParams.get('error');
        if (oauthError) {
          const description = urlParams.get('error_description');
          throw new Error(description ? `${oauthError}: ${description}` : oauthError);
        }

        const hasCode = urlParams.has('code');
        const hasCallbackState = sdk.isInOAuthCallback() && hasCode;

        if (!hasCallbackState && hasMismatchedStoredAuthConfig(config, clientId)) {
          clearOAuthSession(clientId);
          setSdk(new UiPath(config));
          setIsAuthenticated(false);
          setCurrentUserEmail(null);
          setCurrentUserName(null);
          return;
        }

        if (!hasCallbackState && hasMismatchedOAuthContext(config)) {
          clearOAuthSession(clientId);
          setSdk(new UiPath(config));
          setIsAuthenticated(false);
          setCurrentUserEmail(null);
          setCurrentUserName(null);
          return;
        }

        if (hasCallbackState) {
          await sdk.completeOAuth();
        }

        setIsAuthenticated(sdk.isAuthenticated());
        if (sdk.isAuthenticated()) {
          rememberAuthConfig(config);
        }
        const profile = getCurrentUserProfile(clientId);
        setCurrentUserEmail(profile.email);
        setCurrentUserName(profile.name);
      } catch (err) {
        console.error('Authentication initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        clearOAuthSession(clientId);
        clearOAuthCallbackParams();
        setSdk(new UiPath(config));
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        setCurrentUserName(null);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [clientId, hasRequiredConfig, sdk]);

  const login = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!hasRequiredConfig) {
        throw new Error(`Missing UiPath OAuth config: ${missingFields.join(', ')}`);
      }

      let authSdk = sdk;

      if (!sdk.isInOAuthCallback()) {
        clearOAuthSession(clientId);
        authSdk = new UiPath(config);
        setSdk(authSdk);
      }

      await authSdk.initialize();
      setIsAuthenticated(authSdk.isAuthenticated());
      if (authSdk.isAuthenticated()) {
        rememberAuthConfig(config);
      }
      const profile = getCurrentUserProfile(clientId);
      setCurrentUserEmail(profile.email);
      setCurrentUserName(profile.name);
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsAuthenticated(false);
      setCurrentUserEmail(null);
      setCurrentUserName(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearOAuthSession(clientId);

    setIsAuthenticated(false);
    setError(null);
    setCurrentUserEmail(null);
    setCurrentUserName(null);
    setSdk(new UiPath(config));
  };

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated,
    isLoading,
    sdk,
    currentUserEmail,
    currentUserName,
    login,
    logout,
    error,
    missingFields,
  }), [currentUserEmail, currentUserName, error, isAuthenticated, isLoading, missingFields, sdk]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
