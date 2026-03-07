/**
 * @file feature_test.cpp
 * @brief Tests for feature module using Google Test.
 *
 * Naming convention: TEST(TestSuite, test_{method}_{scenario}_{expected})
 */

#include "feature.hpp"

#include <gtest/gtest.h>
#include <memory>
#include <unordered_map>

namespace features::feature {

// =============================================================================
// SECTION 1: MOCK REPOSITORY
// =============================================================================

class MockRepository : public Repository {
public:
    std::optional<Item> find_by_id(const std::string& id) override {
        auto it = store_.find(id);
        if (it == store_.end()) {
            return std::nullopt;
        }
        return it->second;
    }

    std::vector<Item> find_all(int limit, int offset) override {
        std::vector<Item> result;
        for (const auto& [_, item] : store_) {
            result.push_back(item);
        }
        return result;
    }

    void save(const Item& item) override {
        store_[item.id()] = item;
    }

    void remove(const std::string& id) override {
        store_.erase(id);
    }

    [[nodiscard]] size_t size() const { return store_.size(); }
    [[nodiscard]] bool contains(const std::string& id) const {
        return store_.find(id) != store_.end();
    }

private:
    std::unordered_map<std::string, Item> store_;
};

// =============================================================================
// SECTION 2: TEST FIXTURES
// =============================================================================

class FeatureServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        repository_ = std::make_shared<MockRepository>();
        service_ = std::make_unique<Service>(Config::defaults(), repository_);
        service_no_repo_ = std::make_unique<Service>(Config::defaults());
    }

    std::shared_ptr<MockRepository> repository_;
    std::unique_ptr<Service> service_;
    std::unique_ptr<Service> service_no_repo_;
};

// =============================================================================
// SECTION 3: CREATE TESTS
// =============================================================================

TEST_F(FeatureServiceTest, test_create_validData_succeeds) {
    auto result = service_->create(CreateInput{"test data"});

    EXPECT_FALSE(result.id().empty());
    EXPECT_EQ(result.data(), "test data");
}

TEST_F(FeatureServiceTest, test_create_persistsToRepository) {
    auto result = service_->create(CreateInput{"test"});

    EXPECT_TRUE(repository_->contains(result.id()));
}

TEST_F(FeatureServiceTest, test_create_emptyData_throws) {
    EXPECT_THROW(
        service_->create(CreateInput{""}),
        ValidationError
    );
}

TEST_F(FeatureServiceTest, test_create_dataTooLong_throws) {
    std::string long_data(1001, 'x');

    EXPECT_THROW(
        service_->create(CreateInput{long_data}),
        ValidationError
    );
}

// =============================================================================
// SECTION 4: GET TESTS
// =============================================================================

TEST_F(FeatureServiceTest, test_get_found_returnsItem) {
    auto created = service_->create(CreateInput{"test"});

    auto result = service_->get(created.id());

    EXPECT_EQ(result.id(), created.id());
    EXPECT_EQ(result.data(), "test");
}

TEST_F(FeatureServiceTest, test_get_notFound_throws) {
    EXPECT_THROW(
        service_->get("nonexistent-id"),
        NotFoundError
    );
}

TEST_F(FeatureServiceTest, test_get_noRepository_throws) {
    EXPECT_THROW(
        service_no_repo_->get("any-id"),
        NotFoundError
    );
}

// =============================================================================
// SECTION 5: UPDATE TESTS
// =============================================================================

TEST_F(FeatureServiceTest, test_update_success) {
    auto created = service_->create(CreateInput{"original"});

    auto result = service_->update(created.id(), UpdateInput{"updated"});

    EXPECT_EQ(result.data(), "updated");
    EXPECT_TRUE(result.updated_at().has_value());
}

TEST_F(FeatureServiceTest, test_update_notFound_throws) {
    EXPECT_THROW(
        service_->update("nonexistent", UpdateInput{"new"}),
        NotFoundError
    );
}

TEST_F(FeatureServiceTest, test_update_emptyData_throws) {
    auto created = service_->create(CreateInput{"original"});

    EXPECT_THROW(
        service_->update(created.id(), UpdateInput{""}),
        ValidationError
    );
}

TEST_F(FeatureServiceTest, test_update_noData_preservesOriginal) {
    auto created = service_->create(CreateInput{"original"});

    auto result = service_->update(created.id(), UpdateInput{});

    EXPECT_EQ(result.data(), "original");
}

// =============================================================================
// SECTION 6: DELETE TESTS
// =============================================================================

TEST_F(FeatureServiceTest, test_remove_success) {
    auto created = service_->create(CreateInput{"test"});

    service_->remove(created.id());

    EXPECT_FALSE(repository_->contains(created.id()));
}

TEST_F(FeatureServiceTest, test_remove_notFound_throws) {
    EXPECT_THROW(
        service_->remove("nonexistent"),
        NotFoundError
    );
}

// =============================================================================
// SECTION 7: LIST TESTS
// =============================================================================

TEST_F(FeatureServiceTest, test_list_returnsAll) {
    service_->create(CreateInput{"item1"});
    service_->create(CreateInput{"item2"});

    auto result = service_->list();

    EXPECT_EQ(result.size(), 2);
}

TEST_F(FeatureServiceTest, test_list_noRepository_returnsEmpty) {
    auto result = service_no_repo_->list();

    EXPECT_TRUE(result.empty());
}

// =============================================================================
// SECTION 8: ITEM TESTS
// =============================================================================

TEST(ItemTest, test_item_construction) {
    Item item("test-id", "test-data");

    EXPECT_EQ(item.id(), "test-id");
    EXPECT_EQ(item.data(), "test-data");
    EXPECT_FALSE(item.updated_at().has_value());
}

TEST(ItemTest, test_item_markUpdated) {
    Item item("test-id", "test-data");

    item.mark_updated();

    EXPECT_TRUE(item.updated_at().has_value());
}

TEST(ItemTest, test_item_setData) {
    Item item("test-id", "original");

    item.set_data("modified");

    EXPECT_EQ(item.data(), "modified");
}

// =============================================================================
// SECTION 9: UTILITY TESTS
// =============================================================================

TEST(UtilityTest, test_generateId_unique) {
    auto id1 = generate_id();
    auto id2 = generate_id();

    EXPECT_NE(id1, id2);
}

TEST(UtilityTest, test_generateId_notEmpty) {
    auto id = generate_id();

    EXPECT_FALSE(id.empty());
}

} // namespace features::feature

// =============================================================================
// MAIN
// =============================================================================

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
