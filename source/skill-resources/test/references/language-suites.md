# Language test suites

Prefer the project's existing suite. Add dependencies when the repo has a native gap and the task requires one.

- Rust: Cargo/libtest, doctests, integration tests under `tests/`, proptest/quickcheck for properties, insta for approved snapshots, criterion for benchmarks, cargo-nextest where present. Rust module tests use `mod tests;` in `foo.rs` and bodies in `foo/tests.rs`.
- TypeScript/JavaScript: Vitest, Jest, Bun test, Playwright, Node test runner. Match existing runner and module system.
- Python: pytest, unittest where present, hypothesis for properties.
- Go: `go test`, table tests, fuzz tests, Ginkgo/Gomega where present, integration tags.
- JVM: JUnit 5, TestNG, Kotest, Spek, ScalaTest, and specs2 according to project baseline.
- .NET: xUnit.net, NUnit, MSTest, FsCheck, and Expecto; separate test projects where present.
- C/C++: GoogleTest and Catch2 according to project baseline.
- Swift: Swift Testing or XCTest according to project baseline.
- Dart/Flutter: package:test, flutter_test, and integration_test according to package type.
- Ruby: RSpec or Minitest according to project baseline.
- PHP: PHPUnit or Pest according to project baseline.
- Elixir/Erlang: ExUnit, EUnit, Common Test, doctests, StreamData for properties, Mox for behaviours, Wallaby/Hound where present, and async when tests have isolated mutable state.
- Clojure/ClojureScript: clojure.test and cljs.test according to project baseline.
- Haskell: Hspec, QuickCheck, and Tasty according to project baseline.
- R: testthat according to project baseline.
- Lua: busted according to project baseline.
- Shell: Bats according to project baseline.
- Perl: Test::More according to project baseline.

Generated artifact tests:

- Use golden tests for stable generated artifacts when the diff is human-reviewable.
- Use snapshot tests when the snapshot is small, intentional, and reviewed.
- Use mutation testing when branch coverage needs safety-critical reinforcement.
- Use benchmarks when performance is part of the contract.
