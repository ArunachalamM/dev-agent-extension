import { z } from 'zod';

// ============================================
// Tool Parameter Schemas
// ============================================

export const CloneRepoParamsSchema = z.object({
    url: z.string().url().describe('Git repository URL'),
    destination: z.string().optional().describe('Local folder path'),
    branch: z.string().optional().describe('Branch to checkout')
});

export const NpmInstallParamsSchema = z.object({
    workingDir: z.string().optional().describe('Directory containing package.json'),
    packages: z.array(z.string()).optional().describe('Specific packages to install'),
    dev: z.boolean().optional().describe('Install as dev dependencies')
});

export const BuildProjectParamsSchema = z.object({
    workingDir: z.string().optional().describe('Project directory'),
    script: z.string().optional().default('build').describe('NPM script to run')
});

export const RunTestsParamsSchema = z.object({
    workingDir: z.string().optional().describe('Project directory'),
    testPattern: z.string().optional().describe('Test file pattern')
});

export const ReadFileParamsSchema = z.object({
    filePath: z.string().describe('Absolute or workspace-relative file path')
});

export const EditFileParamsSchema = z.object({
    filePath: z.string().describe('File to edit'),
    search: z.string().describe('Text to find'),
    replace: z.string().describe('Replacement text')
});

export const SearchWorkspaceParamsSchema = z.object({
    query: z.string().describe('Search query'),
    filePattern: z.string().optional().describe('Glob pattern for files')
});

export const CreateFileParamsSchema = z.object({
    filePath: z.string().describe('Path for new file'),
    content: z.string().describe('File content')
});

export const RunCommandParamsSchema = z.object({
    command: z.string().describe('Shell command to execute'),
    workingDir: z.string().optional().describe('Working directory')
});

// ============================================
// Type Definitions
// ============================================

export type CloneRepoParams = z.infer<typeof CloneRepoParamsSchema>;
export type NpmInstallParams = z.infer<typeof NpmInstallParamsSchema>;
export type BuildProjectParams = z.infer<typeof BuildProjectParamsSchema>;
export type RunTestsParams = z.infer<typeof RunTestsParamsSchema>;
export type ReadFileParams = z.infer<typeof ReadFileParamsSchema>;
export type EditFileParams = z.infer<typeof EditFileParamsSchema>;
export type SearchWorkspaceParams = z.infer<typeof SearchWorkspaceParamsSchema>;
export type CreateFileParams = z.infer<typeof CreateFileParamsSchema>;
export type RunCommandParams = z.infer<typeof RunCommandParamsSchema>;

// ============================================
// Tool Definitions
// ============================================

export interface ToolDefinition {
    name: string;
    description: string;
    schema: z.ZodObject<any>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
    {
        name: 'clone_repo',
        description: 'Clone a git repository to the local workspace',
        schema: CloneRepoParamsSchema
    },
    {
        name: 'npm_install',
        description: 'Install npm dependencies in a project',
        schema: NpmInstallParamsSchema
    },
    {
        name: 'build_project',
        description: 'Build a project using npm scripts',
        schema: BuildProjectParamsSchema
    },
    {
        name: 'run_tests',
        description: 'Run tests in a project',
        schema: RunTestsParamsSchema
    },
    {
        name: 'read_file',
        description: 'Read the contents of a file',
        schema: ReadFileParamsSchema
    },
    {
        name: 'edit_file',
        description: 'Edit a file by replacing text',
        schema: EditFileParamsSchema
    },
    {
        name: 'search_workspace',
        description: 'Search for text in the workspace',
        schema: SearchWorkspaceParamsSchema
    },
    {
        name: 'create_file',
        description: 'Create a new file with content',
        schema: CreateFileParamsSchema
    },
    {
        name: 'run_command',
        description: 'Run a shell command',
        schema: RunCommandParamsSchema
    }
];

// ============================================
// Agent Types
// ============================================

export interface ToolCall {
    tool: string;
    params: Record<string, unknown>;
    reasoning?: string;
}

export interface AgentPlan {
    steps: ToolCall[];
    summary: string;
    directResponse?: string;  // For conversational queries that don't need tools
}

export interface ToolResult {
    success: boolean;
    output?: string;
    error?: string;
}

export interface AgentStep {
    tool: string;
    params: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: ToolResult;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface AgentContext {
    workspaceFolder: string;
    currentFile?: string;
    diagnostics?: string[];
    conversationHistory: ChatMessage[];
}
