'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Play, Mic } from 'lucide-react';
import type { SessionStatus } from '@/types';

interface PlayButtonProps {
  sessionStatus: SessionStatus;
  onToggle: () => void;
}

export const PlayButton: React.FC<PlayButtonProps> = ({ sessionStatus, onToggle }) => {
  const isConnected = sessionStatus === 'CONNECTED';
  const isConnecting = sessionStatus === 'CONNECTING';

  return (
    <div className="relative mb-4 flex items-center justify-center">
      {/* Outer slow ping — only when live */}
      {isConnected && (
        <span className="absolute w-20 h-20 rounded-full bg-red-500/15 animate-ping" style={{ animationDuration: '2s' }} />
      )}
      {/* Inner faster ping */}
      {isConnected && (
        <span className="absolute w-[72px] h-[72px] rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '1.4s', animationDelay: '0.3s' }} />
      )}

      {/* Hover ring */}
      <div
        className={`absolute w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          isConnected ? 'bg-red-500/15' : 'bg-blue-500/15'
        }`}
      />

      <div className="group">
        <motion.button
          onClick={onToggle}
          disabled={isConnecting}
          aria-label={isConnected ? 'End session' : isConnecting ? 'Connecting…' : 'Start voice agent'}
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-colors duration-300 ${
            isConnected
              ? 'bg-red-500 text-white hover:bg-red-600'
              : isConnecting
                ? 'bg-blue-500 text-white cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          whileHover={{ scale: isConnecting ? 1 : 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          {isConnecting ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isConnected ? (
            <Mic className="w-6 h-6" />
          ) : (
            <Play className="w-7 h-7 ml-0.5" fill="currentColor" />
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default PlayButton;
