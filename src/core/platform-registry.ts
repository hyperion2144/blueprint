/**
 * platform-registry — PlatformProvider interface + PlatformRegistry
 *
 * Defines the contract for platform-specific file generators.
 * Each platform (omp, claude-code, agent) implements PlatformProvider
 * and registers with PlatformRegistry.
 *
 * ---
 *
 * PlatformProvider:
 *   Unified generate() method. Platform decides what files to produce
 *   (commands, agents, skills, or none). No per-type dispatch — the
 *   provider knows its own capabilities.
 *
 * PlatformRegistry:
 *   Map-based singleton. register/resolve/list/has/generateAll.
 *   setPlatformRegistry() for test isolation — replaces the singleton.
 */

import type { ProjectConfig } from '../types/index.js';

// ── Types ─────────────────────────────────────────────────────────

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface PlatformCapabilities {
  supportsCommands?: boolean; // default: false
}

export interface PlatformProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities?: PlatformCapabilities;
  generate(config: ProjectConfig): GeneratedFile[];
}

// ── Registry ───────────────────────────────────────────────────────

type RegistryMap = Map<string, PlatformProvider>;
let registry: RegistryMap | null = null;

/** Create a fresh registry (factory). */
export function createDefaultRegistry(): RegistryMap {
  return new Map();
}

/** Replace the singleton registry — for test isolation. */
export function setPlatformRegistry(r: RegistryMap | null): void {
  registry = r;
}

/** Get the singleton, creating a default if none set. */
function ensureRegistry(): RegistryMap {
  if (!registry) {
    registry = createDefaultRegistry();
  }
  return registry;
}

export const PlatformRegistry = {
  register(id: string, provider: PlatformProvider): void {
    const r = ensureRegistry();
    if (r.has(id)) {
      throw new Error(`PlatformProvider "${id}" is already registered`);
    }
    r.set(id, provider);
  },

  resolve(id: string): PlatformProvider {
    const r = ensureRegistry();
    const provider = r.get(id);
    if (!provider) {
      throw new Error(`PlatformProvider "${id}" not found`);
    }
    return provider;
  },

  list(): PlatformProvider[] {
    return Array.from(ensureRegistry().values());
  },

  has(id: string): boolean {
    return ensureRegistry().has(id);
  },

  generateAll(config: ProjectConfig): GeneratedFile[] {
    const r = ensureRegistry();
    const files: GeneratedFile[] = [];
    for (const provider of r.values()) {
      files.push(...provider.generate(config));
    }
    return files;
  },
};
