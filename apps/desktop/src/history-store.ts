import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  LocalHistoryCreateInput,
  LocalHistoryEntry,
  LocalHistoryFilters,
} from "@postman-clone/shared-types";

const maxHistoryEntries = 1000;

export class LocalHistoryStore {
  private readonly filePath: string;
  private writeQueue = Promise.resolve();

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, "local-history.json");
  }

  async create(input: LocalHistoryCreateInput): Promise<LocalHistoryEntry | null> {
    const entries = await this.readAll();
    const entry: LocalHistoryEntry = {
      id: input.id ?? crypto.randomUUID(),
      requestId: input.requestId ?? null,
      workspaceId: input.workspaceId ?? null,
      collectionId: input.collectionId ?? null,
      protocolType: input.protocolType,
      method: input.method,
      url: input.url,
      requestHeaders: input.requestHeaders,
      requestBody: input.requestBody,
      responseStatus: input.responseStatus,
      responseHeaders: input.responseHeaders,
      responseBody: input.responseBody,
      durationMs: input.durationMs,
      sizeBytes: input.sizeBytes,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };

    await this.writeAll([entry, ...entries].slice(0, maxHistoryEntries));
    return entry;
  }

  async list(filters: LocalHistoryFilters = {}): Promise<LocalHistoryEntry[]> {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), maxHistoryEntries);
    const query = filters.query?.trim().toLowerCase();

    return (await this.readAll())
      .filter((entry) => {
        if (filters.requestId && entry.requestId !== filters.requestId) {
          return false;
        }

        if (filters.collectionId && entry.collectionId !== filters.collectionId) {
          return false;
        }

        if (filters.workspaceId && entry.workspaceId !== filters.workspaceId) {
          return false;
        }

        if (query && !`${entry.method} ${entry.url} ${entry.responseStatus}`.toLowerCase().includes(query)) {
          return false;
        }

        return true;
      })
      .slice(0, limit);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const entries = await this.readAll();
    const nextEntries = entries.filter((entry) => entry.id !== id);
    await this.writeAll(nextEntries);
    return { success: entries.length !== nextEntries.length };
  }

  async clear(): Promise<{ success: boolean }> {
    await this.writeAll([]);
    return { success: true };
  }

  private async readAll(): Promise<LocalHistoryEntry[]> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as LocalHistoryEntry[];
    } catch {
      return [];
    }
  }

  private async writeAll(entries: LocalHistoryEntry[]): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(entries, null, 2), "utf8");
    });

    await this.writeQueue;
  }
}
