import type { ToolDefinition, ToolParamDefinition } from './types';

// ============================================================================
// Core Tool Builder
// ============================================================================

type InferParamType<T extends ToolParamDefinition> = 
  T['type'] extends 'string' ? string :
  T['type'] extends 'number' ? number :
  T['type'] extends 'boolean' ? boolean :
  T['type'] extends 'array' ? unknown[] :
  T['type'] extends 'object' ? Record<string, unknown> :
  unknown;

type InferParams<T extends Record<string, ToolParamDefinition>> = {
  [K in keyof T]: InferParamType<T[K]>;
};

/**
 * Define a tool with full type inference
 * 
 * @example
 * ```ts
 * const weatherTool = defineTool({
 *   name: 'get_weather',
 *   description: 'Get current weather for a location',
 *   parameters: {
 *     location: { type: 'string', description: 'City name' },
 *     unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
 *   },
 *   required: ['location'],
 *   execute: async ({ location, unit }) => {
 *     return { temp: 72, unit, location };
 *   }
 * });
 * ```
 */
export function defineTool<
  TParams extends Record<string, ToolParamDefinition>,
  TResult = unknown
>(config: {
  name: string;
  description: string;
  parameters: TParams;
  required?: (keyof TParams)[];
  execute: (params: InferParams<TParams>) => Promise<TResult> | TResult;
}): ToolDefinition<InferParams<TParams>, TResult> {
  return {
    name: config.name,
    description: config.description,
    parameters: {
      type: 'object',
      properties: config.parameters,
      required: config.required as string[],
    },
    execute: config.execute as (params: InferParams<TParams>) => Promise<TResult> | TResult,
  };
}

// ============================================================================
// Convenience Tool Builders
// ============================================================================

/**
 * Create a navigation tool for single-page apps
 * 
 * @example
 * ```ts
 * const navTool = createNavigationTool(['about', 'projects', 'contact']);
 * ```
 */
export function createNavigationTool(sections: string[]): ToolDefinition<{ section: string }, { success: boolean; section?: string; error?: string }> {
  return defineTool({
    name: 'navigate',
    description: `Navigate to a section. Available: ${sections.join(', ')}`,
    parameters: {
      section: { 
        type: 'string', 
        enum: sections,
        description: 'Section to scroll to' 
      }
    },
    required: ['section'],
    execute: ({ section }) => {
      if (typeof window !== 'undefined') {
        const el = document.getElementById(section as string);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return { success: true, section: section as string };
        }
      }
      return { success: false, error: 'Section not found' };
    }
  });
}

/**
 * Create a tool that dispatches a custom event for UI updates
 * 
 * @example
 * ```ts
 * const showModalTool = createEventTool({
 *   name: 'show_modal',
 *   description: 'Show a modal dialog',
 *   parameters: { title: { type: 'string' } },
 *   eventType: 'voice:show-modal'
 * });
 * 
 * // Listen in React:
 * useEffect(() => {
 *   const handler = (e) => setModal(e.detail.params);
 *   window.addEventListener('voice:show-modal', handler);
 *   return () => window.removeEventListener('voice:show-modal', handler);
 * }, []);
 * ```
 */
export function createEventTool<TParams extends Record<string, ToolParamDefinition>>(config: {
  name: string;
  description: string;
  parameters: TParams;
  required?: (keyof TParams)[];
  eventType: string;
}): ToolDefinition<InferParams<TParams>, { success: boolean }> {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    required: config.required,
    execute: (params) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(config.eventType, { 
          detail: { toolName: config.name, params } 
        }));
      }
      return { success: true, ...params } as { success: boolean };
    }
  });
}

/**
 * Create a tool that calls an API endpoint
 * 
 * @example
 * ```ts
 * const searchTool = createAPITool({
 *   name: 'search',
 *   description: 'Search the database',
 *   parameters: { query: { type: 'string' } },
 *   required: ['query'],
 *   endpoint: '/api/search',
 *   method: 'POST'
 * });
 * ```
 */
export function createAPITool<
  TParams extends Record<string, ToolParamDefinition>,
  TResult = unknown
>(config: {
  name: string;
  description: string;
  parameters: TParams;
  required?: (keyof TParams)[];
  endpoint: string | ((params: InferParams<TParams>) => string);
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  transform?: (response: unknown) => TResult;
}): ToolDefinition<InferParams<TParams>, TResult | { success: false; error: string }> {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    required: config.required,
    execute: async (params) => {
      try {
        const url = typeof config.endpoint === 'function' 
          ? config.endpoint(params) 
          : config.endpoint;
        
        const isPost = config.method === 'POST';
        
        const response = await fetch(url, {
          method: config.method || 'GET',
          headers: {
            ...(isPost ? { 'Content-Type': 'application/json' } : {}),
            ...config.headers,
          },
          body: isPost ? JSON.stringify(params) : undefined,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return config.transform ? config.transform(data) : data;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  }) as ToolDefinition<InferParams<TParams>, TResult | { success: false; error: string }>;
}

// ============================================================================
// Project/Content Search Tools
// ============================================================================

/**
 * Create a tool that searches projects/content by technology or keyword
 * 
 * @example
 * ```ts
 * const findProjectsTool = createSearchTool({
 *   name: 'find_projects_by_tech',
 *   description: 'Find projects that use a specific technology',
 *   searchParam: 'technology',
 *   endpoint: '/api/search',
 *   // OR custom fetch function:
 *   fetch: async (query) => {
 *     const res = await fetch(`/api/rag?q=${query}`);
 *     return res.json();
 *   }
 * });
 * ```
 */
export function createSearchTool<TResult = unknown>(config: {
  name: string;
  description: string;
  /** Parameter name shown to the model (e.g. 'technology', 'query', 'keyword') */
  searchParam?: string;
  /** Simple endpoint - will POST { query: value } */
  endpoint?: string;
  /** Custom fetch function for complex queries */
  fetch?: (query: string) => Promise<TResult>;
  /** Transform the response */
  transform?: (response: TResult) => unknown;
  /** Event to dispatch with results (for UI updates) */
  eventType?: string;
}): ToolDefinition {
  const paramName = config.searchParam || 'query';
  
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: {
      [paramName]: { 
        type: 'string', 
        description: `The ${paramName} to search for` 
      }
    },
    required: [paramName],
    execute: async (params) => {
      const query = params[paramName as keyof typeof params] as string;
      
      try {
        let result: TResult;
        
        if (config.fetch) {
          result = await config.fetch(query);
        } else if (config.endpoint) {
          const res = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          result = await res.json();
        } else {
          throw new Error('Must provide either endpoint or fetch function');
        }
        
        const finalResult = config.transform ? config.transform(result) : result;
        
        // Dispatch event for UI if configured
        if (config.eventType && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(config.eventType, {
            detail: { query, result: finalResult }
          }));
        }
        
        return finalResult;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  }) as ToolDefinition;
}

/**
 * Create a RAG-powered search tool
 * 
 * @example
 * ```ts
 * const ragTool = createRAGTool({
 *   name: 'search_codebase',
 *   description: 'Search the codebase for relevant code snippets',
 *   endpoint: '/api/rag'
 * });
 * ```
 */
export function createRAGTool(config: {
  name: string;
  description: string;
  endpoint: string;
  /** Optional: filter by repo name */
  repo?: string;
  /** Number of results to return */
  limit?: number;
  /** Event to dispatch with results */
  eventType?: string;
}): ToolDefinition {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: {
      query: { type: 'string', description: 'Search query' },
      ...(config.repo ? {} : { repo: { type: 'string', description: 'Optional: filter by repository name' } })
    },
    required: ['query'],
    execute: async (params) => {
      const { query, repo } = params as { query: string; repo?: string };
      
      try {
        const res = await fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            repo: config.repo || repo,
            limit: config.limit || 10
          })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        
        if (config.eventType && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(config.eventType, {
            detail: { query, result }
          }));
        }
        
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  }) as ToolDefinition;
}

// ============================================================================
// Tool Event Helpers
// ============================================================================

/** Event name for tool results */
export const TOOL_RESULT_EVENT = 'voicekit:tool-result';

/** Dispatch a tool result event (called internally) */
export function emitToolResult(name: string, input: unknown, result: unknown): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TOOL_RESULT_EVENT, {
      detail: { name, input, result, timestamp: Date.now() }
    }));
  }
}
