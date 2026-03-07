// Package feature provides {brief description of what this feature does}.
//
// # Usage
//
//	cfg := feature.Config{FieldOne: "value"}
//	svc := feature.NewService(cfg)
//	item, err := svc.Create(ctx, feature.CreateInput{Data: "example"})
//
// # Architecture
//
// This package follows the standard Go module structure:
//   - Types at the top (Config, MainType, etc.)
//   - Service implementation
//   - Private helpers at the bottom
package feature

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// -----------------------------------------------------------------------------
// SECTION 1: CONFIGURATION
// -----------------------------------------------------------------------------

// Config holds the configuration for the feature service.
type Config struct {
	// FieldOne is {description}.
	FieldOne string

	// FieldTwo is {description}. Defaults to 3600.
	FieldTwo int
}

// DefaultConfig returns a Config with sensible defaults.
func DefaultConfig() Config {
	return Config{
		FieldOne: "",
		FieldTwo: 3600,
	}
}

// -----------------------------------------------------------------------------
// SECTION 2: DOMAIN TYPES
// -----------------------------------------------------------------------------

// MainType represents the primary domain entity for this feature.
type MainType struct {
	// ID is the unique identifier.
	ID string `json:"id"`

	// Data holds the main payload.
	Data string `json:"data"`

	// CreatedAt is when this was created.
	CreatedAt time.Time `json:"created_at"`

	// UpdatedAt is when this was last modified.
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}

// CreateInput is the input for creating a new item.
type CreateInput struct {
	Data     string
	Metadata map[string]any
}

// UpdateInput is the input for updating an existing item.
type UpdateInput struct {
	Data     *string
	Metadata map[string]any
}

// -----------------------------------------------------------------------------
// SECTION 3: ERRORS
// -----------------------------------------------------------------------------

var (
	// ErrNotFound is returned when an item is not found.
	ErrNotFound = errors.New("feature: not found")

	// ErrInvalidInput is returned when input validation fails.
	ErrInvalidInput = errors.New("feature: invalid input")
)

// -----------------------------------------------------------------------------
// SECTION 4: REPOSITORY INTERFACE
// -----------------------------------------------------------------------------

// Repository defines the data access interface.
// Implement this for different storage backends.
type Repository interface {
	FindByID(ctx context.Context, id string) (*MainType, error)
	FindAll(ctx context.Context, limit, offset int) ([]*MainType, error)
	Save(ctx context.Context, item *MainType) error
	Delete(ctx context.Context, id string) error
}

// -----------------------------------------------------------------------------
// SECTION 5: SERVICE
// -----------------------------------------------------------------------------

// Service handles feature business logic.
type Service struct {
	config Config
	repo   Repository
}

// NewService creates a new Service with the given configuration.
func NewService(cfg Config) *Service {
	return &Service{
		config: cfg,
	}
}

// NewServiceWithRepo creates a new Service with a repository.
func NewServiceWithRepo(cfg Config, repo Repository) *Service {
	return &Service{
		config: cfg,
		repo:   repo,
	}
}

// -----------------------------------------------------------------------------
// SECTION 6: CRUD OPERATIONS
// -----------------------------------------------------------------------------

// Create creates a new item.
//
// It validates the input and persists the item if a repository is configured.
// Returns ErrInvalidInput if validation fails.
func (s *Service) Create(ctx context.Context, input CreateInput) (*MainType, error) {
	// Validate input
	if err := s.validateCreateInput(input); err != nil {
		return nil, err
	}

	// Create item
	item := &MainType{
		ID:        uuid.New().String(),
		Data:      input.Data,
		CreatedAt: time.Now().UTC(),
	}

	// Persist if repository available
	if s.repo != nil {
		if err := s.repo.Save(ctx, item); err != nil {
			return nil, err
		}
	}

	return item, nil
}

// Get retrieves an item by ID.
//
// Returns ErrNotFound if the item doesn't exist.
func (s *Service) Get(ctx context.Context, id string) (*MainType, error) {
	if s.repo == nil {
		return nil, ErrNotFound
	}

	item, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrNotFound
	}

	return item, nil
}

// Update updates an existing item.
//
// Returns ErrNotFound if the item doesn't exist.
// Returns ErrInvalidInput if validation fails.
func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*MainType, error) {
	// Validate input
	if err := s.validateUpdateInput(input); err != nil {
		return nil, err
	}

	// Get existing item
	existing, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.Data != nil {
		existing.Data = *input.Data
	}
	now := time.Now().UTC()
	existing.UpdatedAt = &now

	// Persist
	if s.repo != nil {
		if err := s.repo.Save(ctx, existing); err != nil {
			return nil, err
		}
	}

	return existing, nil
}

// Delete removes an item by ID.
//
// Returns ErrNotFound if the item doesn't exist.
func (s *Service) Delete(ctx context.Context, id string) error {
	// Verify exists
	if _, err := s.Get(ctx, id); err != nil {
		return err
	}

	// Delete
	if s.repo != nil {
		return s.repo.Delete(ctx, id)
	}

	return nil
}

// List returns all items with pagination.
func (s *Service) List(ctx context.Context, limit, offset int) ([]*MainType, error) {
	if s.repo == nil {
		return []*MainType{}, nil
	}

	return s.repo.FindAll(ctx, limit, offset)
}

// -----------------------------------------------------------------------------
// SECTION 7: VALIDATION
// -----------------------------------------------------------------------------

func (s *Service) validateCreateInput(input CreateInput) error {
	if input.Data == "" {
		return ErrInvalidInput
	}
	if len(input.Data) > 1000 {
		return ErrInvalidInput
	}
	return nil
}

func (s *Service) validateUpdateInput(input UpdateInput) error {
	if input.Data != nil {
		if *input.Data == "" {
			return ErrInvalidInput
		}
		if len(*input.Data) > 1000 {
			return ErrInvalidInput
		}
	}
	return nil
}

// -----------------------------------------------------------------------------
// SECTION 8: PRIVATE HELPERS
// -----------------------------------------------------------------------------

// generateID creates a new unique identifier.
func generateID() string {
	return uuid.New().String()
}
