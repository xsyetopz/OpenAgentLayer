# Cross-platform app stack

Choose exactly one stack from the product type:

- **Cross-platform app:** Flutter stable with Dart, Material 3, and platform-adaptive components.
- **Cross-platform desktop app:** C# with Avalonia UI.
- **Cross-platform game:** C# with MonoGame.

For Flutter app work:

- **App runtime:** Flutter stable with Dart, Material 3, and platform-adaptive components.
- **State:** Riverpod with explicit providers, immutable state objects, and small feature controllers.
- **Navigation:** GoRouter with typed route names, guarded redirects, and deep-link-ready paths.
- **Persistence:** Drift for local SQLite data; use migrations from the first persisted schema.
- **Networking:** Dio with typed clients, request/response models, retries only where product semantics allow them, and Problem Details shaped errors when the API supports them.
- **Design system:** Theme extensions, design tokens, responsive breakpoints, accessible contrast, and localized strings from the start.
- **Validation:** Flutter analyze, targeted widget tests, unit tests for controllers/models, and one golden or screenshot check for visually important states when the repo supports it.

For Avalonia desktop work:

- **App runtime:** .NET with C#, Avalonia UI, and MVVM.
- **State:** Explicit view models, commands, and immutable domain objects where practical.
- **Persistence:** SQLite through a typed repository layer when local storage is needed.
- **Validation:** `dotnet build`, targeted unit tests, and UI smoke checks when the repo supports them.

For MonoGame work:

- **Game runtime:** .NET with C#, MonoGame, fixed timestep update loops, and explicit content pipeline ownership.
- **Architecture:** Game states/screens, asset loading boundaries, deterministic simulation code, and renderer/input adapters.
- **Validation:** `dotnet build`, simulation/unit tests for gameplay rules, and a headless smoke path when available.

Default Flutter platforms are iOS, Android, macOS, Windows, Linux, and Web. Default Avalonia and MonoGame platforms are Windows, macOS, and Linux. Remove a platform only when the user asks for a narrower product target or the repository already constrains supported platforms.
