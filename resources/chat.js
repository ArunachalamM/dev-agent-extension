(function () {
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loadingEl = document.getElementById('loading');

    function send() {
        const text = inputEl.value.trim();
        if (!text) return;

        vscode.postMessage({ command: 'send', text });
        inputEl.value = '';
    }

    function addMessage(role, content) {
        const div = document.createElement('div');
        div.className = 'message ' + role;
        div.innerHTML = `
            <div class="message-role">${role === 'user' ? '👤 You' : '🤖 Agent'}</div>
            <div class="message-content">${escapeHtml(content)}</div>
        `;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addProgress(icon, tool, status) {
        let progressDiv = document.querySelector(`.progress-item[data-tool="${tool}"]`);
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.className = 'progress-item';
            progressDiv.dataset.tool = tool;
            messagesEl.appendChild(progressDiv);
        }
        progressDiv.className = 'progress-item ' + status;
        progressDiv.textContent = icon + ' ' + tool;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') send();
    });
    cancelBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'cancel' });
    });
    clearBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'clear' });
    });

    window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.command) {
            case 'message':
                addMessage(msg.role, msg.content);
                break;
            case 'progress':
                addProgress(msg.icon, msg.tool, msg.status);
                break;
            case 'loading':
                loadingEl.classList.toggle('active', msg.value);
                sendBtn.disabled = msg.value;
                cancelBtn.disabled = !msg.value;
                break;
            case 'clear':
                messagesEl.innerHTML = '';
                break;
        }
    });
}());
