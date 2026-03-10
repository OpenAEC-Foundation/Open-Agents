# Batch 13 Report — Agent Library

**Date:** 2026-03-08
**Total agents created:** 30

## Categories

### analytics (10 agents)
| File | ID | Description |
|------|----|-------------|
| funnel-analyzer.json | analytics-funnel-analyzer | Analyzes conversion funnels to identify drop-off points and optimization opportunities. |
| cohort-analyzer.json | analytics-cohort-analyzer | Segments users into cohorts and tracks their behavior over time for retention analysis. |
| ab-test-designer.json | analytics-ab-test-designer | Designs statistically valid A/B tests including sample size, duration, and success metrics. |
| conversion-rate-optimizer.json | analytics-conversion-rate-optimizer | Identifies conversion rate improvement opportunities from analytics data and user behavior. |
| user-journey-mapper.json | analytics-user-journey-mapper | Maps user journeys from raw clickstream data to reveal common paths and pain points. |
| retention-metric-calculator.json | analytics-retention-metric-calculator | Calculates key retention metrics including DAU/MAU, churn rate, and stickiness. |
| churn-predictor.json | analytics-churn-predictor | Scores users by churn risk based on behavioral signals and suggests retention interventions. |
| dashboard-layout-designer.json | analytics-dashboard-layout-designer | Designs analytics dashboard layouts with widget placement and metric hierarchy recommendations. |
| kpi-definition-writer.json | analytics-kpi-definition-writer | Writes precise KPI definitions with calculation formulas, data sources, and targets. |
| attribution-model-builder.json | analytics-attribution-model-builder | Builds marketing attribution models to assign conversion credit across touchpoints. |

### blockchain (10 agents)
| File | ID | Description |
|------|----|-------------|
| smart-contract-auditor.json | blockchain-smart-contract-auditor | Audits Solidity smart contracts for security vulnerabilities and code quality issues. |
| solidity-function-writer.json | blockchain-solidity-function-writer | Writes secure, gas-efficient Solidity functions from plain-language specifications. |
| nft-metadata-builder.json | blockchain-nft-metadata-builder | Generates ERC-721/ERC-1155 compliant NFT metadata JSON files from asset descriptions. |
| defi-protocol-analyzer.json | blockchain-defi-protocol-analyzer | Analyzes DeFi protocol mechanics, tokenomics, and risk factors from documentation. |
| gas-optimizer.json | blockchain-gas-optimizer | Analyzes Solidity contracts and suggests specific gas optimization techniques. |
| wallet-integration-designer.json | blockchain-wallet-integration-designer | Designs Web3 wallet integration architecture for dApps including connection flows and signing. |
| token-economics-planner.json | blockchain-token-economics-planner | Designs token economic models including supply, distribution, and incentive mechanisms. |
| abi-decoder.json | blockchain-abi-decoder | Decodes Ethereum ABI-encoded transaction data and event logs into human-readable format. |
| hardhat-test-writer.json | blockchain-hardhat-test-writer | Writes comprehensive Hardhat/Ethers.js test suites for Solidity smart contracts. |
| ipfs-storage-advisor.json | blockchain-ipfs-storage-advisor | Designs IPFS storage strategies for dApp assets including pinning, gateways, and retrieval. |

### iot (10 agents)
| File | ID | Description |
|------|----|-------------|
| sensor-data-parser.json | iot-sensor-data-parser | Parses raw IoT sensor payloads into normalized, structured data formats. |
| mqtt-topic-designer.json | iot-mqtt-topic-designer | Designs hierarchical MQTT topic structures for IoT device fleets with ACL recommendations. |
| device-firmware-updater.json | iot-device-firmware-updater | Designs OTA firmware update workflows and rollback strategies for IoT device fleets. |
| edge-compute-planner.json | iot-edge-compute-planner | Plans edge computing architecture for IoT deployments including processing split and hardware sizing. |
| security-auditor.json | iot-iot-security-auditor | Audits IoT system security across device, network, and cloud layers against standard frameworks. |
| time-series-schema-designer.json | iot-time-series-schema-designer | Designs optimized time series database schemas for IoT sensor data storage and querying. |
| alert-threshold-calculator.json | iot-alert-threshold-calculator | Calculates statistically appropriate alert thresholds for IoT sensor metrics to minimize false positives. |
| device-fleet-monitor.json | iot-device-fleet-monitor | Designs device fleet monitoring dashboards and health scoring systems for IoT deployments. |
| ota-update-planner.json | iot-ota-update-planner | Plans phased OTA update campaigns for IoT fleets including scheduling, targeting, and success criteria. |
| protocol-bridge-designer.json | iot-protocol-bridge-designer | Designs protocol translation bridges between IoT protocols such as MQTT, CoAP, HTTP, and Modbus. |

## Template Specs
- **maturity:** tool-capable
- **modelHint:** anthropic/claude-haiku-4-5-20251001
- **tools:** Read, Write
- **atomic:** true
