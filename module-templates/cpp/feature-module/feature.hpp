/**
 * @file feature.hpp
 * @brief {Brief description of what this feature does}
 *
 * @example
 * @code
 * #include "feature.hpp"
 *
 * features::feature::Config config;
 * features::feature::Service service(config);
 * auto item = service.create("example data");
 * @endcode
 */

#pragma once

#include <chrono>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

namespace features::feature {

// =============================================================================
// SECTION 1: CONFIGURATION
// =============================================================================

/**
 * @brief Configuration for the feature service.
 */
struct Config {
    /// {Description of field}
    std::string field_one;

    /// {Description of field}. Defaults to 3600.
    int field_two = 3600;

    /// Creates default configuration.
    static Config defaults() {
        return Config{};
    }
};

// =============================================================================
// SECTION 2: DOMAIN TYPES
// =============================================================================

/**
 * @brief Main domain type for this feature.
 *
 * @example
 * @code
 * Item item("some-id", "data");
 * std::cout << item.id() << std::endl;
 * @endcode
 */
class Item {
public:
    /**
     * @brief Constructs a new Item.
     * @param id Unique identifier
     * @param data Main payload
     */
    Item(std::string id, std::string data);

    /// Gets the unique identifier.
    [[nodiscard]] const std::string& id() const noexcept { return id_; }

    /// Gets the data payload.
    [[nodiscard]] const std::string& data() const noexcept { return data_; }

    /// Sets the data payload.
    void set_data(std::string data) { data_ = std::move(data); }

    /// Gets the creation timestamp.
    [[nodiscard]] std::chrono::system_clock::time_point created_at() const noexcept {
        return created_at_;
    }

    /// Gets the last update timestamp.
    [[nodiscard]] std::optional<std::chrono::system_clock::time_point> updated_at() const noexcept {
        return updated_at_;
    }

    /// Marks the item as updated.
    void mark_updated();

private:
    std::string id_;
    std::string data_;
    std::chrono::system_clock::time_point created_at_;
    std::optional<std::chrono::system_clock::time_point> updated_at_;
};

// =============================================================================
// SECTION 3: INPUT TYPES
// =============================================================================

/**
 * @brief Input for creating a new item.
 */
struct CreateInput {
    std::string data;
};

/**
 * @brief Input for updating an existing item.
 */
struct UpdateInput {
    std::optional<std::string> data;
};

// =============================================================================
// SECTION 4: ERRORS
// =============================================================================

/**
 * @brief Base exception for feature errors.
 */
class FeatureError : public std::runtime_error {
public:
    explicit FeatureError(const std::string& message)
        : std::runtime_error(message) {}
};

/**
 * @brief Thrown when an item is not found.
 */
class NotFoundError : public FeatureError {
public:
    explicit NotFoundError(const std::string& id)
        : FeatureError("Item not found: " + id), id_(id) {}

    [[nodiscard]] const std::string& id() const noexcept { return id_; }

private:
    std::string id_;
};

/**
 * @brief Thrown when input validation fails.
 */
class ValidationError : public FeatureError {
public:
    explicit ValidationError(const std::string& message)
        : FeatureError("Invalid input: " + message) {}
};

// =============================================================================
// SECTION 5: REPOSITORY INTERFACE
// =============================================================================

/**
 * @brief Interface for data access.
 *
 * Implement this for different storage backends.
 */
class Repository {
public:
    virtual ~Repository() = default;

    virtual std::optional<Item> find_by_id(const std::string& id) = 0;
    virtual std::vector<Item> find_all(int limit, int offset) = 0;
    virtual void save(const Item& item) = 0;
    virtual void remove(const std::string& id) = 0;
};

// =============================================================================
// SECTION 6: SERVICE
// =============================================================================

/**
 * @brief Service for feature operations.
 *
 * @example
 * @code
 * Service service(Config::defaults());
 * auto item = service.create(CreateInput{"test data"});
 * @endcode
 */
class Service {
public:
    /**
     * @brief Constructs a service with configuration.
     * @param config Service configuration
     */
    explicit Service(Config config);

    /**
     * @brief Constructs a service with configuration and repository.
     * @param config Service configuration
     * @param repository Data access repository
     */
    Service(Config config, std::shared_ptr<Repository> repository);

    /**
     * @brief Creates a new item.
     * @param input Creation input
     * @return The created item
     * @throws ValidationError If input is invalid
     */
    [[nodiscard]] Item create(const CreateInput& input);

    /**
     * @brief Retrieves an item by ID.
     * @param id Unique identifier
     * @return The item if found
     * @throws NotFoundError If item doesn't exist
     */
    [[nodiscard]] Item get(const std::string& id);

    /**
     * @brief Updates an existing item.
     * @param id Item ID
     * @param input Update input
     * @return The updated item
     * @throws NotFoundError If item doesn't exist
     * @throws ValidationError If input is invalid
     */
    [[nodiscard]] Item update(const std::string& id, const UpdateInput& input);

    /**
     * @brief Deletes an item.
     * @param id Item ID
     * @throws NotFoundError If item doesn't exist
     */
    void remove(const std::string& id);

    /**
     * @brief Lists all items with pagination.
     * @param limit Maximum items to return
     * @param offset Items to skip
     * @return Vector of items
     */
    [[nodiscard]] std::vector<Item> list(int limit = 20, int offset = 0);

private:
    void validate_create_input(const CreateInput& input);
    void validate_update_input(const UpdateInput& input);

    Config config_;
    std::shared_ptr<Repository> repository_;
};

// =============================================================================
// SECTION 7: UTILITY FUNCTIONS
// =============================================================================

/**
 * @brief Generates a unique identifier.
 * @return A UUID string
 */
[[nodiscard]] std::string generate_id();

} // namespace features::feature
