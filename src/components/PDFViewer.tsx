'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Document, Page, pdfjs, type DocumentProps } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}
interface PDFViewerProps {
  pdfUrl: string
  title?: string
  className?: string
}

function PDFViewer({ pdfUrl, title: _title = 'PDF Document', className = '' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(800);

  const options = useMemo(() => ({}), []);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== 'undefined') {
        setPageWidth(Math.min(window.innerWidth * 0.8, 800))
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Reset loading state when pdfUrl changes
  useEffect(() => {
    setLoading(true)
    setError(null)
  }, [pdfUrl])

  const onDocLoad: NonNullable<DocumentProps['onLoadSuccess']> = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
    setLoading(false);
    setError(null);
  };

  function onDocumentLoadError(_error: Error) {
    setError('Failed to load PDF document')
    setLoading(false)
  }


  return (
    <div className={`${className}`}>
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading PDF...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 dark:text-red-400 p-4 text-center">
          {error}
          <div className="mt-2">
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open PDF in new tab
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center space-y-6 pt-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocLoad}
          onLoadError={onDocumentLoadError}
          options={options}
          loading={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          }
          error={
            <div className="flex items-center justify-center p-8 text-red-600">
              <div>Failed to load PDF</div>
            </div>
          }
        >
          {numPages && Array.from(new Array(numPages), (_, index) => (
            <div key={`page_${index + 1}`} className="mb-6">
              <Page
                pageNumber={index + 1}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  )
}

export default PDFViewer;