import { readFileSync, existsSync } from 'node:fs';
import type { OutlineConfig, TransportConfig } from './types.js';

interface ConfigFile {
  outline?: {
    baseUrl?: string;
    apiKey?: string;
  };
}

export function loadConfig(configPath?: string): OutlineConfig {
  // Start with environment variables
  let baseUrl = process.env.OUTLINE_BASE_URL;
  let apiKey = process.env.OUTLINE_API_KEY;

  // Override with config file if provided
  if (configPath && existsSync(configPath)) {
    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      const fileConfig: ConfigFile = JSON.parse(fileContent);

      if (fileConfig.outline?.baseUrl) {
        baseUrl = fileConfig.outline.baseUrl;
      }
      if (fileConfig.outline?.apiKey) {
        apiKey = fileConfig.outline.apiKey;
      }
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new Error(`Config file not found: ${configPath}`, {
          cause: error,
        });
      } else if (error instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON in config file ${configPath}: ${error.message}`,
          { cause: error }
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read config file ${configPath}: ${message}`, {
        cause: error,
      });
    }
  }

  // Validate required fields
  if (!baseUrl) {
    throw new Error(
      'Missing Outline base URL. Set OUTLINE_BASE_URL environment variable or provide config file.'
    );
  }

  if (!apiKey) {
    throw new Error(
      'Missing Outline API key. Set OUTLINE_API_KEY environment variable or provide config file.'
    );
  }

  // Normalize base URL (remove trailing slash)
  baseUrl = baseUrl.replace(/\/+$/, '');

  return { baseUrl, apiKey };
}

export function getConfigPath(): string | undefined {
  // Check for --config flag in args
  const configIndex = process.argv.indexOf('--config');
  if (configIndex !== -1 && process.argv[configIndex + 1]) {
    return process.argv[configIndex + 1];
  }
  return undefined;
}

export function getTransportConfig(): TransportConfig {
  // Check for --transport flag in args, then env var, default to stdio
  const transportIndex = process.argv.indexOf('--transport');
  let transport: string | undefined;
  if (transportIndex !== -1 && process.argv[transportIndex + 1]) {
    transport = process.argv[transportIndex + 1];
  }
  transport = transport || process.env.MCP_TRANSPORT || 'stdio';

  if (transport !== 'stdio' && transport !== 'http') {
    throw new Error(
      `Invalid transport "${transport}". Must be "stdio" or "http".`
    );
  }

  // Check for --port flag in args, then env var, default to 9999
  const portIndex = process.argv.indexOf('--port');
  let portStr: string | undefined;
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    portStr = process.argv[portIndex + 1];
  }
  portStr = portStr || process.env.PORT;
  const port = portStr ? parseInt(portStr, 10) : 9999;

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port "${portStr}". Must be a number between 1 and 65535.`
    );
  }

  return { transport, port };
}
