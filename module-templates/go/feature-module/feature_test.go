package feature

import (
	"context"
	"testing"
)

// -----------------------------------------------------------------------------
// Test Fixtures
// -----------------------------------------------------------------------------

// mockRepository is an in-memory repository for testing.
type mockRepository struct {
	store map[string]*MainType
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		store: make(map[string]*MainType),
	}
}

func (m *mockRepository) FindByID(ctx context.Context, id string) (*MainType, error) {
	item, ok := m.store[id]
	if !ok {
		return nil, nil
	}
	return item, nil
}

func (m *mockRepository) FindAll(ctx context.Context, limit, offset int) ([]*MainType, error) {
	items := make([]*MainType, 0, len(m.store))
	for _, item := range m.store {
		items = append(items, item)
	}
	return items, nil
}

func (m *mockRepository) Save(ctx context.Context, item *MainType) error {
	m.store[item.ID] = item
	return nil
}

func (m *mockRepository) Delete(ctx context.Context, id string) error {
	delete(m.store, id)
	return nil
}

// testService creates a service for testing.
func testService() *Service {
	return NewService(DefaultConfig())
}

// testServiceWithRepo creates a service with a mock repository.
func testServiceWithRepo() (*Service, *mockRepository) {
	repo := newMockRepository()
	svc := NewServiceWithRepo(DefaultConfig(), repo)
	return svc, repo
}

// -----------------------------------------------------------------------------
// Create Tests
// -----------------------------------------------------------------------------

func TestService_Create_ValidData(t *testing.T) {
	svc := testService()
	ctx := context.Background()

	result, err := svc.Create(ctx, CreateInput{Data: "test data"})

	switch {
	case err != nil:
		t.Fatalf("unexpected error: %v", err)
	case result == nil:
		t.Fatal("expected result, got nil")
	case result.ID == "":
		t.Error("expected ID to be set")
	case result.Data != "test data":
		t.Errorf("expected Data to be 'test data', got %q", result.Data)
	case result.CreatedAt.IsZero():
		t.Error("expected CreatedAt to be set")
	}

}

func TestService_Create_EmptyData(t *testing.T) {
	svc := testService()
	ctx := context.Background()

	_, err := svc.Create(ctx, CreateInput{Data: ""})

	if err != ErrInvalidInput {
		t.Errorf("expected ErrInvalidInput, got %v", err)
	}
}

func TestService_Create_DataTooLong(t *testing.T) {
	svc := testService()
	ctx := context.Background()
	longData := make([]byte, 1001)
	for i := range longData {
		longData[i] = 'x'
	}

	_, err := svc.Create(ctx, CreateInput{Data: string(longData)})

	if err != ErrInvalidInput {
		t.Errorf("expected ErrInvalidInput, got %v", err)
	}
}

func TestService_Create_PersistsToRepository(t *testing.T) {
	svc, repo := testServiceWithRepo()
	ctx := context.Background()

	result, err := svc.Create(ctx, CreateInput{Data: "test"})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	stored, ok := repo.store[result.ID]
	if !ok {
		t.Error("item not found in repository")
	}
	if stored.Data != "test" {
		t.Errorf("expected stored Data to be 'test', got %q", stored.Data)
	}
}

// -----------------------------------------------------------------------------
// Get Tests
// -----------------------------------------------------------------------------

func TestService_Get_Found(t *testing.T) {
	svc, _ := testServiceWithRepo()
	ctx := context.Background()

	created, _ := svc.Create(ctx, CreateInput{Data: "test"})

	result, err := svc.Get(ctx, created.ID)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID != created.ID {
		t.Errorf("expected ID %q, got %q", created.ID, result.ID)
	}
}

func TestService_Get_NotFound(t *testing.T) {
	svc, _ := testServiceWithRepo()
	ctx := context.Background()

	_, err := svc.Get(ctx, "nonexistent-id")

	if err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestService_Get_NoRepository(t *testing.T) {
	svc := testService()
	ctx := context.Background()

	_, err := svc.Get(ctx, "any-id")

	if err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// -----------------------------------------------------------------------------
// Update Tests
// -----------------------------------------------------------------------------

func TestService_Update_Success(t *testing.T) {
	svc, _ := testServiceWithRepo()
	ctx := context.Background()

	created, _ := svc.Create(ctx, CreateInput{Data: "original"})
	newData := "updated"

	result, err := svc.Update(ctx, created.ID, UpdateInput{Data: &newData})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Data != "updated" {
		t.Errorf("expected Data to be 'updated', got %q", result.Data)
	}
	if result.UpdatedAt == nil {
		t.Error("expected UpdatedAt to be set")
	}
}

func TestService_Update_NotFound(t *testing.T) {
	svc, _ := testServiceWithRepo()
	ctx := context.Background()
	data := "new"

	_, err := svc.Update(ctx, "nonexistent", UpdateInput{Data: &data})

	if err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestService_Update_EmptyData(t *testing.T) {
	svc, _ := testServiceWithRepo()
	ctx := context.Background()

	created, _ := svc.Create(ctx, CreateInput{Data: "original"})
	empty := ""

	_, err := svc.Update(ctx, created.ID, UpdateInput{Data: &empty})

	if err != ErrInvalidInput {
		t.Errorf("expected ErrInvalidInput, got %v", err)
	}
}

// -----------------------------------------------------------------------------
// Delete Tests
// -----------------------------------------------------------------------------

func TestService_Delete_Success(t *testing.T) {
	svc, repo := testServiceWithRepo()
	ctx := context.Background()

	created, _ := svc.Create(ctx, CreateInput{Data: "test"})

	err := svc.Delete(ctx, created.ID)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := repo.store[created.ID]; ok {
		t.Error("item should be deleted from repository")
	}
}

func TestService_Delete_NotFound(t *testing.T) {
	svc, _ := testServiceWithRepo()
	ctx := context.Background()

	err := svc.Delete(ctx, "nonexistent")

	if err != ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// -----------------------------------------------------------------------------
// List Tests
// -----------------------------------------------------------------------------

func TestService_List_ReturnsAll(t *testing.T) {
	svc, _ := testServiceWithRepo()
	ctx := context.Background()

	svc.Create(ctx, CreateInput{Data: "item1"})
	svc.Create(ctx, CreateInput{Data: "item2"})

	result, err := svc.List(ctx, 10, 0)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items, got %d", len(result))
	}
}

func TestService_List_NoRepository(t *testing.T) {
	svc := testService()
	ctx := context.Background()

	result, err := svc.List(ctx, 10, 0)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}

// -----------------------------------------------------------------------------
// Benchmark Tests (optional)
// -----------------------------------------------------------------------------

func BenchmarkService_Create(b *testing.B) {
	svc := testService()
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.Create(ctx, CreateInput{Data: "benchmark data"})
	}
}
