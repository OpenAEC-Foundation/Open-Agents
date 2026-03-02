---
id: document-processor
name: Document Processor
type: pattern
category: specialist
tags: [document, extraction, transformation, specialist]
minNodes: 2
maxNodes: 5
tokenProfile:
  avgInputPerNode: 4000
  avgOutputPerNode: 2500
  costMultiplier: 2.0
---

# Document Processor

## Description
A specialized pipeline for processing documents. An extractor agent parses the document and extracts structured data, a transformer agent converts the data into the desired output format, and an optional validator ensures accuracy. Handles various document types (contracts, invoices, reports) through configurable extraction schemas.

## Diagram
```
[Document] --> [Extractor] --> [Transformer] --> [Structured Output]
                                                        |
                                                  (optional)
                                                        v
                                                  [Validator] --> [Verified Output]
```

## When to Use
- You need to extract structured data from unstructured documents
- Documents follow a known schema or template
- You need to transform documents between formats
- Accuracy of extraction is critical and needs verification

## Anti-Patterns
- Do not use for free-form text where no structure exists
- Avoid when the document exceeds the model's context window without chunking
- Not suitable when extraction requires visual understanding (use OCR first)
- Do not use for one-off simple extractions that a single agent handles

## Node Templates

### Extractor
- **Role**: Parses the document and extracts structured data according to a defined schema.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep]
- **Prompt Template**: Extract structured data from the following document according to this schema. Be precise with values — prefer exact quotes over paraphrasing. Mark any fields where you are uncertain.

### Transformer
- **Role**: Converts extracted data into the desired output format (JSON, CSV, database records, etc.).
- **Model**: anthropic/claude-haiku-4-5
- **Tools**: [Read, Write]
- **Prompt Template**: Transform the extracted data into the specified output format. Maintain data integrity during transformation. Apply any required formatting rules or business logic.

## Edge Flow
Document -> Extractor (direct)
Extractor -> Transformer (structured data)
Transformer -> Structured Output (direct)
Transformer -> Validator (optional, for verification)
Validator -> Verified Output (confirmed accurate)
