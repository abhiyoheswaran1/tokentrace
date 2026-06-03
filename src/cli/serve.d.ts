export interface ServeOptions {
  help: boolean;
  hostname: string;
  port: number | null;
  openBrowser: boolean;
}

export interface ResolvedServePort {
  port: number;
  fixed: boolean;
}

export interface ServeContext {
  appDataDir(): string;
  nextBin(): string;
  runtimeEnv(): NodeJS.ProcessEnv;
}

export function parsePort(value: unknown): number;
export function parseServeOptions(args: string[], env?: NodeJS.ProcessEnv): ServeOptions;
export function isLoopbackHostname(hostname: unknown): boolean;
export function assertHostnameAllowed(
  hostname: string,
  env?: Record<string, string | undefined>
): void;
export function startupProgress(step: string, detail?: string): void;
export function formatServeError(
  error: unknown,
  options?: { hostname?: string; port?: number | null }
): string;
export function resolveServePort(options: ServeOptions): Promise<ResolvedServePort>;
export function serve(context: ServeContext, args?: string[]): Promise<void>;
