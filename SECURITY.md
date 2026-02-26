# Security Policy

## Reporting a Vulnerability

Als je een beveiligingsprobleem vindt in Open-Agents, neem dan **privé** contact op:

- **Email**: freek@impertio.nl
- **Geen** publieke GitHub Issues voor security problemen

We streven ernaar binnen 48 uur te reageren.

## Ondersteunde Versies

| Versie | Ondersteund |
|--------|:-----------:|
| main branch | Ja |

## Security Practices

- Credentials worden **nooit** gecommit (defense-in-depth .gitignore)
- Agent containers draaien geïsoleerd (geen bash/write naar host)
- Frappe API users hebben minimale role permissions
- Alle agent tool calls worden gelogd voor audit

## Credential Management

Zie de [Impertio AI Ecosystem Deployment](https://github.com/OpenAEC-Foundation/Impertio-AI-Ecosystem-Deployment) repository voor ons credential management beleid (SEC_001, SEC_002).
