# Security Policy

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, use one of these channels:

1. **GitHub Security Advisory (preferred)**: Go to the repository -> Security -> Advisories -> "Report a vulnerability"
2. **Email**: security@impertio.ai

### What to include in your report

- Description of the vulnerability
- Steps to reproduce (or proof-of-concept)
- Affected component (oa-cli, Visual Canvas, bridge server, etc.)
- Potential impact
- Any suggested mitigations

### Response timeline

- **Acknowledgment**: Within 3 business days
- **Initial assessment**: Within 7 business days
- **Fix or mitigation**: Depends on severity — critical issues are prioritized

---

## Scope

This security policy covers:

- `oa-cli` Python package (agent orchestration)
- Visual Canvas (TypeScript monorepo — frontend, backend, packages)
- Flask bridge server (`bridge.py`)
- VS Code extension (`packages/vscode-extension`)

---

## Credential Management

**Never commit credentials to the repository.**

Open-Agents uses the following credential management patterns:

- **Claude subscription**: Managed by Claude Code CLI (`~/.claude/`)
- **API keys**: Stored in `.env` files (always in `.gitignore`)
- **Agent workspaces**: Temporary directories (`/tmp/oa-agent-*`) — never persisted to git

If you accidentally commit credentials:
1. Revoke the credential immediately (GitHub, Anthropic, etc.)
2. Use `git filter-branch` or GitHub's secret scanning remediation tools
3. Force-push a new clean commit

---

## Dependency Security

### Monitoring

- **Python (oa-cli):** `pip audit` checks for known vulnerabilities
- **Node.js (packages/):** `npm audit` / `pnpm audit` for dependency security
- **CI/CD:** GitHub Actions runs security checks on every push

### Reporting Dependency Vulnerabilities

If you discover a vulnerability in a dependency:

1. Check if a patch is available
2. If yes: create a PR updating the dependency
3. If no: report directly to the dependency maintainers
4. If critical: open a GitHub Security Advisory describing the issue

### Keeping Dependencies Updated

- Regular dependency updates are made via `dependabot` (auto-PRs)
- Major updates are reviewed manually for breaking changes
- Security patches are prioritized

---

## Safe Defaults

Open-Agents uses safe defaults:

| Component | Default Behavior | Notes |
|-----------|-----------------|-------|
| Agent workspace | Isolated tmpdir | No access to other agent workspaces |
| tmux session | Restricted permissions | Other users cannot attach |
| API keys | From CLI subscription | Not stored in orchestrator state |
| File permissions | 0700 (user only) | Workspace directory is user-private |
| Model selection | Sonnet (balanced) | Users can override to Opus or Haiku |
| Bash execution | Restricted | Optional blocklists in Visual Canvas |

---

## Security Best Practices for Users

If you use Open-Agents in production:

1. **Keep agents isolated:** Run on dedicated machines/containers
2. **Monitor workspace cleanup:** Use `oa clean` regularly to remove old workspaces
3. **Audit agent logs:** Review `oa collect <name>` and `oa status` regularly
4. **Rotate credentials:** If agents interact with external APIs, rotate tokens periodically
5. **Network security:** If using web UI, keep it on localhost or behind authentication
6. **Update regularly:** Stay on the latest version for security patches

---

## Security Contacts

| Role | Contact |
|------|---------|
| Security Lead | Freek Heijting (Open-Agents maintainer) |
| Impertio Studio B.V. | security@impertio.ai |

For non-public inquiries: submit via GitHub Security Advisory (preferred) or email.

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.1 | 2026-03-02 | Added responsible disclosure section, fixed oa logs -> oa collect |
| 1.0 | 2026-03-02 | Initial security policy |

---

## Compliance

Open-Agents aims to comply with:
- OWASP Top 10 (mitigation where applicable)
- CWE/CAPEC common vulnerability patterns
- Python/Node.js security standards

---

*Last updated: 2026-03-02*
