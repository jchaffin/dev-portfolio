'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { FormSubmissionState } from './types';

interface InlineContactFormProps {
  onClose: () => void;
  initialSubject?: string;
  initialContext?: string;
}

export const InlineContactForm: React.FC<InlineContactFormProps> = ({
  onClose,
  initialSubject = '',
  initialContext = '',
}) => {
  const [formState, setFormState] = useState<FormSubmissionState>({
    name: '',
    email: '',
    subject: initialSubject,
    message: initialContext,
    isSubmitting: false,
    submitStatus: 'idle',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          subject: formState.subject,
          message: formState.message,
        }),
      });

      if (response.ok) {
        setFormState((prev) => ({
          ...prev,
          submitStatus: 'success',
          isSubmitting: false,
        }));
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setFormState((prev) => ({
          ...prev,
          submitStatus: 'error',
          isSubmitting: false,
        }));
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setFormState((prev) => ({
        ...prev,
        submitStatus: 'error',
        isSubmitting: false,
      }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="px-6 pb-6 pt-4"
    >
      <div className="bg-theme-tertiary border border-theme-secondary rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-theme-primary">
            Send Email to Jacob
          </h3>
          <button
            onClick={onClose}
            className="text-theme-secondary hover:text-theme-primary text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
        {/* Name and Email in a row */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            name="name"
            required
            value={formState.name}
            onChange={handleInputChange}
            className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm"
            placeholder="Your name *"
          />
          <input
            type="email"
            name="email"
            required
            value={formState.email}
            onChange={handleInputChange}
            className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm"
            placeholder="your@email.com *"
          />
        </div>

        <input
          type="text"
          name="subject"
          value={formState.subject}
          onChange={handleInputChange}
          className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm"
          placeholder="Subject (optional)"
        />

        <textarea
          name="message"
          required
          rows={2}
          value={formState.message}
          onChange={handleInputChange}
          className="w-full bg-theme-primary border border-theme-secondary text-theme-primary px-3 py-2 rounded-lg text-sm resize-none"
          placeholder="Your message *"
        />

        {formState.submitStatus === 'success' && (
          <div className="p-2 bg-green-100 border border-green-400 text-green-700 rounded-lg text-xs">
            Message sent! We'll get back to you soon.
          </div>
        )}

        {formState.submitStatus === 'error' && (
          <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded-lg text-xs">
            Failed to send. Please try again.
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-theme-primary border border-theme-secondary text-theme-secondary rounded-lg hover:opacity-90 transition-colors text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={formState.isSubmitting || formState.submitStatus === 'success'}
            className="flex-1 px-3 py-2 bg-accent-secondary hover:bg-accent-secondary/80 text-white rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {formState.isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
      </div>
    </motion.div>
  );
};

export default InlineContactForm;
