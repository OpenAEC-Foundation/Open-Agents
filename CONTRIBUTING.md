# Contributing to Open-Agents

Thank you for your interest in contributing to Open-Agents! This document explains how to contribute effectively.

---

## Prerequisites

Before contributing, make sure you have:

- **Python >= 3.11** (for oa-cli development)
- **tmux** (for agent orchestration testing)
- **Claude Code CLI** with active subscription
- **Node.js >= 20** and **pnpm >= 9** (for Visual Canvas development)
- **git** and a GitHub account

---

## Getting Started

### 1. Fork and clone the repository

1. Fork the repository on GitHub (click "Fork" in the top right)

2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Open-Agents.git
   cd Open-Agents
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/OpenAEC-Foundation/Open-Agents.git
   ```

### 2. Set up your development environment

**For oa-cli development:**
```bash
cd oa-cli
pip install -e .
oa version  # verify installation
```

**For Visual Canvas development:**
```bash
pnpm install
pnpm dev
```

### 3. Create a branch

Always work on a feature branch, never directly on `main`:

```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/your-bug-description
```

---

## Making Changes

Follow the project's design principles (see [PRINCIPLES.md](PRINCIPLES.md)) and architectural decisions (see [DECISIONS.md](DECISIONS.md)) when making changes.

**Code style:**
- Python: follow PEP 8, use type hints
- TypeScript: strict mode, no `any` types
- Keep functions small and focused (single responsibility)

**Before submitting:**

1. Run type checking:
   ```bash
   # TypeScript
   pnpm typecheck
   # Python
   mypy src/
   ```

2. Run tests:
   ```bash
   # TypeScript
   pnpm test
   # Python
   pytest
   ```

3. **Write a description**:
   - What problem does this solve?
   - How does it solve it?
   - Any breaking changes? (label with `BREAKING CHANGE:`)

4. **Push to your fork** and open a PR against `main`

5. **CI checks** will run automatically:
   - Type checking
   - Tests
   - Linting

6. **Address review feedback**:
   - Make changes in new commits (do not amend unless asked)
   - Push updates to your branch
   - Maintainers will merge when ready

---

## Questions & Support

- **Issues:** Use GitHub Issues for bug reports and feature requests
- **Discussions:** Use GitHub Discussions for general questions
- **Security issues:** See [SECURITY.md](SECURITY.md)

---

## Additional Resources

- [CLAUDE.md](CLAUDE.md) — Internal development conventions
- [ROADMAP.md](ROADMAP.md) — Project status and phases
- [README.md](README.md) — Project overview

---

Thank you for contributing to Open-Agents!
