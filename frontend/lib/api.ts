/**
 * API client utilities
 */

import { getTelegramWebApp } from "./telegram"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

/**
 * Make API request with Telegram initData header
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options

  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value))
    })
    url += `?${searchParams.toString()}`
  }

  // Get Telegram initData
  const webApp = getTelegramWebApp()
  let initData = webApp?.initData || ""

  // Development mode: use "dev" as initData if not in Telegram
  if (!initData && process.env.NEXT_PUBLIC_ENVIRONMENT === "development") {
    initData = "dev"
  }

  // Prepare headers
  const headers = new Headers(fetchOptions.headers)
  headers.set("Content-Type", "application/json")
  headers.set("X-Telegram-Init-Data", initData)

  // Make request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: response.statusText,
    }))

    // Handle different error formats
    let errorMessage = "API request failed"
    if (typeof error.detail === "string") {
      errorMessage = error.detail
    } else if (Array.isArray(error.detail)) {
      // FastAPI validation errors
      errorMessage = error.detail.map((err: any) => err.msg).join(", ")
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * GET request
 */
export function apiGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET", params })
}

/**
 * POST request
 */
export function apiPost<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/**
 * PUT request
 */
export function apiPut<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

/**
 * PATCH request
 */
export function apiPatch<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

/**
 * DELETE request
 */
export function apiDelete<T>(
  endpoint: string
): Promise<T> {
  return apiRequest<T>(endpoint, { method: "DELETE" })
}
