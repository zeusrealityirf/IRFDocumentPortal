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
            const documents = await store.list();
            documents.sort((a, b) => b.updatedAt - a.updatedAt);
            list.replaceChildren();
            count.textContent = `${documents.length} ${documents.length === 1 ? 'draft' : 'drafts'}`;
            status.textContent = documents.length ? '' : 'No saved documents yet. Choose a template below and select Save draft.';
            for (const draft of documents) {
                const row = element('li', 'draft-row');
                const info = element('div', 'draft-info');
                const name = element('a', 'draft-title', draft.name);
                name.href = `editor.html?v=7&draft=${encodeURIComponent(draft.id)}`;
                info.append(name, element('span', 'draft-meta', `${names[draft.type] || 'Document'} · Saved ${dateFormat.format(draft.updatedAt)}`));
                const actions = element('div', 'draft-actions');
                const edit = element('a', 'draft-open', 'Continue editing →');
                edit.href = name.href;
                const remove = element('button', 'draft-delete', 'Delete');
                remove.type = 'button';
                remove.setAttribute('aria-label', `Delete ${draft.name}`);
                remove.addEventListener('click', async () => {
                    if (!confirm(`Delete “${draft.name}” from this browser? This cannot be undone.`)) return;
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

    renderLibrary();
    window.addEventListener('pageshow', renderLibrary);
    window.addEventListener('focus', renderLibrary);
})();
