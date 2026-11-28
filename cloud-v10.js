/* Public browser configuration. Never put administrative keys here. */
(() => {
    const local = window.IRFLocalDrafts;
    if (!local) return;
    const projectUrl = 'https://aigtruuaaturhuypvosr.supabase.co';
    const publishableKey = 'sb_publishable_Pk-lOR7YUO-ZEAkurQg2WA_Vy_0zaZ3';
    const client = window.supabase?.createClient(projectUrl, publishableKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const ready = (async () => {
        if (!client) return null;
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data.session;
    })();
    // Keep local editing available even if the authentication service is offline.
    ready.catch(() => {});
    async function session() {
        await ready;
        if (!client) return null;
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data.session;
    }
    async function requireUser() {
        const current = await session();
        if (!current) throw new Error('Sign in with Discord to access cloud documents.');
        return current.user;
    }
    function isCloud(id) { return typeof id === 'string' && id.startsWith('cloud-'); }
    function unpack(row) {
        return { ...row.content, id: 'cloud-' + row.id, name: row.name, type: row.type,
            updatedAt: Date.parse(row.updated_at), storage: 'cloud' };
    }
    window.IRFAuth = {
        available: Boolean(client), session,
        async signIn() {
            if (!client) throw new Error('Authentication could not load. Refresh and try again.');
            const redirectTo = new URL('index.html', location.href).href;
            const { error } = await client.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo } });
            if (error) throw error;
        },
        async signOut() {
            if (!client) return;
            const { error } = await client.auth.signOut({ scope: 'local' });
            if (error) throw error;
        }
    };
    window.IRFDrafts = {
        isCloud,
        newId: destination => (destination === 'cloud' ? 'cloud-' : '') + crypto.randomUUID(),
        async get(id) {
            if (!isCloud(id)) return local.get(id);
            const user = await requireUser();
            const { data, error } = await client.from('documents').select('id,name,type,content,updated_at')
                .eq('id', id.slice(6)).eq('user_id', user.id).maybeSingle();
            if (error) throw error;
            return data ? unpack(data) : null;
        },
        async list() {
            const documents = await local.list();
            let cloudError = null;
            try {
                const current = await session();
                if (current) {
                    // Fetch metadata only; signatures and document bodies load when opened.
                    const { data, error } = await client.from('documents').select('id,name,type,updated_at')
                        .eq('user_id', current.user.id).order('updated_at', { ascending: false });
                    if (error) throw error;
                    documents.push(...data.map(unpack));
                }
            } catch (error) { cloudError = error; }
            return { documents, cloudError };
        },
        async put(draft) {
            if (!isCloud(draft.id)) return local.put(draft);
            const user = await requireUser();
            const { id, name, type, paper, checklist, version } = draft;
            const { error } = await client.from('documents').upsert({
                id: id.slice(6), user_id: user.id, name, type,
                content: { paper, checklist, version }, updated_at: new Date().toISOString()
            }, { onConflict: 'id' }).select('id').single();
            if (error) throw error;
        },
        async remove(id) {
            if (!isCloud(id)) return local.remove(id);
            const user = await requireUser();
            const { error } = await client.from('documents').delete().eq('id', id.slice(6))
                .eq('user_id', user.id).select('id').single();
            if (error) throw error;
        }
    };
})();
