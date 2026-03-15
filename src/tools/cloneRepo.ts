import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { CloneRepoParams, ToolResult } from '../types';
import * as path from 'path';

export async function cloneRepo(
    params: CloneRepoParams, 
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            return { success: false, error: 'No workspace folder open' };
        }

        const destination = params.destination 
            ? path.isAbsolute(params.destination) 
                ? params.destination 
                : path.join(workspaceFolder, params.destination)
            : workspaceFolder;

        const args = ['clone', params.url];
        
        if (params.branch) {
            args.push('-b', params.branch);
        }
        
        args.push(destination);

        return new Promise((resolve) => {
            const proc = spawn('git', args, { shell: true });
            let stderr = '';

            const cancelListener = cancellationToken.onCancellationRequested(() => {
                proc.kill();
                resolve({ success: false, error: 'Operation cancelled' });
            });

            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                cancelListener.dispose();
                if (code === 0) {
                    resolve({ success: true, output: `Repository cloned to ${destination}` });
                } else {
                    resolve({ success: false, error: stderr || `Git exited with code ${code}` });
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
