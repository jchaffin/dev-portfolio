import { ContactForm, ApiResponse, PaginatedResponse, Project } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Generic API function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}/api${endpoint}`
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'An error occurred')
    }

    return {
      success: true,
      data,
      message: data.message,
    }
  } catch (error) {
    console.error('API Request Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Contact API
export const contactApi = {
  async submit(formData: ContactForm): Promise<ApiResponse<{ message: string }>> {
    return apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
  },
}

// Projects API
export const projectsApi = {
  async getAll(params?: {
    category?: string
    featured?: boolean
    page?: number
    limit?: number
  }): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const searchParams = new URLSearchParams()
    
    if (params?.category) searchParams.append('category', params.category)
    if (params?.featured) searchParams.append('featured', 'true')
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const queryString = searchParams.toString()
    const endpoint = `/projects${queryString ? `?${queryString}` : ''}`

    return apiRequest(endpoint)
  },

  async getById(id: number): Promise<ApiResponse<Project>> {
    return apiRequest(`/projects/${id}`)
  },

  async create(projectData: Omit<Project, 'id'>): Promise<ApiResponse<Project>> {
    return apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    })
  },

  async update(id: number, projectData: Partial<Project>): Promise<ApiResponse<Project>> {
    return apiRequest(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    })
  },

  async delete(id: number): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/projects/${id}`, {
      method: 'DELETE',
    })
  },
}

// Analytics API (for future implementation)
export const analyticsApi = {
  async trackPageView(page: string): Promise<void> {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
        page_path: page,
      })
    }
  },

  async trackEvent(action: string, category: string, label?: string, value?: number): Promise<void> {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      })
    }
  },
}

// Error handling utility
export const handleApiError = (error: ApiResponse<any>) => {
  if (!error.success && error.error) {
    console.error('API Error:', error.error)
    // You could integrate with error tracking services here
    // like Sentry, LogRocket, etc.
  }
}

// Type for Google Analytics
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}