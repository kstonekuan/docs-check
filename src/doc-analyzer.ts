import { promises as fs } from "node:fs";
import { join, relative } from "node:path";
import { query } from "@anthropic-ai/claude-code";
import type { AnalysisResult, DocumentationIssue, GitHubRepository } from "./types.js";

export class DocumentationAnalyzer {
  constructor(apiKey: string) {
    // Claude Code SDK uses environment variables for configuration
    process.env.ANTHROPIC_API_KEY = apiKey;
  }

  async analyzeDocumentation(
    repoPath: string,
    repository: GitHubRepository
  ): Promise<AnalysisResult> {
    try {
      // Scan for documentation files
      const documentationFiles = await this.findDocumentationFiles(repoPath);

      // Scan for code files to understand the project structure
      const codeFiles = await this.findCodeFiles(repoPath);

      // Analyze the repository using Claude
      const issues = await this.performClaudeAnalysis(repoPath, documentationFiles, codeFiles);

      // Sort issues by severity (high -> low) and then by effort (low -> high)
      issues.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        const effortOrder = { low: 0, medium: 1, high: 2 };

        if (a.severity !== b.severity) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }

        return effortOrder[a.effort] - effortOrder[b.effort];
      });

      // Generate summary
      const summary = this.generateSummary(issues);

      return {
        repository,
        issues,
        summary,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Failed to analyze documentation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async findDocumentationFiles(repoPath: string): Promise<string[]> {
    const documentationFiles: string[] = [];

    const docPatterns = [
      /\.md$/i,
      /\.rst$/i,
      /\.txt$/i,
      /readme/i,
      /changelog/i,
      /contributing/i,
      /license/i,
      /docs?\//i,
    ];

    async function scanDirectory(dirPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Skip common directories that don't contain user-facing documentation
            if (
              !["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(entry.name)
            ) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const relativePath = relative(repoPath, fullPath);

            // Check if file matches documentation patterns
            if (docPatterns.some((pattern) => pattern.test(relativePath))) {
              documentationFiles.push(relativePath);
            }
          }
        }
      } catch (_error) {
        // Skip directories we can't read
        console.warn(`Warning: Could not read directory ${dirPath}`);
      }
    }

    await scanDirectory(repoPath);
    return documentationFiles.slice(0, 50); // Limit to 50 files to avoid E2BIG
  }

  private async findCodeFiles(repoPath: string): Promise<string[]> {
    const codeFiles: string[] = [];

    const codePatterns = [
      /\.(js|jsx|ts|tsx|py|java|cpp|c|h|cs|php|rb|go|rust|rs)$/i,
      /package\.json$/i,
      /requirements\.txt$/i,
      /Cargo\.toml$/i,
      /pom\.xml$/i,
    ];

    async function scanDirectory(dirPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Skip common directories
            if (
              ![
                "node_modules",
                ".git",
                "dist",
                "build",
                ".next",
                "coverage",
                "target",
                "__pycache__",
              ].includes(entry.name)
            ) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const relativePath = relative(repoPath, fullPath);

            // Check if file matches code patterns
            if (codePatterns.some((pattern) => pattern.test(relativePath))) {
              codeFiles.push(relativePath);
            }
          }
        }
      } catch (_error) {
        // Skip directories we can't read
        console.warn(`Warning: Could not read directory ${dirPath}`);
      }
    }

    await scanDirectory(repoPath);
    return codeFiles.slice(0, 50); // Limit to 50 files to avoid overwhelming Claude
  }

  private async performClaudeAnalysis(
    repoPath: string,
    documentationFiles: string[],
    codeFiles: string[]
  ): Promise<DocumentationIssue[]> {
    // Prepare context for Claude
    const documentationContent = await this.readFiles(repoPath, documentationFiles);
    const codeStructure = await this.getCodeStructure(repoPath, codeFiles);

    const prompt = this.buildAnalysisPrompt(documentationContent, codeStructure);

    try {
      const response = query({
        prompt,
        options: {
          cwd: repoPath,
        },
      });

      let fullResponse = "";
      for await (const message of response) {
        if (message.type === "assistant") {
          // Extract text content from assistant message
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === "text") {
                fullResponse += block.text;
              }
            }
          } else if (typeof content === "string") {
            fullResponse += content;
          }
        } else if (message.type === "result" && message.subtype === "success") {
          fullResponse += message.result;
        }
      }

      // Parse Claude's response to extract structured issues
      return this.parseClaudeResponse(fullResponse);
    } catch (error) {
      throw new Error(
        `Claude analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async readFiles(repoPath: string, filePaths: string[]): Promise<Record<string, string>> {
    const content: Record<string, string> = {};

    for (const filePath of filePaths) {
      try {
        const fullPath = join(repoPath, filePath);
        const fileContent = await fs.readFile(fullPath, "utf-8");
        content[filePath] = fileContent.replace(/\0/g, "");
      } catch (_error) {
        console.warn(`Warning: Could not read file ${filePath}`);
        content[filePath] = "[Could not read file]";
      }
    }

    return content;
  }

  private async getCodeStructure(repoPath: string, codeFiles: string[]): Promise<string> {
    let structure = "Project Structure:\n";

    // Get package.json or similar project files for context
    const projectFiles = codeFiles.filter((file) =>
      ["package.json", "requirements.txt", "Cargo.toml", "pom.xml"].some((pattern) =>
        file.includes(pattern)
      )
    );

    for (const file of projectFiles) {
      try {
        const content = await fs.readFile(join(repoPath, file), "utf-8");
        structure += `\n${file}:\n${content.replace(/\0/g, "").slice(0, 1000)}...\n`;
      } catch (_error) {
        // Skip files we can't read
      }
    }

    // Add directory structure
    structure += "\nCode Files:\n";
    structure += codeFiles.slice(0, 30).join("\n");

    return structure;
  }

  private buildAnalysisPrompt(
    documentationContent: Record<string, string>,
    codeStructure: string
  ): string {
    let prompt = `You are a documentation analysis expert. Please analyze the following repository's documentation for completeness, accuracy, and clarity.\n\nHere is the project structure:\n${codeStructure}\n\nHere are the documentation files:\n`;

    for (const [filePath, content] of Object.entries(documentationContent)) {
      prompt += `\n--- ${filePath} ---\n${content.slice(0, 2000)}${content.length > 2000 ? "...[truncated]" : ""}\n`;
    }

    prompt += `\n\nPlease analyze the documentation and identify issues in the following categories:\n1. **Missing**: Important documentation that should exist but doesn't\n2. **Outdated**: Documentation that doesn't match the current code\n3. **Unclear**: Documentation that is confusing or poorly written\n4. **Broken Links**: Links that don't work or point to wrong locations\n\nFor each issue, provide:
- Type (missing/outdated/unclear/broken-link)
- Severity (high/medium/low)
- Effort (high/medium/low) to fix
- Title (brief description)
- Description (detailed explanation)
- File (if applicable)
- Line number (if applicable)
- Suggestion (how to fix it)

Please return your analysis as a JSON array of issues in this exact format:
[
  {
    "type": "missing",
    "severity": "high",
    "effort": "low",
    "title": "Missing installation instructions",
    "description": "The README lacks clear installation instructions for new users",
    "file": "README.md",
    "suggestion": "Add a section with step-by-step installation instructions"
  }
]\n\nFocus on the most important issues that would help users understand and use this project effectively.`;

    return prompt;
  }

  private parseClaudeResponse(response: string): DocumentationIssue[] {
    try {
      // Extract JSON from Claude's response (it might be wrapped in markdown)
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);

      let issues: DocumentationIssue[];

      if (jsonMatch?.[1]) {
        issues = JSON.parse(jsonMatch[1]) as DocumentationIssue[];
      } else {
        // Fallback for responses that might not be in a markdown block
        const plainJsonMatch = response.match(/\\\[[\\s\\S]*\\\\]/);
        if (plainJsonMatch) {
          issues = JSON.parse(plainJsonMatch[0]) as DocumentationIssue[];
        } else {
          throw new Error("No JSON array found in Claude's response");
        }
      }

      // Validate and sanitize the issues
      return issues.filter(
        (issue) =>
          issue.type &&
          issue.severity &&
          issue.effort &&
          issue.title &&
          issue.description &&
          ["missing", "outdated", "unclear", "broken-link"].includes(issue.type) &&
          ["high", "medium", "low"].includes(issue.severity)
      );
    } catch (_error) {
      console.warn("Failed to parse Claude response as JSON, creating fallback issue");

      // Fallback: create a general issue if parsing fails
      return [
        {
          type: "unclear",
          severity: "medium",
          effort: "medium",
          title: "Analysis completed with parsing issues",
          description: `Claude provided analysis but response format was unexpected. Raw response: ${response}...`,
          suggestion: "Manual review of documentation recommended",
        },
      ];
    }
  }

  private generateSummary(issues: DocumentationIssue[]) {
    const totalIssues = issues.length;
    const highSeverity = issues.filter((issue) => issue.severity === "high").length;
    const mediumSeverity = issues.filter((issue) => issue.severity === "medium").length;
    const lowSeverity = issues.filter((issue) => issue.severity === "low").length;

    return {
      totalIssues,
      highSeverity,
      mediumSeverity,
      lowSeverity,
    };
  }
}
