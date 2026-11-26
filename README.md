# Stratus

> **Note:** Stratus is the open-source release of a previously private desktop tool originally built for video editing workflows. It starts from a clean initial commit after stripping out private endpoints, test scripts, and internal branding. This codebase is legacy/unmaintained and released as-is under the MIT License.

An open-source desktop script processing tool for video editors. Built with Tauri, React, TypeScript, and a Python `.docx` parsing sidecar, Stratus extracts A-Roll timestamps, normalizes embedded links, and tracks editing progress in a local SQLite database.

## Features

- **Smart `.docx` Parsing**: Extracts A-Roll timestamps, durations, notes, embedded links, and images from writer scripts.
- **Synchronized Dual-Pane Workspace**: View the formatted script alongside an interactive checklist that scrolls in sync.
- **Paint-to-Check**: Click and drag across checkboxes to batch-toggle progress quickly.
- **Local SQLite Persistence**: Saves checklists, custom notes, and stats locally in `stratus.db` with a 30-day recycle bin.
- **Copyright Helper (Discontinued)**: Legacy experimental media player with timeline marker lanes. Discontinued and unoptimized — due to React/Tauri bridge constraints, importing a video loads the entire file into RAM instead of streaming directly from disk.
- **Customizable UI**: Light/Dark/System themes, multiple dark variants, Widescreen mode, and Performance mode.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Zustand
- **Desktop Runtime**: Tauri v2 (Rust)
- **Parser Sidecar**: Python (`python-docx`, packaged via PyInstaller)
- **Storage**: SQLite (`@tauri-apps/plugin-sql`)

## Getting Started (Build from Source)

### Prerequisites

- **Node.js** (v18+)
- **Rust** toolchain (`rustup` / `cargo`)
- **Python** (3.10+)

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Build the Python Parser Sidecar

Stratus uses a compiled Python sidecar (`src-tauri/bin/parser-x86_64-pc-windows-msvc.exe` on Windows) to parse `.docx` files. The prebuilt binary is not committed to source control, so you must build it once locally before running the app:

```bash
# Create a virtual environment inside src-tauri/sidecars
python -m venv src-tauri/sidecars/venv

# Install sidecar dependencies
src-tauri/sidecars/venv/Scripts/pip install python-docx pyinstaller

# Compile and copy the sidecar binary into src-tauri/bin/
npm run build:sidecar
```

### 3. Run in Development Mode

```bash
npm run dev
```

This launches the Vite dev server and opens the Tauri desktop window.

### 4. Build for Production

```bash
npm run tauri build
```

## Documentation

- [Application Guide](./APP_GUIDE.md)
- [Editor Playbook](./docs/STRATUS_EDITOR_PLAYBOOK.md)

## License & Contact

Licensed under the [MIT License](./LICENSE) — open-source software by [canefly](https://github.com/canefly). For bug reports, questions, or contributions, use [GitHub Issues](https://github.com/canefly/stratus/issues).
