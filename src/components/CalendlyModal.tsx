'use client'

import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Calendar, ExternalLink, Clock } from 'lucide-react'

interface CalendlyModalProps {
  isOpen: boolean
  onClose: () => void
  calendlyUrl: string
  meetingDetails?: {
    type: string
    duration: string
  }
}

const CalendlyModal: React.FC<CalendlyModalProps> = ({ 
  isOpen, 
  onClose, 
  calendlyUrl, 
  meetingDetails 
}) => {
  const handleOpenCalendly = () => {
    window.open(calendlyUrl, '_blank')
    onClose()
  }

  const getMeetingTypeDisplay = (type: string) => {
    switch (type) {
      case 'intro': return 'Introduction Call'
      case 'technical': return 'Technical Discussion'
      case 'consulting': return 'Consulting Session'
      default: return 'General Meeting'
    }
  }

  const getMeetingIcon = (type: string) => {
    switch (type) {
      case 'intro': return '👋'
      case 'technical': return '💻'
      case 'consulting': return '💼'
      default: return '📅'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-theme-primary border border-theme-secondary rounded-2xl shadow-2xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-theme-secondary">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-accent-secondary" />
                  <h2 className="text-xl font-semibold text-theme-primary">Schedule Meeting</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Meeting Info */}
                <div className="text-center space-y-4">
                  <div className="text-4xl">
                    {getMeetingIcon(meetingDetails?.type || 'general')}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-theme-primary">
                      {getMeetingTypeDisplay(meetingDetails?.type || 'general')}
                    </h3>
                    <p className="text-theme-secondary mt-1">
                      with Jacob Chaffin
                    </p>
                  </div>
                </div>

                {/* Meeting Details */}
                <div className="bg-theme-tertiary rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3 text-theme-primary">
                    <Clock className="h-5 w-5 text-accent-secondary" />
                    <span>Duration: {meetingDetails?.duration || '30min'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-theme-primary">
                    <Calendar className="h-5 w-5 text-accent-secondary" />
                    <span>Select available time slots</span>
                  </div>
                  <div className="flex items-center gap-3 text-theme-primary">
                    <ExternalLink className="h-5 w-5 text-accent-secondary" />
                    <span>Opens in Calendly</span>
                  </div>
                </div>

                {/* Description */}
                <div className="text-center text-sm text-theme-secondary">
                  You'll be redirected to Calendly where you can choose from Jacob's available time slots
                  and provide meeting details.
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-theme-secondary text-theme-secondary rounded-lg hover:bg-theme-secondary hover:text-theme-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOpenCalendly}
                    className="flex-1 px-4 py-3 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Open Calendly
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CalendlyModal
