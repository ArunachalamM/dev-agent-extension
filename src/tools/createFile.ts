import * as vscode from 'vscode';
import { CreateFileParams, ToolResult } from '../types';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function createFile(
    params: CreateFileParams, 
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            return { success: false, error: 'No workspace folder open' };
        }

        let filePath = params.filePath;
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(workspaceFolder, filePath);
        }

        if (cancellationToken.isCancellationRequested) {
            return { success: false, error: 'Operation cancelled' };
        }

        // Check if file already exists
        try {
            await fs.access(filePath);
            return { 
                success: false, 
                error: `File already exists: ${filePath}. Use edit_file to modify existing files.` 
            };
        } catch {
            // File doesn't exist, which is what we want
        }

        // Create directory if needed
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // Write the file
        await fs.writeFile(filePath, params.content, 'utf-8');

        return {
            success: true,
            output: `Created file: ${path.basename(filePath)}`
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || String(error)
        };
    }
}
