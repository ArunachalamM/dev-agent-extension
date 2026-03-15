# Dev Agent Extension — User Guide

A step-by-step guide to using the Dev Agent extension after launching it.

---

## Table of Contents

1. [Launching the Extension](#1-launching-the-extension)
2. [What You'll See](#2-what-youll-see)
3. [Using the Chat Panel](#3-using-the-chat-panel)
4. [Example Prompts & Workflows](#4-example-prompts--workflows)
5. [Understanding Agent Responses](#5-understanding-agent-responses)
6. [Available Tools & Capabilities](#6-available-tools--capabilities)
7. [Tips & Best Practices](#7-tips--best-practices)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Launching the Extension

### Step 1: Open the Project
Open the `dev-agent-extension` folder in VS Code.

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Press F5
This launches the **Extension Development Host** — a new VS Code window with your extension loaded.

```
┌─────────────────────────────────────────────────────────────┐
│  VS Code Window 1 (Development)                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Your extension code                                 │   │
│  │  Press F5 here                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│                       Opens                                 │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  VS Code Window 2 (Extension Host)                   │   │
│  │  Your extension is running here!                     │   │
│  │  Open any project folder to test                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Open a Test Project
In the Extension Host window, open any folder (File → Open Folder) to test the agent on.

---

## 2. What You'll See

### Activity Bar Icon

A new icon appears in the **Activity Bar** (left sidebar):

```
┌────────────────────────────────────────────────────────┐
│ ┌────┐                                                 │
│ │ 📁 │  Explorer                                       │
│ ├────┤                                                 │
│ │ 🔍 │  Search                                         │
│ ├────┤                                                 │
│ │ 🔀 │  Source Control                                 │
│ ├────┤                                                 │
│ │ 🐛 │  Run and Debug                                  │
│ ├────┤                                                 │
│ │ 🔧 │  Extensions                                     │
│ ├────┤                                                 │
│ │ ⏱️ │  ← DEV AGENT (Click this!)                      │
│ └────┘                                                 │
└────────────────────────────────────────────────────────┘
```

### Chat Panel

Clicking the Dev Agent icon opens the **Chat Panel** in the sidebar:

```
┌─────────────────────────────────────────┐
│  Dev Agent Chat                   [🗑️]  │  ← Clear button
├─────────────────────────────────────────┤
│                                         │
│  (Empty - waiting for your prompt)      │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ What should I do?                   │ │  ← Input field
│ └─────────────────────────────────────┘ │
│ [ Send ]  [ Cancel ]                    │  ← Action buttons
└─────────────────────────────────────────┘
```

---

## 3. Using the Chat Panel

### Sending a Request

1. **Type your request** in the input field
2. **Press Enter** or click **Send**
3. **Watch the progress** as the agent plans and executes

### Visual Flow

```
┌─────────────────────────────────────────┐
│  Dev Agent Chat                   [🗑️]  │
├─────────────────────────────────────────┤
│                                         │
│  👤 You                                 │
│  ┌─────────────────────────────────────┐│
│  │ install lodash and axios            ││
│  └─────────────────────────────────────┘│
│                                         │
│  ◐ npm_install  (running...)            │  ← Progress indicator
│                                         │
│  ⏳ Thinking...                         │  ← Loading spinner
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ [ Send ]  [ Cancel ]                    │
└─────────────────────────────────────────┘
```

### After Completion

```
┌─────────────────────────────────────────┐
│  Dev Agent Chat                   [🗑️]  │
├─────────────────────────────────────────┤
│                                         │
│  👤 You                                 │
│  ┌─────────────────────────────────────┐│
│  │ install lodash and axios            ││
│  └─────────────────────────────────────┘│
│                                         │
│  ✓ npm_install                          │  ← Completed!
│                                         │
│  🤖 Agent                               │
│  ┌─────────────────────────────────────┐│
│  │ ## Execution Summary                ││
│  │                                     ││
│  │ Installing npm packages             ││
│  │                                     ││
│  │ ### Steps Completed:                ││
│  │ ✓ npm_install: Installed: lodash,   ││
│  │   axios                             ││
│  └─────────────────────────────────────┘│
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ What should I do?                   │ │
│ └─────────────────────────────────────┘ │
│ [ Send ]  [ Cancel ]                    │
└─────────────────────────────────────────┘
```

### Progress Status Icons

| Icon | Status | Meaning |
|------|--------|---------|
| ○ | Pending | Step queued, not started |
| ◐ | Running | Currently executing |
| ✓ | Completed | Successfully finished |
| ✗ | Failed | Error occurred |

---

## 4. Example Prompts & Workflows

### 📦 Project Setup

**Prompt:** `setup a new react project`

**What happens:**
1. Agent analyzes the request
2. Plans: clone template → npm install → build
3. Executes each step
4. Reports results

```
✓ clone_repo: Repository cloned to ./my-react-app
✓ npm_install: Dependencies installed successfully
✓ build_project: Build completed (npm run build)
```

---

### 🔧 Install Packages

**Prompt:** `install express, cors, and dotenv as dependencies`

**What happens:**
```
✓ npm_install: Installed: express, cors, dotenv
```

---

### 🐛 Fix Build Errors

**Prompt:** `fix the build errors`

**What happens:**
1. Agent reads current diagnostics from VS Code
2. Searches for relevant code
3. Applies fixes
4. Rebuilds to verify

```
✓ read_file: Read 150 lines from src/app.ts
✓ edit_file: File edited: app.ts
✓ build_project: Build completed
```

---

### 🔍 Search Codebase

**Prompt:** `find all TODO comments`

**What happens:**
```
✓ search_workspace: Found 12 matches:
  src/utils/helpers.ts:45: // TODO: Implement caching
  src/components/Header.tsx:12: // TODO: Add responsive design
  ...
```

---

### 📝 Create Files

**Prompt:** `create a .env.example file with DATABASE_URL and API_KEY placeholders`

**What happens:**
```
✓ create_file: Created file: .env.example
```

---

### 🧪 Run Tests

**Prompt:** `run the tests`

**What happens:**
```
✓ run_tests: Tests completed
  PASS  src/utils.test.ts
  PASS  src/app.test.ts
  
  Test Suites: 2 passed, 2 total
  Tests:       8 passed, 8 total
```

---

### 🖥️ Run Shell Commands

**Prompt:** `check the node version and list all global npm packages`

**What happens:**
```
✓ run_command: v20.11.0
✓ run_command: 
  ├── npm@10.2.4
  ├── typescript@5.4.2
  └── yarn@1.22.21
```

---

### 🔄 Multi-Step Workflows

**Prompt:** `clone https://github.com/user/repo, install dependencies, and run tests`

**What happens:**
```
✓ clone_repo: Repository cloned to ./repo
✓ npm_install: Dependencies installed successfully  
✓ run_tests: Tests completed (15 passed)
```

---

## 5. Understanding Agent Responses

### Response Structure

```markdown
## Execution Summary

Brief description of what was accomplished.

### Steps Completed:
✓ tool_name: Result message
✓ another_tool: Another result
✗ failed_tool: Error message (if any failed)
```

### Error Handling

When something fails:

```
┌─────────────────────────────────────────┐
│  🤖 Agent                               │
│  ┌─────────────────────────────────────┐│
│  │ ## Execution Summary                ││
│  │                                     ││
│  │ Attempted to build project          ││
│  │                                     ││
│  │ ### Steps Completed:                ││
│  │ ✓ npm_install: Dependencies         ││
│  │   installed                         ││
│  │ ✗ build_project: Build failed:      ││
│  │   Cannot find module 'react'        ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## 6. Available Tools & Capabilities

### Tool Reference

| Tool | What It Does | Example Prompt |
|------|--------------|----------------|
| `clone_repo` | Clones a Git repository | "clone the react starter template" |
| `npm_install` | Installs npm packages | "install axios and moment" |
| `build_project` | Runs npm build | "build the project" |
| `run_tests` | Runs npm test | "run all tests" |
| `read_file` | Reads file contents | "show me the package.json" |
| `edit_file` | Find & replace in files | "change the port from 3000 to 8080" |
| `create_file` | Creates new files | "create a README.md" |
| `search_workspace` | Searches for text | "find all console.log statements" |
| `run_command` | Runs shell commands | "check git status" |

### What the Agent CAN Do

✅ Install/update npm packages  
✅ Clone repositories  
✅ Build projects  
✅ Run tests  
✅ Create, read, and edit files  
✅ Search through your codebase  
✅ Run safe shell commands  
✅ Multi-step automated workflows  

### What the Agent CANNOT Do

❌ Access the internet (beyond git clone)  
❌ Run dangerous commands (rm -rf /, format, etc.)  
❌ Modify files outside the workspace  
❌ Access your credentials or secrets  
❌ Run indefinitely (5-10 min timeout per tool)  

---

## 7. Tips & Best Practices

### Be Specific

```
❌ "fix it"
✅ "fix the TypeScript error in src/app.ts on line 45"

❌ "install stuff"  
✅ "install lodash, moment, and axios as dependencies"

❌ "set up project"
✅ "clone https://github.com/example/repo and install dependencies"
```

### Use Natural Language

The agent understands context:

```
"The build is failing because of a missing import"
→ Agent will: read errors → find file → add import → rebuild

"I need a .gitignore for a Node project"
→ Agent will: create .gitignore with node_modules, .env, etc.
```

### Chain Multiple Tasks

```
"Install jest, create a basic test file for utils.ts, and run the tests"
→ Agent plans and executes all three steps
```

### Cancel Long Operations

If something is taking too long:
1. Click the **Cancel** button
2. The current operation will be stopped

### Clear History

Click the **Clear** button (🗑️) in the header to:
- Reset the conversation
- Start fresh with a new context

---

## 8. Troubleshooting

### "No language models available"

**Cause:** GitHub Copilot is not installed or not signed in.

**Fix:**
1. Install the GitHub Copilot extension
2. Sign in with your GitHub account
3. Ensure you have Copilot access
4. Restart VS Code

### "No workspace folder open"

**Cause:** You need an open folder to run tools.

**Fix:**
1. File → Open Folder
2. Select any project folder
3. Try your prompt again

### Tool Timeout

**Cause:** Operation took longer than 5-10 minutes.

**Fix:**
- Break the task into smaller steps
- Run commands manually for very long operations

### "Command blocked for security"

**Cause:** The agent detected a potentially dangerous command.

**Fix:**
- The agent blocks commands like `rm -rf /`, `format`, etc.
- Run these manually in terminal if truly needed

### Agent Gives Unexpected Plan

**Cause:** Ambiguous prompt.

**Fix:**
- Be more specific
- Include file paths, package names, or exact requirements
- Provide context: "In my React project..."

---

## Command Palette Alternatives

Besides the Chat Panel, you can also:

1. **Ctrl+Shift+P** → Type "Dev Agent"
2. Select **Dev Agent: Run Task**
3. Enter your prompt in the input box

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    DEV AGENT QUICK REFERENCE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LAUNCH:     F5 from extension project                      │
│  OPEN:       Click Dev Agent icon in Activity Bar           │
│  USE:        Type prompt → Send → Watch progress            │
│  CANCEL:     Click Cancel button                            │
│  CLEAR:      Click 🗑️ in header                             │
│                                                             │
│  GOOD PROMPTS:                                              │
│  • "install express and typescript"                         │
│  • "find all TODO comments in src/"                         │
│  • "create a utils/helpers.ts with slugify function"        │
│  • "run npm build and show errors"                          │
│  • "clone repo-url and install deps"                        │
│                                                             │
│  PROGRESS ICONS:                                            │
│  ○ Pending  ◐ Running  ✓ Done  ✗ Failed                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Try it out** — Press F5 and send your first prompt
2. **Experiment** — Try different types of requests
3. **Add tools** — Extend with your own custom tools (see README.md)
4. **Customize** — Modify the planner prompt for your use cases

Happy automating! 🚀
