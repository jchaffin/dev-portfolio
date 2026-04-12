let z: typeof import('zod').z | undefined;
try {
  z = require('zod').z;
} catch {
  // zod is an optional peer dependency; guardrail Zod schemas are unavailable without it
}

// Moderation categories
export const MODERATION_CATEGORIES = [
  'OFFENSIVE',
  'OFF_BRAND',
  'VIOLENCE',
  'NONE',
] as const;

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];
export const ModerationCategoryZod = z?.enum([...MODERATION_CATEGORIES]);

// Guardrail output schema
export const GuardrailOutputZod = z?.object({
  moderationRationale: z.string(),
  moderationCategory: z.enum([...MODERATION_CATEGORIES]),
  testText: z.string().optional(),
}).strict();

export type GuardrailOutput = {
  moderationRationale: string;
  moderationCategory: ModerationCategory;
  testText?: string;
};

export interface GuardrailResult {
  status: 'IN_PROGRESS' | 'DONE';
  testText?: string;
  category?: ModerationCategory;
  rationale?: string;
}

export interface OutputGuardrailResult {
  tripwireTriggered: boolean;
  outputInfo: GuardrailOutput | { error: string };
}

export interface OutputGuardrailArgs {
  agentOutput: string;
  agent?: unknown;
  context?: unknown;
}

export interface OutputGuardrail {
  name: string;
  execute: (args: OutputGuardrailArgs) => Promise<OutputGuardrailResult>;
}

export interface GuardrailClassifierConfig {
  apiEndpoint?: string;
  model?: string;
  categories?: readonly string[];
  companyName?: string;
}

/**
 * Run the guardrail classifier against a message
 */
export async function runGuardrailClassifier(
  message: string,
  config: GuardrailClassifierConfig = {}
): Promise<GuardrailOutput | null> {
  const {
    apiEndpoint = '/api/responses',
    model = 'gpt-4o-mini',
    categories = MODERATION_CATEGORIES,
    companyName = 'Company',
  } = config;

  const categoryDescriptions = categories.map(cat => {
    switch (cat) {
      case 'OFFENSIVE':
        return '- OFFENSIVE: Content that includes hate speech, discriminatory language, insults, slurs, or harassment.';
      case 'OFF_BRAND':
        return '- OFF_BRAND: Content that discusses competitors in a disparaging way.';
      case 'VIOLENCE':
        return '- VIOLENCE: Content that includes explicit threats, incitement of harm, or graphic descriptions of physical injury or violence.';
      case 'NONE':
        return '- NONE: If no other classes are appropriate and the message is fine.';
      default:
        return `- ${cat}: Custom category.`;
    }
  }).join('\n');

  const messages = [
    {
      role: 'user',
      content: `You are an expert at classifying text according to moderation policies. Consider the provided message, analyze potential classes from output_classes, and output the best classification. Output json, following the provided schema. Keep your analysis and reasoning short and to the point, maximum 2 sentences.

      <info>
      - Company name: ${companyName}
      </info>

      <message>
      ${message}
      </message>

      <output_classes>
      ${categoryDescriptions}
      </output_classes>
      `,
    },
  ];

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: messages,
      text: {
        format: {
          type: 'json_schema',
          name: 'output_format',
          schema: GuardrailOutputZod,
        },
      },
    }),
  });

  if (!response.ok) return null;

  try {
    const data = await response.json();
    return GuardrailOutputZod ? GuardrailOutputZod.parse(data) : data as GuardrailOutput;
  } catch {
    return null;
  }
}

/**
 * Create a moderation guardrail for output filtering
 */
export function createModerationGuardrail(
  config: GuardrailClassifierConfig = {}
): OutputGuardrail {
  return {
    name: 'moderation_guardrail',
    async execute({ agentOutput }: OutputGuardrailArgs): Promise<OutputGuardrailResult> {
      try {
        const res = await runGuardrailClassifier(agentOutput, config);
        const triggered = res?.moderationCategory !== 'NONE';
        return {
          tripwireTriggered: triggered || false,
          outputInfo: res || { error: 'guardrail_failed' },
        };
      } catch {
        return {
          tripwireTriggered: false,
          outputInfo: { error: 'guardrail_failed' },
        };
      }
    },
  };
}

/**
 * Create a custom guardrail with your own classifier function
 */
export function createCustomGuardrail(
  name: string,
  classifier: (output: string) => Promise<{ triggered: boolean; info: unknown }>
): OutputGuardrail {
  return {
    name,
    async execute({ agentOutput }: OutputGuardrailArgs): Promise<OutputGuardrailResult> {
      try {
        const { triggered, info } = await classifier(agentOutput);
        return {
          tripwireTriggered: triggered,
          outputInfo: info as GuardrailOutput | { error: string },
        };
      } catch {
        return {
          tripwireTriggered: false,
          outputInfo: { error: 'guardrail_failed' },
        };
      }
    },
  };
}
