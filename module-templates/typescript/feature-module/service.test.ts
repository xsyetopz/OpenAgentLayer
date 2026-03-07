/**
 * Tests for {Feature} Service
 *
 * Naming convention: describe('{method}') > it('should {behavior} when {condition}')
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureService, FeatureRepository } from './service';
import { MainType, NotFoundError, ValidationError } from './types';

// =============================================================================
// SECTION 1: TEST FIXTURES
// =============================================================================

/**
 * Creates a mock repository
 */
function createMockRepository(): FeatureRepository {
  const store = new Map<string, MainType>();

  return {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findAll: vi.fn(async () => Array.from(store.values())),
    save: vi.fn(async (item: MainType) => {
      store.set(item.id, item);
    }),
    delete: vi.fn(async (id: string) => {
      store.delete(id);
    }),
  };
}

/**
 * Creates a test service with default config
 */
function createTestService(repository?: FeatureRepository): FeatureService {
  return new FeatureService({ fieldOne: 'test' }, repository);
}

// =============================================================================
// SECTION 2: CREATE TESTS
// =============================================================================

describe('FeatureService', () => {
  describe('create', () => {
    it('should create item with valid data', async () => {
      const service = createTestService();

      const result = await service.create({ data: 'test data' });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.data).toBe('test data');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should persist item when repository provided', async () => {
      const repository = createMockRepository();
      const service = createTestService(repository);

      const result = await service.create({ data: 'test data' });

      expect(repository.save).toHaveBeenCalledWith(result);
    });

    it('should throw ValidationError when data is empty', async () => {
      const service = createTestService();

      await expect(service.create({ data: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when data is whitespace only', async () => {
      const service = createTestService();

      await expect(service.create({ data: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when data exceeds max length', async () => {
      const service = createTestService();
      const longData = 'x'.repeat(1001);

      await expect(service.create({ data: longData })).rejects.toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // SECTION 3: GET TESTS
  // ===========================================================================

  describe('get', () => {
    it('should return item when found', async () => {
      const repository = createMockRepository();
      const service = createTestService(repository);

      // Create item first
      const created = await service.create({ data: 'test' });

      const result = await service.get(created.id);

      expect(result).toEqual(created);
    });

    it('should throw NotFoundError when item does not exist', async () => {
      const repository = createMockRepository();
      const service = createTestService(repository);

      await expect(service.get('nonexistent-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when no repository', async () => {
      const service = createTestService();

      await expect(service.get('any-id')).rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // SECTION 4: UPDATE TESTS
  // ===========================================================================

  describe('update', () => {
    let repository: FeatureRepository;
    let service: FeatureService;
    let existingItem: MainType;

    beforeEach(async () => {
      repository = createMockRepository();
      service = createTestService(repository);
      existingItem = await service.create({ data: 'original' });
    });

    it('should update item data', async () => {
      const result = await service.update(existingItem.id, { data: 'updated' });

      expect(result.data).toBe('updated');
      expect(result.updatedAt).toBeDefined();
    });

    it('should preserve original data when not provided in update', async () => {
      const result = await service.update(existingItem.id, {});

      expect(result.data).toBe('original');
    });

    it('should throw NotFoundError when item does not exist', async () => {
      await expect(service.update('nonexistent', { data: 'new' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when data is empty', async () => {
      await expect(service.update(existingItem.id, { data: '' })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ===========================================================================
  // SECTION 5: DELETE TESTS
  // ===========================================================================

  describe('delete', () => {
    it('should delete existing item', async () => {
      const repository = createMockRepository();
      const service = createTestService(repository);
      const item = await service.create({ data: 'test' });

      await service.delete(item.id);

      expect(repository.delete).toHaveBeenCalledWith(item.id);
    });

    it('should throw NotFoundError when item does not exist', async () => {
      const repository = createMockRepository();
      const service = createTestService(repository);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // SECTION 6: LIST TESTS
  // ===========================================================================

  describe('list', () => {
    it('should return all items', async () => {
      const repository = createMockRepository();
      const service = createTestService(repository);
      await service.create({ data: 'item1' });
      await service.create({ data: 'item2' });

      const result = await service.list();

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no repository', async () => {
      const service = createTestService();

      const result = await service.list();

      expect(result).toEqual([]);
    });
  });
});
