# Batch 14 Report — Agent Library

**Date:** 2026-03-08
**Agent:** library-batch14
**Total templates created:** 30

## Summary

### game-dev (10 agents)
| File | Name | Description |
|------|------|-------------|
| `game-mechanic-designer.json` | Game Mechanic Designer | Designs core game mechanics with rules, interactions, and player feedback loops |
| `level-designer.json` | Level Designer | Creates level layouts with flow, challenge progression, and environmental storytelling |
| `asset-pipeline-planner.json` | Asset Pipeline Planner | Plans the art asset pipeline from source creation to engine-ready format |
| `shader-writer.json` | Shader Writer | Writes GLSL/HLSL shader code for visual effects based on style descriptions |
| `physics-configurator.json` | Physics Configurator | Configures physics simulation parameters for realistic or stylized game feel |
| `ai-behavior-tree-builder.json` | AI Behavior Tree Builder | Builds behavior trees for NPC AI given behavioral requirements |
| `save-system-designer.json` | Save System Designer | Designs game save/load systems with data schema and persistence strategy |
| `multiplayer-sync-advisor.json` | Multiplayer Sync Advisor | Advises on multiplayer synchronization architecture for networked games |
| `game-balance-analyzer.json` | Game Balance Analyzer | Analyzes game balance parameters and suggests tuning for fair, engaging gameplay |
| `localization-manager.json` | Localization Manager | Manages game localization structure, key naming, and translation workflow |

### embedded (10 agents)
| File | Name | Description |
|------|------|-------------|
| `rtos-task-designer.json` | RTOS Task Designer | Designs RTOS task structure with priorities, stack sizes, and scheduling strategy |
| `interrupt-handler-writer.json` | Interrupt Handler Writer | Writes ISR code for microcontroller peripherals with proper context save and flag handling |
| `memory-map-planner.json` | Memory Map Planner | Plans the memory map for embedded systems including flash, RAM, and peripheral regions |
| `peripheral-driver-writer.json` | Peripheral Driver Writer | Writes HAL-level peripheral driver code for common embedded peripherals |
| `bootloader-advisor.json` | Bootloader Advisor | Advises on bootloader design including update flow, integrity checks, and fallback strategy |
| `power-management-optimizer.json` | Power Management Optimizer | Optimizes embedded system power consumption through sleep modes and peripheral gating |
| `i2c-protocol-implementer.json` | I2C Protocol Implementer | Implements I2C communication code for a target sensor or actuator |
| `uart-debug-logger.json` | UART Debug Logger | Implements a UART-based debug logging module with log levels and ring buffer |
| `flash-memory-manager.json` | Flash Memory Manager | Manages internal/external flash for data persistence with wear leveling awareness |
| `test-harness.json` | Embedded Test Harness | Creates a unit test harness for embedded C code using a minimal test framework |

### geospatial (10 agents)
| File | Name | Description |
|------|------|-------------|
| `coordinate-transformer.json` | Coordinate Transformer | Transforms coordinates between CRS systems using PROJ/pyproj specifications |
| `geojson-validator.json` | GeoJSON Validator | Validates GeoJSON files for spec compliance, geometry validity, and coordinate range |
| `spatial-query-builder.json` | Spatial Query Builder | Builds PostGIS or SpatiaLite SQL queries for spatial operations |
| `map-style-configurator.json` | Map Style Configurator | Creates MapLibre GL / Mapbox GL style JSON for map layer visualization |
| `route-optimizer.json` | Route Optimizer | Optimizes multi-stop routes using shortest path or TSP algorithms on geographic data |
| `heatmap-data-preparer.json` | Heatmap Data Preparer | Prepares point data for heatmap rendering by normalizing weights and binning |
| `geocoder-configurator.json` | Geocoder Configurator | Configures and scripts batch geocoding workflows using Nominatim, Pelias, or Google |
| `elevation-data-processor.json` | Elevation Data Processor | Processes DEM/raster elevation data to extract profiles, contours, and slope analysis |
| `polygon-simplifier.json` | Polygon Simplifier | Simplifies complex polygon geometries while preserving topology and key features |
| `tile-server-configurator.json` | Tile Server Configurator | Configures a tile server (Martin/pg_tileserv/TileServer GL) for serving vector or raster tiles |

## Quality Notes
- All templates use `modelHint: anthropic/claude-haiku-4-5-20251001`
- All templates include `tools: ["Read", "Write"]`
- All systemPrompts follow the pattern: Role → Task → Input (typed) → Output (structured) → "Be specific and deterministic."
- IDs follow convention `{category}-{filename-stem}`
- Files written with `newline="\n"` and `ensure_ascii=False`
