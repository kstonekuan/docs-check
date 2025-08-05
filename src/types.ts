export interface CliOptions {
  createIssues: boolean;
  createPullRequest: boolean;
  outputFormat: "json" | "text";
  verbose: boolean;
}

export interface GitHubRepository {
  owner: string;
  repo: string;
  url: string;
}

export interface DocumentationIssue {
  type: "missing" | "outdated" | "unclear" | "broken-link";
  severity: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestion: string;
  file?: string;
  line?: number;
}

export interface AnalysisResult {
  repository: GitHubRepository;
  issues: DocumentationIssue[];
  summary: {
    totalIssues: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
  timestamp: string;
}

export interface GitHubActionResult {
  type: "issue" | "pull-request";
  url: string;
  number: number;
}

export interface AppConfig {
  githubToken: string;
  anthropicApiKey: string;
  tempDirectory: string;
}
