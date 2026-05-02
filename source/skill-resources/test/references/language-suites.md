# Language test suites and layout patterns

Prefer the project's existing suite. Add dependencies only when the repo has no native test path and the task requires one.

- TypeScript/JavaScript: Bun test, Vitest, Jest, Node test runner, Testing Library, Playwright, Cypress, WebdriverIO, Pact, fast-check. Use `foo.test.ts`, `foo.spec.ts`, or `__tests__/foo.test.ts`; keep browser/e2e tests in the repo's e2e convention.
- Rust: Cargo/libtest, doctests, integration tests under `tests/`, proptest/quickcheck for properties, insta for approved snapshots, criterion for benchmarks, cargo-nextest where present. Never inline `mod tests { ... }` in production modules. Use `mod tests;` in `foo.rs` and put bodies in `foo/tests.rs`.
- Python: pytest, unittest, hypothesis, tox/nox, pytest-asyncio, pytest-django, Robot Framework where present. Prefer `tests/test_foo.py` or package-local tests matching the repo. Use fixtures over hidden shared state.
- Go: standard `testing` package through `go test` with `*_test.go`, benchmarks with `BenchmarkXxx`, fuzz tests with `FuzzXxx`, examples with `ExampleXxx`, testify, gomock, Ginkgo/Gomega, and `testdata/` for fixtures.
- Java: JUnit 5, TestNG, AssertJ, Hamcrest, Mockito, WireMock, REST Assured, Testcontainers, Maven Surefire/Failsafe, Gradle test filters, and parameterized tests for matrices.
- Kotlin: Kotest, JUnit 5, MockK, Spek, Turbine for Flow, Robolectric/Espresso for Android where present, Gradle test filters, and coroutine test utilities.
- Scala: ScalaTest, specs2, MUnit, ScalaCheck, Weaver, Mockito Scala, Testcontainers Scala, and sbt test filters.
- C#/.NET: xUnit.net, NUnit, MSTest, FluentAssertions, Moq, NSubstitute, FsCheck, Verify, BenchmarkDotNet, Playwright .NET, and `dotnet test` with separate test projects when the solution already does that.
- F#: Expecto, xUnit.net, NUnit, FsCheck, Unquote, Verify, and separate test projects when the solution already does that.
- C/C++: GoogleTest, Catch2, doctest, CTest, CMocka, Unity/Ceedling for embedded C, sanitizers, fuzzers, and golden fixtures where present.
- Swift: Swift Testing, XCTest, SnapshotTesting, Quick/Nimble where present, `swift test`, and Xcode test plans for app targets.
- Dart/Flutter: `package:test`, `flutter_test`, integration_test, Mockito, mocktail, golden_toolkit, patrol where present, and `dart test` or `flutter test`.
- PHP: PHPUnit, Pest, Behat, Codeception, Infection for mutation testing, data providers, and explicit exception/output assertions.
- Ruby: RSpec, Minitest, Capybara, FactoryBot, VCR/WebMock, mutant where present, and framework-native Rails tests when present.
- Elixir: ExUnit, doctests, StreamData for properties, Mox for behaviours, Wallaby/Hound where present, and async only when tests do not share mutable resources.
- Erlang: EUnit, Common Test, PropEr, Triq, and rebar3 test tasks following the project.
- Clojure: clojure.test, Kaocha, Midje where present, test.check, eftest, and namespace-local fixtures.
- Haskell: Hspec, tasty, QuickCheck, Hedgehog, doctest, golden tests, and Cabal/Stack test suites.
- R: testthat, tinytest, covr, snapshot tests where reviewable, and package-local `tests/testthat/` layout.
- Lua: busted, luaunit, plenary.nvim for Neovim plugins, luassert, and project-local fixture directories.
- Shell: Bats, shunit2, ShellSpec, shellcheck for static checks, golden stdout/stderr fixtures, and isolated temp directories.
- Perl: Test::More, Test2, Test::Exception, prove, and distribution-local `t/` layout.
- ClojureScript: cljs.test, shadow-cljs test, doo, Kaocha cljs, and browser/Node targets matching the project.
- Objective-C: XCTest, OCMock, Nimble where present, and Xcode test plans.

Cross-language patterns:

- Use Given/When/Then for behavior specs and Arrange/Act/Assert for code-centric tests.
- Use property tests for invariants and parser/serializer round-trips.
- Use contract tests for APIs, SDKs, provider renderers, plugins, and external boundaries.
- Use golden tests for stable generated artifacts only when the diff is human-reviewable.
- Use snapshot tests only when the snapshot is small, intentional, and reviewed.
- Use mutation testing only when branch coverage is not enough for safety-critical logic.
- Use benchmarks only when performance is part of the contract.

Failure output must identify command, exit code, failing test, minimal reproduction, and whether the failure is product behavior, test setup, dependency, or environment.
