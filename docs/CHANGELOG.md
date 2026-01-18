# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-18

### Added

- **Tauri v2 Desktop Application**: Complete migration from web application to Tauri v2 desktop app
- **Cross-platform Support**: Windows and Linux builds with CI/CD pipeline
- **Rust Backend**: High-performance backend with native system integration
  - State management with bincode + zstd compression
  - Async HTTP client with streaming support
  - JavaScript sandbox for code execution (rquickjs)
  - Markdown rendering with syntax highlighting (syntect + pulldown-cmark)
- **React Frontend**: Modern React 19 with TypeScript
  - Tailwind CSS v4 styling
  - Excalidraw integration for whiteboard functionality
  - React Markdown with math (KaTeX) and GFM support
- **IPC Communication**: Tauri command system for frontend-backend communication
- **System Tray**: Native system tray icon support
- **Notification System**: Native desktop notifications via tauri-plugin-notification

### Technical Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4
- **Backend**: Rust (Edition 2021), Tauri 2.9
- **Testing**: Vitest for frontend, Rust tests for backend
- **CI/CD**: GitHub Actions with multi-platform builds

### Changed

- Migrated from Electron to Tauri for smaller bundle size and better performance
- Updated all dependencies to latest stable versions

### Removed

- Mascot component and related functionality (per code review feedback)
- AceConfig and related configuration options

## [Unreleased]

### Planned

- macOS build support
- Auto-update functionality
- Plugin system for extensions
