'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { SessionStatus } from '@/types';

interface PlayButtonProps {
  sessionStatus: SessionStatus;
  onToggle: () => void;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  sessionStatus,
  onToggle,
}) => {
  return (
    <div className="relative mb-4 group">
      {/* Hover ring */}
      <div
        className={`absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          sessionStatus === 'CONNECTED' ? 'bg-red-500/20' : 'bg-blue-500/20'
        }`}
      />
      <motion.button
        onClick={onToggle}
        disabled={sessionStatus === 'CONNECTING'}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
          sessionStatus === 'CONNECTED'
            ? 'bg-red-500 text-white hover:bg-red-600 hover:shadow-red-500/25'
            : sessionStatus === 'CONNECTING'
              ? 'bg-blue-500 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/25'
        } hover:shadow-xl`}
        whileHover={{ scale: sessionStatus === 'CONNECTING' ? 1 : 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        {sessionStatus === 'CONNECTING' ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : sessionStatus === 'CONNECTED' ? (
          <div className="w-5 h-5 bg-white rounded-sm" />
        ) : (
          <Play className="w-7 h-7 ml-0.5" fill="currentColor" />
        )}
      </motion.button>
    </div>
  );
};

export default PlayButton;
