import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { SearchWorkspaceParams, ToolResult } from '../types';

export async function searchWorkspace(
    params: SearchWorkspaceParams, 
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    try {
        if (cancellationToken.isCancellationRequested) {
            return { success: false, error: 'Operation cancelled' };
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return { success: false, error: 'No workspace folder open' };
        }

        // Build glob pattern
        const pattern = params.filePattern || '**/*.{ts,js,json,md,tsx,jsx,css,html}';
        const include = new vscode.RelativePattern(workspaceFolder, pattern);

        // Find files matching the pattern
        const files = await vscode.workspace.findFiles(include, '**/node_modules/**', 100);
        
        if (cancellationToken.isCancellationRequested) {
            return { success: false, error: 'Operation cancelled' };
        }

        const results: string[] = [];
        const query = params.query.toLowerCase();

        // Search in each file
        for (const file of files) {
            if (cancellationToken.isCancellationRequested) {
                break;
            }

            try {
                const content = await fs.readFile(file.fsPath, 'utf-8');
                const lines = content.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(query)) {
                        const relativePath = vscode.workspace.asRelativePath(file);
                        const preview = lines[i].trim().substring(0, 100);
                        results.push(`${relativePath}:${i + 1}: ${preview}`);
                        
                        if (results.length >= 50) break;
                    }
                }
                
                if (results.length >= 50) break;
            } catch {
                // Skip files that can't be read
            }
        }

        if (results.length === 0) {
            return {
                success: true,
                output: `No results found for: "${params.query}"`
            };
        }

        return {
            success: true,
            output: `Found ${results.length} matches:\n${results.slice(0, 20).join('\n')}${results.length > 20 ? '\n... and more' : ''}`
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || String(error)
        };
    }
}
