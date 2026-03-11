# Batch 16 Report — Agent Library Builder

**Date:** 2026-03-08
**Status:** Complete
**Total templates created:** 30

## Summary

30 new agent templates created across 3 new categories.

---

## Category: `media-processing` (10 agents)

| File | ID | Description |
|------|----|-------------|
| image-resizer.json | media-processing-image-resizer | Resizes images to specified dimensions or percentage |
| video-transcoder-advisor.json | media-processing-video-transcoder-advisor | Recommends optimal FFmpeg transcoding settings |
| audio-normalizer.json | media-processing-audio-normalizer | Normalizes audio loudness to broadcast/streaming standards |
| subtitle-generator.json | media-processing-subtitle-generator | Creates SRT/VTT subtitle files from transcript data |
| thumbnail-extractor.json | media-processing-thumbnail-extractor | Extracts thumbnail frames from video at intervals |
| metadata-stripper.json | media-processing-metadata-stripper | Removes EXIF/XMP metadata for privacy |
| format-detector.json | media-processing-format-detector | Detects actual media format regardless of extension |
| compression-optimizer.json | media-processing-compression-optimizer | Recommends optimal compression to meet size/quality targets |
| watermark-placer.json | media-processing-watermark-placer | Overlays watermarks on images or video |
| batch-media-renamer.json | media-processing-batch-media-renamer | Batch-renames media files using metadata/pattern templates |

---

## Category: `nlp` (10 agents)

| File | ID | Description |
|------|----|-------------|
| named-entity-recognizer.json | nlp-named-entity-recognizer | Extracts and classifies named entities from text |
| dependency-parser.json | nlp-dependency-parser | Parses syntactic dependency structure into CoNLL-U/JSON |
| coreference-resolver.json | nlp-coreference-resolver | Identifies and links coreference chains in text |
| text-classifier.json | nlp-text-classifier | Classifies text using zero-shot or few-shot methods |
| relation-extractor.json | nlp-relation-extractor | Extracts subject-predicate-object triples from text |
| topic-modeler.json | nlp-topic-modeler | Discovers latent topics using LDA/NMF on a corpus |
| readability-scorer.json | nlp-readability-scorer | Computes readability scores and recommends improvements |
| language-detector.json | nlp-language-detector | Detects language with confidence and handles multilingual docs |
| text-chunker.json | nlp-text-chunker | Splits text into semantically coherent chunks for LLM/RAG |
| semantic-similarity-calculator.json | nlp-semantic-similarity-calculator | Computes semantic similarity using sentence embeddings |

---

## Category: `robotics` (10 agents)

| File | ID | Description |
|------|----|-------------|
| ros-node-designer.json | robotics-ros-node-designer | Generates ROS2 node scaffolding with pub/sub/services |
| kinematic-chain-analyzer.json | robotics-kinematic-chain-analyzer | Analyzes kinematic chains for workspace and singularities |
| sensor-fusion-planner.json | robotics-sensor-fusion-planner | Designs sensor fusion pipelines with EKF/UKF/particle filter |
| path-planner.json | robotics-path-planner | Implements A*, RRT, RRT* path planning |
| joint-controller-writer.json | robotics-joint-controller-writer | Generates PID joint controllers with anti-windup |
| urdf-generator.json | robotics-urdf-generator | Generates URDF robot description files for ROS simulation |
| simulation-scenario-builder.json | robotics-simulation-scenario-builder | Generates Gazebo/MuJoCo world files for test scenarios |
| gripper-controller.json | robotics-gripper-controller | Generates gripper controllers with grasp planning logic |
| localization-configurator.json | robotics-localization-configurator | Configures AMCL/EKF localization for ROS2 Nav2 |
| robot-behavior-designer.json | robotics-robot-behavior-designer | Generates behavior tree XML for autonomous task execution |

---

## Quality Notes

- All templates use `modelHint: "anthropic/claude-haiku-4-5-20251001"` (fast, structured output)
- All templates include `"tools": ["Read", "Write"]` and `"atomic": true`
- systemPrompts follow ROLE → Task → Input → Output → Rules format
- Each systemPrompt ends with "Be specific and deterministic."
