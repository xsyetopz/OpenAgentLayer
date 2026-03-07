/// Business logic for the Feature module.
///
/// This file contains the main service implementation.
/// Keep business logic here, delegate data access to repositories.

import Foundation

// MARK: - Service

/// Service for feature operations.
///
/// ## Example
///
/// ```swift
/// let service = FeatureService(config: .default)
/// let item = try await service.create(input: CreateInput(data: "test"))
/// ```
public final class FeatureService: Sendable {

    // MARK: - Properties

    private let config: FeatureConfig
    private let repository: FeatureRepository?

    // MARK: - Initialization

    /// Creates a new service with configuration.
    public init(config: FeatureConfig = .default) {
        self.config = config
        self.repository = nil
    }

    /// Creates a new service with configuration and repository.
    public init(config: FeatureConfig = .default, repository: FeatureRepository) {
        self.config = config
        self.repository = repository
    }

    // MARK: - CRUD Operations

    /// Creates a new item.
    ///
    /// - Parameter input: The creation input.
    /// - Returns: The created item.
    /// - Throws: `FeatureError.invalidInput` if validation fails.
    public func create(input: CreateInput) async throws -> FeatureItem {
        // Validate input
        try validateCreateInput(input)

        // Create item
        let item = FeatureItem(data: input.data)

        // Persist if repository available
        if let repository {
            try await repository.save(item)
        }

        return item
    }

    /// Retrieves an item by ID.
    ///
    /// - Parameter id: The unique identifier.
    /// - Returns: The item if found.
    /// - Throws: `FeatureError.notFound` if item doesn't exist.
    public func get(id: UUID) async throws -> FeatureItem {
        guard let repository else {
            throw FeatureError.notFound(id)
        }

        guard let item = try await repository.findById(id) else {
            throw FeatureError.notFound(id)
        }

        return item
    }

    /// Updates an existing item.
    ///
    /// - Parameters:
    ///   - id: The item ID.
    ///   - input: The update input.
    /// - Returns: The updated item.
    /// - Throws: `FeatureError.notFound` if item doesn't exist.
    /// - Throws: `FeatureError.invalidInput` if validation fails.
    public func update(id: UUID, input: UpdateInput) async throws -> FeatureItem {
        // Validate input
        try validateUpdateInput(input)

        // Get existing item
        var existing = try await get(id: id)

        // Apply updates
        if let data = input.data {
            existing.data = data
        }
        existing.updatedAt = Date()

        // Persist
        if let repository {
            try await repository.save(existing)
        }

        return existing
    }

    /// Deletes an item.
    ///
    /// - Parameter id: The item ID.
    /// - Throws: `FeatureError.notFound` if item doesn't exist.
    public func delete(id: UUID) async throws {
        // Verify exists
        _ = try await get(id: id)

        // Delete
        if let repository {
            try await repository.delete(id)
        }
    }

    /// Lists all items with pagination.
    ///
    /// - Parameters:
    ///   - limit: Maximum number of items to return.
    ///   - offset: Number of items to skip.
    /// - Returns: Array of items.
    public func list(limit: Int = 20, offset: Int = 0) async throws -> [FeatureItem] {
        guard let repository else {
            return []
        }

        return try await repository.findAll(limit: limit, offset: offset)
    }

    // MARK: - Validation

    private func validateCreateInput(_ input: CreateInput) throws {
        guard !input.data.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw FeatureError.invalidInput("Data cannot be empty")
        }

        guard input.data.count <= 1000 else {
            throw FeatureError.invalidInput("Data exceeds maximum length of 1000")
        }
    }

    private func validateUpdateInput(_ input: UpdateInput) throws {
        if let data = input.data {
            guard !data.trimmingCharacters(in: .whitespaces).isEmpty else {
                throw FeatureError.invalidInput("Data cannot be empty")
            }

            guard data.count <= 1000 else {
                throw FeatureError.invalidInput("Data exceeds maximum length of 1000")
            }
        }
    }
}

// MARK: - Factory Functions

/// Creates a service with default configuration.
public func createFeatureService(repository: FeatureRepository? = nil) -> FeatureService {
    if let repository {
        return FeatureService(config: .default, repository: repository)
    }
    return FeatureService(config: .default)
}
