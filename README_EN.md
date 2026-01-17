<div align="center">
  <img width="1200" height="475" alt="Pixel-Client Banner" src="assets/banner.png" />
</div>

# Pixel-Client

> AI Chat Application Client based on Tauri v2 + React

[English](README_EN.md) | [简体中文](README.md)

## Introduction

Pixel-Client is a powerful AI chat desktop application built with Tauri v2 and React, supporting multi-model conversations, whiteboard drawing, Markdown rendering, and more.

## Features

| Feature | Description |
|---------|-------------|
| AI Chat | Multi-model streaming chat, integrated with multiple LLM providers |
| Excalidraw Whiteboard | Built-in drawing tool with scene save and export |
| Markdown Rendering | Syntax highlighting, custom tag support |
| State Persistence | Auto-save chat history and scene data |
| MCP Protocol | Model Context Protocol server management |
| AI Skills System | Executable JavaScript skill scripts |
| Deep Thinking | Deep thinking mode with layered reasoning |
| Multi-Theme | 10 themes to choose from |
| Multi-Language | Support for Chinese, English, Japanese |
| State Backup | Auto backup and import/export |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide Icons
- **Backend**: Tauri v2 + Rust
- **Package Manager**: Bun 1.2.23
- **Testing**: Vitest 4.0.17

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Node.js](https://nodejs.org) >= 18
- [Rust](https://rustup.rs) >= 1.70 (for Tauri build)

### Install Dependencies

```bash
bun install
```

### Environment Configuration

1. Copy environment template:

```bash
cp .env.example .env.local
```

2. Configure API keys in `.env.local`:

```env
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run Development Version

```bash
bun run dev
```

### Build for Production

```bash
# Build frontend
bun run build

# Build Tauri application (current platform)
bun run tauri build
```

### Cross-Platform Build

#### Windows (build on Windows)

```bash
bun run tauri build
```

#### Linux (build with Docker)

```bash
# Pull Tauri builder image
docker pull ghcr.io/tauri-apps/tauri-builder:2

# Run Linux build
docker run --rm \
  -v "$PWD":/app \
  -v "$PWD/src-tauri/target":/app/src-tauri/target \
  -e TAURI_PRIVATE_KEY_PASSWORD \
  -e TAURI_PRIVATE_KEY \
  ghcr.io/tauri-apps/tauri-builder:2 \
  bun install && bun run build && bun run tauri build
```

**Note**: You need to set `TAURI_PRIVATE_KEY` (private key) and `TAURI_PRIVATE_KEY_PASSWORD` (key password) environment variables to sign the application.

#### macOS (requires Xcode and Rust)

```bash
# Install Rust targets
rustup target add aarch64-apple-darwin x86_64-apple-darwin

# Build Apple Silicon version
bun run tauri build --target aarch64-apple-darwin

# Build Intel version
bun run tauri build --target x86_64-apple-darwin
```

**Note**: macOS build must be performed on macOS system or use macOS CI service.

## Project Structure

```
pixel-client-tauri/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── Chat/           # Chat components
│   │   └── ModelManager/   # Model management components
│   ├── hooks/              # Custom hooks
│   ├── services/           # API services
│   ├── types/              # TypeScript types
│   └── __tests__/          # Test files
├── src-tauri/              # Tauri backend
│   ├── src/
│   │   ├── commands/       # Tauri commands
│   │   ├── services/       # Backend services
│   │   └── state.rs        # State management
│   └── Cargo.toml          # Rust dependencies
├── docs/                   # Documentation
│   ├── API.md              # API documentation
│   └── ARCHITECTURE.md     # Architecture documentation
├── planning/               # Planning files
└── README.md               # This file
```

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build frontend |
| `bun run tauri dev` | Start Tauri development window |
| `bun run tauri build` | Build Tauri installer |
| `bun test` | Run tests |
| `bun run lint` | Code linting |
| `bun run format` | Code formatting |

## API Documentation

For detailed command API documentation, see [docs/API.md](docs/API.md).

## Architecture Documentation

For system architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Testing

```bash
# Run all tests
bun test

# Run with watch
bun test --watch
```

## Comparison with Original Pixel-Client

| Metric | Original (Web) | Tauri Version |
|--------|---------------|---------------|
| API Endpoints | 32 | 66 (+106%) |
| New Features | - | 10 |
| Port Completion | - | 100% |
| Security Model | API key network transmission | Local storage, no network transmission |
| Offline Capability | Depends on remote server | Fully offline |

## License

This project is open source under the MIT License.

## Contributing

Issues and Pull Requests are welcome!

---

<div align="center">
  Made with Tauri + React
</div>
