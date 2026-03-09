# Plugin Auto-Discovery Design

**Goal:** Replace manual plugin registration in runtime config with installation-based discovery so `npm install clipper-plugin-xxx` makes plugins available automatically, including unpublished local plugins installed via workspace, `file:`, or link workflows.

## Problem

The current runtime model merges built-in plugins with plugin objects declared directly in `clipper.config.*`. This makes extension possible, but it creates a poor plugin UX:

- users must both install and manually register plugins
- unpublished local plugins need custom config wiring
- the config file mixes behavior overrides with plugin discovery concerns
- plugin diagnostics are limited because there is no explicit discovery lifecycle

The design should make installation the source of truth while preserving a clear, inspectable loading pipeline.

## Recommended Approach

Use **manifest-based discovery over Node-resolvable dependencies**.

A package is considered a Clipper plugin when:

- its package name matches `clipper-plugin-*` or `@scope/clipper-plugin-*`, and/or
- its `package.json` declares `clipper.plugin = true`

Clipper discovers plugin candidates from packages installed into the current runtime environment, validates a Clipper-specific manifest, dynamically imports the plugin entry, then merges exported plugin contributions into the runtime registry.

This keeps the boundary tight and reproducible: if Node can resolve the package from the current project, Clipper can discover it. If a plugin exists somewhere else on disk but is not installed into the environment, it is intentionally ignored.

## Discovery Boundary

Discovery is limited to packages resolvable from the current project `cwd`.

Supported plugin sources:

- normal project dependencies from npm or a private registry
- workspace packages linked into `node_modules`
- local packages installed through `file:` specifiers
- packages linked through `npm link` or `pnpm link`
- optional global packages as a low-priority fallback

This boundary is what guarantees unpublished plugins can still be found. A plugin does not need to be published publicly; it only needs to be installed so that Node resolution works from the active project.

## Plugin Package Contract

Plugin packages should expose explicit metadata in `package.json`:

```json
{
  "name": "clipper-plugin-example",
  "exports": {
    ".": "./dist/index.js"
  },
  "clipper": {
    "plugin": true,
    "apiVersion": 1,
    "kind": ["collector", "publisher"],
    "entry": "./dist/index.js"
  }
}
```

Recommended fields:

- `clipper.plugin`: marks the package as a Clipper plugin
- `clipper.apiVersion`: compatibility guard between CLI and plugin contract
- `clipper.kind`: advisory list for diagnostics and inspection
- `clipper.entry`: optional explicit entry override when `exports` is not enough

Runtime export shape should use either a `default` export or named `plugin` export:

```ts
export default {
  name: 'example',
  collectors: [],
  transformers: [],
  publishers: []
}
```

## Runtime Architecture

Split plugin handling into three responsibilities:

1. `discoverPlugins({ cwd })`
   - reads the root `package.json`
   - enumerates dependency names from `dependencies`, `optionalDependencies`, and optionally `devDependencies`
   - resolves candidate packages with `require.resolve(..., { paths: [cwd] })`
   - reads package manifests and returns discovery records

2. `loadPlugins(discovered)`
   - validates manifest fields
   - resolves import entry from `clipper.entry`, `exports`, or `main`
   - dynamically imports the plugin module
   - validates the exported structure
   - returns loaded runtime contributions and diagnostics

3. `resolveRuntimeConfig({ cwd, configPath })`
   - loads built-in plugins
   - loads auto-discovered plugins
   - loads user config overrides
   - merges results into the final `RuntimeConfig`

This keeps `config` focused on behavior control rather than package registration.

## Config Role After Redesign

Config should no longer register plugin objects directly.

Instead, config should only control behavior, for example:

- disable a discovered plugin by package or logical name
- set plugin ordering or preference
- provide plugin-specific options
- tune fallback or resolution behavior

Illustrative shape:

```ts
export default defineConfig({
  plugins: {
    disable: ['clipper-plugin-legacy'],
    prefer: ['clipper-plugin-custom-publisher']
  }
})
```

This is a cleaner separation of concerns:

- package manager installs plugins
- discovery finds plugins
- config changes how discovered plugins are used

## Merge Rules

Final runtime config is assembled in this order:

1. built-in plugins
2. auto-discovered plugins
3. config-driven behavior overrides

Conflict handling rules:

- if two plugin packages produce the same logical plugin name, prefer project-local sources over global sources
- if the same package is visible from multiple sources, keep the closest project-local resolution
- if multiple collectors match the same URL, preserve the merged order and let config later influence precedence

This allows local development plugins to override globally installed ones without special-case logic in user config.

## Failure Handling

Discovery must not make the CLI fragile.

Each plugin moves through explicit states:

- `discovered`
- `loaded`
- `skipped`
- `failed`

Track diagnostics for every plugin:

- package name
- resolved path
- source type (`dependency`, `workspace`, `file`, `link`, `global`)
- failure stage (`resolve`, `manifest`, `import`, `validate`)
- human-readable message

Behavior rules:

- manifest validation failures skip the plugin with a diagnostic
- import or export validation failures skip the plugin with a diagnostic
- incompatible `apiVersion` skips the plugin with an upgrade hint
- one broken plugin must not stop unrelated plugins from loading
- a command should fail only when it explicitly depends on a missing or invalid plugin

## CLI UX

The `plugins` command becomes the primary diagnostic surface.

Recommended commands:

- `clipper plugins list`
  - shows loaded plugin names grouped by kind
- `clipper plugins list --verbose`
  - also shows skipped and failed plugins with source and reason
- `clipper plugins inspect <name>`
  - shows package metadata, entry path, kinds, and status
- `clipper plugins doctor`
  - validates manifests, API version compatibility, and entry exports

This makes local plugin development significantly easier, especially for unpublished packages.

## Type Additions

Current runtime types only represent already-loaded plugin instances. Add separate types for discovery and diagnostics, for example:

- `ClipperPluginManifest`
- `DiscoveredPlugin`
- `LoadedPluginModule`
- `PluginDiagnostic`
- `PluginDiscoveryResult`

These types should live alongside `RuntimeConfig` so CLI commands and config resolution can share the same diagnostic model.

## Why This Solves Unpublished Plugins

An unpublished plugin should be treated exactly like any other installed dependency.

Examples that should work without extra registration:

- `npm install ../clipper-plugin-local`
- workspace package dependency
- `npm link clipper-plugin-local`
- private registry package install

The guarantee is not “discover every possible plugin on disk.” The guarantee is “discover every installed plugin that this project can resolve.” That boundary is deterministic, testable, and friendly to both teams and CI.

## Non-Goals

This design does not add:

- arbitrary file-system scanning outside the project resolution boundary
- a remote plugin marketplace
- runtime plugin installation from inside Clipper
- plugin sandboxing or process isolation

These can be revisited later if needed, but they are not required to fix the current UX problem.

## Recommendation Summary

Adopt installation-based discovery with a Clipper manifest in `package.json`, dynamic import through Node resolution, and config limited to behavior control. This provides a clean plugin UX, supports unpublished local plugins naturally, and creates a solid base for diagnostics and future plugin versioning.