# Documentation Checker

A powerful tool that analyzes GitHub repositories for documentation quality using Claude Code SDK and provides automated fixes through GitHub integration.

## Features

- 🔍 **Intelligent Analysis**: Uses Claude Code SDK to analyze documentation completeness, accuracy, and clarity
- 🐳 **Containerized Execution**: Runs in isolated Docker containers for security
- 🤖 **GitHub Integration**: Automatically creates issues and pull requests with fixes
- 📊 **Detailed Reports**: Provides structured analysis with severity and effort levels
- 🛠️ **Multiple Output Formats**: Supports JSON and human-readable text output

## Prerequisites

- Node.js 18+
- Docker
- GitHub Personal Access Token (with `repo`, `public_repo`, `issues:write`, `pull_requests:write` permissions)
- Anthropic API Key

## Installation

### Using Docker (Recommended)

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd docs-check
    ```

2.  Build the Docker image:
    ```bash
    docker build -t docs-check .
    ```

### Local Development

1.  Install dependencies:
    ```bash
    pnpm install
    ```

2.  Build the project:
    ```bash
    pnpm run build
    ```

## Configuration

Set the required environment variables. You can use the `gh` CLI to securely provide your token:

```bash
export GITHUB_TOKEN=$(gh auth token)
export ANTHROPIC_API_KEY="your_anthropic_api_key"
```

## Usage

### Docker Usage

```bash
# Basic analysis
docker run --rm \
  -e GITHUB_TOKEN \
  -e ANTHROPIC_API_KEY \
  docs-check https://github.com/owner/repo

# Verbose output for detailed progress
docker run --rm \
  -e GITHUB_TOKEN \
  -e ANTHROPIC_API_KEY \
  docs-check https://github.com/owner/repo --verbose

# Create GitHub issues for found problems
docker run --rm \
  -e GITHUB_TOKEN \
  -e ANTHROPIC_API_KEY \
  docs-check https://github.com/owner/repo --create-issues

# Create a pull request with automatic fixes
docker run --rm \
  -e GITHUB_TOKEN \
  -e ANTHROPIC_API_KEY \
  docs-check https://github.com/owner/repo --create-pr

# JSON output for programmatic use
docker run --rm \
  -e GITHUB_TOKEN \
  -e ANTHROPIC_API_KEY \
  docs-check https://github.com/owner/repo --output-format json
```

### Local Usage

```bash
# Basic analysis
pnpm start https://github.com/owner/repo

# With GitHub integration and verbose logging
pnpm start https://github.com/owner/repo --create-issues --verbose

# Development mode
pnpm dev https://github.com/owner/repo --create-pr
```

## Command Line Options

-   `<github-url>` - GitHub repository URL to analyze (required)
-   `--create-issues` - Create GitHub issues for found problems
-   `--create-pr` - Create a pull request with documentation fixes
-   `--output-format <format>` - Output format: `json` or `text` (default: text)
-   `--verbose` - Enable verbose logging
-   `--help` - Show help information

## Output Examples

### Text Output

```
📊 Documentation Analysis Results for owner/repo
--------------------------------------------------
Total Issues: 1
High Severity: 1
Medium Severity: 0
Low Severity: 0

📋 Issues Found:

[HIGH] [LOW EFFORT] Missing installation instructions
Type: missing
Description: The README lacks clear installation instructions for new users
File: README.md
Suggestion: Add a section with step-by-step installation instructions
```

### JSON Output

```json
{
  "repository": {
    "owner": "owner",
    "repo": "repo",
    "url": "https://github.com/owner/repo.git"
  },
  "issues": [
    {
      "type": "missing",
      "severity": "high",
      "effort": "low",
      "title": "Missing installation instructions",
      "description": "The README lacks clear installation instructions for new users",
      "file": "README.md",
      "suggestion": "Add a section with step-by-step installation instructions"
    }
  ],
  "summary": {
    "totalIssues": 1,
    "highSeverity": 1,
    "mediumSeverity": 0,
    "lowSeverity": 0
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Development

### Scripts

```bash
pnpm run build        # Build TypeScript
pnpm run dev          # Development mode with tsx
pnpm run typecheck    # Type checking
pnpm run lint         # Linting with Biome
pnpm run format       # Format code with Biome
pnpm run check        # Run all checks and fixes
```

### Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── doc-analyzer.ts     # Claude Code SDK integration
├── github-client.ts    # GitHub API operations
├── git-operations.ts   # Git operations with simple-git
└── types.ts            # TypeScript type definitions
```

## Security

-   **Containerized execution**: Repositories are cloned in isolated Docker containers.
-   **Temporary storage**: All cloned data is automatically cleaned up.
-   **Token security**: API keys are never logged or stored.
-   **Read-only analysis**: No modifications made without explicit flags.

## Limitations

-   **Repository size**: Very large repositories may hit analysis timeouts.
-   **Private repositories**: Requires appropriate GitHub token permissions.
-   **Language support**: Optimized for repositories with standard documentation patterns.
-   **Fix complexity**: Automatic fixes are limited to simple text modifications.

## Contributing

1.  Fork the repository.
2.  Create a feature branch.
3.  Make your changes.
4.  Run tests and linting: `pnpm run check`
5.  Submit a pull request.

## License

ISC License - see LICENSE file for details.
