import { promises as fs } from "node:fs";
import { basename, join } from "node:path";
import { type SimpleGit, simpleGit } from "simple-git";

export class GitOperations {
  private git: SimpleGit;
  private baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;
    this.git = simpleGit();
  }

  async cloneRepository(repoUrl: string): Promise<string> {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.baseDirectory, { recursive: true });

      // Generate unique directory name for this clone
      const repoName = basename(repoUrl, ".git");
      const timestamp = Date.now();
      const cloneDirectory = join(this.baseDirectory, `${repoName}-${timestamp}`);

      // Clone the repository
      await this.git.clone(repoUrl, cloneDirectory, {
        "--depth": 1, // Shallow clone for faster operation
        "--single-branch": null,
      });

      return cloneDirectory;
    } catch (error) {
      throw new Error(
        `Failed to clone repository ${repoUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async createBranch(repoPath: string, branchName: string): Promise<void> {
    try {
      const repoGit = simpleGit(repoPath);
      await repoGit.checkoutLocalBranch(branchName);
    } catch (error) {
      throw new Error(
        `Failed to create branch ${branchName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async commitChanges(repoPath: string, message: string, files?: string[]): Promise<void> {
    try {
      const repoGit = simpleGit(repoPath);

      if (files && files.length > 0) {
        // Add specific files
        await repoGit.add(files);
      } else {
        // Add all changes
        await repoGit.add(".");
      }

      await repoGit.commit(message);
    } catch (error) {
      throw new Error(
        `Failed to commit changes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async pushBranch(repoPath: string, branchName: string, remote = "origin"): Promise<void> {
    try {
      const repoGit = simpleGit(repoPath);
      await repoGit.push(remote, branchName, { "--set-upstream": null });
    } catch (error) {
      throw new Error(
        `Failed to push branch ${branchName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getRepositoryInfo(repoPath: string) {
    try {
      const repoGit = simpleGit(repoPath);
      const remotes = await repoGit.getRemotes(true);
      const status = await repoGit.status();
      const currentBranch = status.current;

      const originRemote = remotes.find((remote) => remote.name === "origin");

      return {
        currentBranch,
        remotes,
        originUrl: originRemote?.refs?.fetch,
        status,
      };
    } catch (error) {
      throw new Error(
        `Failed to get repository info: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    try {
      const repoGit = simpleGit(repoPath);
      const status = await repoGit.status();

      return (
        status.modified.length > 0 ||
        status.created.length > 0 ||
        status.deleted.length > 0 ||
        status.renamed.length > 0
      );
    } catch (error) {
      throw new Error(
        `Failed to check repository status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async cleanup(repoPath: string): Promise<void> {
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `Warning: Failed to cleanup directory ${repoPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async ensureCleanWorkingDirectory(repoPath: string): Promise<void> {
    const hasChanges = await this.hasUncommittedChanges(repoPath);
    if (hasChanges) {
      throw new Error("Repository has uncommitted changes. Cannot proceed with branch operations.");
    }
  }
}
