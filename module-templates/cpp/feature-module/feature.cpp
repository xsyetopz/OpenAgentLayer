#include "feature.hpp"

#include <iomanip>
#include <random>
#include <sstream>

namespace features::feature {

// -----------------------------------------------------------------------------
// Item
// -----------------------------------------------------------------------------

Item::Item(std::string id, std::string payload)
    : id_{std::move(id)}, payload_{std::move(payload)},
      created_at_{Clock::now()}, updated_at_{std::nullopt} {}

auto Item::set_payload(std::string new_payload) -> void {
  payload_ = std::move(new_payload);
}

auto Item::mark_as_updated() -> void { updated_at_ = Clock::now(); }

// -----------------------------------------------------------------------------
// ItemService
// -----------------------------------------------------------------------------

ItemService::ItemService(Config config)
    : config_{std::move(config)}, repository_{nullptr} {}

ItemService::ItemService(Config config,
                         std::shared_ptr<ItemRepository> repository)
    : config_{std::move(config)}, repository_{std::move(repository)} {}

auto ItemService::create_item(const CreateItemInput &input) -> Item {
  validate_payload(input.payload);

  auto item = Item{generate_uuid(), input.payload};

  if (repository_) {
    repository_->save(item);
  }

  return item;
}

auto ItemService::get_item(std::string_view id) -> Item {
  if (!repository_) {
    throw ItemNotFoundError{id};
  }

  auto item = repository_->find_by_id(id);
  if (!item) {
    throw ItemNotFoundError{id};
  }

  return *item;
}

auto ItemService::update_item(std::string_view id, const UpdateItemInput &input)
    -> Item {
  if (input.payload) {
    validate_payload(*input.payload);
  }

  auto item = get_item(id);

  if (input.payload) {
    item.set_payload(*input.payload);
  }
  item.mark_as_updated();

  if (repository_) {
    repository_->save(item);
  }

  return item;
}

auto ItemService::delete_item(std::string_view id) -> void {
  [[maybe_unused]] const auto _ = get_item(id);

  if (repository_) {
    repository_->remove(id);
  }
}

auto ItemService::list_items(PaginationParams params) -> std::vector<Item> {
  if (!repository_) {
    return {};
  }

  return repository_->find_all(params);
}

auto ItemService::validate_payload(std::string_view payload) const -> void {
  if (payload.empty()) {
    throw InvalidInputError{"payload cannot be empty"};
  }

  constexpr std::size_t max_payload_length = 1000;
  if (payload.size() > max_payload_length) {
    throw InvalidInputError{"payload exceeds maximum length"};
  }
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

auto generate_uuid() -> std::string {
  static thread_local std::mt19937 gen{std::random_device{}()};
  std::uniform_int_distribution<> hex_dist{0, 15};
  std::uniform_int_distribution<> variant_dist{8, 11};

  auto ss = std::ostringstream{};
  ss << std::hex;

  for (auto i = 0; i < 8; ++i) {
    ss << hex_dist(gen);
  }
  ss << '-';
  for (auto i = 0; i < 4; ++i) {
    ss << hex_dist(gen);
  }
  ss << "-4";
  for (auto i = 0; i < 3; ++i) {
    ss << hex_dist(gen);
  }
  ss << '-';
  ss << variant_dist(gen);
  for (auto i = 0; i < 3; ++i) {
    ss << hex_dist(gen);
  }
  ss << '-';
  for (auto i = 0; i < 12; ++i) {
    ss << hex_dist(gen);
  }

  return ss.str();
}

} // namespace features::feature
