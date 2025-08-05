# Documentation Checker

A powerful tool that analyzes GitHub repositories for documentation quality using Claude Code SDK and provides automated fixes through GitHub integration.

## Features

- 🔍 **Intelligent Analysis**: Uses Claude Code SDK to analyze documentation completeness, accuracy, and clarity
- 🐳 **Containerized Execution**: Runs in isolated Docker containers for security
- 🤖 **GitHub Integration**: Automatically creates issues and pull requests with fixes
- 📊 **Detailed Reports**: Provides structured analysis with severity levels
- 🛠️ **Multiple Output Formats**: Supports JSON and human-readable text output

## Prerequisites

- Node.js 18+ 
- Docker
- GitHub Personal Access Token
- Anthropic API Key

## Installation

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd docs-check
```

2. Build the Docker image:
```bash
docker build -t docs-check .
```

### Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Build the project:
```bash
pnpm run build
```

## Configuration

Set the required environment variables:

```bash
export GITHUB_TOKEN=$(gh auth token)
export ANTHROPIC_API_KEY="your_anthropic_api_key"
```

### GitHub Token Permissions

Your GitHub token needs the following permissions:
- `repo` (for private repositories)
- `public_repo` (for public repositories)
- `issues:write`
- `pull_requests:write`

## Usage

### Docker Usage

```bash
# Basic analysis (output only)
docker run --rm \
  -e GITHUB_TOKEN="your_token" \
  -e ANTHROPIC_API_KEY="your_api_key" \
  docs-check https://github.com/owner/repo

# Create GitHub issues for found problems  
docker run --rm \
  -e GITHUB_TOKEN="your_token" \
  -e ANTHROPIC_API_KEY="your_api_key" \
  docs-check https://github.com/owner/repo --create-issues

# Create a pull request with automatic fixes
docker run --rm \
  -e GITHUB_TOKEN="your_token" \
  -e ANTHROPIC_API_KEY="your_api_key" \
  docs-check https://github.com/owner/repo --create-pr

# JSON output for programmatic use
docker run --rm \
  -e GITHUB_TOKEN="your_token" \
  -e ANTHROPIC_API_KEY="your_api_key" \
  docs-check https://github.com/owner/repo --output-format json
```

### Local Usage

```bash
# Basic analysis
pnpm start https://github.com/owner/repo

# With GitHub integration
pnpm start https://github.com/owner/repo --create-issues --verbose

# Development mode
pnpm dev https://github.com/owner/repo --create-pr
```

## Command Line Options

- `<github-url>` - GitHub repository URL to analyze (required)
- `--create-issues` - Create GitHub issues for found problems
- `--create-pr` - Create a pull request with documentation fixes  
- `--output-format <format>` - Output format: `json` or `text` (default: text)
- `--verbose` - Enable verbose logging
- `--help` - Show help information

## Analysis Types

The tool identifies four types of documentation issues:

### 1. Missing Documentation
- **High Severity**: Critical documentation like README, installation instructions
- **Medium Severity**: API documentation, contributing guidelines
- **Low Severity**: Minor sections, examples

### 2. Outdated Documentation
- **High Severity**: Installation steps that no longer work
- **Medium Severity**: API changes not reflected in docs
- **Low Severity**: Minor version references

### 3. Unclear Documentation
- **High Severity**: Confusing critical instructions
- **Medium Severity**: Ambiguous explanations
- **Low Severity**: Minor clarity improvements

### 4. Broken Links
- **High Severity**: Links to critical resources
- **Medium Severity**: Internal documentation links
- **Low Severity**: Non-essential external links

## Output Examples

### Text Output
```
📊 Documentation Analysis Results for owner/repo
--------------------------------------------------
Total Issues: 5
High Severity: 1
Medium Severity: 3
Low Severity: 1

📋 Issues Found:

[HIGH] Missing installation instructions
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

## GitHub Integration

### Issues Created
- **High severity issues**: Created individually with detailed descriptions
- **Medium/Low severity issues**: Grouped into consolidated issues
- **Labels**: Automatically tagged with `documentation`, severity, and type labels

### Pull Requests
- **Automatic fixes**: Simple issues like formatting, missing sections
- **Detailed descriptions**: Lists all fixes applied and remaining manual tasks
- **Branch naming**: Uses `docs-check-fixes-{timestamp}` format

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
└── types.ts           # TypeScript type definitions
```

## Security

- **Containerized execution**: Repositories are cloned in isolated Docker containers
- **Temporary storage**: All cloned data is automatically cleaned up
- **Token security**: API keys are never logged or stored
- **Read-only analysis**: No modifications made without explicit flags

## Limitations

- **Repository size**: Very large repositories may hit analysis timeouts
- **Private repositories**: Requires appropriate GitHub token permissions
- **Language support**: Optimized for repositories with standard documentation patterns
- **Fix complexity**: Automatic fixes are limited to simple text modifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `pnpm run check`
5. Submit a pull request

## License

ISC License - see LICENSE file for details.