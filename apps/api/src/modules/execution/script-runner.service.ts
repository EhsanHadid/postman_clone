import { Injectable } from "@nestjs/common";
import { Script, createContext } from "node:vm";

interface MutableRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

interface ResponseFacade {
  status: number;
  headers: Record<string, string>;
  text: () => string;
  json: () => unknown;
}

interface ScriptExecutionOptions {
  script: string;
  request: MutableRequest;
  envVariables: Record<string, string>;
  response?: ResponseFacade;
}

@Injectable()
export class ScriptRunnerService {
  run({ script, request, envVariables, response }: ScriptExecutionOptions): {
    request: MutableRequest;
    envMutations: Record<string, string>;
  } {
    if (!script.trim()) {
      return {
        request,
        envMutations: {},
      };
    }

    const envMutations: Record<string, string> = {};

    const context = createContext({
      env: {
        get: (name: string) => envVariables[name],
        set: (name: string, value: unknown) => {
          const nextValue = String(value ?? "");
          envVariables[name] = nextValue;
          envMutations[name] = nextValue;
        },
      },
      request: {
        getHeader: (name: string) => request.headers[this.normalizeHeaderName(name)],
        setHeader: (name: string, value: unknown) => {
          request.headers[this.normalizeHeaderName(name)] = String(value ?? "");
        },
        setBody: (value: unknown) => {
          request.body = typeof value === "string" ? value : JSON.stringify(value);
        },
        getBody: () => request.body,
        setUrl: (value: string) => {
          request.url = value;
        },
        method: request.method,
        url: request.url,
      },
      response,
      console: {
        log: (...args: unknown[]) => {
          void args;
        },
      },
    });

    const wrappedScript = new Script(`"use strict";\n${script}`);
    wrappedScript.runInContext(context, { timeout: 150 });

    return {
      request,
      envMutations,
    };
  }

  private normalizeHeaderName(name: string): string {
    return name.toLowerCase();
  }
}
