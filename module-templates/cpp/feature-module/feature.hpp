#pragma once

#include <chrono>
#include <concepts>
#include <memory>
#include <optional>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace features::feature {

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

struct Config {
  std::string field_one;
  int ttl_seconds = 3600;

  [[nodiscard]] static auto defaults() -> Config { return {}; }
};

// -----------------------------------------------------------------------------
// Domain Types
// -----------------------------------------------------------------------------

class Item {
public:
  using Clock = std::chrono::system_clock;
  using TimePoint = Clock::time_point;

  Item(std::string id, std::string payload);

  // Rule of Five
  ~Item() = default;
  Item(const Item &) = default;
  Item(Item &&) noexcept = default;
  auto operator=(const Item &) -> Item & = default;
  auto operator=(Item &&) noexcept -> Item & = default;

  [[nodiscard]] auto id() const noexcept -> std::string_view { return id_; }
  [[nodiscard]] auto payload() const noexcept -> std::string_view {
    return payload_;
  }
  [[nodiscard]] auto created_at() const noexcept -> TimePoint {
    return created_at_;
  }
  [[nodiscard]] auto updated_at() const noexcept -> std::optional<TimePoint> {
    return updated_at_;
  }

  auto set_payload(std::string new_payload) -> void;
  auto mark_as_updated() -> void;

private:
  std::string id_;
  std::string payload_;
  TimePoint created_at_;
  std::optional<TimePoint> updated_at_;
};

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

struct CreateItemInput {
  std::string payload;
};

struct UpdateItemInput {
  std::optional<std::string> payload;
};

struct PaginationParams {
  int limit = 20;
  int offset = 0;
};

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

class FeatureError : public std::runtime_error {
public:
  using std::runtime_error::runtime_error;
};

class ItemNotFoundError : public FeatureError {
public:
  explicit ItemNotFoundError(std::string_view item_id)
      : FeatureError(std::string{"Item not found: "} + std::string{item_id}),
        item_id_{item_id} {}

  [[nodiscard]] auto item_id() const noexcept -> std::string_view {
    return item_id_;
  }

private:
  std::string item_id_;
};

class InvalidInputError : public FeatureError {
public:
  explicit InvalidInputError(std::string_view reason)
      : FeatureError(std::string{"Invalid input: "} + std::string{reason}) {}
};

// -----------------------------------------------------------------------------
// Repository Interface
// -----------------------------------------------------------------------------

class ItemRepository {
public:
  virtual ~ItemRepository() = default;
  ItemRepository() = default;
  ItemRepository(const ItemRepository &) = default;
  ItemRepository(ItemRepository &&) = default;
  auto operator=(const ItemRepository &) -> ItemRepository & = default;
  auto operator=(ItemRepository &&) -> ItemRepository & = default;

  [[nodiscard]] virtual auto find_by_id(std::string_view id)
      -> std::optional<Item> = 0;
  [[nodiscard]] virtual auto find_all(PaginationParams params)
      -> std::vector<Item> = 0;
  virtual auto save(const Item &item) -> void = 0;
  virtual auto remove(std::string_view id) -> void = 0;
};

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

class ItemService {
public:
  explicit ItemService(Config config);
  ItemService(Config config, std::shared_ptr<ItemRepository> repository);

  [[nodiscard]] auto create_item(const CreateItemInput &input) -> Item;
  [[nodiscard]] auto get_item(std::string_view id) -> Item;
  [[nodiscard]] auto update_item(std::string_view id,
                                 const UpdateItemInput &input) -> Item;
  auto delete_item(std::string_view id) -> void;
  [[nodiscard]] auto list_items(PaginationParams params = {})
      -> std::vector<Item>;

private:
  auto validate_payload(std::string_view payload) const -> void;

  Config config_;
  std::shared_ptr<ItemRepository> repository_;
};

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

[[nodiscard]] auto generate_uuid() -> std::string;

// C++20 concept for repository-like types
template <typename T>
concept RepositoryLike =
    requires(T repo, std::string_view id, Item item, PaginationParams params) {
      { repo.find_by_id(id) } -> std::same_as<std::optional<Item>>;
      { repo.find_all(params) } -> std::same_as<std::vector<Item>>;
      { repo.save(item) } -> std::same_as<void>;
      { repo.remove(id) } -> std::same_as<void>;
    };

} // namespace features::feature
