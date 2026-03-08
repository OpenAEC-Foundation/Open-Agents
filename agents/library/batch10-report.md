# Batch 10 Report — Agent Library Builder

**Date:** 2026-03-08  
**Total templates created:** 30  
**Status:** ✅ Complete

---

## Category: `mobile` (10 agents)

| File | ID | Description |
|------|----|-------------|
| `react-native-component-builder.json` | mobile-react-native-component-builder | Generates React Native functional components with TypeScript, props interface, and StyleSheet. |
| `ios-permission-advisor.json` | mobile-ios-permission-advisor | Advises on required iOS permission strings and Info.plist entries for a given feature set. |
| `android-manifest-writer.json` | mobile-android-manifest-writer | Generates AndroidManifest.xml permission declarations and intent filters for requested app features. |
| `push-notification-configurator.json` | mobile-push-notification-configurator | Generates setup code and configuration for push notifications in React Native (FCM/APNs). |
| `offline-sync-designer.json` | mobile-offline-sync-designer | Designs an offline-first data synchronization strategy with conflict resolution for mobile apps. |
| `app-store-metadata-writer.json` | mobile-app-store-metadata-writer | Writes App Store Connect and Google Play Store listing metadata from a product brief. |
| `deep-link-handler.json` | mobile-deep-link-handler | Generates deep link and universal link configuration and handler code for React Native apps. |
| `mobile-analytics-setup.json` | mobile-mobile-analytics-setup | Generates analytics instrumentation code for mobile apps using a specified analytics provider. |
| `biometric-auth-implementer.json` | mobile-biometric-auth-implementer | Generates biometric authentication (Face ID / fingerprint) implementation code for React Native. |
| `mobile-performance-advisor.json` | mobile-mobile-performance-advisor | Analyzes React Native code and provides specific performance optimization recommendations. |

---

## Category: `design-system` (10 agents)

| File | ID | Description |
|------|----|-------------|
| `color-palette-generator.json` | design-system-color-palette-generator | Generates a complete design-system color palette with semantic tokens from a base brand color. |
| `typography-scale-designer.json` | design-system-typography-scale-designer | Designs a typographic scale with font sizes, line heights, and weights as design tokens. |
| `spacing-system-builder.json` | design-system-spacing-system-builder | Builds a spacing scale and layout grid tokens for a design system. |
| `component-token-extractor.json` | design-system-component-token-extractor | Extracts and names design tokens from a component's styles into a structured token file. |
| `icon-set-advisor.json` | design-system-icon-set-advisor | Recommends an appropriate icon set and generates usage guidelines for a design system. |
| `motion-designer.json` | design-system-motion-designer | Defines animation tokens and motion guidelines for a design system. |
| `design-handoff-formatter.json` | design-system-design-handoff-formatter | Formats design specifications into a structured developer handoff document. |
| `storybook-story-writer.json` | design-system-storybook-story-writer | Generates Storybook stories (CSF 3) for design system components. |
| `theme-configurator.json` | design-system-theme-configurator | Generates a complete theme configuration object for a UI library (MUI, Chakra, Mantine, etc.). |
| `component-variant-planner.json` | design-system-component-variant-planner | Plans all variants, sizes, and states for a design system component using CVA or similar. |

---

## Category: `workflow-automation` (10 agents)

| File | ID | Description |
|------|----|-------------|
| `n8n-flow-designer.json` | workflow-automation-n8n-flow-designer | Designs n8n workflow JSON for a described automation use case. |
| `zapier-zap-writer.json` | workflow-automation-zapier-zap-writer | Writes a Zapier Zap specification document for a given automation trigger-action scenario. |
| `github-action-builder.json` | workflow-automation-github-action-builder | Generates a GitHub Actions workflow YAML file for a described CI/CD pipeline. |
| `gitlab-ci-writer.json` | workflow-automation-gitlab-ci-writer | Writes a .gitlab-ci.yml pipeline configuration for a described project and workflow. |
| `makefile-generator.json` | workflow-automation-makefile-generator | Generates a project Makefile with common development, build, and deploy targets. |
| `pre-commit-hook-writer.json` | workflow-automation-pre-commit-hook-writer | Generates a .pre-commit-config.yaml with appropriate hooks for a given project stack. |
| `git-hook-installer.json` | workflow-automation-git-hook-installer | Generates shell-based git hooks and an install script for a project. |
| `cron-job-planner.json` | workflow-automation-cron-job-planner | Generates cron expressions and a cron job configuration file for described scheduled tasks. |
| `webhook-router-designer.json` | workflow-automation-webhook-router-designer | Designs a webhook routing configuration and handler code for incoming webhook events. |
| `event-trigger-mapper.json` | workflow-automation-event-trigger-mapper | Maps business events to automation triggers across multiple platforms and tools. |

---

## Summary

- All 30 templates use `modelHint: "anthropic/claude-haiku-4-5-20251001"`
- All templates are `atomic: true` with `maturity: "tool-capable"`
- Tools: `["Read", "Write"]` for all templates
- systemPrompts follow the pattern: Role → Task → Input → Output → deterministic instruction
