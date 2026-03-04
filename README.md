# Hyacinth Medication Dispensing & Inventory System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.x-blue.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

Hyacinth is a HIPAA-compliant desktop application for **medication dispensing, inventory tracking, and clinical workflows** in healthcare settings. Built with Electron and React, it provides secure, offline-capable medication management with comprehensive audit trails.

**Key Features:**
- Quick Dispense mode with CDC guideline-based templates
- Real-time inventory tracking with lot/expiry management
- Comprehensive audit logging with tamper-evident checksums
- Field-level AES-256 encryption for all PHI
- Automatic backup and disaster recovery
- STI medication dispensing with instruction templates

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Configuration](#configuration)
- [Security](#security)
- [Documentation](#documentation)
- [Support](#support)

---

## System Requirements

### Minimum Requirements

| Component | Specification |
|-----------|--------------|
| Operating System | Windows 10/11 (64-bit), macOS 10.15+, or Linux Ubuntu 20.04+ |
| Processor | Intel Core i3 or equivalent (2 cores) |
| Memory | 4 GB RAM |
| Storage | 500 MB for application + 1 GB per 10,000 patient records |
| Display | 1280x720 resolution |
| Network | Not required for operation (offline-capable) |

### Recommended Requirements

| Component | Specification |
|-----------|--------------|
| Processor | Intel Core i5 or equivalent (4+ cores) |
| Memory | 8 GB RAM |
| Storage | SSD with 5 GB free space |
| Display | 1920x1080 resolution |
| Printer | Label printer for medication labels (optional) |

---

## Installation

### Windows (End User Installation)

1. **Download the installer** from the [Releases](https://github.com/Qcsinc23/hyacinth-sample/releases) page
2. **Run the installer** (`Hyacinth Setup 2.1.0.exe`)
3. **Launch the application** from the Start Menu or Desktop shortcut
4. **First-time setup:**
   - The system will create a default admin account
   - Default admin PIN: `1234` (change immediately after first login)
   - Database encryption will initialize automatically

### macOS

1. **Download** `Hyacinth-2.1.0.dmg` from Releases
2. **Open the DMG** and drag Hyacinth to Applications
3. **Launch** from Applications folder
4. **Security Note:** You may need to right-click and select "Open" the first time (Gatekeeper)

### Linux

```bash
# Download and extract
cd ~/Applications
wget https://github.com/Qcsinc23/hyacinth-sample/releases/download/v2.1.0/Hyacinth-2.1.0-linux-x64.tar.gz
tar -xzf Hyacinth-2.1.0-linux-x64.tar.gz

# Run
./Hyacinth-2.1.0-linux-x64/hyacinth
```

---

## Development

### Prerequisites

- Node.js `>= 18.x` (LTS recommended)
- npm `>= 9.x` or yarn `>= 1.22.x`
- Git

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Qcsinc23/hyacinth-sample.git
cd hyacinth-sample

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild
```

### Running in Development

```bash
# Start the application in development mode
npm start

# Run with hot reload
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run type checking
npm run typecheck

# Run linting
npm run lint
npm run lint:fix
```

---

## Building for Production

### Windows

```bash
# Build and package for Windows
npm run package:win

# Output:
# - release/build/Hyacinth Setup 2.1.0.exe (Installer)
# - release/build/Hyacinth-2.1.0-win.zip (Portable)
```

### macOS

```bash
# Build and package for macOS
npm run package:mac

# Output:
# - release/build/Hyacinth-2.1.0.dmg
```

### Linux

```bash
# Build and package for Linux
npm run package:linux

# Output:
# - release/build/Hyacinth-2.1.0-linux-x64.tar.gz
```

### All Platforms

```bash
# Build for current platform
npm run package
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HYACINTH_MASTER_PASSWORD` | Database encryption master password | `hyacinth-desktop-default` |
| `HYACINTH_BOOTSTRAP_ADMIN_PIN` | Initial admin PIN (change after first login) | `1234` |
| `HYACINTH_E2E_TEST` | Skip single-instance lock for E2E tests | `undefined` |
| `NODE_ENV` | Environment mode | `production` in packaged app |

### Application Settings

Settings are stored in the database and can be configured via **Settings** > **Profile**:

- **Session timeout**: 1-60 minutes (default: 5)
- **Backup enabled**: true/false (default: true)
- **Backup interval**: 1-168 hours (default: 24)
- **Backup retention**: 7-365 days (default: 30)
- **Low stock threshold**: Configurable per medication
- **Expiration warning days**: 7-90 days (default: 30)

### Database Location

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\Hyacinth\hyacinth.db` |
| macOS | `~/Library/Application Support/Hyacinth/hyacinth.db` |
| Linux | `~/.config/Hyacinth/hyacinth.db` |

---

## Security

### HIPAA Compliance

Hyacinth is designed with HIPAA compliance as a core requirement:

- **Encryption**: AES-256-GCM for all PHI at rest
- **Access Control**: Role-based with unique user identification
- **Audit Controls**: Comprehensive logging with tamper-evident checksums
- **Integrity**: SHA-256 checksums verify data integrity
- **Automatic Logoff**: Configurable session timeout with warning

See detailed documentation:
- [HIPAA Compliance Policy](docs/HIPAA_COMPLIANCE.md)
- [Security Procedures](docs/SECURITY_PROCEDURES.md)
- [Privacy Notice](docs/PRIVACY_NOTICE.md)

### Authentication

- **PIN-based authentication** (4-6 digits)
- **Account lockout** after 5 failed attempts (30-minute lockout)
- **bcrypt hashing** for secure PIN storage
- **Session management** with automatic timeout

### Data Protection

- Field-level encryption for patient names, DOB, contact info, clinical notes
- Encrypted database backups
- Tamper-evident audit logs with 6-year retention
- No data transmission to external servers (offline-capable)

---

## Documentation

### For Users

- [HIPAA Privacy Notice](docs/PRIVACY_NOTICE.md) - Patient rights and data usage

### For Administrators

- [HIPAA Compliance Policy](docs/HIPAA_COMPLIANCE.md) - Comprehensive compliance guide
- [Security Procedures](docs/SECURITY_PROCEDURES.md) - Operational security requirements
- [Production Readiness Checklist](docs/PRODUCTION_READINESS_CHECKLIST.md) - Pre-deployment validation

### For Developers

- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Feature overview
- [Quick Dispense Implementation](QUICK_DISPENSE_IMPLEMENTATION.md) - Template system details
- [Changelog](CHANGELOG.md) - Version history

---

## Project Structure

```
hyacinth-sample/
├── src/
│   ├── main/              # Electron main process
│   │   ├── backup/        # Backup/restore functionality
│   │   ├── database/      # Database layer, migrations, queries
│   │   ├── print/         # Label and receipt printing
│   │   ├── security/      # Encryption, PIN hashing
│   │   ├── services/      # IPC services (audit, access logging)
│   │   └── settings/      # Application settings
│   ├── renderer/          # React UI
│   │   ├── components/    # UI components
│   │   ├── contexts/      # React contexts (Auth, Alert)
│   │   ├── data/          # Static data, templates
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   └── shared/            # Shared types, IPC channels
├── docs/                  # Regulatory documentation
├── e2e/                   # Playwright end-to-end tests
├── assets/                # Icons, images
└── .erb/                  # Electron React Boilerplate configs
```

---

## Support

### Reporting Issues

- **Bug Reports**: [GitHub Issues](https://github.com/Qcsinc23/hyacinth-sample/issues)
- **Security Issues**: See [Security Procedures](docs/SECURITY_PROCEDURES.md) Section 4

### Resources

- **Documentation**: See `docs/` directory
- **Changelog**: See [CHANGELOG.md](CHANGELOG.md)
- **License**: [MIT License](LICENSE)

---

## Engineering Principles

- **Simplicity first**: Clear, linear control flow over heavy abstraction
- **Data integrity**: Persistence rules in the data layer, not UI components
- **Debuggability**: Structured logging with explicit success/error results
- **Security by default**: Encryption, audit logging, and access controls built-in
- **Testability**: Playwright E2E flows cover main clinical paths

---

## License

This repository is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

**Disclaimer**: This software is provided as-is for educational and development purposes. Production deployment in a healthcare setting requires appropriate validation, security review, and compliance verification for your specific jurisdiction and use case.
