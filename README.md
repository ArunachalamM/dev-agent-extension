# Dev Agent Extension

AI-powered developer automation agent for VS Code using GitHub Copilot's Language Model API.

## Features

- 🤖 **AI-Powered Planning** — Uses Copilot's LLM to understand your request and create execution plans
- 🔧 **Tool Execution** — Automates common dev tasks: git, npm, file operations, shell commands
- 💬 **Chat Interface** — Interactive sidebar panel for conversational automation
- ⚡ **Cancellable Operations** — Stop long-running tasks anytime
- 🔒 **Security Built-in** — Dangerous commands are blocked, parameters are validated

## Architecture

```
User Prompt → Planner (Copilot LLM) → Tool Executor → Results
```

The agent separates reasoning (Copilot) from execution (your tools):

```
src/
├── agent/
│   ├── devAgent.ts      # Main orchestrator
│   ├── planner.ts       # LLM integration (vscode.lm API)
│   └── toolExecutor.ts  # Tool dispatcher
├── tools/
│   ├── cloneRepo.ts     # Git clone
│   ├── npmInstall.ts    # npm install
│   ├── buildProject.ts  # npm run build
│   ├── runTests.ts      # npm test
│   ├── readFile.ts      # Read file contents
│   ├── editFile.ts      # Find & replace in file
│   ├── createFile.ts    # Create new file
│   ├── searchWorkspace.ts  # Text search
│   └── runCommand.ts    # Shell commands (sandboxed)
├── ui/
│   └── chatProvider.ts  # Chat panel webview
├── extension.ts         # Extension entry point
└── types.ts             # TypeScript types & schemas
```

## Prerequisites

- **VS Code 1.90+** (for Language Model API)
- **GitHub Copilot extension** installed and signed in
- **Node.js 18+**
- **Git** (for clone_repo tool)

## Setup

1. **Install dependencies**

```bash
cd dev-agent-extension
npm install
```

2. **Compile**

```bash
npm run compile
```

3. **Run in VS Code**

Press `F5` to launch the Extension Development Host.

## Usage

1. Click the **Dev Agent** icon in the Activity Bar
2. Type your request in the chat panel:
   - `"setup react project"`
   - `"install lodash and moment"`
   - `"fix the build errors"`
   - `"search for TODO comments"`
3. Watch the agent plan and execute steps

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `clone_repo` | Clone a git repository | `url`, `destination?`, `branch?` |
| `npm_install` | Install npm packages | `workingDir?`, `packages?`, `dev?` |
| `build_project` | Run npm build script | `workingDir?`, `script?` |
| `run_tests` | Run npm tests | `workingDir?`, `testPattern?` |
| `read_file` | Read file contents | `filePath` |
| `edit_file` | Find & replace in file | `filePath`, `search`, `replace` |
| `create_file` | Create new file | `filePath`, `content` |
| `search_workspace` | Search for text | `query`, `filePattern?` |
| `run_command` | Run shell command | `command`, `workingDir?` |

## Adding Custom Tools

1. Create a new file in `src/tools/`:

```typescript
import * as vscode from 'vscode';
import { ToolResult } from '../types';

export async function myTool(
    params: { /* your params */ }, 
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    // Implementation
    return { success: true, output: 'Done!' };
}
```

2. Add the schema in `src/types.ts`:

```typescript
export const MyToolParamsSchema = z.object({
    myParam: z.string().describe('Description for LLM')
});

// Add to TOOL_DEFINITIONS array
```

3. Register in `src/agent/toolExecutor.ts`:

```typescript
import { myTool } from '../tools/myTool';

// In constructor:
this.tools.set('my_tool', myTool);
```

## Configuration

The extension uses VS Code's Language Model API (`vscode.lm`). It automatically selects an available Copilot model.

## Development

```bash
# Watch mode
npm run watch

# Lint
npm run lint

# Package extension
npx vsce package
```

## Security

- The `run_command` tool blocks dangerous patterns (rm -rf /, format, fork bombs, etc.)
- All tool parameters are validated with Zod schemas
- File paths are restricted to the workspace
- Operations have 5-10 minute timeouts

## Troubleshooting

**"No language models available"**
- Ensure GitHub Copilot is installed and you're signed in
- Check that Copilot is enabled for your account

**"Tool timeout"**
- Long operations (npm install, builds) have 5-10 minute limits
- For longer tasks, consider breaking them into smaller steps

**"Command blocked for security"**
- The agent blocks potentially dangerous shell commands
- Review the blocked patterns in `src/tools/runCommand.ts`

## License

MIT

## Contributing

Pull requests welcome! Please ensure:
- TypeScript strict mode passes
- New tools have Zod schemas
- Security implications are considered
