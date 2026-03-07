export type { ItemRepository } from "./service";
export { createItemService, ItemService } from "./service";

export type {
	Config,
	CreateItemInput,
	Item,
	PaginatedResponse,
	PaginationParams,
	UpdateItemInput,
} from "./types";

export {
	FeatureError,
	InvalidInputError,
	ItemNotFoundError,
	isItem,
} from "./types";
