// Read-only ephemeral view. Canonical state and history remain in Python.
export const SCENE_FIELDS = ['local_time', 'location', 'participants', 'clothing',
    'posture', 'activity', 'object_position', 'object_custody'];
export const NEEDS = ['Hunger', 'Bladder', 'Fatigue', 'Thirst'];
export const displayValue = row => row?.certainty === 'known' && row.value !== null
    ? (Array.isArray(row.value) ? JSON.stringify(row.value) : String(row.value)) : 'UNKNOWN';
export const metricLabel = key => key.filter(Boolean).join(' / ');

// Display only: derive a label from the recorded identifier; never resolve an
// entity, infer ownership or change the raw value kept in Source details.
function custodyValue(row) {
    if (row?.certainty !== 'known' || row.value == null) return 'UNKNOWN';
    if (typeof row.value !== 'string' || row.value.length > 96) return 'See details';
    const reference = /^(place|holder|character):([A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*)$/.exec(row.value);
    if (!reference) return 'See details';
    const label = {place:'At a place', holder:'Holder', character:'Character'}[reference[1]];
    return label + ' \u00b7 ' + reference[2].replace(/[-_]/g, ' ');
}

// Version and exact observation checks reject late replies after clear/rearm/edit.
export function createInspector(binding, inspect, render, timers = globalThis) {
    let version = 0;
    let expiry;
    let receipt = null;
    let pending = false;
    let halted = false;
    let finishedAt = -Infinity;
    const now = () => timers.performance?.now() ?? performance.now();
    const clear = () => {
        version++;
        halted = false;
        receipt = null;
        timers.clearTimeout(expiry);
        render(null);
    };
    const refresh = async ({automatic = false} = {}) => {
        if (pending || (automatic && halted)) return;
        if (automatic) version++;
        else clear();
        const token = version;
        const started = performance.now();
        const observation = binding();
        if (!observation) return;
        pending = true;
        try {
            const data = await inspect(observation);
            if (token !== version) return;
            if (JSON.stringify(binding()) !== JSON.stringify(observation)) {clear(); return;}
            if (data?.status !== 'READ_ONLY_TEST_LEDGER' || data.write_status !== 'WRITE_HOLD'
                || !Array.isArray(data.facts) || !Array.isArray(data.events)
                || !Number.isInteger(data.expires_in_ms) || data.expires_in_ms <= 0
                || data.expires_in_ms > 900000) throw Error('invalid inspector reply');
            const remaining = data.expires_in_ms - Math.ceil(performance.now() - started);
            if (remaining <= 0) {clear(); halted = true; return;}
            receipt = JSON.stringify(observation);
            render(data, automatic);
            timers.clearTimeout(expiry);
            expiry = timers.setTimeout(() => {clear(); halted = true;}, remaining);
        } catch {
            if (token === version) {clear(); halted = true;}
        } finally {pending = false; finishedAt = now();}
    };
    const check = () => {
        if (receipt !== null && JSON.stringify(binding()) !== receipt) clear();
    };
    return {clear, refresh, check, get pending() {return pending;}, get halted() {return halted;}, get finishedAt() {return finishedAt;}};
}

export function mountSidebar({document, binding, inspect, timers = globalThis, onRenderError, container=document.body, headerContainer, embedded=false, onSelect}) {
    const make = (tag, text, parent) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        parent?.append(node);
        return node;
    };
    const root = make('aside', undefined, container);
    root.id = 'companionlab-state-sidebar';
    root.setAttribute('aria-label', 'Character State TEST');
    const style = make('style', undefined, root);
    style.textContent = `#companionlab-state-sidebar { position:fixed; right:12px; bottom:48px;
        z-index:2000; width:max-content; max-width:calc(100vw - 24px); box-sizing:border-box;
        background:var(--SmartThemeBlurTintColor,Canvas); color:var(--SmartThemeBodyColor,CanvasText);
        border:1px solid var(--SmartThemeBorderColor,GrayText); border-radius:12px;
        font:inherit; font-size:13px; line-height:1.45; text-align:left; backdrop-filter:blur(12px); }
        #companionlab-state-sidebar * {box-sizing:border-box;min-width:0}
        #companionlab-state-sidebar [hidden] {display:none!important}
        #companionlab-state-sidebar > button {width:100%;margin:0;border:0;border-radius:11px;padding:10px 14px;text-align:left}
        #companionlab-state-sidebar > div {width:350px;max-width:calc(100vw - 26px);max-height:64dvh;overflow:auto;padding:0 14px 12px;overscroll-behavior:contain}
        #companionlab-state-sidebar button, #companionlab-state-sidebar select {font:inherit;color:inherit;background:transparent;
            border:1px solid var(--SmartThemeBorderColor,GrayText);border-radius:7px;padding:7px 9px;cursor:pointer;max-width:100%}
        #companionlab-state-sidebar button:hover, #companionlab-state-sidebar button[aria-pressed="true"] {background:var(--SmartThemeBlurTintColor,ButtonFace);border-color:var(--SmartThemeQuoteColor,GrayText)}
        #companionlab-state-sidebar :is(button,select,summary):focus-visible {outline:2px solid var(--SmartThemeEmColor,Highlight);outline-offset:3px}
        #companionlab-state-sidebar nav {display:grid;grid-template-columns:1fr 1fr 1.7fr;gap:5px;margin:10px 0}
        #companionlab-state-sidebar nav button {flex:1;padding:7px 5px}
        #companionlab-state-sidebar p {margin:6px 0;overflow-wrap:anywhere}
        #companionlab-state-sidebar h3 {font:inherit;font-weight:600;margin:14px 0 5px;color:var(--SmartThemeEmColor,CanvasText)}
        #companionlab-state-sidebar summary {cursor:pointer;overflow-wrap:anywhere;padding:6px 0}
        #companionlab-state-sidebar details {margin:3px 0}
        #companionlab-state-sidebar details p {font-size:12px;padding-left:10px;border-left:2px solid var(--SmartThemeBorderColor,GrayText)}
        #companionlab-state-sidebar .cl-state-note {font-size:12px;opacity:.85}
        #companionlab-state-sidebar .cl-state-group {border-top:1px solid var(--SmartThemeBorderColor,GrayText);padding-bottom:5px}
        #companionlab-state-sidebar .cl-state-change {border-top:1px solid var(--SmartThemeBorderColor,GrayText);padding:8px 0}
        @media(max-width:420px) {#companionlab-state-sidebar {right:8px;bottom:48px;max-width:calc(100vw - 16px)}
            #companionlab-state-sidebar > div {max-width:calc(100vw - 18px);max-height:48dvh}}
        @media(prefers-reduced-motion:reduce) {#companionlab-state-sidebar * {animation:none!important;transition:none!important}}`;
    const now = () => timers.performance?.now() ?? performance.now();
    const toggle = make('button', 'Character State \u00b7 TEST', root);
    toggle.type = 'button';
    toggle.className = 'menu_button';
    toggle.setAttribute('aria-controls', 'companionlab-state-body');
    const body = make('div', undefined, root);
    body.id = 'companionlab-state-body';
    body.hidden = !embedded;
    toggle.setAttribute('aria-expanded', String(embedded));
    toggle.addEventListener('click', () => {
        body.hidden = !body.hidden;
        toggle.setAttribute('aria-expanded', String(!body.hidden));
        if (!body.hidden) void client.refresh();
        else client.clear();
    });
    const sceneHeader = embedded ? make('header',undefined,headerContainer ?? body) : undefined;
    if (sceneHeader) sceneHeader.className='cl-state-header';
    const clock = make('p', 'World time: UNKNOWN',sceneHeader);
    const place = make('p','Location: UNKNOWN',sceneHeader);
    clock.className = 'cl-state-note';
    const note = make('p', 'Approved scene facts only. Missing facts stay UNKNOWN.');
    note.className = 'cl-state-note';
    const refresh = make('button', 'Refresh approved Ledger', body);
    refresh.type = 'button';
    const health = make('p', 'No current scene snapshot.', body);
    health.setAttribute('role', 'status');
    const diagnostic = make('details');
    make('summary', 'About this TEST view', diagnostic);
    if (!embedded) diagnostic.append(clock);

    diagnostic.append(note);
    make('p', 'Read-only TEST \u00b7 WRITE_HOLD \u00b7 no inferred needs or consent', diagnostic);
    const status = make('p', 'NO_CURRENT_VIEW / REFRESH_OR_REARM_REQUIRED', diagnostic);
    const nav = make('nav', undefined, body);
    nav.setAttribute('aria-label', 'State views');
    const content = make('div', undefined, body);content.className='cl-state-content';
    body.append(diagnostic);
    const labels = {local_time:'Local time', location:'Location', participants:'Participants',
        clothing:'Clothing', posture:'Posture', activity:'Activity', object_position:'Position', object_custody:'Custody'};
    const friendly = key => labels[key[0]] ?? 'Scene property';
    const sceneValue = row => row.key[0] === 'participants' && row.certainty === 'known' && Array.isArray(row.value)
        ? row.value.length + ' recorded participant' + (row.value.length === 1 ? '' : 's')
        : row.key[0] === 'object_custody' ? custodyValue(row) : displayValue(row);
    let selected = 'Scene';
    let data = null;
    let metric = '';
    const buttons = [];
    const draw = (value, renewal = false) => {
        // A lease renewal with identical Ledger data must not collapse drilldowns.
        if (renewal && value && data && JSON.stringify([value.scope, value.facts, value.events])
            === JSON.stringify([data.scope, data.facts, data.events])) {data = value; return;}
        data = value;
        content.replaceChildren();
        clock.textContent = 'World time: ' + displayValue(data?.facts.find(f => f.key[0] === 'local_time'));
        place.textContent = 'Location: '+displayValue(data?.facts.find(f=>f.key[0]==='location'));
        health.textContent = data ? 'Approved snapshot \u00b7 read-only TEST' : 'No current scene snapshot. Refresh or rearm to view approved facts.';
        status.textContent = data ? 'Approved Ledger snapshot \u00b7 TEST' : 'NO_CURRENT_VIEW / REFRESH_OR_REARM_REQUIRED';
        for (const [name, button] of buttons) button.setAttribute('aria-pressed', String(name === selected));
        if (selected === 'Needs') {
            for (const name of NEEDS) make('p', name + ': UNSUPPORTED / UNTRACKED', content);
            make('p', 'Arousal never establishes consent.', content);
        } else if (selected === 'Scene') {
            for (const [title, fields] of [
                ['Where & when', ['location', 'local_time', 'participants']],
                ['Character', ['clothing', 'posture', 'activity']],
                ['Objects & phone', ['object_position', 'object_custody']],
            ]) {
                const group = make('section', undefined, content);
                group.className = 'cl-state-group';
                make('h3', title, group);
                for (const field of fields) {
                    const rows = data?.facts.filter(f => f.key[0] === field) ?? [];
                    for (const row of rows.length ? rows : [{key:[field], certainty:'unknown', value:null}]) {
                        const item = make('details', undefined, group);
                        make('summary', friendly(row.key) + ': ' + sceneValue(row), item);
                        make('p', 'Source details \u00b7 ' + metricLabel(row.key) + ': ' + displayValue(row), item);
                        if (row.event_id !== undefined) make('p', 'Event: ' + row.event_id + ' \u00b7 Source: ' + row.source_id, item);
                        make('p', 'Certainty: ' + row.certainty, item);
                    }
                }
            }
        } else {
            const label = make('label', 'Metric ', content);
            const filter = make('select', undefined, label);
            filter.setAttribute('aria-label', 'History metric');
            const keys = new Map();
            for (const event of data?.events ?? []) for (const c of event.changes) keys.set(JSON.stringify(c.key), c.key);
            const all = make('option', 'All metrics', filter); all.value = '';
            for (const [key, value] of keys) { const option = make('option', friendly(value), filter); option.value = key; }
            if (!keys.has(metric)) metric = '';
            filter.value = metric;
            filter.addEventListener('change', () => {metric = filter.value; render(data);});
            let count = 0;
            for (const event of [...(data?.events ?? [])].reverse()) {
                const changes = event.changes.filter(c => !metric || JSON.stringify(c.key) === metric);
                if (!changes.length) continue;
                count++;
                const entry = make('article', undefined, content);
                entry.className = 'cl-state-change';
                make('h3', 'Change ' + (event.sequence + 1) + ' \u00b7 ' + event.status, entry);
                for (const row of changes) make('p', friendly(row.key) + ': ' + sceneValue(row) + ' \u00b7 ' + row.state, entry);
                const provenance = make('details', undefined, entry);
                make('summary', 'Why? · Source details', provenance);
                const group = make('details', undefined, provenance);
                make('summary', event.event_id + ' \u00b7 ' + event.status, group);
                make('p', 'Source: ' + event.source_id + ' \u00b7 Sequence: ' + event.sequence, group);
                make('p', 'Actor: ' + event.actor + ' \u00b7 Agency: ' + event.agency, group);
                for (const row of changes) {
                    const detail = make('details', undefined, group);
                    make('summary', metricLabel(row.key) + ' \u00b7 ' + row.state, detail);
                    make('p', 'Recorded value: ' + displayValue(row), detail);
                    make('p', 'Certainty: ' + row.certainty, detail);
                }
            }
            if (!count) make('p', 'No accepted changes for this selection.', content);
        }
    };
    let renderFailed = false;
    const render = (value, renewal = false) => {
        if (renderFailed) return;
        try {draw(value, renewal);}
        catch (error) {
            if (typeof onRenderError === 'function') {
                // Terminal for this view. Cleanup may call render(null) again.
                // Still throw so createInspector can finish its own cleanup.
                renderFailed = true; data = null;
                try {onRenderError(error);} finally {throw error;}
            }
            throw error; // Optional seam absent: preserve existing behavior.
        }
    };
    for (const name of ['Scene', 'Needs', 'History']) {
        const button = make('button', name === 'History' && !embedded ? 'History / Recent Changes' : name, nav);
        button.type = 'button';
        buttons.push([name, button]);
        button.addEventListener('click', () => {selected = name; onSelect?.(name);render(data);});
    }
    const client = createInspector(binding, inspect, render, timers);
    refresh.addEventListener('click', () => void client.refresh());
    // Revalidate only an open, armed TEST view through the existing read-only callback.
    // Keep at least two seconds between requests and never overlap an active one.
    const guard = timers.setInterval(() => {
        client.check();
        if (body.hidden || container.hidden || document.hidden || client.pending || client.halted || !binding()) return;
        if (now() < client.finishedAt + 2000) return;
        void client.refresh({automatic:true});
    }, 250);
    const onHide = () => {client.clear(); timers.clearInterval(guard);};
    globalThis.addEventListener?.('pagehide', onHide, {once:true});
    client.destroy = () => {onHide(); globalThis.removeEventListener?.('pagehide', onHide); sceneHeader?.remove();root.remove();};
    render(null);
    return client;
}
