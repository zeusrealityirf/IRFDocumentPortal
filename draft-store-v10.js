/* Browser-local document storage, shared by the portal and editor. */
(() => {
    if (location.protocol === 'file:') return;
    const scope = new URL('.', location.href).pathname;
    const databaseName = 'irf-documents:' + scope;
    let connection;

    function openDatabase() {
        if (!connection) {
            connection = new Promise((resolve, reject) => {
                const request = indexedDB.open(databaseName, 1);
                request.onupgradeneeded = () => {
                    request.result.createObjectStore('documents', { keyPath: 'id' });
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
                request.onblocked = () => reject(new Error('Close other editor tabs and retry.'));
            });
            connection.catch(() => { connection = null; });
        }
        return connection;
    }

    async function run(mode, operation) {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction('documents', mode);
            const request = operation(transaction.objectStore('documents'));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error || request.error);
            transaction.onabort = () => reject(transaction.error || new Error('Storage transaction cancelled.'));
        });
    }

    window.IRFLocalDrafts = {
        get: id => run('readonly', store => store.get(id)),
        list: () => run('readonly', store => store.getAll()),
        put: draft => run('readwrite', store => store.put(draft)),
        remove: id => run('readwrite', store => store.delete(id)),
        newId: () => crypto.randomUUID()
    };
})();
