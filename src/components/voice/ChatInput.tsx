'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="px-6 pb-6 pt-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="flex-1 bg-theme-tertiary rounded-lg h-12 flex items-center px-3 border border-theme-secondary/60">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent text-theme-primary placeholder-theme-secondary/70 focus:outline-none disabled:opacity-50"
            aria-label="Chat message input"
          />
        </div>
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="h-12 w-12 rounded-lg bg-theme-tertiary text-theme-secondary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center justify-center border border-theme-secondary/60"
          aria-label="Send message"
        >
          <Send className="w-6 h-6" />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
