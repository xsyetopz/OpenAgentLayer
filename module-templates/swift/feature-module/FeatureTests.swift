/// Tests for Feature module.
///
/// Naming convention: test_{method}_{scenario}_{expected}

import XCTest
@testable import Feature

// MARK: - Mock Repository

final class MockRepository: FeatureRepository {
    var store: [UUID: FeatureItem] = [:]

    func findById(_ id: UUID) async throws -> FeatureItem? {
        store[id]
    }

    func findAll(limit: Int, offset: Int) async throws -> [FeatureItem] {
        Array(store.values)
    }

    func save(_ item: FeatureItem) async throws {
        store[item.id] = item
    }

    func delete(_ id: UUID) async throws {
        store.removeValue(forKey: id)
    }
}

// MARK: - Test Fixtures

func testService() -> FeatureService {
    FeatureService(config: .default)
}

func testServiceWithRepo() -> (FeatureService, MockRepository) {
    let repo = MockRepository()
    let service = FeatureService(config: .default, repository: repo)
    return (service, repo)
}

// MARK: - Create Tests

final class FeatureServiceCreateTests: XCTestCase {

    func test_create_validData_succeeds() async throws {
        let service = testService()

        let result = try await service.create(input: CreateInput(data: "test data"))

        XCTAssertFalse(result.id.uuidString.isEmpty)
        XCTAssertEqual(result.data, "test data")
        XCTAssertNotNil(result.createdAt)
    }

    func test_create_persistsToRepository() async throws {
        let (service, repo) = testServiceWithRepo()

        let result = try await service.create(input: CreateInput(data: "test"))

        XCTAssertNotNil(repo.store[result.id])
        XCTAssertEqual(repo.store[result.id]?.data, "test")
    }

    func test_create_emptyData_throws() async {
        let service = testService()

        do {
            _ = try await service.create(input: CreateInput(data: ""))
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .invalidInput = error {
                // Expected
            } else {
                XCTFail("Expected invalidInput error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }

    func test_create_whitespaceData_throws() async {
        let service = testService()

        do {
            _ = try await service.create(input: CreateInput(data: "   "))
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .invalidInput = error {
                // Expected
            } else {
                XCTFail("Expected invalidInput error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }

    func test_create_dataTooLong_throws() async {
        let service = testService()
        let longData = String(repeating: "x", count: 1001)

        do {
            _ = try await service.create(input: CreateInput(data: longData))
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .invalidInput = error {
                // Expected
            } else {
                XCTFail("Expected invalidInput error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }
}

// MARK: - Get Tests

final class FeatureServiceGetTests: XCTestCase {

    func test_get_found_returnsItem() async throws {
        let (service, _) = testServiceWithRepo()
        let created = try await service.create(input: CreateInput(data: "test"))

        let result = try await service.get(id: created.id)

        XCTAssertEqual(result.id, created.id)
        XCTAssertEqual(result.data, "test")
    }

    func test_get_notFound_throws() async {
        let (service, _) = testServiceWithRepo()
        let randomId = UUID()

        do {
            _ = try await service.get(id: randomId)
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .notFound(let id) = error {
                XCTAssertEqual(id, randomId)
            } else {
                XCTFail("Expected notFound error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }

    func test_get_noRepository_throws() async {
        let service = testService()

        do {
            _ = try await service.get(id: UUID())
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .notFound = error {
                // Expected
            } else {
                XCTFail("Expected notFound error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }
}

// MARK: - Update Tests

final class FeatureServiceUpdateTests: XCTestCase {

    func test_update_success() async throws {
        let (service, _) = testServiceWithRepo()
        let created = try await service.create(input: CreateInput(data: "original"))

        let result = try await service.update(id: created.id, input: UpdateInput(data: "updated"))

        XCTAssertEqual(result.data, "updated")
        XCTAssertNotNil(result.updatedAt)
    }

    func test_update_notFound_throws() async {
        let (service, _) = testServiceWithRepo()

        do {
            _ = try await service.update(id: UUID(), input: UpdateInput(data: "new"))
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .notFound = error {
                // Expected
            } else {
                XCTFail("Expected notFound error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }

    func test_update_emptyData_throws() async throws {
        let (service, _) = testServiceWithRepo()
        let created = try await service.create(input: CreateInput(data: "original"))

        do {
            _ = try await service.update(id: created.id, input: UpdateInput(data: ""))
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .invalidInput = error {
                // Expected
            } else {
                XCTFail("Expected invalidInput error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }
}

// MARK: - Delete Tests

final class FeatureServiceDeleteTests: XCTestCase {

    func test_delete_success() async throws {
        let (service, repo) = testServiceWithRepo()
        let created = try await service.create(input: CreateInput(data: "test"))

        try await service.delete(id: created.id)

        XCTAssertNil(repo.store[created.id])
    }

    func test_delete_notFound_throws() async {
        let (service, _) = testServiceWithRepo()

        do {
            try await service.delete(id: UUID())
            XCTFail("Expected error to be thrown")
        } catch let error as FeatureError {
            if case .notFound = error {
                // Expected
            } else {
                XCTFail("Expected notFound error")
            }
        } catch {
            XCTFail("Unexpected error type")
        }
    }
}

// MARK: - List Tests

final class FeatureServiceListTests: XCTestCase {

    func test_list_returnsAll() async throws {
        let (service, _) = testServiceWithRepo()
        _ = try await service.create(input: CreateInput(data: "item1"))
        _ = try await service.create(input: CreateInput(data: "item2"))

        let result = try await service.list()

        XCTAssertEqual(result.count, 2)
    }

    func test_list_noRepository_returnsEmpty() async throws {
        let service = testService()

        let result = try await service.list()

        XCTAssertEqual(result.count, 0)
    }
}

// MARK: - FeatureItem Tests

final class FeatureItemTests: XCTestCase {

    func test_item_equatable() {
        let id = UUID()
        let item1 = FeatureItem(id: id, data: "test1")
        let item2 = FeatureItem(id: id, data: "test2")
        let item3 = FeatureItem(data: "test1")

        XCTAssertEqual(item1, item2) // Same ID
        XCTAssertNotEqual(item1, item3) // Different ID
    }

    func test_item_description() {
        let item = FeatureItem(data: "test")

        XCTAssertTrue(item.description.contains("FeatureItem"))
        XCTAssertTrue(item.description.contains(item.id.uuidString))
    }
}
