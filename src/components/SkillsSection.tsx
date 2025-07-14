'use client'

import React from 'react'
import { motion } from 'motion/react'

interface Skill {
  name: string
  level: number
  category: string
}

const skills: Skill[] = [
  { name: 'React/Next.js', level: 95, category: 'Frontend' },
  { name: 'TypeScript', level: 90, category: 'Language' },
  { name: 'Node.js', level: 88, category: 'Backend' },
  { name: 'PostgreSQL', level: 85, category: 'Database' },
  { name: 'AWS/Cloud', level: 82, category: 'DevOps' },
  { name: 'Docker', level: 80, category: 'DevOps' },
  { name: 'GraphQL', level: 75, category: 'API' },
  { name: 'Python', level: 78, category: 'Language' },
]

const getCategoryColor = (category: string) => {
  const colors = {
    Frontend: 'from-blue-500 to-cyan-500',
    Backend: 'from-green-500 to-emerald-500',
    Database: 'from-purple-500 to-violet-500',
    DevOps: 'from-orange-500 to-red-500',
    Language: 'from-pink-500 to-rose-500',
    API: 'from-indigo-500 to-blue-500',
  }
  return colors[category as keyof typeof colors] || 'from-gray-500 to-gray-600'
}

const SkillCard = ({ skill, index }: { skill: Skill, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileHover={{ 
      scale: 1.05,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    }}
    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
  >
    {/* Category Badge */}
    <div className="flex items-center justify-between mb-4">
      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getCategoryColor(skill.category)}`}>
        {skill.category}
      </span>
      <span className="text-2xl font-bold text-gray-900 dark:text-white">
        {skill.level}%
      </span>
    </div>

    {/* Skill Name */}
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
      {skill.name}
    </h3>

    {/* Progress Bar Container */}
    <div className="relative">
      {/* Background Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        {/* Animated Progress Bar */}
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${skill.level}%` }}
          viewport={{ once: true }}
          transition={{ 
            duration: 1.5, 
            delay: index * 0.1 + 0.3,
            ease: "easeOut"
          }}
          className={`h-full bg-gradient-to-r ${getCategoryColor(skill.category)} rounded-full relative overflow-hidden`}
        >
          {/* Shimmer Effect */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 1.5,
              delay: index * 0.1 + 0.5,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </div>

      {/* Progress Indicator Dots */}
      <div className="flex justify-between mt-2 px-1">
        {[25, 50, 75, 100].map((mark) => (
          <div
            key={mark}
            className={`w-1 h-1 rounded-full transition-colors duration-500 ${
              skill.level >= mark 
                ? 'bg-gray-400 dark:bg-gray-300' 
                : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>

    {/* Skill Level Description */}
    <div className="mt-3">
      <span className={`text-xs font-medium ${
        skill.level >= 90 ? 'text-green-600 dark:text-green-400' :
        skill.level >= 80 ? 'text-blue-600 dark:text-blue-400' :
        skill.level >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
        'text-gray-600 dark:text-gray-400'
      }`}>
        {skill.level >= 90 ? 'Expert' :
         skill.level >= 80 ? 'Advanced' :
         skill.level >= 70 ? 'Intermediate' :
         'Beginner'}
      </span>
    </div>
  </motion.div>
)

const SkillsSection = () => {
  return (
    <section id="skills" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Technical Skills
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Technologies I work with to build amazing applications
          </p>
        </motion.div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {skills.map((skill, index) => (
            <SkillCard key={skill.name} skill={skill} index={index} />
          ))}
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 flex flex-wrap justify-center gap-4"
        >
          {['Frontend', 'Backend', 'Database', 'DevOps', 'Language', 'API'].map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getCategoryColor(category)}`} />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {category}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default SkillsSection