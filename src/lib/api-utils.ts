import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standard API error types
 */
export enum ApiErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    type: ApiErrorType
    message: string
    details?: unknown
  }
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  data: T
  message?: string
}

/**
 * Create error response
 */
export function createErrorResponse(
  type: ApiErrorType,
  message: string,
  details?: unknown,
  status?: number
): NextResponse<ApiErrorResponse> {
  const statusCode = status ?? getStatusCodeForErrorType(type)
  
  return NextResponse.json(
    {
      error: {
        type,
        message,
        details,
      },
    },
    { status: statusCode }
  )
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      data,
      message,
    },
    { status }
  )
}

/**
 * Get HTTP status code for error type
 */
function getStatusCodeForErrorType(type: ApiErrorType): number {
  switch (type) {
    case ApiErrorType.VALIDATION_ERROR:
      return 400
    case ApiErrorType.BAD_REQUEST:
      return 400
    case ApiErrorType.UNAUTHORIZED:
      return 401
    case ApiErrorType.FORBIDDEN:
      return 403
    case ApiErrorType.NOT_FOUND:
      return 404
    case ApiErrorType.INTERNAL_ERROR:
      return 500
    default:
      return 500
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error)

  // Zod validation errors
  if (error instanceof ZodError) {
    return createErrorResponse(
      ApiErrorType.VALIDATION_ERROR,
      'Validation failed',
      error.issues
    )
  }

  // Standard Error objects
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('not found')) {
      return createErrorResponse(
        ApiErrorType.NOT_FOUND,
        error.message
      )
    }
    
    if (error.message.includes('unauthorized')) {
      return createErrorResponse(
        ApiErrorType.UNAUTHORIZED,
        error.message
      )
    }

    return createErrorResponse(
      ApiErrorType.INTERNAL_ERROR,
      error.message
    )
  }

  // Unknown errors
  return createErrorResponse(
    ApiErrorType.INTERNAL_ERROR,
    'An unexpected error occurred'
  )
}

/**
 * Async handler wrapper with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch(handleApiError)
}