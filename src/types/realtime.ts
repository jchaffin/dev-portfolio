import { z } from "zod";

// Define the allowed moderation categories only once
export const MODERATION_CATEGORIES = [
  "OFFENSIVE",
  "OFF_BRAND",
  "VIOLENCE",
  "NONE",
] as const;

// Derive the union type for ModerationCategory from the array
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

// Create a Zod enum based on the same array
export const ModerationCategoryZod = z.enum([...MODERATION_CATEGORIES]);

export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

// Missing type definitions
export interface FunctionArgs {
  [key: string]: unknown;
}

export interface FunctionResult {
  [key: string]: unknown;
}

export interface Arguments {
  [key: string]: unknown;
}

export interface Content {
  type: string;
  text?: string;
  transcript?: string;
  name?: string;
  arguments?: Arguments;
  [key: string]: unknown;
}

export interface ToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  pattern?: string;
  properties?: Record<string, ToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: ToolParameterProperty;
}

export interface ToolParameters {
  type: string;
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters: ToolParameters;
}

export interface AgentConfig {
  name: string;
  publicDescription: string; // gives context to agent transfer tool
  instructions: string;
  tools: Tool[];
  toolLogic?: Record<
    string,
    (_args: FunctionArgs, _transcriptLogsFiltered: TranscriptItem[], _addTranscriptBreadcrumb?: (_title: string, _data?: unknown) => void) => Promise<FunctionResult> | FunctionResult
  >;
  // addTranscriptBreadcrumb is a param in case we want to add additional breadcrumbs, e.g. for nested tool calls from a supervisor agent.
  downstreamAgents?:
    | AgentConfig[]
    | { name: string; publicDescription: string }[];
}

export type AllAgentConfigsType = Record<string, AgentConfig[]>;

export interface GuardrailResultType {
  status: "IN_PROGRESS" | "DONE";
  testText?: string; 
  category?: ModerationCategory;
  rationale?: string;
}

export interface TranscriptItem {
  itemId: string;
  type: "MESSAGE" | "BREADCRUMB";
  role?: "user" | "assistant";
  title?: string;
  data?: Record<string, unknown>;
  expanded: boolean;
  timestamp: string;
  createdAtMs: number;
  status: "IN_PROGRESS" | "DONE";
  isHidden: boolean;
  guardrailResult?: GuardrailResultType;
}

export interface Log {
  id: number;
  timestamp: string;
  direction: string;
  eventName: string;
  data: unknown;
  expanded: boolean;
  type: string;
}

export interface ServerEvent {
  type: string;
  event_id?: string;
  item_id?: string;
  transcript?: string;
  delta?: string;
  session?: {
    id?: string;
  };
  item?: {
    id?: string;
    object?: string;
    type?: string;
    status?: string;
    name?: string;
    arguments?: Arguments;
    role?: "user" | "assistant";
    content?: Content[];
  };
  response?: {
    output?: {
      id: string;
      type?: string;
      name?: string;
      arguments?: Arguments;
      call_id?: string;
      role: string;
      content?: Content[];
    }[];
    metadata: Record<string, unknown>;
    status_details?: {
      error?: Error;
    };
  };
}

export interface LoggedEvent {
  id: number;
  direction: "client" | "server";
  expanded: boolean;
  timestamp: string;
  eventName: string;
  eventData: Record<string, unknown>; // can have arbitrary objects logged
}

// Update the GuardrailOutputZod schema to use the shared ModerationCategoryZod
export const GuardrailOutputZod = z.object({
  moderationRationale: z.string(),
  moderationCategory: ModerationCategoryZod,
  testText: z.string().optional(),
}).strict();

export type GuardrailOutput = z.infer<typeof GuardrailOutputZod>;

