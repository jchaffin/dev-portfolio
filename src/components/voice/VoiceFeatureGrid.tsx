'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mic, Search, Wrench } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: "Realtime Voice AI",
    description: "Speech-to-speech conversation powered by OpenAI Realtime API over WebRTC",
    details: ["< 200ms latency", "Ephemeral token auth", "Bidirectional streaming"],
    accent: "blue",
  },
  {
    icon: Search,
    title: "RAG-Powered Search",
    description: "Retrieves code snippets and docs from project repos and a personal knowledge base",
    details: ["Vector similarity search", "Multi-repo indexing", "Grounded citations"],
    accent: "emerald",
  },
  {
    icon: Wrench,
    title: "Agentic Tool Use",
    description: "An agent that calls tools to search code, pull up experience, and take actions on the page",
    details: ["12 registered tools", "Code + knowledge search", "Navigation & scheduling"],
    accent: "violet",
  },
];

const accentStyles: Record<string, { bg: string; ring: string; text: string; dot: string }> = {
  blue:    { bg: 'bg-blue-500/10',    ring: 'group-hover:ring-blue-500/30',    text: 'text-blue-500',    dot: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-500/10', ring: 'group-hover:ring-emerald-500/30', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  violet:  { bg: 'bg-violet-500/10',  ring: 'group-hover:ring-violet-500/30',  text: 'text-violet-500',  dot: 'bg-violet-500' },
};

export const VoiceFeatureGrid: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {features.map((feature, index) => {
        const style = accentStyles[feature.accent];
        const Icon = feature.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
            className="group glass rounded-2xl p-6 ring-1 ring-transparent transition-all duration-300 hover:shadow-lg"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${style.bg} mb-4`}>
              <Icon className={`h-5 w-5 ${style.text}`} />
            </div>

            <h3 className="text-lg font-semibold text-theme-primary mb-1">
              {feature.title}
            </h3>
            <p className="text-sm text-theme-secondary leading-relaxed mb-4">
              {feature.description}
            </p>

            <ul className="space-y-1.5">
              {feature.details.map((detail) => (
                <li key={detail} className="flex items-center gap-2 text-xs text-theme-secondary">
                  <span className={`w-1 h-1 rounded-full ${style.dot} shrink-0`} />
                  {detail}
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default VoiceFeatureGrid;
