# Stratus — Application Guide

Stratus is an open-source script processing tool built for video editors. It converts `.docx` scripts into structured, interactive checklists for managing A-Rolls, links, notes, and editing progress.

---

## Core Features

### Script Parsing
- **Instant Extraction**: Drop any `.docx` script into the window to extract A-Roll segments, durations, embedded links, notes, and images.
- **Python Sidecar**: Uses a compiled `python-docx` sidecar for fast document analysis without freezing the interface.
- **Link Normalization**: Cleans YouTube URLs (shorts, embeds, mobile links) and strips tracking or view parameters from Google Drive links.

### Interactive Workspace
- **Dual-Pane Layout**: Read the formatted script on the left while working through extracted A-Rolls on the right.
- **Real-Time Sync**: Click any timestamp or segment in the results panel to jump directly to its location in the script.
- **Paint-to-Check**: Click and drag down the checkbox column to toggle multiple items in one motion.

### Progress Persistence
- **Auto-Save**: Every checked item, link state, and custom note is automatically saved to a local SQLite database (`stratus.db`).
- **DataVault**: Includes a 30-day recycle bin for soft-deleted document progress.
- **Recent Scripts**: Quick access to your 5 most recently opened scripts.

### Interface & Customization
- **Themes**: Light, Dark, and System modes with dark variants (*Cloudy Blue*, *Midnight Black*, *Adobe Gray*, *Pink Passion*).
- **Aurora Background**: Configurable ambient backdrop with adjustable size and opacity.
- **Performance Mode**: Disables heavy blur and animation effects for lower-end hardware.
- **Widescreen Mode**: Distraction-free view toggled via a configurable hotkey (default: `Shift+F`).

### Editor Stats
- Tracks lifetime app uptime, total A-Rolls processed, and total video duration logged.

### Copyright Helper (Discontinued)
- An experimental built-in media player for visualizing copyright claim markers. This feature is **discontinued** and unoptimized: due to React and Tauri IPC bridge constraints, importing a video loads all file bytes directly into RAM instead of streaming from disk. Avoid loading large video files.

---

## Usage

### 1. Importing a Script
- **Dashboard**: Click the **Script Parser** card on the home screen and select a `.docx` file.
- **Drag & Drop**: Drag a `.docx` file (or video/audio file for Copyright Helper) anywhere into the Stratus window.

### 2. Working in the Workspace
- **Left Pane**: View the script. Highlighted sections correspond to parsed timestamps and notes. Right-click a block to attach custom editor notes.
- **Right Pane**: Browse extracted A-Rolls. Click any timecode pill to copy the normalized `HH:MM:SS:FF` timecode to your clipboard.
- **Checklists**: Click or drag across checkboxes to mark items complete.

### 3. Settings & DataVault
Use the **Sidebar** on the left edge to access:
- **Document Tabs / Notes / Links**: Filter and check off script notes and external reference links.
- **Settings**: Adjust themes, Aurora backdrop, Performance Mode, image extraction path, and Widescreen hotkey.
- **Stats & DataVault**: Review editing stats or restore/manage saved document progress.

### 4. Troubleshooting
- **File Not Found**: If a recent script was moved or deleted, Stratus notifies you and removes the stale entry from Recent Scripts.
- **Sidecar Missing**: If parsing fails in a fresh clone, make sure you have built the sidecar binary using `npm run build:sidecar` (see [README.md](./README.md)).
