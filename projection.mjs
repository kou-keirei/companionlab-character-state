// Deliberately not imported by index.js. No automatic injection or native arm.
export const KEY = 'companionlab-manual-projection-test';
export const HOLD = 'REAL_TAURI_HOOK_UNPROVEN';
export function activateManualProjection({consent = false} = {}) {
    return Object.freeze({status: consent === true ? HOLD : 'DISABLED', enabled: false, text: ''});
}

// A confined TEST assembly component seam, NOT a generation hook. The caller
// supplies the canonical ManualControls reader and the stock host slot reader.
// No returned bytes may be treated as proof of native current-chat binding.
export function createManualProjectionTest({readProjection, setExtensionPrompt, assemble,
    lifecycle, deadlineMs = 1000} = {}) {
    let epoch = 0, flight = false, destroyed = false;
    const clear = () => { epoch++; setExtensionPrompt(KEY, '', 0, 0, false, 0); };
    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        clear();
        lifecycle?.removeEventListener('pagehide', destroy);
    };
    lifecycle?.addEventListener('pagehide', destroy);
    async function run({testOnly = false, confirmation = ''} = {}) {
        // No host access or slot mutation for an unconsented/default invocation.
        if (destroyed || testOnly !== true || !/^[a-f0-9]{64}$/.test(confirmation))
            return {status: 'DISABLED', text: ''};
        if (typeof readProjection !== 'function' || typeof setExtensionPrompt !== 'function'
            || typeof assemble !== 'function' || !Number.isInteger(deadlineMs)
            || deadlineMs < 1 || deadlineMs > 3000) return {status: HOLD, text: ''};
        if (flight) { clear(); return {status: 'REARM_REQUIRED', text: ''}; }
        clear();
        const token = epoch;
        flight = true;
        let timer;
        const check = () => {
            if (destroyed || token !== epoch) throw Error('cancelled');
        };
        const work = async () => {
            const before = await readProjection();
            check();
            if (before?.qualification !== 'MANUAL_TEST_ONLY' || before.confirmation !== confirmation
                || typeof before.text !== 'string' || !Number.isInteger(before.byte_budget)
                || before.byte_budget < 0 || before.byte_budget > 4096
                || new TextEncoder().encode(before.text).length > before.byte_budget
                // The stock reader expands macros. Never allow a saved DATA
                // value to expand host variables or private chat text.
                || /\{\{|\}\}/.test(before.text)) throw Error('projection hold');
            const frozen = JSON.stringify(before);
            setExtensionPrompt(KEY, before.text, 0, 0, false, 0);
            const text = await assemble();
            check();
            const after = await readProjection();
            check();
            if (JSON.stringify(after) !== frozen || typeof text !== 'string'
                || (before.text && text.split(before.text).length !== 2)) throw Error('stale assembly');
            return {status: 'WEB_HOST_COMPONENT_ONLY', text};
        };
        try {
            return await Promise.race([work(), new Promise((_, reject) => {
                timer = setTimeout(() => reject(Error('deadline')), deadlineMs);
            })]);
        } catch {
            return {status: 'REARM_REQUIRED', text: ''};
        } finally {
            clearTimeout(timer);
            // Invalidates delayed work even when it lost the deadline race.
            clear();
            flight = false;
        }
    }
    return Object.freeze({run, clear, destroy});
}
