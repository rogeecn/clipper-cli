# CLI Help And Binary Name Design

**Goal:** Make the published CLI expose a usable built-in help experience and align the installed executable name with the package name by standardizing on `clipper-cli`.

**Scope:** Update the published binary metadata, the Commander root command name, user-facing docs, and focused regression tests. Do not introduce a custom help renderer or preserve the old `clipper` command alias.

## Context

The package is published as `clipper-cli`, but `packages/clipper-cli/package.json` currently exposes the executable as `clipper`, and the CLI root command also identifies itself as `clipper`. That mismatch makes installation feel inconsistent. At the same time, there is no explicit test proving `--help` is available through the shipped binary name, so users cannot reliably discover usage from the installed tool.

Commander already provides help generation automatically as long as the binary entry parses arguments and the root command is named correctly. The missing work is mostly standardization and regression coverage, not a new help subsystem.

## Options Considered

### 1. Standardize everything on `clipper-cli`

- Change npm `bin` from `clipper` to `clipper-cli`
- Change `program.name()` to `clipper-cli`
- Update docs and tests to use `clipper-cli`
- Pros: package name, install command, and executable all match; smallest design with the clearest user experience
- Cons: breaking change for anyone already invoking `clipper`

### 2. Keep `clipper`, only add help coverage

- Leave the binary name unchanged
- Add tests and docs for `clipper --help`
- Pros: lowest compatibility risk
- Cons: does not solve the naming inconsistency the user explicitly wants fixed

### 3. Publish both `clipper` and `clipper-cli`

- Add a second bin alias while keeping the old one
- Update docs to prefer `clipper-cli`
- Pros: smooth migration path
- Cons: preserves duplicate names and ongoing maintenance ambiguity

## Chosen Approach

Use option 1.

## Design

### Binary Metadata

Change the published `bin` entry to expose only `clipper-cli`. This makes global installs and local `.bin` shims generate the same executable name as the npm package.

### Help Experience

Keep using Commander’s built-in help output. No custom `--help` implementation is needed. Once the root command name is updated to `clipper-cli`, both `clipper-cli --help` and subcommand help such as `clipper-cli collect --help` should render correctly through the existing `parseAsync` flow.

### Documentation

Update the package README usage examples to consistently show `clipper-cli`. If the workspace root README also demonstrates the command, update that too so installation instructions and usage examples stay aligned.

### Testing

Add or adjust focused tests that prove:

- the packaged binary metadata exposes `clipper-cli`
- the built CLI reports help text with `clipper-cli` in the usage banner
- the direct binary invocation test uses the renamed executable identity where appropriate

Keep tests narrow so they verify the user-facing contract without pulling in unrelated package build behavior.

## Success Criteria

- installing `clipper-cli` produces a `clipper-cli` executable instead of `clipper`
- `clipper-cli --help` prints usage information
- docs and tests consistently refer to `clipper-cli`
- no custom help code is added when Commander already handles the behavior
