// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface Config {
	fieldOne: string;
	ttlSeconds?: number;
}

export const DEFAULT_CONFIG: Required<Config> = {
	fieldOne: "",
	ttlSeconds: 3600,
};

// -----------------------------------------------------------------------------
// Domain Types
// -----------------------------------------------------------------------------

export interface Item {
	readonly id: string;
	payload: string;
	readonly createdAt: Date;
	updatedAt?: Date;
}

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

export interface CreateItemInput {
	payload: string;
	metadata?: Record<string, unknown>;
}

export interface UpdateItemInput {
	payload?: string;
	metadata?: Record<string, unknown>;
}

export interface PaginationParams {
	limit?: number;
	offset?: number;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class FeatureError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
	) {
		super(message);
		this.name = "FeatureError";
	}
}

export class ItemNotFoundError extends FeatureError {
	constructor(itemId: string) {
		super(`Item not found: ${itemId}`, "ITEM_NOT_FOUND", 404);
		this.name = "ItemNotFoundError";
	}
}

export class InvalidInputError extends FeatureError {
	constructor(
		reason: string,
		public readonly field?: string,
	) {
		super(`Invalid input: ${reason}`, "INVALID_INPUT", 400);
		this.name = "InvalidInputError";
	}
}

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

export function isItem(value: unknown): value is Item {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"payload" in value &&
		"createdAt" in value
	);
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type Result<T, E = FeatureError> =
	| { ok: true; value: T }
	| { ok: false; error: E };
