# Shared Features

This directory contains shared feature logic that can be used across multiple features.

## Guidelines

- Only place code here if it's genuinely shared between multiple features
- Document why code is shared and which features use it
- Keep shared code minimal and well-tested
- Avoid creating shared code prematurely - prefer duplication over wrong abstraction

## Documentation Requirements

Each shared module should include:
- Purpose and use cases
- Which features depend on it
- Usage examples
- Any breaking changes or migration notes

