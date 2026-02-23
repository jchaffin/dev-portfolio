'use client';

import React from 'react';
import { useSuggestions } from './SuggestionContext';
import type { SuggestionItem, SuggestionGroup } from './types';

// ============================================================================
// SuggestionChips — renders the current suggestion group as clickable chips
// ============================================================================

export interface SuggestionChipsProps {
  /** Override the group from context (optional; defaults to useSuggestions()) */
  group?: SuggestionGroup | null;
  /** Custom renderer for each item. Receives the item and a click handler. */
  renderItem?: (item: SuggestionItem, onSelect: () => void) => React.ReactNode;
  /** Extra CSS class on the outer wrapper */
  className?: string;
  /** Extra CSS class on each chip button */
  chipClassName?: string;
}

export function SuggestionChips({
  group: groupOverride,
  renderItem,
  className,
  chipClassName,
}: SuggestionChipsProps) {
  const { suggestions, selectSuggestion } = useSuggestions();
  const group = groupOverride ?? suggestions;

  if (!group || group.items.length === 0) return null;

  return (
    <div className={className ?? 'vk-suggestions'}>
      {group.prompt && (
        <p className="vk-suggestions-prompt" style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.5rem' }}>
          {group.prompt}
        </p>
      )}
      <div
        className="vk-suggestions-list"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
      >
        {group.items.map((item) => {
          const handleClick = () => selectSuggestion(item);

          if (renderItem) {
            return <React.Fragment key={item.id}>{renderItem(item, handleClick)}</React.Fragment>;
          }

          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={chipClassName ?? 'vk-chip'}
              style={
                chipClassName
                  ? undefined
                  : {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      border: '1px solid rgba(99,102,241,0.3)',
                      background: 'rgba(99,102,241,0.08)',
                      color: 'inherit',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SuggestionChips;
