(async () => {
    const sourceScript = document.currentScript;
    const drafts = window.IRFDrafts;
    const requestedDraft = drafts ? new URLSearchParams(location.search).get('draft') : null;
    let savedDraft = null;

    // Restore the editable source before attaching any editing listeners.
    if (requestedDraft) {
        try {
            savedDraft = await drafts.get(requestedDraft);
            if (!savedDraft || savedDraft.version !== 1) throw new Error('This draft could not be found in this browser.');
            const original = document.getElementById('paper');
            const artwork = new Map([...original.querySelectorAll('[data-artwork]')]
                .map(image => [image.dataset.artwork, image.getAttribute('src')]));
            const template = document.createElement('template');
            template.innerHTML = savedDraft.paper;
            const restored = template.content.firstElementChild;
            if (!restored || restored.id !== 'paper') throw new Error('The saved draft is invalid.');
            restored.querySelectorAll('[data-artwork]').forEach(image => {
                const src = artwork.get(image.dataset.artwork);
                if (src) image.setAttribute('src', src);
            });
            original.replaceWith(restored);
            document.querySelectorAll('[data-checklist]').forEach((input, index) => {
                input.checked = Boolean(savedDraft.checklist?.[index]);
                input.toggleAttribute('checked', input.checked);
            });
        } catch (error) {
            alert(error.message + ' Return to Saved documents to open an existing draft.');
            location.replace('index.html#saved-documents');
            return;
        }
    }
    const paper = document.getElementById('paper');
    const articles = document.getElementById('articles');
    const preview = document.getElementById('preview-pages');
    const workspace = document.getElementById('workspace');
    const documentType = document.getElementById('doc-type');
    const cabinetModes = ['minutes', 'directive'];
    const documentNames = {
        decree: "Prime Minister's Decree",
        appointment: 'Decree of Appointment',
        minutes: 'Cabinet Minutes',
        directive: 'Cabinet Directive', proposal: 'Federal Cabinet Proposal', bill: 'Imperial Bill'
    };
    const fileNames = {
        decree: 'IRF-Decree', appointment: 'IRF-Appointment',
        minutes: 'IRF-Cabinet-Minutes', directive: 'IRF-Cabinet-Directive', proposal: 'IRF-Cabinet-Proposal', bill: 'IRF-Imperial-Bill'
    };
    const legislationModes = ['proposal', 'bill'];
    const isLegislation = () => legislationModes.includes(documentType.value);
    const isCabinet = () => cabinetModes.includes(documentType.value);
    const assetStore = document.getElementById('embedded-assets');
    const embeddedAssets = assetStore ? JSON.parse(assetStore.textContent) : {};
    const assetReady = loadArtwork();
    let artworkLoaded = false;
    assetReady.then(() => { artworkLoaded = true; }).catch(() => {});
    let previewTimer = 0, isRendering = false;
    const byId = id => document.getElementById(id);
    // Artwork must be embedded before the browser can rasterise an SVG page.

    async function loadArtwork() {
        const artwork = [...document.querySelectorAll('[data-artwork]')];
        const sources = new Map();
        for (const element of artwork) {
            const key = element.dataset.artwork;
            const attribute = element.tagName === 'LINK' ? 'href' : 'src';
            if (!sources.has(key)) {
                sources.set(key, (async () => {
                    if (embeddedAssets[key])
                        return embeddedAssets[key];
                    const response = await fetch(element.getAttribute(attribute));
                    if (!response.ok)
                        throw new Error('Could not load ' + key);
                    const blob = await response.blob();
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                })());
            }
            element.setAttribute(attribute, await sources.get(key));
        }
    }
    // Export a portable copy, even when the website uses separate CSS and JS files.

    async function makePortableCopy() {
        await assetReady;
        const clone = document.documentElement.cloneNode(true);
        clone.querySelector('#preview-pages').replaceChildren();
        // A downloaded document is independent of the hosted portal.
        clone.querySelector('#portal-home')?.remove();
        const brandLink = clone.querySelector('#brand-home');
        if (brandLink) {
            const identity = document.createElement('div');
            identity.className = 'app-identity';
            brandLink.querySelector('.brand-return')?.remove();
            identity.append(...brandLink.childNodes);
            brandLink.replaceWith(identity);
        }
        clone.querySelector('#draft-controls')?.remove();
        clone.querySelector('#save-draft')?.remove();
        clone.querySelector('#draft-store-script')?.remove();
        const note = clone.querySelector('.sidebar-note');
        if (note) note.textContent = 'Download editable HTML to keep your changes.';
        clone.querySelector('#workspace').classList.remove('preview-only', 'editor-only');
        const stylesheet = document.getElementById('editor-styles');
        if (stylesheet.tagName === 'LINK') {
            const response = await fetch(stylesheet.href);
            if (!response.ok)
                throw new Error('Could not load the stylesheet.');
            const inlineStyle = document.createElement('style');
            inlineStyle.id = 'editor-styles';
            inlineStyle.textContent = await response.text();
            clone.querySelector('#editor-styles').replaceWith(inlineStyle);
        }
        if (sourceScript.src) {
            const response = await fetch(sourceScript.src);
            if (!response.ok)
                throw new Error('Could not load the editor script.');
            const inlineScript = document.createElement('script');
            inlineScript.id = 'editor-script';
            inlineScript.textContent = await response.text();
            clone.querySelector('#editor-script').replaceWith(inlineScript);
        }
        const artwork = {};
        clone.querySelector('#paper').style.removeProperty('background-image');
        clone.querySelectorAll('[data-artwork]').forEach(element => {
            const attribute = element.tagName === 'LINK' ? 'href' : 'src';
            artwork[element.dataset.artwork] = element.getAttribute(attribute);
            element.removeAttribute(attribute);
        });
        let store = clone.querySelector('#embedded-assets');
        if (!store) {
            store = document.createElement('script');
            store.id = 'embedded-assets';
            store.type = 'application/json';
            clone.querySelector('#editor-script').before(store);
        }
        store.textContent = JSON.stringify(artwork);
        return '<!DOCTYPE html>\n' + clone.outerHTML;
    }
    // Document editing

    function numberArticles() {
        [...articles.children].forEach((a, i) => {
            a.querySelector('.article-no').textContent = (i + 1) + '.';
            a.querySelector('.remove').setAttribute('aria-label', 'Remove article ' + (i + 1));
        });
    }

    function addArticle(focus = false) {
        const el = document.createElement('div');
        el.className = 'article';
        el.innerHTML = '<div class="article-no"></div><div><div class="article-head edit" contenteditable="true" role="textbox" aria-label="Article heading" data-placeholder="Article heading"></div><div class="article-body edit" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article text" data-placeholder="Enter the provisions of this article."></div></div><button class="remove" type="button" title="Remove article">×</button>';
        articles.append(el);
        numberArticles();
        if (focus)
            el.querySelector('.article-head').focus();
        schedulePreview();
    }
    if (!articles.children.length && !paper.dataset.initialized) {
        for (let i = 0; i < 3; i++)
            addArticle();
        paper.dataset.initialized = 'true';
    }

    function schedulePreview() {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(renderPreview, 90);
    }

    function cloneForPreview(el) {
        const c = el.cloneNode(true);
        c.removeAttribute('id');
        c.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
        [c, ...c.querySelectorAll('[contenteditable]')].forEach(x => {
            x.removeAttribute('contenteditable');
            x.removeAttribute('role');
            x.removeAttribute('aria-multiline');
        });
        c.querySelectorAll('.remove,.signature-tools').forEach(x => x.remove());
        return c;
    }

    function getEditableText(el) {
        return el.innerText.replace(/\r/g, '').replace(/\n$/, '');
    }
    // A4 preview pages

    function createPreviewPage() {
        const wrap = document.createElement('div');
        wrap.className = 'page-wrap';
        const caption = document.createElement('div');
        caption.className = 'page-caption';
        const title = document.createElement('span');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Download page PNG';
        caption.append(title, btn);
        const p = document.createElement('article');
        p.className = 'paper preview-page ' + [...paper.classList].filter(x => x !== 'paper').join(' ');
        const content = document.createElement('div');
        content.className = 'page-content';
        const end = document.createElement('div');
        end.className = 'page-end';
        end.innerHTML = '<span></span><span></span>';
        end.firstElementChild.textContent = isCabinet()
            ? (documentType.value === 'directive' ? 'OFFICE OF THE CABINET CLERK' : 'FEDERAL CABINET')
            : 'OFFICE OF THE PRIME MINISTER';
        if (isLegislation()) {
            const letterhead = document.createElement('img');
            letterhead.className = 'legislation-page-art';
            letterhead.alt = '';
            letterhead.src = paper.querySelector(`[data-artwork="${documentType.value}-letterhead"]`).src;
            p.append(letterhead);
            end.firstElementChild.textContent = documentType.value === 'bill'
                ? `Written by ${byId('bill-author').textContent.trim()} on ${byId('bill-written-date').textContent.trim()}`
                : '';
            if (documentType.value === 'bill' && !byId('bill-author').textContent.trim() && !byId('bill-written-date').textContent.trim())
                end.firstElementChild.textContent = '';
        }
        if (isCabinet()) {
            const background = document.createElement('img');
            background.className = 'cabinet-page-art';
            background.alt = '';
            background.src = paper.querySelector('[data-artwork="cabinet-paper"]').src;
            p.append(background);
        }
        p.append(content, end);
        wrap.append(caption, p);
        preview.append(wrap);
        btn.onclick = () => exportPagePng(p, [...preview.children].indexOf(wrap) + 1);
        return { wrap, p, content, end, title };
    }

    function pageHasRoom(currentPage) {
        const scale = currentPage.p.getBoundingClientRect().width / currentPage.p.offsetWidth || 1;
        return currentPage.content.getBoundingClientRect().bottom <= currentPage.end.getBoundingClientRect().top - 8 * scale
            && currentPage.end.getBoundingClientRect().bottom <= currentPage.p.getBoundingClientRect().bottom - 40 * scale;
    }
    // Measure on actual A4-width output, not guessed character counts. Split long editable text at word boundaries, or characters for unbroken strings.

    function belongsToDocument(element) {
        const type = documentType.value;
        const classes = element.classList;
        if (classes.contains('cabinet-assets')) return false;
        if (classes.contains('report-only') && (type !== 'directive' || paper.dataset.report !== 'true')) return false;
        if (classes.contains('proposal-only')) return type === 'proposal';
        if (classes.contains('bill-only')) return type === 'bill';
        if (classes.contains('minutes-only')) return type === 'minutes';
        if (classes.contains('directive-only')) return type === 'directive';
        if (classes.contains('appointment-only')) return type === 'appointment';
        if (classes.contains('decree-only')) return type === 'decree';
        if (classes.contains('pm-only')) return type === 'decree' || type === 'appointment';
        return false;
    }

    function showActiveSections() {
        for (const section of paper.children) section.hidden = !belongsToDocument(section);
    }

    // Fit the screen representation to the available workspace. The A4 sheet
    // still measures 210 × 297 mm at export time.
    function fitSheets() {
        const style = getComputedStyle(workspace);
        const available = workspace.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const split = !workspace.classList.contains('editor-only') && !workspace.classList.contains('preview-only')
            && window.innerWidth > 1120;
        const width = split ? (available - 20) / 2 : available;
        const previewScale = Math.min(1, Math.max(.2, width / (210 * 96 / 25.4)));
        // Keep editing legible on narrow screens; the source sheet can scroll.
        const editorScale = split ? previewScale : Math.min(1, Math.max(.76, previewScale));
        for (const [name, scale] of [['editor', editorScale], ['preview', previewScale]]) {
            workspace.style.setProperty(`--${name}-scale`, scale);
            workspace.style.setProperty(`--${name}-width`, `${210 * 96 / 25.4 * scale}px`);
        }
    }

    function renderPreview() {
        clearTimeout(previewTimer);
        if (isRendering || !artworkLoaded)
            return;
        isRendering = true;
        fitSheets();
        numberArticles();
        numberMeetingItems();
        showActiveSections();
        const editor = paper.parentElement;
        const restoreEditor = editor.getAttribute("style");
        if (!editor.getClientRects().length) {
            editor.style.setProperty("display", "block", "important");
            editor.style.setProperty("position", "absolute", "important");
            editor.style.setProperty("left", "-12000px", "important");
            editor.style.setProperty("top", "0", "important");
            editor.style.setProperty("opacity", "0", "important");
            editor.style.setProperty("visibility", "visible", "important");
        }
        preview.replaceChildren();
        const hidden = workspace.classList.contains('editor-only');
        if (hidden) {
            workspace.classList.remove('editor-only');
            preview.parentElement.classList.add('page-measuring');
        }
        let pages = [], currentPage;
        function next() {
            currentPage = createPreviewPage();
            pages.push(currentPage);
            return currentPage;
        }
        if (isCabinet()) {
            const cover = next();
            cover.p.classList.add('cabinet-cover');
            cover.p.querySelector('.cabinet-page-art').src = paper.querySelector(`[data-artwork="${documentType.value}-cover"]`).src;
        }
        next();
        function addBlock(node) {
            currentPage.content.append(node);
            if (!pageHasRoom(currentPage) && currentPage.content.children.length > 1) {
                node.remove();
                next();
                currentPage.content.append(node);
            }
            return node;
        }
        function splitText(text, make) {
            if (!text) {
                addBlock(make('', false));
                return;
            }
            let rest = text, continuation = false;
            while (rest.length) {
                let whole = make(rest, continuation);
                currentPage.content.append(whole);
                if (pageHasRoom(currentPage))
                    break;
                whole.remove();
                let lo = 1, hi = rest.length - 1, best = 0;
                while (lo <= hi) {
                    let mid = (lo + hi) >> 1;
                    let candidate = make(rest.slice(0, mid), continuation);
                    currentPage.content.append(candidate);
                    let good = pageHasRoom(currentPage);
                    candidate.remove();
                    if (good) {
                        best = mid;
                        lo = mid + 1;
                    }
                    else
                        hi = mid - 1;
                }
                if (best === 0) {
                    if (currentPage.content.children.length) {
                        next();
                        continue;
                    } // an oversized heading alone is exceptional; avoid endless loops
                    best = Math.min(rest.length, 1);
                }
                let cut = best;
                if (best < rest.length) {
                    let boundary = rest.slice(0, best + 1).search(/\s+\S*$/);
                    if (boundary > 0 && boundary >= best - 80 && boundary >= best * .6)
                        cut = boundary;
                }
                let piece = rest.slice(0, cut).replace(/[ \t]+$/, '');
                if (!piece)
                    piece = rest.slice(0, cut);
                currentPage.content.append(make(piece, continuation));
                rest = rest.slice(cut).replace(/^[ \t]+/, '');
                if (rest.startsWith('\n'))
                    rest = rest.slice(1);
                continuation = true;
                if (rest)
                    next();
            }
        }
        for (const el of paper.children) {
            if (!belongsToDocument(el))
                continue;
            if (el.dataset.pageBreak && currentPage.content.children.length)
                next();
            if (el.classList.contains('legislation-author')) continue;
            if (el.classList.contains('legislation-list')) {
                const entries = [...el.querySelectorAll('.legislation-item')];
                entries.forEach((item, index) => {
                    splitText(getEditableText(item.querySelector('.legislation-text')), (text, continued) => {
                        const block = document.createElement('div');
                        if (index === 0 && !continued) block.append(cloneForPreview(el.querySelector('h3')));
                        const entry = cloneForPreview(item);
                        entry.querySelector('.legislation-text').textContent = text;
                        if (continued) entry.querySelector('.legislation-item-heading').remove();
                        block.append(entry);
                        return block;
                    });
                });
            } else if (el.classList.contains('legislation-section')) {
                splitText(getEditableText(el.querySelector('.legislation-text')), (text, continued) => {
                    const section = cloneForPreview(el);
                    section.querySelector('.legislation-text').textContent = text;
                    if (continued) section.querySelector('h3').remove();
                    return section;
                });
            } else if (el.id === 'minutes-items') {
                for (const item of el.children) {
                    if (item.classList.contains('proposal-block')) {
                        // Repeat the table heading when a proposal table crosses a page.
                        let table;
                        function startTable() {
                            table = cloneForPreview(item.querySelector('table'));
                            table.tBodies[0].replaceChildren();
                            currentPage.content.append(table);
                        }
                        startTable();
                        for (const row of item.querySelectorAll('tbody tr')) {
                            const entry = cloneForPreview(row);
                            table.tBodies[0].append(entry);
                            if (!pageHasRoom(currentPage) && (table.tBodies[0].rows.length > 1 || currentPage.content.children.length > 1)) {
                                entry.remove();
                                if (!table.tBodies[0].rows.length) table.remove();
                                next();
                                startTable();
                                table.tBodies[0].append(entry);
                            }
                        }
                    } else {
                        splitText(getEditableText(item.querySelector('.cabinet-text')), (text, continued) => {
                            const node = cloneForPreview(item);
                            node.querySelector('.cabinet-text').textContent = text;
                            if (continued) {
                                node.querySelector('.cabinet-item-head').remove();
                                node.classList.add('continued-item');
                            }
                            return node;
                        });
                    }
                }
            }
            else if (el.classList.contains('report-section') && !el.classList.contains('report-stats')) {
                splitText(getEditableText(el.querySelector('.cabinet-text')), (text, continued) => {
                    const node = cloneForPreview(el);
                    node.querySelector('.cabinet-text').textContent = text;
                    if (continued) node.querySelector('strong').remove();
                    return node;
                });
            }
            else if (el === articles) {
                for (const a of articles.children) {
                    const text = getEditableText(a.querySelector('.article-body'));
                    const make = (t, cont) => {
                        const n = cloneForPreview(a);
                        n.querySelector('.article-body').textContent = t;
                        if (cont) {
                            n.classList.add('continuation');
                            n.querySelector('.article-no').textContent = '';
                            n.querySelector('.article-head').remove();
                        }
                        return n;
                    }; // keep heading with at least some body, move a whole short article where possible
                    let whole = make(text, false);
                    currentPage.content.append(whole);
                    if (pageHasRoom(currentPage))
                        continue;
                    whole.remove();
                    let old = currentPage;
                    if (currentPage.content.children.length) {
                        const test = next();
                        test.content.append(whole);
                        if (pageHasRoom(test))
                            continue;
                        whole.remove();
                        test.wrap.remove();
                        pages.pop();
                        currentPage = old;
                    }
                    splitText(text, make);
                }
            }
            else if ((el.classList.contains('preamble') || el.classList.contains('appointment-body') || el.classList.contains('directive-text'))) {
                splitText(getEditableText(el), (t, cont) => {
                    let n = cloneForPreview(el);
                    n.textContent = t;
                    if (cont)
                        n.style.minHeight = '0';
                    return n;
                });
            }
            else if (el.classList.contains('bottom')) {
                addBlock(cloneForPreview(el.querySelector('.closing')));
            }
            else {
                addBlock(cloneForPreview(el));
            }
        }
        pages.forEach((x, i) => {
            x.title.textContent = 'Page ' + (i + 1) + ' of ' + pages.length + (x.p.classList.contains('cabinet-cover') ? ' · Cover' : '');
            x.end.lastElementChild.textContent = 'Page ' + (i + 1) + (isLegislation() ? ' of ' : ' / ') + pages.length;
        });
        byId('page-count').textContent = pages.length + ' A4 ' + (pages.length === 1 ? 'page' : 'pages');
        if (hidden) {
            preview.parentElement.classList.remove('page-measuring');
            workspace.classList.add('editor-only');
        }
        if (restoreEditor === null)
            editor.removeAttribute("style");
        else
            editor.setAttribute("style", restoreEditor);
        isRendering = false;
    }
    const meetingItems = byId('minutes-items');
    const proposalRows = byId('proposal-rows');
    const meetingItemTemplate = meetingItems.querySelector('.cabinet-item').cloneNode(true);
    const proposalTemplate = proposalRows.firstElementChild.cloneNode(true);

    function numberMeetingItems() {
        [...meetingItems.querySelectorAll('.cabinet-item')].forEach((item, index) => {
            item.querySelector('.cabinet-item-no').textContent = String(index + 1).padStart(2, '0');
        });
    }

    function blankCopy(template) {
        const item = template.cloneNode(true);
        item.querySelectorAll('.edit').forEach(field => field.textContent = '');
        return item;
    }

    byId('add-minute').onclick = () => {
        const item = blankCopy(meetingItemTemplate);
        item.querySelector('.cabinet-text').dataset.placeholder = 'Record discussion, decisions and actions.';
        meetingItems.append(item);
        numberMeetingItems();
        item.querySelector('.cabinet-item-title').focus();
        schedulePreview();
    };
    meetingItems.addEventListener('click', event => {
        const button = event.target.closest('.cabinet-remove');
        if (!button) return;
        const item = button.closest('.cabinet-item');
        if (meetingItems.querySelectorAll('.cabinet-item').length === 1) {
            alert('Keep at least one meeting item.');
            return;
        }
        if (confirm('Remove this meeting item?')) {
            item.remove();
            numberMeetingItems();
            schedulePreview();
        }
    });
    byId('add-proposal').onclick = () => {
        proposalRows.append(blankCopy(proposalTemplate));
        schedulePreview();
    };
    byId('remove-proposal').onclick = () => {
        if (proposalRows.rows.length > 1 && confirm('Remove the last proposal row?')) {
            proposalRows.lastElementChild.remove();
            schedulePreview();
        }
    };
    byId('include-cover').checked = paper.dataset.cover === 'true';
    byId('include-report').checked = paper.dataset.report === 'true';
    byId('include-report').onchange = event => {
        paper.dataset.report = String(event.target.checked);
        showActiveSections();
        schedulePreview();
    };

    // Legislative entries retain editable labels so articles and subarticles can be renumbered manually.
    function addLegislationEntry(groupId, label) {
        const list = byId(groupId).querySelector('.legislation-entries');
        const entry = blankCopy(list.firstElementChild);
        entry.querySelector('.legislation-label').textContent = label;
        list.append(entry);
        entry.querySelector('.legislation-text').focus();
        schedulePreview();
    }
    function nextArticleLabel() {
        const labels = [...byId('bill-articles').querySelectorAll('.legislation-label')];
        const numbers = labels.map(label => Number(label.textContent.match(/Article\s+(\d+)/i)?.[1]) || 0);
        return 'Article ' + (Math.max(0, ...numbers) + 1);
    }
    byId('add-definition').onclick = () => addLegislationEntry('proposal-definitions', '');
    byId('add-section').onclick = () => addLegislationEntry('proposal-sections', 'SECTION ' + (byId('proposal-sections').querySelectorAll('.legislation-item').length + 1));
    byId('add-bill-article').onclick = () => addLegislationEntry('bill-articles', nextArticleLabel());
    byId('add-subarticle').onclick = () => {
        const labels = [...byId('bill-articles').querySelectorAll('.legislation-label')];
        const last = labels.at(-1).textContent.match(/Article\s+(\d+)(?:\.(\d+))?/i);
        const main = last ? last[1] : '1';
        const sub = last && last[2] ? Number(last[2]) + 1 : 1;
        addLegislationEntry('bill-articles', `Article ${main}.${sub}`);
    };
    byId('add-comment').onclick = () => addLegislationEntry('bill-comments', '');
    paper.addEventListener('click', event => {
        const button = event.target.closest('.legislation-remove');
        if (!button) return;
        const entry = button.closest('.legislation-item');
        if (entry.parentElement.children.length === 1) {
            alert('Keep at least one entry in this section.');
            return;
        }
        if (confirm('Remove this entry?')) { entry.remove(); schedulePreview(); }
    });
    for (const checkbox of document.querySelectorAll('[data-checklist]')) {
        checkbox.addEventListener('change', () => checkbox.toggleAttribute('checked', checkbox.checked));
    }

    byId('add').onclick = () => addArticle(true);
    articles.addEventListener('click', e => {
        if (e.target.classList.contains('remove')) {
            const a = e.target.closest('.article');
            if (a.querySelector('.article-body').innerText.trim() || a.querySelector('.article-head').innerText.trim()) {
                if (!confirm('Remove this article and its text?'))
                    return;
            }
            a.remove();
            numberArticles();
            schedulePreview();
        }
    });
    byId('signature').onclick = () => {
        paper.classList.toggle('no-secondary');
        schedulePreview();
    };
    byId('classification').onclick = () => {
        paper.classList.toggle('no-class');
        schedulePreview();
    };
    const appearance = byId('appearance');
    appearance.value = paper.classList.contains('clean') ? (paper.classList.contains('gold') ? 'clean gold' : 'clean') : (paper.classList.contains('gold') ? 'gold' : 'archive');
    appearance.onchange = () => {
        paper.classList.toggle('clean', appearance.value.includes('clean'));
        paper.classList.toggle('gold', appearance.value.includes('gold'));
        schedulePreview();
    };
    byId('view').value = window.innerWidth <= 740 ? 'editor' : 'both';
    workspace.classList.toggle('editor-only', byId('view').value === 'editor');
    byId('view').onchange = () => {
        workspace.classList.toggle('preview-only', byId('view').value === 'preview');
        workspace.classList.toggle('editor-only', byId('view').value === 'editor');
        renderPreview();
    };
    // Signature image uploads
    paper.querySelectorAll('.signature-tools').forEach(tools => {
        const input = tools.querySelector('input'), img = tools.previousElementSibling.querySelector('img'), line = tools.previousElementSibling, remove = tools.querySelector('[data-sign="remove"]');
        function sync() {
            line.classList.toggle('has-image', !img.hidden);
            remove.disabled = img.hidden;
        }
        sync();
        tools.querySelector('[data-sign="upload"]').onclick = () => input.click();
        remove.onclick = () => {
            img.hidden = true;
            img.removeAttribute('src');
            input.value = '';
            sync();
            schedulePreview();
        };
        input.onchange = () => {
            const file = input.files[0];
            if (!file)
                return;
            if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
                alert('Choose a PNG, JPEG or WebP image.');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const original = new Image();
                original.onload = () => {
                    const c = document.createElement('canvas');
                    let scale = Math.min(1, 1200 / Math.max(original.width, original.height));
                    c.width = Math.max(1, Math.round(original.width * scale));
                    c.height = Math.max(1, Math.round(original.height * scale));
                    c.getContext('2d').drawImage(original, 0, 0, c.width, c.height);
                    img.src = c.toDataURL('image/png');
                    img.hidden = false;
                    sync();
                    schedulePreview();
                };
                original.onerror = () => alert('Could not read this image.');
                original.src = reader.result;
            };
            reader.readAsDataURL(file);
        };
    });
    paper.addEventListener('paste', e => {
        const ed = e.target.closest('.edit');
        if (!ed)
            return;
        e.preventDefault();
        const t = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, ed.matches('.article-body,.preamble,.appointment-body,.cabinet-text,.proposal-field,.legislation-text') ? t : t.replace(/\r?\n/g, ' '));
    });
    paper.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.closest('.edit') && !e.target.closest('.article-body,.preamble,.appointment-body,.cabinet-text,.proposal-field,.legislation-text'))
            e.preventDefault();
    });
    paper.addEventListener('focusout', e => {
        const ed = e.target.closest('.edit');
        if (ed && !ed.textContent.trim())
            ed.innerHTML = '';
        schedulePreview();
    });
    paper.addEventListener('input', schedulePreview);

    function download(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    // File exports
    byId('print').onclick = async () => {
        document.activeElement.blur();
        try {
            await assetReady;
            renderPreview();
            window.print();
        } catch (error) {
            alert('Could not load the document artwork. ' + error.message);
        }
    };
    // The print button prepares the screen preview before opening the print dialog.
    // Do not rebuild it under print-only CSS: the editor is hidden there.
    window.addEventListener('beforeprint', () => {
        if (!window.matchMedia('print').matches) renderPreview();
    });
    byId('save').onclick = async () => {
        document.activeElement.blur();
        renderPreview();
        try {
            const html = await makePortableCopy();
            const filename = fileNames[documentType.value] + '.html';
            download(new Blob([html], { type: 'text/html;charset=utf-8' }), filename);
        }
        catch (error) {
            alert('Could not save the editable document. ' + error.message);
        }
    };
    // Rasterise the same A4 DOM with inline computed styles in a self-contained SVG.

    async function rasterisePage(p) {
        const w = p.offsetWidth, h = p.offsetHeight;
        const clone = p.cloneNode(true);
        let from = [p, ...p.querySelectorAll('*')], to = [clone, ...clone.querySelectorAll('*')];
        for (let i = 0; i < from.length; i++) {
            const c = getComputedStyle(from[i]);
            let style = '';
            for (const key of c)
                style += key + ':' + c.getPropertyValue(key) + ';';
            to[i].setAttribute('style', style);
            to[i].removeAttribute('class');
            if (from[i].hidden)
                to[i].style.display = 'none';
        }
        clone.style.zoom = '1';
        clone.style.margin = '0';
        clone.style.boxShadow = 'none';
        clone.style.width = w + 'px';
        clone.style.height = h + 'px';
        clone.style.minHeight = h + 'px';
        clone.style.maxHeight = h + 'px';
        clone.style.position = 'relative';
        clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        const xml = new XMLSerializer().serializeToString(clone);
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject width="100%" height="100%">' + xml + '</foreignObject></svg>';
        const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        const im = new Image();
        await new Promise((ok, fail) => {
            im.onload = ok;
            im.onerror = () => fail(new Error('Could not rasterise page'));
            im.src = src;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 1588;
        canvas.height = 2246;
        canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    async function exportPagePng(p, n) {
        try {
            await assetReady;
            const currentPage = preview.querySelectorAll('.preview-page')[n - 1] || p;
            const c = await rasterisePage(currentPage);
            const b = await new Promise(ok => c.toBlob(ok, 'image/png'));
            if (!b)
                throw Error('PNG encoding failed');
            download(b, (fileNames[documentType.value] + '-page-') + String(n).padStart(Math.max(2, String(preview.children.length).length), '0') + '.png');
        }
        catch (e) {
            alert('PNG export failed in this browser. Try Chrome or Edge, or use Print / Save PDF. ' + e.message);
        }
    }
    // PNG files are already compressed, so the ZIP can store them as-is.
    // Use one download for a multi-page document to avoid browser download blocks.
    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit++)
                crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    async function zipPages(files) {
        const localParts = [];
        const directory = [];
        let offset = 0;
        let directorySize = 0;
        const encoder = new TextEncoder();
        for (const file of files) {
            const name = encoder.encode(file.name);
            const bytes = new Uint8Array(await file.blob.arrayBuffer());
            const checksum = crc32(bytes);
            const local = new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034b50, true);
            local.setUint16(4, 20, true);
            local.setUint16(12, 0x21, true); // 1 January 1980, valid DOS date
            local.setUint32(14, checksum, true);
            local.setUint32(18, bytes.length, true);
            local.setUint32(22, bytes.length, true);
            local.setUint16(26, name.length, true);
            localParts.push(local.buffer, name, bytes);

            const entry = new DataView(new ArrayBuffer(46));
            entry.setUint32(0, 0x02014b50, true);
            entry.setUint16(4, 20, true);
            entry.setUint16(6, 20, true);
            entry.setUint16(14, 0x21, true);
            entry.setUint32(16, checksum, true);
            entry.setUint32(20, bytes.length, true);
            entry.setUint32(24, bytes.length, true);
            entry.setUint16(28, name.length, true);
            entry.setUint32(42, offset, true);
            directory.push(entry.buffer, name);
            directorySize += 46 + name.length;
            offset += 30 + name.length + bytes.length;
        }
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(8, files.length, true);
        end.setUint16(10, files.length, true);
        end.setUint32(12, directorySize, true);
        end.setUint32(16, offset, true);
        return new Blob([...localParts, ...directory, end.buffer], { type: 'application/zip' });
    }

    async function exportAllPages() {
        const button = byId('png');
        document.activeElement.blur();
        const wasEditorOnly = workspace.classList.contains('editor-only');
        if (wasEditorOnly)
            workspace.classList.remove('editor-only');
        button.disabled = true;
        try {
            await assetReady;
            renderPreview();
            const pages = [...preview.querySelectorAll('.preview-page')];
            const prefix = fileNames[documentType.value];
            const digits = Math.max(2, String(pages.length).length);
            const files = [];
            for (let i = 0; i < pages.length; i++) {
                button.textContent = `Exporting ${i + 1} / ${pages.length}…`;
                const canvas = await rasterisePage(pages[i]);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!blob)
                    throw new Error('Could not encode page ' + (i + 1));
                const number = String(i + 1).padStart(digits, '0');
                files.push({ name: `${prefix}-page-${number}.png`, blob });
            }
            if (files.length === 1)
                download(files[0].blob, files[0].name);
            else
                download(await zipPages(files), `${prefix}-PNG-Pages.zip`);
        }
        catch (error) {
            alert('PNG export could not complete. ' + error.message + ' Try the individual page PNG buttons or Print / Save PDF.');
        }
        finally {
            button.disabled = false;
            button.textContent = 'Export PNG pages';
            if (wasEditorOnly)
                workspace.classList.add('editor-only');
        }
    }
    byId('png').onclick = exportAllPages;
    documentType.value = paper.dataset.documentType || (paper.classList.contains('mode-appointment') ? 'appointment' : 'decree');

    // Each template remembers its own stamp settings in saved documents.
    const stampToggle = byId('include-stamp');
    const stampSize = byId('stamp-size');
    const stampPosition = byId('stamp-position');
    const stampSettings = JSON.parse(paper.dataset.stampSettings || '{}');

    function applyStampSettings() {
        const settings = stampSettings[documentType.value] || {};
        stampToggle.checked = settings.enabled === true;
        stampSize.value = ['25', '35', '45'].includes(settings.size) ? settings.size : '35';
        stampPosition.value = ['left', 'center', 'right'].includes(settings.position) ? settings.position : 'right';
        byId('stamp-settings').hidden = !stampToggle.checked;
        const alignment = { left: 'flex-start', center: 'center', right: 'flex-end' };
        for (const stamp of paper.querySelectorAll('.document-stamp')) {
            stamp.hidden = !stampToggle.checked;
            stamp.style.justifyContent = alignment[stampPosition.value];
            stamp.querySelector('img').style.width = stampSize.value + 'mm';
        }
    }

    function saveStampSettings() {
        stampSettings[documentType.value] = {
            enabled: stampToggle.checked,
            size: stampSize.value,
            position: stampPosition.value
        };
        paper.dataset.stampSettings = JSON.stringify(stampSettings);
        applyStampSettings();
        schedulePreview();
    }

    stampToggle.addEventListener('change', saveStampSettings);
    stampSize.addEventListener('change', saveStampSettings);
    stampPosition.addEventListener('change', saveStampSettings);

    function updateDocumentType() {
        const type = documentType.value;
        const cabinet = isCabinet();
        const legislation = isLegislation();
        paper.dataset.documentType = type;
        for (const mode of ['appointment', ...cabinetModes, ...legislationModes])
            paper.classList.toggle('mode-' + mode, type === mode);
        paper.classList.toggle('mode-cabinet', cabinet);
        paper.classList.toggle('mode-legislation', legislation);
        for (const id of ['add', 'signature', 'classification'])
            byId(id).style.display = type === 'decree' ? '' : 'none';
        for (const id of ['add-minute', 'add-proposal', 'remove-proposal'])
            byId(id).hidden = type !== 'minutes';
        paper.dataset.cover = cabinet ? 'true' : 'false';
        showActiveSections();
        byId('include-cover').checked = cabinet;
        byId('include-cover').disabled = true;
        byId('cover-control').hidden = !cabinet;
        byId('report-control').hidden = type !== 'directive';
        appearance.style.display = cabinet || legislation ? 'none' : '';
        byId('appearance-field').hidden = cabinet || legislation;
        byId('content-tools').hidden = !['decree', 'minutes', 'proposal', 'bill'].includes(type);
        for (const id of ['add-definition', 'add-section']) byId(id).hidden = type !== 'proposal';
        for (const id of ['add-bill-article', 'add-subarticle', 'add-comment']) byId(id).hidden = type !== 'bill';
        byId('proposal-guide').hidden = type !== 'proposal';
        byId('bill-guide').hidden = type !== 'bill';
        if (cabinet) {
            const image = paper.querySelector('[data-artwork="cabinet-paper"]');
            paper.style.backgroundImage = `url("${image.src}")`;
        } else if (legislation) {
            const image = paper.querySelector(`[data-artwork="${type}-letterhead"]`);
            paper.style.backgroundImage = `url("${image.src}")`;
        } else {
            paper.style.removeProperty('background-image');
        }
        document.title = documentNames[type] + ' | Imperialist Robloxian Federation';
        byId('brand-title').textContent = documentNames[type];
        applyStampSettings();
        renderPreview();
    }
    // The portal opens the selected template directly. Saved offline copies
    // continue to use the document type recorded in their markup.
    const homeLink = byId('portal-home');
    if (homeLink && !savedDraft) {
        const requestedType = new URLSearchParams(window.location.search).get('type');
        if (Object.hasOwn(documentNames, requestedType)) documentType.value = requestedType;
    }

    // Drafts store the editable source, not rendered pages or duplicate artwork.
    // The original asset files are reattached when a draft is opened.
    let draftId = savedDraft?.id || null;
    let lastSaved = null;
    let saving = false;
    const draftName = byId('draft-name');
    const draftStatus = byId('draft-status');
    const saveDraftButton = byId('save-draft');

    function draftContent() {
        const source = paper.cloneNode(true);
        source.style.removeProperty('background-image');
        source.querySelectorAll('[data-artwork]').forEach(image => image.removeAttribute('src'));
        return {
            type: documentType.value,
            name: draftName?.value.trim() || documentNames[documentType.value],
            paper: source.outerHTML,
            checklist: [...document.querySelectorAll('[data-checklist]')].map(input => input.checked)
        };
    }

    function hasUnsavedChanges() {
        return lastSaved !== null && JSON.stringify(draftContent()) !== lastSaved;
    }

    async function saveDraft() {
        if (!drafts || saving) return;
        document.activeElement?.blur();
        renderPreview();
        saving = true;
        saveDraftButton.disabled = true;
        draftStatus.textContent = 'Saving…';
        try {
            const content = draftContent();
            const id = draftId || drafts.newId();
            await drafts.put({ ...content, id, version: 1, updatedAt: Date.now() });
            draftId = id;
            draftName.value = content.name;
            lastSaved = JSON.stringify(content);
            draftStatus.textContent = 'Saved in this browser.';
            const url = new URL(location.href);
            url.searchParams.delete('type');
            url.searchParams.set('draft', id);
            history.replaceState(null, '', url);
        } catch (error) {
            draftStatus.textContent = 'Could not save. Download editable HTML as a backup.';
            console.error('Draft storage:', error);
        } finally {
            saving = false;
            saveDraftButton.disabled = false;
        }
    }

    if (!drafts && saveDraftButton) saveDraftButton.hidden = true;
    if (drafts && saveDraftButton) {
        byId('draft-controls').hidden = false;
        draftName.value = savedDraft?.name || '';
        if (savedDraft) draftStatus.textContent = 'Saved in this browser.';
        saveDraftButton.addEventListener('click', saveDraft);
        for (const eventName of ['input', 'change', 'click']) {
            document.addEventListener(eventName, () => {
                setTimeout(() => {
                    if (!saving && hasUnsavedChanges()) draftStatus.textContent = 'Unsaved changes.';
                }, 120);
            });
        }
        // A signature upload can complete after the file input event.
        new MutationObserver(() => {
            if (!saving && hasUnsavedChanges()) draftStatus.textContent = 'Unsaved changes.';
        }).observe(paper, { subtree: true, attributes: true, attributeFilter: ['src'] });
        window.addEventListener('beforeunload', event => {
            if (saving || hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });
    }
    for (const link of [homeLink, byId('brand-home'), document.querySelector('.draft-library-link')]) {
        if (!link) continue;
        // beforeunload also guards browser navigation and refreshing.
        if (!drafts) link.addEventListener('click', event => {
            if (!confirm('Return to the portal? Download your editable HTML before leaving.')) event.preventDefault();
        });
    }
    documentType.onchange = updateDocumentType;
    updateDocumentType();
    renderPreview();
    assetReady.then(() => {
        updateDocumentType();
        for (const id of ['png', 'save', 'print']) byId(id).disabled = false;
        if (drafts && saveDraftButton) {
            lastSaved = JSON.stringify(draftContent());
            saveDraftButton.disabled = false;
        }
    }).catch(error => {
        byId('page-count').textContent = 'Artwork failed to load. Check the assets folder and refresh.';
        console.error('Artwork:', error);
    });
    window.addEventListener('resize', schedulePreview);
})().catch(error => {
    console.error(error);
    document.getElementById('page-count').textContent = 'Could not initialise the editor. Refresh and try again.';
});
