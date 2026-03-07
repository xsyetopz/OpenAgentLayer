#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "feature.hpp"
#include <unordered_map>

namespace features::feature {

// -----------------------------------------------------------------------------
// Mock Repository
// -----------------------------------------------------------------------------

class InMemoryItemRepository final : public ItemRepository {
public:
  [[nodiscard]] auto find_by_id(std::string_view id)
      -> std::optional<Item> override {
    const auto key = std::string{id};
    if (const auto it = store_.find(key); it != store_.end()) {
      return it->second;
    }
    return std::nullopt;
  }

  [[nodiscard]] auto find_all(PaginationParams /*params*/)
      -> std::vector<Item> override {
    auto result = std::vector<Item>{};
    result.reserve(store_.size());
    for (const auto &[_, item] : store_) {
      result.push_back(item);
    }
    return result;
  }

  auto save(const Item &item) -> void override {
    store_.insert_or_assign(std::string{item.id()}, item);
  }

  auto remove(std::string_view id) -> void override {
    store_.erase(std::string{id});
  }

  [[nodiscard]] auto size() const -> std::size_t { return store_.size(); }
  [[nodiscard]] auto contains(std::string_view id) const -> bool {
    return store_.contains(std::string{id});
  }

private:
  std::unordered_map<std::string, Item> store_;
};

// -----------------------------------------------------------------------------
// ItemService::create_item
// -----------------------------------------------------------------------------

TEST_SUITE("ItemService::create_item") {
  TEST_CASE("creates item with valid payload") {
    auto service = ItemService{Config::defaults()};

    const auto item =
        service.create_item(CreateItemInput{.payload = "test payload"});

    CHECK_FALSE(item.id().empty());
    CHECK_EQ(item.payload(), "test payload");
  }

  TEST_CASE("persists item when repository provided") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};

    const auto item = service.create_item(CreateItemInput{.payload = "test"});

    CHECK(repository->contains(item.id()));
  }

  TEST_CASE("throws on empty payload") {
    auto service = ItemService{Config::defaults()};

    CHECK_THROWS_AS(service.create_item(CreateItemInput{.payload = ""}),
                    InvalidInputError);
  }

  TEST_CASE("throws when payload exceeds max length") {
    auto service = ItemService{Config::defaults()};
    const auto long_payload = std::string(1001, 'x');

    CHECK_THROWS_AS(
        service.create_item(CreateItemInput{.payload = long_payload}),
        InvalidInputError);
  }
}

// -----------------------------------------------------------------------------
// ItemService::get_item
// -----------------------------------------------------------------------------

TEST_SUITE("ItemService::get_item") {
  TEST_CASE("returns item when found") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};
    const auto created =
        service.create_item(CreateItemInput{.payload = "test"});

    const auto retrieved = service.get_item(created.id());

    CHECK_EQ(retrieved.id(), created.id());
    CHECK_EQ(retrieved.payload(), "test");
  }

  TEST_CASE("throws when item not found") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};

    CHECK_THROWS_AS(service.get_item("nonexistent"), ItemNotFoundError);
  }

  TEST_CASE("throws when no repository configured") {
    auto service = ItemService{Config::defaults()};

    CHECK_THROWS_AS(service.get_item("any-id"), ItemNotFoundError);
  }
}

// -----------------------------------------------------------------------------
// ItemService::update_item
// -----------------------------------------------------------------------------

TEST_SUITE("ItemService::update_item") {
  TEST_CASE("updates payload successfully") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};
    const auto created =
        service.create_item(CreateItemInput{.payload = "original"});

    const auto updated = service.update_item(
        created.id(), UpdateItemInput{.payload = "modified"});

    CHECK_EQ(updated.payload(), "modified");
    CHECK(updated.updated_at().has_value());
  }

  TEST_CASE("preserves payload when not provided in update") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};
    const auto created =
        service.create_item(CreateItemInput{.payload = "original"});

    const auto updated = service.update_item(created.id(), UpdateItemInput{});

    CHECK_EQ(updated.payload(), "original");
  }

  TEST_CASE("throws when item not found") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};

    CHECK_THROWS_AS(
        service.update_item("nonexistent", UpdateItemInput{.payload = "new"}),
        ItemNotFoundError);
  }

  TEST_CASE("throws on empty payload") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};
    const auto created =
        service.create_item(CreateItemInput{.payload = "original"});

    CHECK_THROWS_AS(
        service.update_item(created.id(), UpdateItemInput{.payload = ""}),
        InvalidInputError);
  }
}

// -----------------------------------------------------------------------------
// ItemService::delete_item
// -----------------------------------------------------------------------------

TEST_SUITE("ItemService::delete_item") {
  TEST_CASE("removes item from repository") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};
    const auto created =
        service.create_item(CreateItemInput{.payload = "test"});

    service.delete_item(created.id());

    CHECK_FALSE(repository->contains(created.id()));
  }

  TEST_CASE("throws when item not found") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};

    CHECK_THROWS_AS(service.delete_item("nonexistent"), ItemNotFoundError);
  }
}

// -----------------------------------------------------------------------------
// ItemService::list_items
// -----------------------------------------------------------------------------

TEST_SUITE("ItemService::list_items") {
  TEST_CASE("returns all items") {
    auto repository = std::make_shared<InMemoryItemRepository>();
    auto service = ItemService{Config::defaults(), repository};
    service.create_item(CreateItemInput{.payload = "first"});
    service.create_item(CreateItemInput{.payload = "second"});

    const auto items = service.list_items();

    CHECK_EQ(items.size(), 2);
  }

  TEST_CASE("returns empty when no repository") {
    auto service = ItemService{Config::defaults()};

    const auto items = service.list_items();

    CHECK(items.empty());
  }
}

// -----------------------------------------------------------------------------
// Item
// -----------------------------------------------------------------------------

TEST_SUITE("Item") {
  TEST_CASE("generates unique IDs") {
    const auto id1 = generate_uuid();
    const auto id2 = generate_uuid();

    CHECK_NE(id1, id2);
  }

  TEST_CASE("mark_as_updated sets timestamp") {
    auto item = Item{"test-id", "payload"};
    CHECK_FALSE(item.updated_at().has_value());

    item.mark_as_updated();

    CHECK(item.updated_at().has_value());
  }
}

} // namespace features::feature
