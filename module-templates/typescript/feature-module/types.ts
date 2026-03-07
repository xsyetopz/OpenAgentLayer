/**
 * Domain types for {Feature}
 *
 * This file contains pure data structures with no business logic.
 * All types here should be self-contained and serializable.
 */

// =============================================================================
// SECTION 1: CONFIGURATION
// =============================================================================

/**
 * Configuration for {Feature}
 */
export interface Config {
  /** {Description of field} */
  fieldOne: string;

  /** {Description of field} */
  fieldTwo?: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<Config> = {
  fieldOne: '',
  fieldTwo: 3600,
};

// =============================================================================
// SECTION 2: DOMAIN TYPES
// =============================================================================

/**
 * Main domain type for {Feature}
 *
 * @example
 * ```typescript
 * const item: MainType = {
 *   id: 'abc-123',
 *   data: 'example',
 *   createdAt: new Date(),
 * };
 * ```
 */
export interface MainType {
  /** Unique identifier */
  readonly id: string;

  /** {Description} */
  data: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

// =============================================================================
// SECTION 3: INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for creating a new item
 */
export interface CreateInput {
  /** The data for the new item */
  data: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating an existing item
 */
export interface UpdateInput {
  /** Updated data (optional) */
  data?: string;

  /** Updated metadata (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// SECTION 4: ERRORS
// =============================================================================

/**
 * Base error class for {Feature}
 */
export class FeatureError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'FeatureError';
  }
}

/**
 * Item was not found
 */
export class NotFoundError extends FeatureError {
  constructor(id: string) {
    super(`Item not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Invalid input provided
 */
export class ValidationError extends FeatureError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// SECTION 5: TYPE GUARDS
// =============================================================================

/**
 * Type guard for MainType
 */
export function isMainType(value: unknown): value is MainType {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'data' in value &&
    'createdAt' in value
  );
}

// =============================================================================
// SECTION 6: UTILITY TYPES
// =============================================================================

/**
 * Makes all properties of T optional except for K
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Result type for operations that can fail
 */
export type Result<T, E = FeatureError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
