/**
 * User-in-the-loop suggestion system.
 *
 * Tools can emit structured suggestions that render as interactive chips.
 * When a user clicks one, a message is sent back to the voice agent,
 * closing the loop.
 */

// ============================================================================
// Suggestion item types
// ============================================================================

export interface SuggestionItem {
  id: string;
  label: string;
  /** Text message to send to the agent when selected */
  message: string;
  /** Optional icon identifier for the consumer to map */
  icon?: string;
  /** Optional secondary text */
  description?: string;
  /** Freeform metadata the consumer can use for rendering */
  meta?: Record<string, unknown>;
}

// ============================================================================
// Suggestion group (what a tool emits)
// ============================================================================

export type SuggestionType = 'action' | 'project' | 'experience' | 'skill' | 'section' | string;

export interface SuggestionGroup {
  /** Category of these suggestions */
  type: SuggestionType;
  /** Items to display */
  items: SuggestionItem[];
  /** Optional heading shown above the chips */
  prompt?: string;
}

// ============================================================================
// Suggestion context value (what the hook returns)
// ============================================================================

export interface SuggestionsContextValue {
  /** Current suggestion group (null when none are active) */
  suggestions: SuggestionGroup | null;
  /** Push a new suggestion group (typically called from a tool) */
  setSuggestions: (group: SuggestionGroup | null) => void;
  /** Handle a user clicking a suggestion: sends the message and clears */
  selectSuggestion: (item: SuggestionItem) => void;
  /** Clear current suggestions */
  clearSuggestions: () => void;
}

// ============================================================================
// Event payload (for the DOM event bridge)
// ============================================================================

export const SUGGESTION_EVENT = 'voicekit:suggestions';

export interface SuggestionEventDetail {
  group: SuggestionGroup;
}
