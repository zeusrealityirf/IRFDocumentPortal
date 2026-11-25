(() => {
    const paper = document.getElementById('paper');
    const articles = document.getElementById('articles');
    const preview = document.getElementById('preview-pages');
    const workspace = document.getElementById('workspace');
    const documentType = document.getElementById('doc-type');
    const sourceScript = document.currentScript;
    const assetStore = document.getElementById('embedded-assets');
    const embeddedAssets = assetStore ? JSON.parse(assetStore.textContent) : {};
    const assetReady = loadArtwork();
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
        end.innerHTML = '<span>OFFICE OF THE PRIME MINISTER</span><span></span>';
        p.append(content, end);
        wrap.append(caption, p);
        preview.append(wrap);
        btn.onclick = () => exportPagePng(p, [...preview.children].indexOf(wrap) + 1);
        return { wrap, p, content, end, title };
    }

    function pageHasRoom(currentPage) {
        return currentPage.content.getBoundingClientRect().bottom <= currentPage.end.getBoundingClientRect().top - 8 && currentPage.end.getBoundingClientRect().bottom <= currentPage.p.getBoundingClientRect().bottom - 40;
    }
    // Measure on actual A4-width output, not guessed character counts. Split long editable text at word boundaries, or characters for unbroken strings.

    function renderPreview() {
        clearTimeout(previewTimer);
        if (isRendering)
            return;
        isRendering = true;
        numberArticles();
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
            if (getComputedStyle(el).display === 'none')
                continue;
            if (el === articles) {
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
            else if ((el.classList.contains('preamble') || el.classList.contains('appointment-body'))) {
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
            x.title.textContent = 'Page ' + (i + 1) + ' of ' + pages.length;
            x.end.lastElementChild.textContent = 'Page ' + (i + 1) + ' / ' + pages.length;
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
    byId('view').value = 'both';
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
        document.execCommand('insertText', false, ed.matches('.article-body,.preamble,.appointment-body') ? t : t.replace(/\r?\n/g, ' '));
    });
    paper.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.closest('.edit') && !e.target.closest('.article-body,.preamble,.appointment-body'))
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
    byId('print').onclick = () => {
        document.activeElement.blur();
        renderPreview();
        window.print();
    };
    window.addEventListener('beforeprint', renderPreview);
    byId('save').onclick = async () => {
        document.activeElement.blur();
        renderPreview();
        try {
            const html = await makePortableCopy();
            const filename = documentType.value === 'appointment' ? 'IRF-Decree-of-Appointment.html' : 'IRF-Prime-Minister-Decree.html';
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
            download(b, (documentType.value === 'appointment' ? 'IRF-Appointment-page-' : 'IRF-Decree-page-') + n + '.png');
        }
        catch (e) {
            alert('PNG export failed in this browser. Try Chrome or Edge, or use Print / Save PDF. ' + e.message);
        }
    }
    byId('png').onclick = async () => {
        document.activeElement.blur();
        renderPreview();
        const was = workspace.classList.contains('editor-only');
        if (was)
            workspace.classList.remove('editor-only');
        let btn = byId('png');
        btn.disabled = true;
        btn.textContent = 'Exporting…';
        try {
            await assetReady;
            let ps = [...preview.querySelectorAll('.preview-page')];
            if (ps.length > 12)
                throw Error('For more than 12 pages, use the individual page PNG buttons.');
            let combined = document.createElement('canvas');
            combined.width = 1588;
            combined.height = 2246 * ps.length;
            let ctx = combined.getContext('2d');
            for (let i = 0; i < ps.length; i++)
                ctx.drawImage(await rasterisePage(ps[i]), 0, 2246 * i);
            const blob = await new Promise(ok => combined.toBlob(ok, 'image/png'));
            if (!blob)
                throw Error('PNG encoding failed');
            download(blob, documentType.value === 'appointment' ? 'IRF-Decree-of-Appointment.png' : 'IRF-Decree.png');
        }
        catch (e) {
            alert('PNG export could not complete. ' + e.message + ' Try individual page PNG buttons or Print / Save PDF.');
        }
        finally {
            btn.disabled = false;
            btn.textContent = 'Export PNG';
            if (was)
                workspace.classList.add('editor-only');
        }
    };
    documentType.value = paper.classList.contains('mode-appointment') ? 'appointment' : 'decree';

    function updateDocumentType() {
        const appointment = documentType.value === 'appointment';
        paper.classList.toggle('mode-appointment', appointment);
        byId('add').style.display = appointment ? 'none' : '';
        byId('signature').style.display = appointment ? 'none' : '';
        byId('classification').style.display = appointment ? 'none' : '';
        document.title = appointment ? 'Decree of Appointment | Imperialist Robloxian Federation' : "Prime Minister's Decree | Imperialist Robloxian Federation";
        const brand = byId('brand-title');
        if (brand)
            brand.textContent = appointment ? 'IRF Appointment & Decree Editor' : 'IRF Document Editor';
        schedulePreview();
    }
    documentType.onchange = updateDocumentType;
    updateDocumentType();
    renderPreview();
    assetReady.then(renderPreview).catch(error => console.error('Artwork:', error));
    window.addEventListener('resize', schedulePreview);
})();
