// Host owns installation; this queue owns only this extension's UI lifecycle.
import {mountStatus} from './status.mjs';
const KEY = Symbol.for('companionlab.character-state.lifecycle');
const doc = globalThis.document;
const state = doc ? (doc[KEY] ??= {chain: Promise.resolve(), owner: null}) : null;
function enqueue(enable) {
    if (!state) return Promise.resolve();
    const task = state.chain.then(async () => {
        await state.owner?.destroy();
        state.owner = null;
        if (enable && globalThis.__TAURITAVERN__?.abiVersion === 2 && doc.body) {
            state.owner = mountStatus({document: doc, lifecycle: globalThis});
        }
    });
    // Failed revocation stays fail-closed; a subsequent stop may retry close.
    state.chain = task.catch(() => {});
    return task;
}
export function stop() { return enqueue(false); }
export function start() { return enqueue(true); }
void start().catch(() => {});
