import {mountManual} from './manual.mjs';
const ID = 'companionlab-character-state-status';
export function mountStatus({document, lifecycle} = {}) {
    if (document.getElementById(ID)) throw Error('UI_OWNER_HOLD');
    const root = document.createElement('section');
    root.id = ID;
    root.setAttribute('aria-label', 'Character State Manual TEST');
    const style=document.createElement('style');
    style.textContent=`
#companionlab-character-state-status {--cl-pad:16px;--cl-control:40px;
 --cl-surface:color-mix(in srgb,var(--SmartThemeBlurTintColor,#171717) 96%,var(--SmartThemeBodyColor,#dcdcd2));
 --cl-border:color-mix(in srgb,var(--SmartThemeBodyColor,#dcdcd2) 32%,transparent);--cl-accent:var(--SmartThemeEmColor,#919191);
 position:fixed;right:16px;top:48px;bottom:16px;z-index:2001;width:400px;max-width:calc(100vw - 32px);overflow:auto;overscroll-behavior:contain;
 padding:var(--cl-pad);box-sizing:border-box;border:1px solid var(--cl-border);border-radius:12px;
 background:var(--SmartThemeBlurTintColor,#171717);color:var(--SmartThemeBodyColor,#dcdcd2);
 font-family:var(--mainFontFamily,sans-serif);font-size:var(--mainFontSize,15px);line-height:1.5;text-align:left;text-shadow:none;}
#companionlab-character-state-status[data-density=compact]{--cl-pad:12px;--cl-control:36px;font-size:calc(var(--mainFontSize,15px) * .93);}
#companionlab-character-state-status *{box-sizing:border-box;min-width:0;text-shadow:none;}
#companionlab-character-state-status > h2{font:inherit;font-size:1.2em;font-weight:600;margin:0 0 8px;}
#companionlab-character-state-status > p{margin:8px 0;overflow-wrap:anywhere;}
#companionlab-character-state-status :is(button,select){font:inherit;color:inherit;background:var(--cl-surface);border:1px solid var(--cl-border);border-radius:8px;padding:8px;min-height:var(--cl-control);cursor:pointer;}
#companionlab-character-state-status :is(button,select,summary):focus-visible{outline:2px solid var(--cl-accent);outline-offset:2px;}
#companionlab-character-state-status > button{margin:8px 4px 8px 0;}
#companionlab-character-state-status > details{margin:12px 0;font-size:.85em;}
#companionlab-character-state-status > label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0;}
#companionlab-character-state-status #companionlab-state-sidebar nav{grid-template-columns:1fr 1fr 1fr;gap:4px;margin:12px 0;}
#companionlab-character-state-status #companionlab-state-sidebar nav button{min-height:var(--cl-control);padding:8px 4px;}
#companionlab-character-state-status #companionlab-state-sidebar button[aria-pressed=true]{border-color:var(--cl-accent);font-weight:600;}
#companionlab-character-state-status #companionlab-state-sidebar summary{min-height:var(--cl-control);padding:8px 0;}
#companionlab-character-state-status .cl-state-header{position:sticky;top:0;z-index:1;background:var(--SmartThemeBlurTintColor,#171717);padding:8px 0;border-bottom:1px solid var(--cl-border);}
@media(max-width:440px){#companionlab-character-state-status{right:8px;top:48px;bottom:8px;max-width:calc(100vw - 16px);}}
@media(forced-colors:active){#companionlab-character-state-status{--cl-border:CanvasText;--cl-accent:Highlight;--cl-surface:Canvas;}}
`;
    root.append(style);
    const make = (tag, text, id) => {
        const e = document.createElement(tag); e.textContent = text;
        if (id) e.id = id;
        root.append(e); return e;
    };
    make('h2', 'Character State');
    const label = make('p', 'Consent OFF · real-chat state disabled.', 'state-consent');
    const holds=make('details','');const why=document.createElement('summary');why.textContent='TEST boundaries';holds.append(why);
    const limitations=make('p', 'REAL_TAURI_HOOK_UNPROVEN · NATIVE_RUNTIME_HOLD. No actual chat state or prompt injection. Manual TEST requires the supported authenticated disposable local transport.');
    holds.append(limitations);
    const toggle = make('button', 'Open Manual TEST controls', 'state-toggle');
    const close = make('button', 'Close Character State', 'state-close');
    for (const b of [toggle, close]) b.type='button';
    // UI-only document preference survives manager re-enable; no chat or origin storage.
    const preference=Symbol.for('companionlab.character-state.density');
    const densityLabel=make('label','Density · this window');
    const density=document.createElement('select');density.id='state-density';density.setAttribute('aria-label','Density');
    for(const name of ['Comfortable','Compact']){const option=document.createElement('option');option.value=name.toLowerCase();option.textContent=name;density.append(option);}
    density.value=document[preference]==='compact'?'compact':'comfortable';densityLabel.append(density);
    function setDensity(){document[preference]=density.value;root.setAttribute('data-density',density.value);}
    setDensity();density.addEventListener('change',setDensity);
    const editorHost=make('div','');
    let editor = null, destroyed = false, busy = false;
    async function revoke() {
        await editor?.destroy(); editor = null;
        label.textContent = 'Consent OFF · real-chat state disabled.';
        toggle.textContent = 'Open Manual TEST controls';
    }
    async function change() {
        if (destroyed || busy) return;
        busy = true; toggle.disabled = true;
        try {
            if (editor) await revoke();
            else {
                editor = mountManual({document, lifecycle, container:editorHost});
                label.textContent = 'Consent ON · hypothetical Manual TEST only; Start required.';
                toggle.textContent = 'Withdraw Manual TEST consent';
            }
        } catch (e) {label.textContent = String(e);}
        finally {busy = false; toggle.disabled = destroyed;}
    }
    async function destroy() {
        destroyed = true; toggle.disabled = true;
        await revoke();
        density.removeEventListener('change',setDensity);
        toggle.removeEventListener('click', change);
        close.removeEventListener('click', closeClick);
        lifecycle?.removeEventListener('pagehide', closeClick);
        root.remove();
    }
    function closeClick() {void destroy().catch(e => {label.textContent = String(e);});}
    toggle.addEventListener('click', change);
    close.addEventListener('click', closeClick);
    lifecycle?.addEventListener('pagehide', closeClick);
    document.body.append(root);
    return Object.freeze({destroy});
}
