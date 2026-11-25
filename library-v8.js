(() => {
    const list = document.getElementById('draft-list');
    const status = document.getElementById('library-status');
    const count = document.getElementById('library-count');
    const store = window.IRFDrafts;
    const names = {
        decree: "Prime Minister's Decree", appointment: 'Decree of Appointment',
        minutes: 'Cabinet Minutes', directive: 'Cabinet Directive',
        proposal: 'Federal Cabinet Proposal', bill: 'Imperial Bill'
    };
    const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    async function renderLibrary() {
        if (!store) {
            status.textContent = 'Open the hosted website to use the saved-document library.';
            return;
        }
        try {
            const { documents, cloudError } = await store.list();
            documents.sort((a, b) => b.updatedAt - a.updatedAt);
            list.replaceChildren();
            count.textContent = `${documents.length} ${documents.length === 1 ? 'draft' : 'drafts'}`;
            status.textContent = cloudError ? "Cloud drafts could not load. Local drafts are still available." : documents.length ? "" : "No saved documents yet. Choose a template below and select Save draft.";
            for (const draft of documents) {
                const row = element('li', 'draft-row');
                const info = element('div', 'draft-info');
                const name = element('a', 'draft-title', draft.name);
                name.href = `editor.html?v=8&draft=${encodeURIComponent(draft.id)}`;
                info.append(name, element('span', 'draft-meta', `${names[draft.type] || 'Document'} · ${store.isCloud(draft.id) ? 'Cloud account' : 'This device'} · Saved ${dateFormat.format(draft.updatedAt)}`));
                const actions = element('div', 'draft-actions');
                const edit = element('a', 'draft-open', 'Continue editing →');
                edit.href = name.href;
                const remove = element('button', 'draft-delete', 'Delete');
                remove.type = 'button';
                remove.setAttribute('aria-label', `Delete ${draft.name}`);
                remove.addEventListener('click', async () => {
                    if (!confirm(`Delete “${draft.name}” ${store.isCloud(draft.id) ? "from your cloud account" : "from this device"}? This cannot be undone.`)) return;
                    try {
                        await store.remove(draft.id);
                        await renderLibrary();
                    } catch (error) {
                        status.textContent = 'Could not delete this draft. Please try again.';
                    }
                });
                actions.append(edit, remove);
                row.append(info, actions);
                list.append(row);
            }
        } catch (error) {
            status.textContent = 'Saved documents are unavailable. Check your browser storage settings.';
            console.error('Draft storage:', error);
        }
    }

    const accountButton = document.getElementById('account-action');
    const accountLabel = document.getElementById('account-label');
    const accountStatus = document.getElementById('account-status');
    const auth = window.IRFAuth;
    async function showAccount() {
        try {
            if (!auth?.available) throw new Error('Sign-in service could not load. Local saving is available.');
            const current = await auth.session();
            accountLabel.textContent = current ? 'Signed in with Discord' : 'Not signed in';
            accountStatus.textContent = current ? (current.user.user_metadata?.full_name || current.user.user_metadata?.name || 'Cloud storage available') : 'Sign in to access documents across devices.';
            accountButton.textContent = current ? 'Sign out' : 'Sign in with Discord';
            accountButton.disabled = false;
            accountButton.onclick = async () => {
                accountButton.disabled = true;
                try {
                    if (current) { await auth.signOut(); await showAccount(); await renderLibrary(); }
                    else await auth.signIn();
                } catch (error) { accountStatus.textContent = error.message; accountButton.disabled = false; }
            };
        } catch (error) { accountLabel.textContent = 'Account unavailable'; accountStatus.textContent = error.message; }
    }
    showAccount();
    renderLibrary();
    window.addEventListener('pageshow', renderLibrary);
    window.addEventListener('focus', () => { showAccount(); renderLibrary(); });
})();
