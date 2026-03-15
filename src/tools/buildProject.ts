import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { BuildProjectParams, ToolResult } from '../types';
import * as path from 'path';

export async function buildProject(
    params: BuildProjectParams, 
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

        const script = params.script || 'build';

        return new Promise((resolve) => {
            const proc = spawn('npm', ['run', script], { cwd, shell: true });
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
                    resolve({ success: true, output: `Build completed (npm run ${script})` });
                } else {
                    resolve({ success: false, error: `Build failed:\n${stderr}\n${stdout}`.trim() });
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
