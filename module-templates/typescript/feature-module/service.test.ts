import { beforeEach, describe, expect, it, mock } from "bun:test";
import { type ItemRepository, ItemService } from "./service";
import { InvalidInputError, type Item, ItemNotFoundError } from "./types";

// -----------------------------------------------------------------------------
// Test Fixtures
// -----------------------------------------------------------------------------

function createMockRepository(): ItemRepository {
	const store = new Map<string, Item>();

	return {
		findById: mock(async (id: string) => store.get(id) ?? null),
		findAll: mock(async () => Array.from(store.values())),
		save: mock(async (item: Item) => {
			store.set(item.id, item);
		}),
		delete: mock(async (id: string) => {
			store.delete(id);
		}),
	};
}

function createTestService(repository?: ItemRepository): ItemService {
	return new ItemService({ fieldOne: "test" }, repository);
}

// -----------------------------------------------------------------------------
// ItemService.createItem
// -----------------------------------------------------------------------------

describe("ItemService.createItem", () => {
	it("creates item with valid payload", async () => {
		const service = createTestService();

		const result = await service.createItem({ payload: "test payload" });

		expect(result.id).toBeDefined();
		expect(result.payload).toBe("test payload");
		expect(result.createdAt).toBeInstanceOf(Date);
	});

	it("persists item when repository provided", async () => {
		const repository = createMockRepository();
		const service = createTestService(repository);

		const result = await service.createItem({ payload: "test" });

		expect(repository.save).toHaveBeenCalledWith(result);
	});

	it("throws on empty payload", async () => {
		const service = createTestService();

		expect(service.createItem({ payload: "" })).rejects.toThrow(
			InvalidInputError,
		);
	});

	it("throws on whitespace-only payload", async () => {
		const service = createTestService();

		expect(service.createItem({ payload: "   " })).rejects.toThrow(
			InvalidInputError,
		);
	});

	it("throws when payload exceeds max length", async () => {
		const service = createTestService();

		expect(service.createItem({ payload: "x".repeat(1001) })).rejects.toThrow(
			InvalidInputError,
		);
	});
});

// -----------------------------------------------------------------------------
// ItemService.getItem
// -----------------------------------------------------------------------------

describe("ItemService.getItem", () => {
	it("returns item when found", async () => {
		const repository = createMockRepository();
		const service = createTestService(repository);
		const created = await service.createItem({ payload: "test" });

		const result = await service.getItem(created.id);

		expect(result).toEqual(created);
	});

	it("throws when item not found", async () => {
		const repository = createMockRepository();
		const service = createTestService(repository);

		expect(service.getItem("nonexistent")).rejects.toThrow(ItemNotFoundError);
	});

	it("throws when no repository configured", async () => {
		const service = createTestService();

		expect(service.getItem("any-id")).rejects.toThrow(ItemNotFoundError);
	});
});

// -----------------------------------------------------------------------------
// ItemService.updateItem
// -----------------------------------------------------------------------------

describe("ItemService.updateItem", () => {
	let repository: ItemRepository;
	let service: ItemService;
	let existingItem: Item;

	beforeEach(async () => {
		repository = createMockRepository();
		service = createTestService(repository);
		existingItem = await service.createItem({ payload: "original" });
	});

	it("updates item payload", async () => {
		const result = await service.updateItem(existingItem.id, {
			payload: "updated",
		});

		expect(result.payload).toBe("updated");
		expect(result.updatedAt).toBeDefined();
	});

	it("preserves payload when not provided", async () => {
		const result = await service.updateItem(existingItem.id, {});

		expect(result.payload).toBe("original");
	});

	it("throws when item not found", async () => {
		expect(
			service.updateItem("nonexistent", { payload: "new" }),
		).rejects.toThrow(ItemNotFoundError);
	});

	it("throws on empty payload", async () => {
		expect(
			service.updateItem(existingItem.id, { payload: "" }),
		).rejects.toThrow(InvalidInputError);
	});
});

// -----------------------------------------------------------------------------
// ItemService.deleteItem
// -----------------------------------------------------------------------------

describe("ItemService.deleteItem", () => {
	it("deletes existing item", async () => {
		const repository = createMockRepository();
		const service = createTestService(repository);
		const item = await service.createItem({ payload: "test" });

		await service.deleteItem(item.id);

		expect(repository.delete).toHaveBeenCalledWith(item.id);
	});

	it("throws when item not found", async () => {
		const repository = createMockRepository();
		const service = createTestService(repository);

		expect(service.deleteItem("nonexistent")).rejects.toThrow(
			ItemNotFoundError,
		);
	});
});

// -----------------------------------------------------------------------------
// ItemService.listItems
// -----------------------------------------------------------------------------

describe("ItemService.listItems", () => {
	it("returns all items", async () => {
		const repository = createMockRepository();
		const service = createTestService(repository);
		await service.createItem({ payload: "first" });
		await service.createItem({ payload: "second" });

		const result = await service.listItems();

		expect(result).toHaveLength(2);
	});

	it("returns empty array when no repository", async () => {
		const service = createTestService();

		const result = await service.listItems();

		expect(result).toEqual([]);
	});
});
