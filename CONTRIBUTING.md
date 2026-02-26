# Contributing to Open-Agents

Bedankt voor je interesse in bijdragen aan Open-Agents!

## Hoe Bijdragen

### Issues

Gebruik GitHub Issues voor:
- Bug reports
- Feature requests
- Vragen over het project

### Pull Requests

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/mijn-feature`)
3. Commit je wijzigingen (`git commit -m "feat: beschrijving"`)
4. Push naar je fork (`git push origin feature/mijn-feature`)
5. Open een Pull Request

### Commit Conventie

We gebruiken [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Gebruik |
|--------|---------|
| `feat:` | Nieuwe functionaliteit |
| `fix:` | Bug fix |
| `docs:` | Documentatie wijziging |
| `refactor:` | Code refactoring |
| `test:` | Tests toevoegen of aanpassen |
| `chore:` | Overig (build, CI, dependencies) |

### Snippet Bijdragen

Bij het toevoegen van snippets aan de kennisbibliotheek:

1. Gebruik YAML frontmatter met `tags`, `weight`, en `model_hint`
2. Houd snippets gefocust op één onderwerp
3. Schrijf in het Nederlands (tenzij het technische documentatie is)
4. Test dat de snippet correct geladen wordt

```markdown
---
tags: [erpnext, api, technisch]
weight: medium
model_hint: any
---

# Snippet Titel

Inhoud hier...
```

## Code of Conduct

Wees respectvol, constructief en professioneel. We volgen de [Contributor Covenant](https://www.contributor-covenant.org/).

## Licentie

Door bij te dragen ga je akkoord dat je bijdragen onder de Apache-2.0 licentie vallen.

---

*Impertio Studio B.V.*
