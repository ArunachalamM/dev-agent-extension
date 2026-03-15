import * as vscode from 'vscode';
import { ReadFileParams, ToolResult } from '../types';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function readFile(
    params: ReadFileParams, 
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        let filePath = params.filePath;
        if (!path.isAbsolute(filePath) && workspaceFolder) {
            filePath = path.join(workspaceFolder, filePath);
        }

        if (cancellationToken.isCancellationRequested) {
            return { success: false, error: 'Operation cancelled' };
        }

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const content = await fs.readFile(filePath, 'utf-8');
        
        // Limit content length to avoid overwhelming the LLM
        const maxLength = 10000;
        const truncated = content.length > maxLength;
        const output = truncated 
            ? content.substring(0, maxLength) + '\n\n... [truncated]' 
            : content;

        return {
            success: true,
            output: output
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || String(error)
        };
    }
}
