import {
	type Config,
	type CreateItemInput,
	DEFAULT_CONFIG,
	InvalidInputError,
	type Item,
	ItemNotFoundError,
	type PaginationParams,
	type UpdateItemInput,
} from "./types";

// -----------------------------------------------------------------------------
// Repository Interface
// -----------------------------------------------------------------------------

export interface ItemRepository {
	findById(id: string): Promise<Item | null>;
	findAll(params?: PaginationParams): Promise<Item[]>;
	save(item: Item): Promise<void>;
	delete(id: string): Promise<void>;
}

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

export class ItemService {
	private readonly _config: Required<Config>;
	private readonly repository?: ItemRepository;

	constructor(config: Config, repository?: ItemRepository) {
		this._config = { ...DEFAULT_CONFIG, ...config };
		this.repository = repository;
	}

	async createItem(input: CreateItemInput): Promise<Item> {
		this.validatePayload(input.payload);

		const item: Item = {
			id: crypto.randomUUID(),
			payload: input.payload,
			createdAt: new Date(),
		};

		if (this.repository) {
			await this.repository.save(item);
		}

		return item;
	}

	async getItem(id: string): Promise<Item> {
		if (!this.repository) {
			throw new ItemNotFoundError(id);
		}

		const item = await this.repository.findById(id);
		if (!item) {
			throw new ItemNotFoundError(id);
		}

		return item;
	}

	async updateItem(id: string, input: UpdateItemInput): Promise<Item> {
		if (input.payload !== undefined) {
			this.validatePayload(input.payload);
		}

		const existing = await this.getItem(id);

		const updated: Item = {
			...existing,
			payload: input.payload ?? existing.payload,
			updatedAt: new Date(),
		};

		if (this.repository) {
			await this.repository.save(updated);
		}

		return updated;
	}

	async deleteItem(id: string): Promise<void> {
		await this.getItem(id);

		if (this.repository) {
			await this.repository.delete(id);
		}
	}

	async listItems(params?: PaginationParams): Promise<Item[]> {
		if (!this.repository) {
			return [];
		}

		return this.repository.findAll(params);
	}

	private validatePayload(payload: string): void {
		if (!payload || payload.trim().length === 0) {
			throw new InvalidInputError("payload cannot be empty", "payload");
		}

		const MAX_PAYLOAD_LENGTH = 1000;
		if (payload.length > MAX_PAYLOAD_LENGTH) {
			throw new InvalidInputError("payload exceeds maximum length", "payload");
		}
	}
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createItemService(repository?: ItemRepository): ItemService {
	return new ItemService({}, repository);
}
