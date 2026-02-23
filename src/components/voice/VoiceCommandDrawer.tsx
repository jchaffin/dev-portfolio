'use client';

import React, { useState } from 'react';
import { ChevronDown, X, FileText, Activity } from 'lucide-react';

interface VoiceCommandDrawerProps {
  onSendEmail: () => void;
  onScheduleMeeting: () => void;
}

export const VoiceCommandDrawer: React.FC<VoiceCommandDrawerProps> = ({
  onSendEmail,
  onScheduleMeeting,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-6">
      <div className="rounded-lg overflow-hidden">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={`w-full flex items-center justify-between bg-theme-tertiary px-4 py-2 cursor-pointer border border-theme-secondary ${
            isOpen ? 'rounded-t-lg border-b-0' : 'rounded-lg'
          }`}
          aria-label={isOpen ? 'Collapse voice commands' : 'Expand voice commands'}
        >
          <span className="text-sm font-semibold text-theme-primary">
            Voice commands
          </span>
          <ChevronDown
            className={`h-4 w-4 text-theme-secondary transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="bg-theme-tertiary border border-theme-secondary border-t-0 rounded-b-lg p-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setIsOpen(false)}
                className="text-theme-secondary hover:text-theme-primary cursor-pointer"
                aria-label="Close commands"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onSendEmail}
                className="flex-1 flex items-center gap-3 p-3 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded-lg transition-colors cursor-pointer"
              >
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Send Email</div>
                  <div className="text-sm opacity-90">
                    Say "I want to contact Jacob"
                  </div>
                </div>
              </button>

              <button
                onClick={onScheduleMeeting}
                className="flex-1 flex items-center gap-3 p-3 bg-accent-primary hover:opacity-90 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Activity className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Schedule Meeting</div>
                  <div className="text-sm opacity-90">
                    Say "I want to schedule a meeting"
                  </div>
                </div>
              </button>
            </div>

            <p className="text-sm text-theme-secondary mt-3 text-center">
              Ask me anything about Jacob's work, or request actions using voice
              commands!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCommandDrawer;
