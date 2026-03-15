import * as vscode from 'vscode';
import { EditFileParams, ToolResult } from '../types';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function editFile(
    params: EditFileParams, 
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

        // Read current content
        let content: string;
        try {
            content = await fs.readFile(filePath, 'utf-8');
        } catch {
            return { success: false, error: `File not found: ${filePath}` };
        }

        // Check if search string exists
        if (!content.includes(params.search)) {
            return { 
                success: false, 
                error: `Search text not found in file: "${params.search.substring(0, 50)}..."` 
            };
        }

        // Count occurrences
        const occurrences = content.split(params.search).length - 1;
        if (occurrences > 1) {
            return { 
                success: false, 
                error: `Search text found ${occurrences} times. Please provide more specific search text.` 
            };
        }

        // Replace
        const newContent = content.replace(params.search, params.replace);

        // Write back
        await fs.writeFile(filePath, newContent, 'utf-8');

        return {
            success: true,
            output: `File edited: ${path.basename(filePath)}`
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || String(error)
        };
    }
}
