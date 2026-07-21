/**
 * Tech stack spec templates — initial spec skeletons per tech stack.
 *
 * Used by `bp init` (greenfield) and `bp init --brownfield` (auto-detected)
 * to create domain-organized initial specs with stack-relevant Requirement skeletons.
 */

import type { ProjectInfo } from '../../core/brownfield.js';

export interface SpecDomain {
  name: string;
  specContent: string;
}

export interface SpecStackTemplate {
  id: string;
  label: string;
  detect: (info: ProjectInfo) => boolean;
  domains: SpecDomain[];
  conventions: string;
}

// ── Domain spec content builders ──

function cliSpec(): string {
  return `# CLI Specification

## Purpose

Command-line interface behavior — argument parsing, flag handling, output formatting, exit codes.

## Requirements

### Requirement: Command parsing
The system SHALL parse CLI arguments using positional args + named flags convention.

#### Scenario: Valid command with required argument
- **GIVEN** a valid command name and required argument
- **WHEN** the CLI is invoked
- **THEN** the system SHALL execute the command and return exit code 0

#### Scenario: Missing required argument
- **GIVEN** a command that requires an argument
- **WHEN** the CLI is invoked without the argument
- **THEN** the system SHALL print a usage error to stderr and return exit code 1
`;
}

function coreSpec(): string {
  return `# Core Specification

## Purpose

Core business logic — domain rules, state transitions, data transformations.

## Requirements

### Requirement: Input validation
The system SHALL validate all inputs before processing.

#### Scenario: Valid input
- **GIVEN** input that meets all type and constraint requirements
- **WHEN** the system processes the input
- **THEN** the system SHALL return the expected result

#### Scenario: Invalid input
- **GIVEN** input that violates type or constraint requirements
- **WHEN** the system processes the input
- **THEN** the system SHALL reject the input with a descriptive error message
`;
}

function apiSpec(stack: 'node' | 'python' | 'go' | 'java' | 'dotnet'): string {
  const framework =
    stack === 'node' ? 'Express/Fastify' :
    stack === 'python' ? 'FastAPI/Flask' :
    stack === 'java' ? 'Spring Boot' :
    stack === 'dotnet' ? 'ASP.NET Core' :
    'net/http';
  return `# API Specification

## Purpose

HTTP API behavior — routing, request/response handling, middleware, error responses.

## Requirements

### Requirement: Request handling
The system SHALL handle HTTP requests using ${framework} conventions.

#### Scenario: Successful GET request
- **GIVEN** a valid endpoint URL
- **WHEN** a GET request is sent
- **THEN** the system SHALL return a 200 status with the response body

#### Scenario: Resource not found
- **GIVEN** a request to a non-existent resource
- **WHEN** the request is processed
- **THEN** the system SHALL return a 404 status with an error message
`;
}

function uiSpec(): string {
  return `# UI Specification

## Purpose

User interface behavior — component rendering, user interaction, state management, routing.

## Requirements

### Requirement: Component rendering
The system SHALL render UI components reactively based on state changes.

#### Scenario: Initial render
- **GIVEN** a component with required props
- **WHEN** the component mounts
- **THEN** the system SHALL render the component tree to the DOM

#### Scenario: State update triggers re-render
- **GIVEN** a mounted component with state
- **WHEN** the state is updated
- **THEN** the system SHALL re-render only the affected subtree
`;
}

function modelsSpec(): string {
  return `# Data Models Specification

## Purpose

Data model definitions — schema validation, serialization, persistence contracts.

## Requirements

### Requirement: Schema validation
The system SHALL validate data against defined schemas before persistence.

#### Scenario: Valid data
- **GIVEN** data that conforms to the schema
- **WHEN** the system validates the data
- **THEN** validation SHALL pass

#### Scenario: Schema violation
- **GIVEN** data that violates the schema constraints
- **WHEN** the system validates the data
- **THEN** validation SHALL fail with field-specific error messages
`;
}

function testingSpec(): string {
  return `# Testing Specification

## Purpose

Test conventions — test structure, coverage requirements, fixture management.

## Requirements

### Requirement: Test isolation
Each test SHALL run in isolation without side effects on other tests.

#### Scenario: Independent test execution
- **GIVEN** two tests that modify shared state
- **WHEN** both tests execute
- **THEN** neither test SHALL affect the other's outcome
`;
}

// ── Conventions builders ──

function tsConventions(): string {
  return `# Coding Standards

## TypeScript Conventions

- Use strict mode (` + '`"strict": true`' + ` in tsconfig.json)
- Prefer interfaces over type aliases for object shapes
- Use explicit return types on exported functions
- File naming: kebab-case for files, PascalCase for types/interfaces
- Import style: named imports, no barrel re-exports
- Error handling: throw typed errors, never swallow exceptions
- Testing: co-locate test files as ` + '`*.test.ts`' + ` next to source
`;
}

function reactConventions(): string {
  return `# Coding Standards

## React Conventions

- Functional components only (no class components)
- Hooks for state and side effects
- Props: destructure with explicit interface
- File naming: PascalCase for components, kebab-case for utilities
- CSS: CSS modules or styled-components, no global CSS
- Testing: React Testing Library, test user behavior not implementation
- Accessibility: WCAG 2.1 AA compliance required
`;
}

function pythonConventions(): string {
  return `# Coding Standards

## Python Conventions

- Follow PEP 8 with line length 100
- Type hints required on all function signatures
- Use dataclasses or Pydantic for data models
- File naming: snake_case for modules, PascalCase for classes
- Error handling: custom exception classes, never bare except
- Testing: pytest, fixtures for setup/teardown
- Docstrings: Google style for all public functions
`;
}

function rustConventions(): string {
  return `# Coding Standards

## Rust Conventions

- Follow rustfmt defaults
- Use \`thiserror\` for error types, \`anyhow\` for application errors
- File naming: snake_case for modules, PascalCase for types
- Prefer \`&str\` over \`String\` in function parameters
- Use \`impl Trait\` in return positions sparingly
- Testing: \`#[cfg(test)]\` modules co-located with source
- Documentation: doc comments on all public items
`;
}

function goConventions(): string {
  return `# Coding Standards

## Go Conventions

- Follow \`gofmt\` and \`golint\` defaults
- Error handling: always check returned errors, wrap with \`fmt.Errorf\`
- File naming: snake_case for files, PascalCase for exported identifiers
- Use interfaces at the consumer side, not the producer side
- Testing: table-driven tests, \`testdata/\` for fixtures
- Documentation: doc comments on all exported functions
`;
}

function genericConventions(): string {
  return `# Coding Standards

## General Conventions

- Follow the existing codebase's naming and style conventions
- All public APIs must have documentation
- Error handling: explicit, never silently swallow
- Testing: co-locate tests with source, test behavior not implementation
`;
}

// ── Stack templates ──

function nodeBackendConventions(): string {
  return `# Coding Standards

## Node.js Backend Conventions

- Use Express or Fastify for HTTP routing
- Centralized error handling middleware
- Request validation via Zod or Joi
- Environment configuration via dotenv
- Logging: structured JSON logs (pino or winston)
- Async error handling: always wrap async route handlers
- Testing: Vitest or Jest with supertest for integration tests
- API docs: OpenAPI/Swagger specification
`;
}

function vueConventions(): string {
  return `# Coding Standards

## Vue Conventions

- Composition API with <script setup> syntax
- TypeScript by default on all components
- Pinia for state management
- Vue Router for client-side routing
- File naming: PascalCase for components, kebab-case for directories
- Component single-responsibility: one component per file
- CSS: scoped styles, prefer Tailwind CSS or CSS variables
- Testing: Vitest + Vue Test Utils, Playwright for E2E
`;
}

function svelteConventions(): string {
  return `# Coding Standards

## Svelte Conventions

- Use Svelte 5 runes ($state, $derived, $effect) for reactivity
- One component per .svelte file
- TypeScript by default in <script lang="ts">
- File naming: PascalCase for components
- Scoped styles via Svelte's built-in scoping
- State management: Svelte stores or context module pattern
- Routing: SvelteKit file-based routing for full apps
- Testing: Vitest, Playwright for E2E
`;
}

function javaConventions(): string {
  return `# Coding Standards

## Java Conventions

- Follow standard Java naming conventions (camelCase methods, PascalCase classes)
- Use Spring Boot annotations for DI, REST, and configuration
- DTO layer for API request/response models
- Repository pattern for data access (Spring Data JPA)
- Lombok for reducing boilerplate
- Validation: Jakarta Bean Validation annotations
- Testing: JUnit 5, Mockito, Spring Boot Test
- Build: Maven (pom.xml) or Gradle (build.gradle)
`;
}

function dotnetConventions(): string {
  return `# Coding Standards

## C# .NET Conventions

- Follow Microsoft .NET naming conventions (PascalCase for public, camelCase for private)
- Use ASP.NET Core for web APIs
- Entity Framework Core for data access
- Dependency injection via built-in DI container
- File-scoped namespaces
- Async/await for all I/O operations
- Testing: xUnit or NUnit, Moq for mocking
- Package management: NuGet
`;
}

export const SPEC_STACKS: SpecStackTemplate[] = [
  {
    id: 'typescript-cli',
    label: 'TypeScript CLI',
    detect: (info) => info.hasPackageJson && info.srcDirs.includes('src') && !info.framework,
    domains: [
      { name: 'cli', specContent: cliSpec() },
      { name: 'core', specContent: coreSpec() },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: tsConventions(),
  },
  {
    id: 'react-web',
    label: 'React Web App',
    detect: (info) => info.framework === 'react',
    domains: [
      { name: 'ui', specContent: uiSpec() },
      { name: 'api', specContent: apiSpec('node') },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: reactConventions(),
  },
  {
    id: 'python-api',
    label: 'Python API',
    detect: (info) => info.language === 'python',
    domains: [
      { name: 'api', specContent: apiSpec('python') },
      { name: 'models', specContent: modelsSpec() },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: pythonConventions(),
  },
  {
    id: 'rust-cli',
    label: 'Rust CLI',
    detect: (info) => info.language === 'rust',
    domains: [
      { name: 'cli', specContent: cliSpec() },
      { name: 'core', specContent: coreSpec() },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: rustConventions(),
  },
  {
    id: 'go-service',
    label: 'Go Service',
    detect: (info) => info.language === 'go',
    domains: [
      { name: 'api', specContent: apiSpec('go') },
      { name: 'models', specContent: modelsSpec() },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: goConventions(),
  },
  {
    id: 'node-backend',
    label: 'Node Backend (Express/Fastify)',
    detect: (info) => info.framework === 'express' || info.framework === 'fastify',
    domains: [
      { name: 'api', specContent: apiSpec('node') },
      { name: 'models', specContent: modelsSpec() },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: nodeBackendConventions(),
  },
  {
    id: 'vue-web',
    label: 'Vue Web App',
    detect: (info) => info.framework === 'vue',
    domains: [
      { name: 'ui', specContent: uiSpec() },
      { name: 'api', specContent: apiSpec('node') },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: vueConventions(),
  },
  {
    id: 'svelte-web',
    label: 'Svelte Web App',
    detect: (info) => info.framework === 'svelte',
    domains: [
      { name: 'ui', specContent: uiSpec() },
      { name: 'api', specContent: apiSpec('node') },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: svelteConventions(),
  },
  {
    id: 'java-spring',
    label: 'Java Spring',
    detect: (info) => info.framework === 'spring',
    domains: [
      { name: 'api', specContent: apiSpec('java') },
      { name: 'models', specContent: modelsSpec() },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: javaConventions(),
  },
  {
    id: 'dotnet-api',
    label: 'C# .NET API',
    detect: (info) => info.language === 'csharp',
    domains: [
      { name: 'api', specContent: apiSpec('dotnet') },
      { name: 'models', specContent: modelsSpec() },
      { name: 'testing', specContent: testingSpec() },
    ],
    conventions: dotnetConventions(),
  },
  {
    id: 'generic',
    label: 'Generic (no specific stack)',
    detect: () => false, // fallback only
    domains: [
      { name: 'core', specContent: coreSpec() },
    ],
    conventions: genericConventions(),
  },
];
