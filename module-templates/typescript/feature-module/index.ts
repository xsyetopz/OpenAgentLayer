/**
 * # {Feature} Module
 *
 * {Brief description of what this feature does}
 *
 * @example
 * ```typescript
 * import { FeatureService, FeatureConfig } from './feature';
 *
 * const service = new FeatureService({ /* config *\/ });
 * const result = await service.create({ data: 'example' });
 * ```
 *
 * @module feature
 */

// =============================================================================
// PUBLIC EXPORTS
// =============================================================================

// Types
export type {
  MainType,
  Config,
  CreateInput,
  UpdateInput,
} from './types';

// Errors
export { FeatureError, NotFoundError, ValidationError } from './types';

// Service
export { FeatureService } from './service';
