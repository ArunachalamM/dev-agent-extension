import * as vscode from 'vscode';
import { ToolCall, ToolResult, TOOL_DEFINITIONS } from '../types';

// Import tool implementations
import { cloneRepo } from '../tools/cloneRepo';
import { npmInstall } from '../tools/npmInstall';
import { buildProject } from '../tools/buildProject';
import { runTests } from '../tools/runTests';
import { readFile } from '../tools/readFile';
import { editFile } from '../tools/editFile';
import { searchWorkspace } from '../tools/searchWorkspace';
import { createFile } from '../tools/createFile';
import { runCommand } from '../tools/runCommand';

type ToolFunction = (params: any, token: vscode.CancellationToken) => Promise<ToolResult>;

export class ToolExecutor {
    private tools: Map<string, ToolFunction>;

    constructor() {
        // Register all tool implementations
        this.tools = new Map<string, ToolFunction>([
            ['clone_repo', cloneRepo],
            ['npm_install', npmInstall],
            ['build_project', buildProject],
            ['run_tests', runTests],
            ['read_file', readFile],
            ['edit_file', editFile],
            ['search_workspace', searchWorkspace],
            ['create_file', createFile],
            ['run_command', runCommand]
        ]);
    }

    async execute(step: ToolCall, cancellationToken: vscode.CancellationToken): Promise<ToolResult> {
        const toolFn = this.tools.get(step.tool);
        
        if (!toolFn) {
            return {
                success: false,
                error: `Unknown tool: ${step.tool}. Available tools: ${Array.from(this.tools.keys()).join(', ')}`
            };
        }

        // Validate parameters against schema
        const toolDef = TOOL_DEFINITIONS.find(t => t.name === step.tool);
        if (toolDef) {
            const validation = toolDef.schema.safeParse(step.params);
            if (!validation.success) {
                return {
                    success: false,
                    error: `Invalid parameters for ${step.tool}: ${validation.error.message}`
                };
            }
        }

        try {
            // Execute with timeout (5 minutes max)
            const timeoutMs = 5 * 60 * 1000;
            const result = await Promise.race([
                toolFn(step.params, cancellationToken),
                new Promise<ToolResult>((_, reject) => 
                    setTimeout(() => reject(new Error('Tool execution timed out')), timeoutMs)
                )
            ]);
            
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Get a list of all registered tools and their descriptions
     */
    getAvailableTools(): string[] {
        return TOOL_DEFINITIONS.map(t => `${t.name}: ${t.description}`);
    }
}
