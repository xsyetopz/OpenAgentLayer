/**
 * Business logic for {Feature}
 *
 * This file contains the main service implementation.
 * Keep business logic here, delegate data access to repositories.
 */

import { randomUUID } from 'crypto';
import {
  Config,
  DEFAULT_CONFIG,
  MainType,
  CreateInput,
  UpdateInput,
  NotFoundError,
  ValidationError,
} from './types';

// =============================================================================
// SECTION 1: REPOSITORY INTERFACE (for dependency injection)
// =============================================================================

/**
 * Repository interface for data access
 * Implement this interface for different storage backends
 */
export interface FeatureRepository {
  findById(id: string): Promise<MainType | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<MainType[]>;
  save(item: MainType): Promise<void>;
  delete(id: string): Promise<void>;
}

// =============================================================================
// SECTION 2: SERVICE CLASS
// =============================================================================

/**
 * Service for {Feature} operations
 *
 * @example
 * ```typescript
 * const service = new FeatureService({ fieldOne: 'value' });
 * const item = await service.create({ data: 'example' });
 * console.log(item.id);
 * ```
 */
export class FeatureService {
  private readonly config: Required<Config>;
  private readonly repository?: FeatureRepository;

  /**
   * Creates a new service instance
   *
   * @param config - Service configuration
   * @param repository - Optional repository for persistence
   */
  constructor(config: Config, repository?: FeatureRepository) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.repository = repository;
  }

  // ===========================================================================
  // SECTION 3: CRUD OPERATIONS
  // ===========================================================================

  /**
   * Creates a new item
   *
   * @param input - The creation input
   * @returns The created item
   * @throws {ValidationError} If input is invalid
   */
  async create(input: CreateInput): Promise<MainType> {
    // Validate input
    this.validateCreateInput(input);

    // Create item
    const item: MainType = {
      id: randomUUID(),
      data: input.data,
      createdAt: new Date(),
    };

    // Persist if repository available
    if (this.repository) {
      await this.repository.save(item);
    }

    return item;
  }

  /**
   * Retrieves an item by ID
   *
   * @param id - The unique identifier
   * @returns The item if found
   * @throws {NotFoundError} If item doesn't exist
   */
  async get(id: string): Promise<MainType> {
    if (!this.repository) {
      throw new NotFoundError(id);
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundError(id);
    }

    return item;
  }

  /**
   * Updates an existing item
   *
   * @param id - The item ID
   * @param input - The update input
   * @returns The updated item
   * @throws {NotFoundError} If item doesn't exist
   * @throws {ValidationError} If input is invalid
   */
  async update(id: string, input: UpdateInput): Promise<MainType> {
    // Validate input
    this.validateUpdateInput(input);

    // Get existing item
    const existing = await this.get(id);

    // Apply updates
    const updated: MainType = {
      ...existing,
      data: input.data ?? existing.data,
      updatedAt: new Date(),
    };

    // Persist
    if (this.repository) {
      await this.repository.save(updated);
    }

    return updated;
  }

  /**
   * Deletes an item
   *
   * @param id - The item ID
   * @throws {NotFoundError} If item doesn't exist
   */
  async delete(id: string): Promise<void> {
    // Verify exists
    await this.get(id);

    // Delete
    if (this.repository) {
      await this.repository.delete(id);
    }
  }

  /**
   * Lists all items with pagination
   *
   * @param options - Pagination options
   * @returns Array of items
   */
  async list(options?: { limit?: number; offset?: number }): Promise<MainType[]> {
    if (!this.repository) {
      return [];
    }

    return this.repository.findAll(options);
  }

  // ===========================================================================
  // SECTION 4: VALIDATION
  // ===========================================================================

  /**
   * Validates creation input
   */
  private validateCreateInput(input: CreateInput): void {
    if (!input.data || input.data.trim().length === 0) {
      throw new ValidationError('Data cannot be empty', 'data');
    }

    if (input.data.length > 1000) {
      throw new ValidationError('Data exceeds maximum length of 1000', 'data');
    }
  }

  /**
   * Validates update input
   */
  private validateUpdateInput(input: UpdateInput): void {
    if (input.data !== undefined) {
      if (input.data.trim().length === 0) {
        throw new ValidationError('Data cannot be empty', 'data');
      }

      if (input.data.length > 1000) {
        throw new ValidationError('Data exceeds maximum length of 1000', 'data');
      }
    }
  }
}

// =============================================================================
// SECTION 5: FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a service with default configuration
 */
export function createFeatureService(
  repository?: FeatureRepository,
): FeatureService {
  return new FeatureService({}, repository);
}
