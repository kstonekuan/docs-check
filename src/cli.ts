#!/usr/bin/env node

import { Command } from "commander";
import { DocumentationAnalyzer } from "./doc-analyzer.js";
import { GitOperations } from "./git-operations.js";
import { GitHubClient } from "./github-client.js";
import type { AppConfig, CliOptions, GitHubRepository } from "./types.js";

function parseGitHubUrl(url: string): GitHubRepository {
  const githubUrlPattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/;
  const match = url.match(githubUrlPattern);

  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  const [, owner, repo] = match;
  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}.git`,
  };
}

function getConfig(): AppConfig {
  const githubToken = process.env.GITHUB_TOKEN;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!githubToken) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  if (!anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }

  return {
    githubToken,
    anthropicApiKey,
    tempDirectory: "/tmp/docs-check",
  };
}

async function main() {
  const program = new Command();

  program
    .name("docs-check")
    .description("Check documentation quality using Claude Code SDK and GitHub integration")
    .version("1.0.0")
    .argument("<github-url>", "GitHub repository URL to analyze")
    .option("--create-issues", "Create GitHub issues for found problems", false)
    .option("--create-pr", "Create a pull request with documentation fixes", false)
    .option("--output-format <format>", "Output format (json|text)", "text")
    .option("--verbose", "Enable verbose logging", false)
    .parse();

  try {
    const githubUrl = program.args[0];
    const options = program.opts() as Omit<CliOptions, "createPullRequest"> & {
      "create-issues": boolean;
      "create-pr": boolean;
      "output-format": "json" | "text";
    };

    const cliOptions: CliOptions = {
      createIssues: options["create-issues"],
      createPullRequest: options["create-pr"],
      outputFormat: options["output-format"],
      verbose: options.verbose,
    };

    if (cliOptions.verbose) {
      console.log("Starting documentation analysis...");
      console.log(`Repository: ${githubUrl}`);
      console.log(`Options:`, cliOptions);
    }

    const config = getConfig();
    const repository = parseGitHubUrl(githubUrl);

    // Initialize services
    const gitOps = new GitOperations(config.tempDirectory);
    const githubClient = new GitHubClient(config.githubToken);
    const analyzer = new DocumentationAnalyzer(config.anthropicApiKey);

    // Clone repository
    if (cliOptions.verbose) {
      console.log(`Cloning repository to ${config.tempDirectory}...`);
    }
    const repoPath = await gitOps.cloneRepository(repository.url);

    // Analyze documentation
    if (cliOptions.verbose) {
      console.log("Analyzing documentation with Claude Code SDK...");
    }
    const analysisResult = await analyzer.analyzeDocumentation(repoPath, repository);

    // Output results
    if (cliOptions.outputFormat === "json") {
      console.log(JSON.stringify(analysisResult, null, 2));
    } else {
      console.log(`\n📊 Documentation Analysis Results for ${repository.owner}/${repository.repo}`);
      console.log(`${"-".repeat(50)}`);
      console.log(`Total Issues: ${analysisResult.summary.totalIssues}`);
      console.log(`High Severity: ${analysisResult.summary.highSeverity}`);
      console.log(`Medium Severity: ${analysisResult.summary.mediumSeverity}`);
      console.log(`Low Severity: ${analysisResult.summary.lowSeverity}`);

      if (analysisResult.issues.length > 0) {
        console.log(`\n📋 Issues Found:`);
        for (const issue of analysisResult.issues) {
          console.log(`
[${issue.severity.toUpperCase()}] [${issue.effort.toUpperCase()} EFFORT] ${issue.title}`);
          console.log(`Type: ${issue.type}`);
          console.log(`Description: ${issue.description}`);
          if (issue.file) {
            console.log(`File: ${issue.file}${issue.line ? `:${issue.line}` : ""}`);
          }
          if (issue.suggestion) {
            console.log(`Suggestion: ${issue.suggestion}`);
          }
        }
      }
    }

    // Create GitHub issues if requested
    if (cliOptions.createIssues && analysisResult.issues.length > 0) {
      if (cliOptions.verbose) {
        console.log("\n🔧 Creating GitHub issues...");
      }

      const issueResults = await githubClient.createIssuesFromAnalysis(repository, analysisResult);

      if (cliOptions.outputFormat === "text") {
        console.log(`\n✅ Created ${issueResults.length} GitHub issues:`);
        for (const result of issueResults) {
          console.log(`- Issue #${result.number}: ${result.url}`);
        }
      }
    }

    // Create pull request if requested
    if (cliOptions.createPullRequest) {
      if (cliOptions.verbose) {
        console.log("\n🔧 Creating pull request with fixes...");
      }

      const prResult = await githubClient.createPullRequestWithFixes(
        repository,
        analysisResult,
        repoPath
      );

      if (prResult && cliOptions.outputFormat === "text") {
        console.log(`\n✅ Created pull request #${prResult.number}: ${prResult.url}`);
      }
    }

    // Cleanup
    await gitOps.cleanup(repoPath);

    if (cliOptions.verbose) {
      console.log("\n✨ Analysis complete!");
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}
