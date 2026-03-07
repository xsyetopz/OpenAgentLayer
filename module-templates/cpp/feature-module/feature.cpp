/**
 * @file feature.cpp
 * @brief Implementation of feature module.
 */

#include "feature.hpp"

#include <random>
#include <sstream>
#include <iomanip>

namespace features::feature {

// =============================================================================
// SECTION 1: ITEM IMPLEMENTATION
// =============================================================================

Item::Item(std::string id, std::string data)
    : id_(std::move(id))
    , data_(std::move(data))
    , created_at_(std::chrono::system_clock::now())
    , updated_at_(std::nullopt) {}

void Item::mark_updated() {
    updated_at_ = std::chrono::system_clock::now();
}

// =============================================================================
// SECTION 2: SERVICE IMPLEMENTATION
// =============================================================================

Service::Service(Config config)
    : config_(std::move(config))
    , repository_(nullptr) {}

Service::Service(Config config, std::shared_ptr<Repository> repository)
    : config_(std::move(config))
    , repository_(std::move(repository)) {}

Item Service::create(const CreateInput& input) {
    // Validate input
    validate_create_input(input);

    // Create item
    Item item(generate_id(), input.data);

    // Persist if repository available
    if (repository_) {
        repository_->save(item);
    }

    return item;
}

Item Service::get(const std::string& id) {
    if (!repository_) {
        throw NotFoundError(id);
    }

    auto item = repository_->find_by_id(id);
    if (!item) {
        throw NotFoundError(id);
    }

    return *item;
}

Item Service::update(const std::string& id, const UpdateInput& input) {
    // Validate input
    validate_update_input(input);

    // Get existing item
    Item item = get(id);

    // Apply updates
    if (input.data) {
        item.set_data(*input.data);
    }
    item.mark_updated();

    // Persist
    if (repository_) {
        repository_->save(item);
    }

    return item;
}

void Service::remove(const std::string& id) {
    // Verify exists
    get(id);

    // Delete
    if (repository_) {
        repository_->remove(id);
    }
}

std::vector<Item> Service::list(int limit, int offset) {
    if (!repository_) {
        return {};
    }

    return repository_->find_all(limit, offset);
}

// =============================================================================
// SECTION 3: VALIDATION
// =============================================================================

void Service::validate_create_input(const CreateInput& input) {
    if (input.data.empty()) {
        throw ValidationError("Data cannot be empty");
    }

    if (input.data.size() > 1000) {
        throw ValidationError("Data exceeds maximum length of 1000");
    }
}

void Service::validate_update_input(const UpdateInput& input) {
    if (input.data) {
        if (input.data->empty()) {
            throw ValidationError("Data cannot be empty");
        }

        if (input.data->size() > 1000) {
            throw ValidationError("Data exceeds maximum length of 1000");
        }
    }
}

// =============================================================================
// SECTION 4: UTILITY FUNCTIONS
// =============================================================================

std::string generate_id() {
    // Simple UUID v4 generation
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);
    std::uniform_int_distribution<> dis2(8, 11);

    std::stringstream ss;
    ss << std::hex;

    for (int i = 0; i < 8; i++) {
        ss << dis(gen);
    }
    ss << "-";

    for (int i = 0; i < 4; i++) {
        ss << dis(gen);
    }
    ss << "-4"; // Version 4

    for (int i = 0; i < 3; i++) {
        ss << dis(gen);
    }
    ss << "-";

    ss << dis2(gen); // Variant

    for (int i = 0; i < 3; i++) {
        ss << dis(gen);
    }
    ss << "-";

    for (int i = 0; i < 12; i++) {
        ss << dis(gen);
    }

    return ss.str();
}

} // namespace features::feature
