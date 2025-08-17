'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Send, Mail } from 'lucide-react'

interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: {
    subject?: string
    context?: string
  }
}

const ContactFormModal: React.FC<ContactFormModalProps> = ({ isOpen, onClose, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: initialData?.subject || '',
    message: initialData?.context || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setSubmitStatus('success')
        setTimeout(() => {
          onClose()
          setSubmitStatus('idle')
          setFormData({ name: '', email: '', subject: '', message: '' })
        }, 2000)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
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
            <div className="bg-theme-primary border border-theme-secondary rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-theme-secondary">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-accent-secondary" />
                  <h2 className="text-xl font-semibold text-theme-primary">Contact Jacob</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-theme-secondary hover:text-theme-primary transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {submitStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400 text-center"
                  >
                    ✅ Message sent successfully! Jacob will get back to you soon.
                  </motion.div>
                )}

                {submitStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-center"
                  >
                    ❌ Error sending message. Please try again.
                  </motion.div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-theme-primary mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-theme-tertiary border border-theme-secondary text-theme-primary placeholder-theme-secondary px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent-secondary focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-theme-primary mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-theme-tertiary border border-theme-secondary text-theme-primary placeholder-theme-secondary px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent-secondary focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-theme-primary mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full bg-theme-tertiary border border-theme-secondary text-theme-primary placeholder-theme-secondary px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent-secondary focus:border-transparent transition-all"
                    placeholder="What would you like to discuss?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-theme-primary mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full bg-theme-tertiary border border-theme-secondary text-theme-primary placeholder-theme-secondary px-4 py-3 rounded-lg focus:ring-2 focus:ring-accent-secondary focus:border-transparent transition-all resize-none"
                    placeholder="Tell Jacob what you'd like to discuss..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-theme-secondary text-theme-secondary rounded-lg hover:bg-theme-secondary hover:text-theme-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || submitStatus === 'success'}
                    className="flex-1 px-4 py-3 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ContactFormModal
