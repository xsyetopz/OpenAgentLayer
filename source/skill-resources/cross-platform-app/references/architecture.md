# Cross-platform app architecture

Use a feature-first structure:

```text
lib/
  app/
    app.dart
    router.dart
    theme/
    l10n/
  features/
    <feature>/
      data/
      domain/
      presentation/
  shared/
    data/
    widgets/
    platform/
test/
  features/
```

Rules:

- Keep UI widgets in `presentation/`, business rules in `domain/`, and I/O adapters in `data/`.
- Expose feature behavior through narrow controllers and repositories.
- Keep platform-specific code behind `shared/platform/` interfaces.
- Model loading, empty, error, and success states explicitly.
- Treat generated files as outputs; update source models, route definitions, or localization inputs first.
- Use product copy that explains user outcomes, then add technical detail only where needed for debugging or setup.
