// src/tools.ts
function defineTool(config) {
  return {
    name: config.name,
    description: config.description,
    parameters: {
      type: "object",
      properties: config.parameters,
      required: config.required
    },
    execute: config.execute
  };
}
function createNavigationTool(sections) {
  return defineTool({
    name: "navigate",
    description: `Navigate to a section. Available: ${sections.join(", ")}`,
    parameters: {
      section: {
        type: "string",
        enum: sections,
        description: "Section to scroll to"
      }
    },
    required: ["section"],
    execute: ({ section }) => {
      if (typeof window !== "undefined") {
        const el = document.getElementById(section);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          return { success: true, section };
        }
      }
      return { success: false, error: "Section not found" };
    }
  });
}
function createEventTool(config) {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    required: config.required,
    execute: (params) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(config.eventType, {
          detail: { toolName: config.name, params }
        }));
      }
      return { success: true, ...params };
    }
  });
}
function createAPITool(config) {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    required: config.required,
    execute: async (params) => {
      try {
        const url = typeof config.endpoint === "function" ? config.endpoint(params) : config.endpoint;
        const isPost = config.method === "POST";
        const response = await fetch(url, {
          method: config.method || "GET",
          headers: {
            ...isPost ? { "Content-Type": "application/json" } : {},
            ...config.headers
          },
          body: isPost ? JSON.stringify(params) : void 0
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
  });
}
function createSearchTool(config) {
  const paramName = config.searchParam || "query";
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: {
      [paramName]: {
        type: "string",
        description: `The ${paramName} to search for`
      }
    },
    required: [paramName],
    execute: async (params) => {
      const query = params[paramName];
      try {
        let result;
        if (config.fetch) {
          result = await config.fetch(query);
        } else if (config.endpoint) {
          const res = await fetch(config.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          result = await res.json();
        } else {
          throw new Error("Must provide either endpoint or fetch function");
        }
        const finalResult = config.transform ? config.transform(result) : result;
        if (config.eventType && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(config.eventType, {
            detail: { query, result: finalResult }
          }));
        }
        return finalResult;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  });
}
function createRAGTool(config) {
  return defineTool({
    name: config.name,
    description: config.description,
    parameters: {
      query: { type: "string", description: "Search query" },
      ...config.repo ? {} : { repo: { type: "string", description: "Optional: filter by repository name" } }
    },
    required: ["query"],
    execute: async (params) => {
      const { query, repo } = params;
      try {
        const res = await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            repo: config.repo || repo,
            limit: config.limit || 10
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (config.eventType && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(config.eventType, {
            detail: { query, result }
          }));
        }
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  });
}
var TOOL_RESULT_EVENT = "voicekit:tool-result";
function emitToolResult(name, input, result) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TOOL_RESULT_EVENT, {
      detail: { name, input, result, timestamp: Date.now() }
    }));
  }
}

export {
  defineTool,
  createNavigationTool,
  createEventTool,
  createAPITool,
  createSearchTool,
  createRAGTool,
  TOOL_RESULT_EVENT,
  emitToolResult
};
