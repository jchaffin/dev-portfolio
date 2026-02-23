'use client';

import React, { useRef, useEffect } from 'react';
import { useVoice } from '../VoiceProvider';
import type { TranscriptMessage } from '../types';

// ============================================================================
// Transcript Message Component
// ============================================================================

interface MessageProps {
  message: TranscriptMessage;
  userClassName?: string;
  assistantClassName?: string;
}

function Message({ message, userClassName, assistantClassName }: MessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? userClassName || 'bg-blue-500 text-white rounded-br-md'
            : assistantClassName || 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Transcript Component
// ============================================================================

interface TranscriptProps {
  messages: TranscriptMessage[];
  userClassName?: string;
  assistantClassName?: string;
  emptyMessage?: React.ReactNode;
}

export function Transcript({ 
  messages, 
  userClassName, 
  assistantClassName,
  emptyMessage = 'Start a conversation...'
}: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Track manual scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      userScrolledUp.current = !isAtBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (containerRef.current && messages.length > 0 && !userScrolledUp.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3 overflow-y-auto h-full p-4">
      {messages.map((msg) => (
        <Message
          key={msg.id}
          message={msg}
          userClassName={userClassName}
          assistantClassName={assistantClassName}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Status Indicator Component
// ============================================================================

interface StatusIndicatorProps {
  className?: string;
  connectedText?: string;
  connectingText?: string;
  disconnectedText?: string;
}

export function StatusIndicator({
  className = '',
  connectedText = 'Connected',
  connectingText = 'Connecting...',
  disconnectedText = 'Disconnected'
}: StatusIndicatorProps) {
  const { status } = useVoice();

  const statusConfig = {
    CONNECTED: { color: 'bg-green-500', text: connectedText, pulse: true },
    CONNECTING: { color: 'bg-yellow-500', text: connectingText, pulse: true },
    DISCONNECTED: { color: 'bg-gray-400', text: disconnectedText, pulse: false },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-sm">{config.text}</span>
    </div>
  );
}

// ============================================================================
// Connect Button Component
// ============================================================================

interface ConnectButtonProps {
  className?: string;
  connectText?: string;
  disconnectText?: string;
  connectingText?: string;
  children?: React.ReactNode;
}

export function ConnectButton({
  className = '',
  connectText = 'Start',
  disconnectText = 'End',
  connectingText = 'Connecting...',
  children,
}: ConnectButtonProps) {
  const { status, connect, disconnect } = useVoice();

  const handleClick = () => {
    if (status === 'CONNECTED') {
      disconnect();
    } else if (status === 'DISCONNECTED') {
      connect();
    }
  };

  const text = status === 'CONNECTED' ? disconnectText : 
               status === 'CONNECTING' ? connectingText : 
               connectText;

  return (
    <button
      onClick={handleClick}
      disabled={status === 'CONNECTING'}
      className={className || `px-4 py-2 rounded-lg font-medium transition-colors ${
        status === 'CONNECTED'
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : status === 'CONNECTING'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {children || text}
    </button>
  );
}

// ============================================================================
// Chat Input Component
// ============================================================================

interface ChatInputProps {
  placeholder?: string;
  className?: string;
  buttonText?: string;
  onSend?: (text: string) => void;
}

export function ChatInput({
  placeholder = 'Type a message...',
  className = '',
  buttonText = 'Send',
  onSend,
}: ChatInputProps) {
  const { sendMessage, status } = useVoice();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputRef.current?.value.trim();
    if (!text) return;
    
    if (onSend) {
      onSend(text);
    } else {
      sendMessage(text);
    }
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const disabled = status !== 'CONNECTED';

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium
                   hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {buttonText}
      </button>
    </form>
  );
}

// ============================================================================
// Main VoiceChat Component
// ============================================================================

export interface VoiceChatProps {
  /** Custom class for the container */
  className?: string;
  /** Height of the chat area */
  height?: string;
  /** Show header with status */
  showHeader?: boolean;
  /** Show input field */
  showInput?: boolean;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Custom header content */
  header?: React.ReactNode;
  /** Custom footer content */
  footer?: React.ReactNode;
}

/**
 * Complete voice chat interface component
 * 
 * @example
 * ```tsx
 * <VoiceProvider agent={agent}>
 *   <VoiceChat height="400px" />
 * </VoiceProvider>
 * ```
 */
export function VoiceChat({
  className = '',
  height = '400px',
  showHeader = true,
  showInput = true,
  emptyState,
  header,
  footer,
}: VoiceChatProps) {
  const { status, transcript, connect, disconnect, clearTranscript } = useVoice();

  const defaultEmptyState = (
    <div className="flex flex-col items-center justify-center gap-4">
      <ConnectButton />
      <p className="text-sm text-gray-500">
        {status === 'CONNECTING' ? 'Connecting...' : 'Click to start a conversation'}
      </p>
    </div>
  );

  return (
    <div className={`flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 
                     bg-white dark:bg-gray-900 overflow-hidden ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {header || (
            <>
              <StatusIndicator />
              <div className="flex gap-2">
                {transcript.length > 0 && (
                  <button
                    onClick={clearTranscript}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={status === 'CONNECTED' ? disconnect : connect}
                  className={`text-sm font-medium ${
                    status === 'CONNECTED' 
                      ? 'text-red-500 hover:text-red-600' 
                      : 'text-green-500 hover:text-green-600'
                  }`}
                >
                  {status === 'CONNECTED' ? 'End' : 'Connect'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Transcript Area */}
      <div style={{ height }} className="overflow-hidden">
        <Transcript
          messages={transcript}
          emptyMessage={emptyState || defaultEmptyState}
        />
      </div>

      {/* Footer/Input */}
      {footer || (showInput && status === 'CONNECTED' && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <ChatInput />
        </div>
      ))}
    </div>
  );
}

export default VoiceChat;
