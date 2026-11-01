---
title: "Contributing"
---
Thank you for your interest in contributing to Auriya! Contributions of all kinds are welcome — from fixing bugs and optimizing code to improving documentation or adding game profile presets.

## How to Contribute

1. **Fork & Branch**: Fork the [Auriya repository](https://github.com/pavelc4/auriya) and create your feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. **Make Changes**: Implement your changes cleanly and write tests if applicable.
3. **Validate**: Make sure tests and linter checks pass locally.
4. **Submit a PR**: Open a Pull Request on GitHub with a clear description of your changes.

## Validate Before Submitting

Run the checks corresponding to what you modified:

```bash
# Rust Daemon & CLI
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test

# Android Manager App
cd android && ./gradlew test
```

## Reporting Issues & Bugs

If you find a bug, regression, or hardware incompatibility, please open an issue following the [Issue Reporting Guide](/development/debugging/#issue-reporting-guide). Using the structured template and running the one-liner diagnostic command ensures your report has all necessary kernel, device, root manager, and daemon log details.

## Coding Conventions

- **Rust**: Default `rustfmt` formatting (4-space indentation), `snake_case` for functions/modules, `CamelCase` for types, `SCREAMING_SNAKE_CASE` for constants.
- **Kotlin**: 4-space indentation, `PascalCase` for composables/classes, `camelCase` for functions/members.
- **Commits**: Clear and concise commit messages, optionally following Conventional Commits (e.g. `feat(daemon): ...`, `fix(app): ...`, `docs: ...`).

## Security & Privacy

Treat root permissions, sysfs nodes, and shell operations as trust boundaries. Never commit private credentials, personal signing keys, or device-specific sensitive paths.
