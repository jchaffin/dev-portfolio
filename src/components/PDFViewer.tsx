'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

import type { PDFDocumentProxy } from 'pdfjs-dist';

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
  const [pageNumber, setPageNumber] = useState<number>(1);
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
    setPageNumber(1)
  }, [pdfUrl])

  function onDocLoad ({ numPages: nextNumPages }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
    setLoading(false);
    setError(null);
  };

  function onDocumentLoadError(_error: Error) {
    setError('Failed to load PDF document')
    setLoading(false)
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => prevPageNumber + offset)
  }

  function previousPage() {
    changePage(-1)
  }

  function nextPage() {
    changePage(1)
  }


  return (
          <div className={`flex flex-col items-center space-y-4 ${className}`}>
      
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

      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-lg">
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
          <Page
            pageNumber={pageNumber}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {numPages && (
        <div className="flex items-center space-x-4">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <span className="text-gray-700 dark:text-gray-300">
            Page {pageNumber} of {numPages}
          </span>
          
          <button
            type="button"
            disabled={pageNumber >= numPages}
            onClick={nextPage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PDFViewer;