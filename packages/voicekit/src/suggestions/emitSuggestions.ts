import type { SuggestionGroup, SuggestionEventDetail } from './types';
import { SUGGESTION_EVENT } from './types';

/**
 * Emit a suggestion group from a tool.
 * Works in both React (via DOM event → SuggestionProvider) and vanilla contexts.
 *
 * @example
 * ```ts
 * import { emitSuggestions } from '@jchaffin/voicekit';
 *
 * const getProjects = defineTool({
 *   name: 'get_projects',
 *   execute: async () => {
 *     const projects = await fetchProjects();
 *     emitSuggestions({
 *       type: 'project',
 *       prompt: 'Projects:',
 *       items: projects.map(p => ({
 *         id: p.name,
 *         label: p.name,
 *         message: `Tell me about the ${p.name} project`,
 *         description: p.description,
 *         meta: { url: p.url, github: p.github },
 *       })),
 *     });
 *     return { success: true, projects };
 *   }
 * });
 * ```
 */
export function emitSuggestions(group: SuggestionGroup): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<SuggestionEventDetail>(SUGGESTION_EVENT, {
      detail: { group },
    })
  );
}

/**
 * Clear the current suggestions.
 */
export function clearSuggestions(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<SuggestionEventDetail>(SUGGESTION_EVENT, {
      detail: { group: null as any },
    })
  );
}
