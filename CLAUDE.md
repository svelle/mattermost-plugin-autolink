# CLAUDE.md

## Project Overview

Mattermost Autolink Plugin — automatically converts text matching regex patterns into Markdown links. Go backend + TypeScript/React frontend.

## Build Commands

```bash
make all              # Full build: lint, test, bundle
make dist             # Create distributable plugin tarball
make server           # Build server binary only
make webapp           # Build webapp assets only
make check-style      # Run all linters (Go + TypeScript)
make test             # Run all tests
make coverage         # Generate Go coverage report
```

## Testing

```bash
make test             # Run Go tests (webapp tests not yet configured)
```

Go tests use `gotestsum`. Test files are colocated with source in `server/autolinkplugin/` and `server/autolink/`.

## Linting

```bash
make check-style      # Both Go and TypeScript
```

- **Go**: `golangci-lint` — see `.golangci.yml` for enabled linters
- **TypeScript**: ESLint + `tsc --noEmit` — configured in `webapp/`

## Project Structure

- `server/` — Go backend
  - `server/main.go` — plugin entry point
  - `server/autolinkplugin/` — plugin hooks, config, slash commands, submissions
  - `server/autolink/` — regex pattern matching and replacement engine
  - `server/api/` — REST API (Gorilla Mux)
  - `server/autolinkclient/` — Go API client
- `webapp/` — TypeScript/React frontend (RHS panel with link management UI)
- `build/` — build tooling (manifest generation, pluginctl)
- `plugin.json` — plugin manifest

## Key Conventions

- Go module path: `github.com/mattermost-community/mattermost-plugin-autolink`
- Go 1.22+
- Plugin ID: `mattermost-autolink`
- Min Mattermost server version: 5.16.0
- Multiplatform builds: linux/darwin/windows (amd64 + arm64)

## Dependencies

- **Go**: Mattermost plugin API (`github.com/mattermost/mattermost/server/public`), Gorilla Mux, testify
- **Frontend**: React 17, Redux, TypeScript 4.9, Webpack 5
