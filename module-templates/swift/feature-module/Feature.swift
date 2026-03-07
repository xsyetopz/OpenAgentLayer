/// # Feature Module
///
/// {Brief description of what this feature does}
///
/// ## Usage
///
/// ```swift
/// let config = FeatureConfig(fieldOne: "value")
/// let service = FeatureService(config: config)
/// let item = try await service.create(data: "example")
/// ```

import Foundation

// MARK: - Configuration

/// Configuration for the feature service.
public struct FeatureConfig: Sendable {
    /// {Description of field}
    public let fieldOne: String

    /// {Description of field}. Defaults to 3600.
    public let fieldTwo: Int

    /// Creates a new configuration.
    public init(
        fieldOne: String = "",
        fieldTwo: Int = 3600
    ) {
        self.fieldOne = fieldOne
        self.fieldTwo = fieldTwo
    }

    /// Default configuration.
    public static let `default` = FeatureConfig()
}

// MARK: - Domain Types

/// Main domain type for this feature.
///
/// ## Example
///
/// ```swift
/// let item = FeatureItem(id: UUID(), data: "example", createdAt: Date())
/// print(item.isExpired)
/// ```
public struct FeatureItem: Identifiable, Codable, Sendable {
    /// Unique identifier.
    public let id: UUID

    /// Main payload data.
    public var data: String

    /// Creation timestamp.
    public let createdAt: Date

    /// Last update timestamp.
    public var updatedAt: Date?

    /// Creates a new item.
    public init(
        id: UUID = UUID(),
        data: String,
        createdAt: Date = Date(),
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.data = data
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Input Types

/// Input for creating a new item.
public struct CreateInput: Sendable {
    public let data: String
    public let metadata: [String: String]?

    public init(data: String, metadata: [String: String]? = nil) {
        self.data = data
        self.metadata = metadata
    }
}

/// Input for updating an existing item.
public struct UpdateInput: Sendable {
    public let data: String?
    public let metadata: [String: String]?

    public init(data: String? = nil, metadata: [String: String]? = nil) {
        self.data = data
        self.metadata = metadata
    }
}

// MARK: - Errors

/// Errors that can occur in the feature module.
public enum FeatureError: Error, LocalizedError {
    /// Item was not found.
    case notFound(UUID)

    /// Invalid input provided.
    case invalidInput(String)

    /// Internal error.
    case internalError(String)

    public var errorDescription: String? {
        switch self {
        case .notFound(let id):
            return "Item not found: \(id)"
        case .invalidInput(let message):
            return "Invalid input: \(message)"
        case .internalError(let message):
            return "Internal error: \(message)"
        }
    }
}

// MARK: - Repository Protocol

/// Protocol for data access.
/// Implement this for different storage backends.
public protocol FeatureRepository: Sendable {
    func findById(_ id: UUID) async throws -> FeatureItem?
    func findAll(limit: Int, offset: Int) async throws -> [FeatureItem]
    func save(_ item: FeatureItem) async throws
    func delete(_ id: UUID) async throws
}

// MARK: - Extensions

extension FeatureItem: Equatable {
    public static func == (lhs: FeatureItem, rhs: FeatureItem) -> Bool {
        lhs.id == rhs.id
    }
}

extension FeatureItem: Hashable {
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

extension FeatureItem: CustomStringConvertible {
    public var description: String {
        "FeatureItem(id: \(id), data: \(data))"
    }
}
