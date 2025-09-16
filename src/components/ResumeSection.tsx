'use client'

import React, { useState } from 'react'
import { Download, Eye, X, Printer } from 'lucide-react'
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-theme-secondary">Loading viewer…</div>
  ),
});

export default function ResumeSection() {
  const [showPDF, setShowPDF] = useState(false)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = '/resume.pdf'
    link.download = 'Jacob_Chaffin_Resume.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.open('/resume.pdf', '_blank')?.print()
  }

  return (
    <section id="resume" className="py-16 relative overflow-hidden bg-gradient-primary">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-blue-500 rounded-full blur-xl"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-theme-primary">
            Resume
          </h2>
          <p className="text-lg text-theme-secondary max-w-2xl mx-auto">
            View or download my professional resume to learn more about my experience, skills, and qualifications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setShowPDF(true)}
            className="flex items-center gap-2 px-6 py-3 glass font-semibold transition-all duration-300 cursor-pointer"
          >
            <Eye className="w-5 h-5" />
            View Resume
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 glass font-semibold transition-all duration-300 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
        </div>

        {/* PDF Modal */}
        {showPDF && (
          <div className="fixed inset-0 bg-theme-primary/20 backdrop-blur-md flex items-center justify-center z-50 p-4 pt-20">
            <div className="bg-theme-secondary rounded-lg max-w-4xl w-full max-h-[90vh] border border-theme-primary shadow-2xl flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-theme-primary/20 bg-theme-primary/10 backdrop-blur-sm rounded-t-lg flex-shrink-0">
                <h3 className="text-xl font-semibold text-theme-primary">
                  Resume
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrint}
                    className="text-theme-primary hover:text-theme-secondary transition-colors p-1 rounded cursor-pointer"
                    title="Print PDF"
                    aria-labelledby="print-button"
                    aria-label="Print PDF"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="text-theme-primary hover:text-theme-secondary transition-colors p-1 rounded cursor-pointer"
                    title="Download PDF"
                    aria-labelledby="download-button"
                    aria-label="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowPDF(false)}
                    className="text-theme-primary hover:text-theme-secondary transition-colors p-1 rounded cursor-pointer"
                    title="Close"
                    aria-labelledby="close-button"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <PDFViewer 
                  pdfUrl="/resume.pdf" 
                  title="Jacob Chaffin - Resume"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
} 