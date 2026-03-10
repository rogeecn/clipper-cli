# NPM-Compatible Weixin Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `clipper-plugin-weixin` installable and linkable from npm-based consumer projects without hitting `EUNSUPPORTEDPROTOCOL` from `workspace:*`.

**Architecture:** Keep the plugin package consumable by plain npm by removing npm-incompatible workspace dependency syntax from its published manifest. Preserve the host contract through `peerDependencies`, keep local development behavior minimal, and verify the real user workflows with subprocess-level npm install and npm link smoke checks.

**Tech Stack:** Node.js, npm, pnpm workspace, package.json metadata, Vitest

---

### Task 1: Add a failing npm-compatibility regression test

**Files:**
- Modify: `packages/clipper-plugin-weixin/tests/package-publish.test.ts`
- Test: `packages/clipper-plugin-weixin/tests/package-publish.test.ts`

**Step 1: Write the failing test**

Add a test that reads `packages/clipper-plugin-weixin/package.json` and asserts the package does not expose npm-incompatible workspace protocol specifiers in publishable dependency fields:

```ts
it('does not declare npm-incompatible workspace protocol dependencies', () => {
  expect(packageJson.devDependencies?.['clipper-cli']).not.toBe('workspace:*')
})
```

Prefer a slightly stronger assertion that checks all publish-relevant dependency sections for values beginning with `workspace:`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter clipper-plugin-weixin test tests/package-publish.test.ts`
Expected: FAIL because `devDependencies.clipper-cli` currently equals `workspace:*`.

**Step 3: Write minimal implementation**

Update `packages/clipper-plugin-weixin/package.json` so the plugin remains host-compatible but npm-consumable:

```json
"peerDependencies": {
  "clipper-cli": "^0.1.0"
},
"devDependencies": {
  "clipper-cli": "^0.1.0"
}
```

Do not add packaging transforms or extra scripts unless the test proves they are needed.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter clipper-plugin-weixin test tests/package-publish.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/clipper-plugin-weixin/package.json packages/clipper-plugin-weixin/tests/package-publish.test.ts
git commit -m "fix: make weixin plugin npm-compatible"
```

### Task 2: Verify real npm consumer workflows

**Files:**
- Test: `packages/clipper-plugin-weixin/package.json`

**Step 1: Build the plugin package**

Run: `pnpm --filter clipper-plugin-weixin build`
Expected: PASS and `packages/clipper-plugin-weixin/dist/index.js` exists

**Step 2: Verify npm file install succeeds**

Create a temp consumer project and run:

```bash
npm init -y
npm install /home/rogee/Projects/clipper-cli/packages/clipper-cli
npm install file:/home/rogee/Projects/clipper-cli/packages/clipper-plugin-weixin
```

Expected: PASS without `EUNSUPPORTEDPROTOCOL`

**Step 3: Verify npm link succeeds**

Run:

```bash
cd /home/rogee/Projects/clipper-cli/packages/clipper-plugin-weixin && npm link
cd <temp-consumer-project> && npm link clipper-plugin-weixin
```

Expected: PASS without `EUNSUPPORTEDPROTOCOL`

**Step 4: Verify clipper discovers the plugin**

Run inside the temp consumer project:

```bash
npx clipper plugins --verbose
```

Expected: output includes `weixin` in `collectors` and `transformers`, with plugin diagnostics showing discovered/loaded status.

**Step 5: Summarize any remaining usage caveats**

If any caveat remains, keep it narrow and user-facing, such as requiring the plugin to be built before linking because it exports `dist/index.js`.

### Task 3: Update usage docs to the direct npm workflow

**Files:**
- Modify: `README.md`
- Modify: `packages/clipper-plugin-weixin/README.md`

**Step 1: Update root usage guidance**

Describe the direct working flow clearly:

```md
pnpm --filter clipper-plugin-weixin build
npm install file:/path/to/clipper-plugin-weixin
clipper plugins --verbose
```

Also include the `npm link` alternative as an option, not the primary path.

**Step 2: Update plugin README**

Document both supported workflows:

```md
# simplest
npm install file:/path/to/clipper-plugin-weixin

# iterative local development
npm link
npm link clipper-plugin-weixin
```

Explicitly remind users to build first because the plugin exports `dist/index.js`.

**Step 3: Verify doc coverage**

Run: `rg "npm install file:|npm link clipper-plugin-weixin|build" README.md packages/clipper-plugin-weixin/README.md`
Expected: matches cover the direct-use steps

**Step 4: Commit**

```bash
git add README.md packages/clipper-plugin-weixin/README.md
git commit -m "docs: clarify npm plugin install workflow"
```

### Task 4: Run focused verification

**Files:**
- Test: `packages/clipper-plugin-weixin/tests/package-publish.test.ts`
- Test: `tests/cli/plugins-list.test.ts`
- Test: `tests/core/plugin-discovery.test.ts`
- Test: `tests/cli/cli-action.test.ts`

**Step 1: Run focused tests**

Run: `pnpm --filter clipper-plugin-weixin test tests/package-publish.test.ts && pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/cli-action.test.ts tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: PASS

**Step 2: Re-run real npm smoke check**

Use a fresh temp consumer project and re-run the successful `npm install file:...` or `npm link` path.
Expected: PASS

**Step 3: Report exact working commands to the user**

Provide the shortest command sequence that was actually verified successfully on this machine.

**Step 4: Commit**

```bash
git add .
git commit -m "fix: support npm installation for weixin plugin"
```