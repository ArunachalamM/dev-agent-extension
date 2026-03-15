import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { NpmInstallParams, ToolResult } from '../types';
import * as path from 'path';

export async function npmInstall(
    params: NpmInstallParams, 
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            return { success: false, error: 'No workspace folder open' };
        }

        const cwd = params.workingDir 
            ? path.isAbsolute(params.workingDir) 
                ? params.workingDir 
                : path.join(workspaceFolder, params.workingDir)
            : workspaceFolder;

        const args = ['install'];
        
        if (params.packages && params.packages.length > 0) {
            args.push(...params.packages);
        }
        
        if (params.dev) {
            args.push('--save-dev');
        }

        return new Promise((resolve) => {
            const proc = spawn('npm', args, { cwd, shell: true });
            let stderr = '';

            const cancelListener = cancellationToken.onCancellationRequested(() => {
                proc.kill();
                resolve({ success: false, error: 'Operation cancelled' });
            });

            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                cancelListener.dispose();
                if (code === 0) {
                    resolve({
                        success: true,
                        output: params.packages 
                            ? `Installed: ${params.packages.join(', ')}` 
                            : 'Dependencies installed successfully'
                    });
                } else {
                    resolve({ success: false, error: stderr || `npm exited with code ${code}` });
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
