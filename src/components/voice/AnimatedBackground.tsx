'use client';

import React from 'react';
import { motion } from 'motion/react';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 opacity-10">
      <motion.div
        className="absolute top-20 left-20 w-32 h-32 bg-accent-secondary rounded-full blur-xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-24 h-24 bg-accent-primary rounded-full blur-xl"
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
