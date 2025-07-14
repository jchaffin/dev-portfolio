'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Mail, Github, Linkedin } from 'lucide-react'

const ContactSection = () => {
  const socialLinks = [
    { 
      icon: <Mail className="h-6 w-6" />, 
      href: "mailto:jchaffin57@gmail.com", 
      label: "Email" 
    },
    { 
      icon: <Github className="h-6 w-6" />, 
      href: "https://github.com/jchaffin", 
      label: "GitHub" 
    },
    { 
      icon: <Linkedin className="h-6 w-6" />, 
      href: "https://linkedin.com/in/jacob-chaffin", 
      label: "LinkedIn" 
    }
  ]

  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-4xl font-bold text-white mb-6">
            Let's Work Together
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            I'm always open to discussing new opportunities and interesting projects
          </p>
          <div className="flex justify-center space-x-6">
            {socialLinks.map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="bg-white/10 backdrop-blur-sm text-white p-4 rounded-full hover:bg-white/20 transition-all duration-300"
                aria-label={item.label}
              >
                {item.icon}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ContactSection