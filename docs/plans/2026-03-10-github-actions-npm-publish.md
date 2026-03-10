# GitHub Actions Auto-Publish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub Actions workflow that automatically bumps the patch version and publishes both `clipper-cli` and `clipper-plugin-weixin` to npm whenever commits are pushed to the `main` branch.

**Architecture:** A single workflow file (`.github/workflows/publish.yml`) triggers on `push` to `main`. It skips runs triggered by its own version-bump commits (via `[skip ci]`). It installs dependencies, builds all packages, then for each package runs `npm version patch` and `npm publish`. Finally it commits the updated `package.json` files back to `main`.

**Tech Stack:** GitHub Actions, pnpm, Node.js ≥18, npm registry, `NPM_TOKEN` secret.

---

### Task 1: Create `.github/workflows` directory and workflow file

**Files:**
- Create: `.github/workflows/publish.yml`

**Step 1: Create the directory**

```bash
mkdir -p .github/workflows
```

**Step 2: Write the workflow file**

```yaml
name: Publish to npm

on:
  push:
    branches:
      - main

jobs:
  publish:
    # Skip if the commit was made by this workflow (version bump commit)
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          # Fetch full history so we can push back
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.6.5

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm build

      - name: Configure git for version bump commit
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Bump version and publish clipper-cli
        working-directory: packages/clipper-cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          npm version patch --no-git-tag-version
          npm publish --access public

      - name: Bump version and publish clipper-plugin-weixin
        working-directory: packages/clipper-plugin-weixin
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          npm version patch --no-git-tag-version
          npm publish --access public

      - name: Commit version bumps back to main
        run: |
          git add packages/clipper-cli/package.json packages/clipper-plugin-weixin/package.json
          git commit -m "chore: bump package versions [skip ci]"
          git push
```

**Step 3: Verify the file was created correctly**

Inspect `.github/workflows/publish.yml` and confirm:
- `if: "!contains(github.event.head_commit.message, '[skip ci]')"` is present
- Both package directories are listed in separate steps
- `permissions: contents: write` is set
- `--no-git-tag-version` flag is used (so npm doesn't create a git tag, we handle the commit ourselves)

**Step 4: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: add GitHub Actions workflow for automatic npm publish on main push"
```

---

### Task 2: Add `NPM_TOKEN` secret to GitHub repository

This is a manual step that must be done in the GitHub UI.

**Step 1: Generate an npm access token**

1. Go to https://www.npmjs.com → Account Settings → Access Tokens
2. Click **Generate New Token** → **Classic Token**
3. Select type **Automation** (bypasses 2FA for CI)
4. Copy the token value

**Step 2: Add the secret to GitHub**

1. Go to the GitHub repository → Settings → Secrets and variables → Actions
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: paste the token copied above
5. Click **Add secret**

**Step 3: Verify**

The secret `NPM_TOKEN` should now appear in the repository secrets list. The workflow references it as `${{ secrets.NPM_TOKEN }}`.

---

### Task 3: Verify workflow runs correctly on next push

**Step 1: Push a test commit to main**

```bash
git push origin main
```

**Step 2: Monitor the workflow run**

Go to GitHub → Actions tab → "Publish to npm" workflow. Confirm:
- All steps succeed (green checkmarks)
- The "Bump version and publish" steps show the new version in their output
- A new "chore: bump package versions [skip ci]" commit appears in main

**Step 3: Verify packages on npm**

Check that new versions are published:
- https://www.npmjs.com/package/clipper-cli
- https://www.npmjs.com/package/clipper-plugin-weixin

**Step 4: Verify no second workflow run triggered**

The `[skip ci]` commit should NOT trigger another workflow run. Confirm in the Actions tab that only one run was created for your original push.

---

## Notes

- **Skipping a publish:** Add `[skip ci]` anywhere in your commit message to skip publishing.
- **`--no-git-tag-version`:** Prevents npm from creating individual git tags per package. The single "chore: bump" commit keeps history clean.
- **`--access public`:** Required for scoped packages on npm free tier; harmless for unscoped packages.
- **Peer dependency drift:** `clipper-plugin-weixin` declares `peerDependencies: { "clipper-cli": "^0.1.0" }`. Because both packages auto-bump independently, this range will eventually mismatch. Update the peer dep range manually when making breaking changes.
