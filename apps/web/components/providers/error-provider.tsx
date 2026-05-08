"use client"

import React, { createContext, useContext, useCallback } from 'react'
import { toast } from 'sonner'

interface ErrorContextType {
  handleError: (error: any, context?: string) => void
  handleApiError: (error: any, defaultMessage?: string) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const handleError = useCallback((error: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
    
    // Show user-friendly error message
    const message = error?.message || 'An unexpected error occurred'
    toast.error(context ? `${context}: ${message}` : message)
  }, [])

  const handleApiError = useCallback((error: any, defaultMessage = 'Operation failed') => {
    console.error('API Error:', error)
    
    // Extract error message from different API response formats
    let message = defaultMessage
    
    if (error?.response?.data?.message) {
      message = error.response.data.message
    } else if (error?.response?.data?.error) {
      message = error.response.data.error
    } else if (error?.message) {
      message = error.message
    }
    
    // Handle specific HTTP status codes
    if (error?.response?.status === 401) {
      message = 'Authentication required. Please log in again.'
    } else if (error?.response?.status === 403) {
      message = 'You do not have permission to perform this action.'
    } else if (error?.response?.status === 404) {
      message = 'The requested resource was not found.'
    } else if (error?.response?.status === 429) {
      message = 'Too many requests. Please try again later.'
    } else if (error?.response?.status >= 500) {
      message = 'Server error. Please try again later.'
    }
    
    toast.error(message)
  }, [])

  return (
    <ErrorContext.Provider value={{ handleError, handleApiError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useErrorHandler() {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useErrorHandler must be used within an ErrorProvider')
  }
  return context
}