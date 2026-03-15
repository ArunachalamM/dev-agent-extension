import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { RunCommandParams, ToolResult } from '../types';
import * as path from 'path';

// List of blocked dangerous commands
const BLOCKED_PATTERNS = [
    /rm\s+-rf\s+\//, // rm -rf /
    /format\s+[a-z]:/i, // format c:
    /del\s+\/s\s+\/q/i, // del /s /q
    /:(){ :|:&};:/, // fork bomb
    />\s*\/dev\/sd[a-z]/i, // writing to disk devices
    /mkfs\./i, // filesystem formatting
];

export async function runCommand(
    params: RunCommandParams, 
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    try {
        // Security check - block dangerous commands
        for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(params.command)) {
                return { 
                    success: false, 
                    error: 'Command blocked for security reasons' 
                };
            }
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            return { success: false, error: 'No workspace folder open' };
        }

        const cwd = params.workingDir 
            ? path.isAbsolute(params.workingDir) 
                ? params.workingDir 
                : path.join(workspaceFolder, params.workingDir)
            : workspaceFolder;

        return new Promise((resolve) => {
            const proc = spawn(params.command, { cwd, shell: true });
            let stdout = '';
            let stderr = '';

            const cancelListener = cancellationToken.onCancellationRequested(() => {
                proc.kill();
                resolve({ success: false, error: 'Operation cancelled' });
            });

            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                cancelListener.dispose();
                if (code === 0) {
                    resolve({ success: true, output: stdout || 'Command completed' });
                } else {
                    resolve({ success: false, error: stderr || `Command exited with code ${code}` });
                }
            });

            proc.on('error', (err) => {
                cancelListener.dispose();
                resolve({ success: false, error: err.message });
            });
        });

    } catch (error: any) {
        return {
            success: false,
            error: error.message || String(error)
        };
    }
}
