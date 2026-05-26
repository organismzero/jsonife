# Jsonife

A desktop application for browsing, editing, comparing, and copying leaves between JSON, JSONC, and JSONL files.

## Features

- **Open** JSON/JSONC/JSONL from local disk or a URL (import-only)
- **Edit** with a synchronized hybrid editor: JSON tree view + Monaco text editor
- **Compare** two open documents side-by-side with a virtualized diff table (filter by added/removed/changed, search by path)
- **Copy leaves** from a source node to a target node across documents, with key-field-based array matching and single-step undo
- XSIAM-inspired dark UI (orange accent, SecOps density, JetBrains Mono)
- Cross-platform: Windows, macOS, Linux

## Tech stack

| | |
|---|---|
| Runtime | Electron |
| Build | electron-vite, Vite 7, electron-builder |
| UI | React 19, shadcn/ui-style components, Tailwind CSS v4 |
| Editor | Monaco (`@monaco-editor/react`) |
| Diff | `json-diff-ts` |
| Parsing | `jsonc-parser` (JSON + JSONC + JSONL) |
| State | Zustand |

## Development

```bash
npm install
npm run dev        # Start Electron with HMR
```

## Building

```bash
npm run build:linux   # AppImage + deb
npm run build:win     # NSIS installer
npm run build:mac     # DMG
```

## Keyboard shortcuts (native menu)

| Action | Shortcut |
|--------|----------|
| Open file | Ctrl/Cmd+O |
| Open URL | Ctrl/Cmd+Shift+O |
| Save | Ctrl/Cmd+S |
| Save As | Ctrl/Cmd+Shift+S |

## Format support

| Format | Extension | Notes |
|--------|-----------|-------|
| JSON | `.json` | Strict |
| JSONC | `.jsonc` | Comments + trailing commas |
| JSONL | `.jsonl` | One JSON value per line; treated as array in data model |

## Compare — leaf copy

1. Open two documents in the **Editor** view
2. Switch to **Compare** view
3. Select **Left** and **Right** documents
4. Optionally set **Source root** and **Target root** (JSON Pointers, e.g. `/data/users`)
5. Set the **Array key** field used to match array elements (default: `id`, fallback: `email`)
6. Check the diff rows you want to copy
7. Click **L → R** or **R → L** to apply
8. Click **Undo** to revert the last apply batch

## Future roadmap

- **Charts**: bar, line, and pie charts from JSON data (sidebar item shows "Coming soon")
