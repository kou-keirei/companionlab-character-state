// TEST-only editor. Official loader evaluation creates controls, never decisions.
import {mountSidebar} from './sidebar.mjs';

// Transport counters survive UI disable/re-enable in this document. No facts here.
let seq=0,epoch=0,secret=null,chain=Promise.resolve(),ackedSeq=0;
async function connectTest(){
    if(secret)return;
    if(location.protocol!=='http:'||location.hostname!=='127.0.0.1'||location.port==='5001')
        throw Error('TEST_TRANSPORT_HOLD: supported local TEST backend unavailable; real chats disabled');
    const response=await fetch('/__companionlab_test__/config.json');
    if(!response.ok)throw Error('TEST_TRANSPORT_HOLD: supported local TEST backend unavailable; real chats disabled');
    secret=(await response.json()).secret;
    if(typeof secret!=='string'||secret.length<32){secret=null;throw Error('TEST_TRANSPORT_HOLD');}
}
export function mountManual({document, lifecycle=globalThis, container=document.body} = {}) {

const subscriptions=[];
const listen=(target,...args)=>{target.addEventListener(...args);subscriptions.push([target,args]);};
const root=document.createElement('section'); root.id='manual-test-editor';
root.setAttribute('aria-labelledby','demo-title');
container.append(root);
const style=document.createElement('style');
// Visual rhythm informed by Damir Sokolovsky's Unslop (CC BY 4.0):
// https://github.com/heydamir/unslop. Original extension implementation.
style.textContent=`
#manual-test-editor {font:inherit;color:inherit;min-width:0;}
#manual-test-editor *{box-sizing:border-box;max-width:100%;text-shadow:none;}
#manual-test-editor [hidden]{display:none!important;}
#manual-test-editor :is(h2,h3){font:inherit;font-weight:600;margin:16px 0 8px;color:inherit;}
#manual-test-editor p{margin:8px 0;overflow-wrap:anywhere;}
#manual-test-editor .demo-muted{font-size:.9em;}
#manual-test-editor label{display:block;margin:12px 0 4px;font-weight:600;}
#manual-test-editor :is(input,textarea,select,button){font:inherit;color:inherit;background:var(--cl-surface);border:1px solid var(--cl-border);border-radius:8px;box-shadow:none;}
#manual-test-editor :is(input:not([type=checkbox]),textarea,select){display:block;width:100%;padding:8px 12px;min-height:var(--cl-control);margin:0;}
#manual-test-editor textarea{resize:vertical;min-height:80px;}
#manual-test-editor input[type=checkbox]{width:20px;height:20px;vertical-align:middle;accent-color:var(--cl-accent);}
#manual-test-editor button{padding:8px 12px;min-height:var(--cl-control);margin:8px 4px 0 0;cursor:pointer;}
#manual-test-editor button.demo-primary{border-color:var(--cl-accent);font-weight:600;}
#manual-test-editor :disabled{opacity:.65;cursor:default;}
#manual-test-editor ::placeholder{color:inherit;opacity:.75;}
#manual-test-editor :is(input,textarea,select,button,summary):focus-visible{outline:2px solid var(--cl-accent);outline-offset:2px;}
#manual-test-editor .demo-card{padding:12px 0;border-top:1px solid var(--cl-border);margin-top:16px;}
#manual-test-editor blockquote{margin:8px 0;padding:8px 12px;border-left:2px solid var(--cl-accent);background:var(--cl-surface);color:inherit;overflow-wrap:anywhere;}
#manual-test-editor details{border-top:1px solid var(--cl-border);margin-top:16px;padding-top:8px;}
#manual-test-editor summary{cursor:pointer;min-height:var(--cl-control);padding:8px 0;}
#manual-test-editor pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;font-size:.85em;}
#manual-test-editor #demo-form,#manual-test-editor #demo-preview{padding:16px;border:1px solid var(--cl-border);border-radius:8px;background:var(--cl-surface);}
#manual-test-editor[data-editing=true] #companionlab-state-sidebar .cl-state-content{display:none;}
#manual-test-editor #companionlab-state-sidebar{position:static;width:100%;max-width:100%;border:0;border-radius:0;background:transparent;backdrop-filter:none;font:inherit;}
#manual-test-editor #companionlab-state-sidebar > div{width:auto;max-width:100%;max-height:none;overflow:visible;padding:0;}
#manual-test-editor #companionlab-state-sidebar > button{display:none;}
#manual-test-editor #companionlab-state-sidebar details{margin:0;padding:0;border:0;}
#manual-test-editor #companionlab-state-sidebar .cl-state-group{padding:8px 0;}
#manual-test-editor #demo-scene-header{position:sticky;top:0;z-index:2;background:var(--SmartThemeBlurTintColor,#171717);}
`;
root.append(style);
const make=(tag,text,id,parent=root)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(id)e.id=id;parent.append(e);return e;};
make('h3','Manual TEST workspace','demo-title');
make('p','Sample data only; not connected to your real chats').className='demo-muted';
const friendlyStatus=make('p','Consent OFF · Manual TEST not started','demo-status');friendlyStatus.setAttribute('role','status');friendlyStatus.setAttribute('aria-live','polite');
const welcome=make('div','','demo-welcome');
make('p','Try recording a few details about a fictional adult character. Nothing is saved until you review it and choose Save change.','',welcome);
const startDemo=make('button','Start demo','demo-start',welcome);startDemo.type='button';startDemo.className='demo-primary';
const sceneHeaderHost=make('div','','demo-scene-header');sceneHeaderHost.hidden=true;
const toolbar=make('div','','demo-toolbar');toolbar.hidden=true;
const sceneHost=make('div','','demo-scene');
const work=make('div','','demo-work');work.hidden=true;
const editButton=make('button','Edit / correct state','demo-edit',toolbar);editButton.type='button';editButton.hidden=true;
const example=make('details','','demo-example',work);example.className='demo-card';
make('summary','Sample source · adults only','',example);
const sentence=make('blockquote','Hypothetical Aoi (25) is at an invented streaming desk. All people are adults.','demo-source',example);
make('p','Load this example before reviewing a change. Loading it records no facts.','',example).className='demo-muted';
const loadDemo=make('button','Load example conversation','demo-load',work);loadDemo.type='button';
const form=make('div','','demo-form',work);form.className='demo-card';form.hidden=true;
function friendlyField(label,id,value,tag='input',parent=form){const l=make('label',label,id+'-label',parent);if(id==='demo-value')valueLabel=l;l.htmlFor=id;const e=make(tag,'',id,parent);e.value=value;return e;}
const fieldChoice=friendlyField('What changed?','demo-field','location','select');
const fieldSpecs={location:{label:'Where is the character?',key:['location','','']},activity:{label:'What are they doing?',key:['activity','aoi-test','']},clothing:{label:'What are they wearing?',key:['clothing','aoi-test','outer']},posture:{label:'How are they positioned?',key:['posture','aoi-test','']}};
for(const [value,spec] of Object.entries(fieldSpecs)){const option=make('option',spec.label,'',fieldChoice);option.value=value;}
fieldChoice.value='location';
const currentValue=make('p','Currently: Not recorded','demo-current',form);currentValue.className='demo-muted';
let valueLabel;
const valueInput=friendlyField('Where is the character?','demo-value','','input');valueInput.placeholder='For example, at the streaming desk';valueInput.maxLength=256;
const unknownLabel=make('label','','',form);const unknownInput=make('input','','demo-unknown',unknownLabel);unknownInput.type='checkbox';make('span',' Not recorded / unknown','',unknownLabel);
const reviewButton=make('button','Review change','demo-review',form);reviewButton.type='button';reviewButton.className='demo-primary';
const undoButton=make('button','Undo saved change…','demo-undo',toolbar);undoButton.type='button';undoButton.disabled=true;
const backButton=make('button','Back to scene','demo-back',form);backButton.type='button';
const preview=make('section','','demo-preview',work);preview.className='demo-card';preview.hidden=true;preview.setAttribute('aria-labelledby','demo-preview-title');
const previewTitle=make('h3','Review this change','demo-preview-title',preview);previewTitle.tabIndex=-1;
const previewText=make('p','','demo-preview-text',preview);
const previewSource=make('blockquote','','demo-preview-source',preview);
const sourceWhy=make('details','','demo-why',preview);make('summary','Why? / selected source','',sourceWhy);
const sourceReceipt=make('pre','','demo-source-receipt',sourceWhy);
const noteInput=friendlyField('Note (optional)','demo-note','','input',preview);noteInput.maxLength=256;noteInput.placeholder='Why you chose this change';
const saveButton=make('button','Save change','demo-save',preview);saveButton.type='button';saveButton.className='demo-primary';
const cancelButton=make('button','Cancel','demo-cancel',preview);cancelButton.type='button';
make('p','Missing information stays unknown. Only explicitly saved changes enter the Ledger.','',work).className='demo-muted';
const stopDemo=make('button','End demo','demo-stop');stopDemo.hidden=true;stopDemo.type='button';
const advanced=make('details','','demo-advanced');advanced.open=false;make('summary','Advanced details','',advanced);
make('p','Developer controls and exact source audit. These are not needed for the demo.','',advanced).className='demo-muted';
const status=make('p','DISABLED','manual-status',advanced);
const field=(label,id,value,tag='input')=>{make('label',label,'',advanced).htmlFor=id;const e=make(tag,'',id,advanced);e.value=value;return e;};
const text=field('Sample source sentence','manual-text','Hypothetical Aoi (25) is at an invented streaming desk. All people are adults.','textarea');
const revision=field('Revision','manual-revision','r1');
const swipe=field('Selected swipe identity','manual-swipe','selected-s1');
const branch=field('Branch','manual-branch','main');
const id=field('New proposal ID','manual-id','manual-location-1');
const corrects=field('Corrects approved proposal ID','manual-corrects','');
const changes=field('Structured changes','manual-changes',JSON.stringify([{field:'location',value:'Hypothetical streaming desk'}]),'textarea');
make('p','Scene actor: aoi-test · Agency: companion. Operator: test-operator.','',advanced);
const decision=field('Proposal to decide','manual-decision','manual-location-1');
const action=make('select','','manual-action',advanced);
for(const name of ['commit','retract']){const o=make('option',name,'',action);o.value=name;}
action.value='commit';
const expected=field('Server action digest','manual-expected','');expected.readOnly=true;
const confirmation=field('Exact confirmation','manual-confirmation','');
const reason=field('Operator reason','manual-reason','');
const reviewed=make('input','','manual-reviewed',advanced);reviewed.type='checkbox';make('label','I reviewed the exact proposal/source/action.','',advanced).htmlFor=reviewed.id;
const details=make('pre','','manual-audit',advanced);
let disposed=false,editOpen=false,demoReady=false,reviewDraft=null,reviewVersion=0,proposalSerial=0,demoBusy=false;saveButton.disabled=true;
function cancelReview(){reviewDraft=null;reviewVersion++;preview.hidden=true;previewText.textContent='';previewSource.textContent='';sourceReceipt.textContent='';noteInput.value='';saveButton.disabled=true;}
function syncDemo(){
    if(disposed)return;
    const active=current!==null;
    work.hidden=!active;welcome.hidden=active;form.hidden=!active||!demoReady||!editOpen||!!reviewDraft;
    editButton.hidden=!active||!demoReady;toolbar.hidden=!active||!demoReady;sceneHost.hidden=!active;sceneHeaderHost.hidden=!active;
    root.setAttribute('data-editing',String(editOpen||!!reviewDraft));
    const spec=fieldSpecs[fieldChoice.value]??fieldSpecs.location;
    const row=last?.manual.current.find(f=>JSON.stringify(f.key)===JSON.stringify(spec.key));
    currentValue.textContent='Currently: '+(row?.certainty==='known'&&row.current!==null?String(row.current):'Not recorded');
    undoButton.disabled=!active||!demoReady||!row;undoButton.textContent='Undo '+fieldChoice.value+'…';
    loadDemo.disabled=demoReady||demoBusy;loadDemo.textContent=demoReady?'Example loaded':'Load example conversation';reviewButton.disabled=!active||!demoReady||demoBusy;saveButton.disabled=!reviewDraft||demoBusy;startDemo.disabled=demoBusy||blocked||ended;stopDemo.hidden=!active&&!possibleOwner&&!demoBusy;
    valueInput.setAttribute('aria-label',spec.label);valueLabel.textContent=spec.label;valueInput.disabled=unknownInput.checked;undoButton.disabled=undoButton.disabled||demoBusy;
}
function setStatus(value){
    if(disposed)return;
    status.textContent=value;
    friendlyStatus.textContent=value==='DISABLED'?'Consent OFF · Manual TEST not started':value==='MANUAL_TEST_ONLY'?(demoReady?'Ready to review a change':'Demo started. Load the example conversation to continue.')
        :String(value).includes('CLOSE_HOLD')?'The demo could not confirm it has ended. Stop it in its owning console before trying again.'
        :String(value).toLowerCase().includes('changed')?'The example changed. Start the demo again to use the new source.'
        :'The demo paused to keep your state safe. End it and start again.';
    syncDemo();
}
let version=0,current=null,last=null,sidebar=null;
let possibleOwner=false,closing=null,blocked=false,ended=false,uncertain=0;
const inFlight=new Set();
const timeouts=new Set(),intervals=new Set();
const timers={performance, setTimeout(fn,ms){const n=setTimeout(fn,ms);timeouts.add(n);return n;},clearTimeout(n){clearTimeout(n);timeouts.delete(n);},setInterval(fn,ms){const n=setInterval(fn,ms);intervals.add(n);return n;},clearInterval(n){clearInterval(n);intervals.delete(n);}};
function clear(){version++;current=null;last=null;details.textContent='';valueInput.value='';unknownInput.checked=false;demoReady=false;demoBusy=false;editOpen=false;cancelReview();syncDemo();expected.value='';confirmation.value='';reviewed.checked=false;
    // A failed read-only render must not interrupt already requested revocation.
    try{sidebar?.destroy();}catch{} sidebar=null;
    for(const n of timeouts)clearTimeout(n);for(const n of intervals)clearInterval(n);timeouts.clear();intervals.clear();document.getElementById('companionlab-state-sidebar')?.remove();}
function digestDisplay(){const p=last?.manual.proposals.find(p=>p.id===decision.value);expected.value=p?.[action.value+'_confirmation']??'';confirmation.value='';reviewed.checked=false;}
listen(decision,'input',digestDisplay);listen(action,'change',digestDisplay);
async function selection(){
    const content=text.value;
    const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)));
    const hash=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
    return {synthetic:true,character_id:'aoi-test',chat_id:'TEST-W128-adult-manual-editor',branch_id:branch.value,messages:[{source:{character_id:'aoi-test',chat_id:'TEST-W128-adult-manual-editor',branch_id:branch.value,message_id:'manual-m1',revision_id:revision.value,selected_swipe_id:swipe.value,speaker_id:'aoi-test',turn_index:0,source_content_sha256:hash},content,status:'accepted'}]};
}
function request(op,arg={},snapshot=current,direct=false){
    // Serialize commands, never auto-retry lost acknowledgements or decisions.
    const token=version;
    const perform=async()=>{
        let sent;
        try {
        if(op!=='close'&&(blocked||ended||token!==version))throw Error('Rearm/close acknowledgement required');
        if(op!=='close' && JSON.stringify(await selection())!==JSON.stringify(snapshot))throw Error('Selected source changed; new consent required');
        await connectTest();
        if(op!=='close'&&(blocked||ended||token!==version))throw Error('Stale local command');
        const sentEpoch=epoch, maxCloseEpoch=epoch+1+uncertain+inFlight.size;
        sent=++seq;inFlight.add(sent);
        const response=await fetch('/__companionlab_test__/manual',{method:'POST',headers:{'Content-Type':'application/json','X-CompanionLab-Test':secret},body:JSON.stringify({op,seq:sent,epoch:sentEpoch,current:snapshot,arg}),signal:AbortSignal.timeout(3000),keepalive:op==='close'});
        const result=await response.json();
        if(!response.ok||result.seq!==sent||!Number.isSafeInteger(result.epoch)
            ||Object.keys(result).sort().join(',')!=='epoch,manual,seq,sidebar,status'
            ||result.manual?.status!==result.status
            ||!Array.isArray(result.manual?.current)||!Array.isArray(result.manual?.proposals)
            ||result.sidebar?.status!=='READ_ONLY_TEST_LEDGER'||result.sidebar.write_status!=='WRITE_HOLD'
            ||!Array.isArray(result.sidebar.facts)||!Array.isArray(result.sidebar.events))throw Error('COMMAND_ACK_HOLD');
        if(op==='close') {
            if(result.epoch<=sentEpoch||result.epoch>maxCloseEpoch||result.status!=='DISABLED'
                ||result.manual.status!=='DISABLED'||result.manual.current.length||result.manual.proposals.length
                ||!Array.isArray(result.sidebar?.facts)||result.sidebar.facts.length
                ||!Array.isArray(result.sidebar?.events)||result.sidebar.events.length)throw Error('CLOSE_ACK_HOLD');
        } else if(result.epoch!==sentEpoch+(op==='start'?1:0)||result.status!=='MANUAL_TEST_ONLY'
            ||(op==='start'&&(result.manual.current.length||result.manual.proposals.length)))throw Error('EPOCH_ACK_HOLD');
        // A navigation Close can overtake a pending acknowledgement. Never let
        // an older reply roll the confirmed server epoch/sequence backwards.
        if(sent>ackedSeq){ackedSeq=sent;epoch=result.epoch;uncertain=0;if(op==='close')blocked=false;}
        return result;
        } catch(error) {
            if(sent>ackedSeq){blocked=true;uncertain=1;}
            // Inspect failures are swallowed by the read-only view client, so
            // transport itself must revoke too, not only button error handlers.
            if(op!=='close'&&token===version){void withdraw();setStatus(String(error));}
            throw error;
        }
        finally {inFlight.delete(sent);}
    };
    if(direct)return perform();
    const pending=chain.then(perform);chain=pending.catch(()=>{});return pending;
}
function show(result){last=result;setStatus(result.status);details.textContent=JSON.stringify(result.manual,null,2);digestDisplay();syncDemo();}
async function start(){
    const busy=demoBusy,cleanup=withdraw(),token=version;
    // The initial empty-baseline withdrawal must not release this Start's UI lock.
    demoBusy=busy;syncDemo();await cleanup;
    if(token!==version)return;
    if(blocked||ended)throw Error('CLOSE_HOLD; stop this foreground fixture');
    const snapshot=await selection();if(token!==version)return;
    await connectTest();if(token!==version||ended)return;
    possibleOwner=true; // Includes Start in flight, before current/view exists.
    try {
        const result=await request('start',{},snapshot);if(token!==version)return;
        current=snapshot;show(result);sentence.textContent=current.messages[0].content;
        const mounted=mountSidebar({document,timers,container:sceneHost,headerContainer:sceneHeaderHost,embedded:true,onSelect:()=>{editOpen=false;cancelReview();syncDemo();},binding:()=>current,inspect:async observation=>{const value=await request('inspect',{},observation);return value.sidebar;},onRenderError:error=>{
            if(token===version){void withdraw();setStatus(String(error));}
        }});
        if(token!==version){mounted.clear();return;}
        sidebar=mounted;
        // The authoritative inspector catches reply/renderer faults internally.
        // Propagate its terminal refresh outcome through our existing Close
        // barrier instead of duplicating its schema or leaving a writer armed.
        const view=sidebar,refresh=view.refresh.bind(view);
        view.refresh=async options=>{
            if(options?.automatic&&view.halted)return;
            const token=version;
            try {
                await refresh(options);
                if(token===version&&view===sidebar&&view.halted) {
                    void withdraw();setStatus('INSPECTOR_REPLY_HOLD');
                }
            } catch(error) {
                if(token===version&&view===sidebar){void withdraw();setStatus(String(error));}
            }
        };
    } catch(error) {if(token===version)throw error;}
}
async function send(op,arg={}){if(!current)throw Error('Consent/start required');const token=version;try{const result=await request(op,arg);if(token!==version)return;show(result);await sidebar?.refresh();return result;}catch(error){if(token===version)throw error;}}
function withdraw(navigation=false){
    clear();setStatus(blocked?'CLOSE_HOLD; stop this foreground fixture':'DISABLED');
    if(navigation)ended=true;
    if(!possibleOwner)return closing??Promise.resolve();
    if(navigation||!closing) {
        const pending=request('close',{},null,navigation).then(()=>{possibleOwner=false;syncDemo();},()=>{blocked=true;setStatus('CLOSE_HOLD; stop this foreground fixture');});
        if(!navigation)closing=pending.then(()=>{if(!blocked)closing=null;});
        return pending;
    }
    return closing;
}
for(const e of [text,revision,swipe,branch])listen(e,'input',()=>void withdraw());
function button(label,id,fn){const b=make('button',label,id,advanced);b.type='button';b.style.margin='4px';listen(b,'click',()=>{if(ended||b.disabled)return;b.disabled=true;const token=version;Promise.resolve().then(()=>{if(!ended&&token===version)return fn();}).catch(error=>{if(!ended&&token===version){void withdraw();setStatus(String(error));}}).finally(()=>{if(!ended)b.disabled=false;});});return b;}
button('Consent / start empty TEST baseline','manual-start',start);
button('Next distinct logical message','manual-next',()=>send('next',{message_id:'manual-m2',turn_index:1}));
button('Propose only (no approval)','manual-propose',()=>send('propose',{event_id:id.value,corrects:corrects.value,source:current.messages[0].source,actor:'aoi-test',agency:'companion',changes:JSON.parse(changes.value)}));
button('Confirm separate decision','manual-decide',()=>{if(!reviewed.checked||!expected.value||confirmation.value!==expected.value||!reason.value.trim())throw Error('Review, exact digest and reason required');return send('decide',{action:action.value,decision_id:decision.value,operator:'test-operator',reason:reason.value,confirmation:confirmation.value});});
button('Withdraw / restart requires new consent','manual-close',withdraw);
// Friendly controls compose the same commands; no approval occurs on load,
// source freeze, field input, or proposal creation.
function reviewChanged(){cancelReview();syncDemo();}
listen(fieldChoice,'change',reviewChanged);listen(valueInput,'input',reviewChanged);listen(unknownInput,'change',reviewChanged);
function stageReview(proposal,operation,label,value){
    const digest=proposal[operation+'_confirmation'];
    if(!/^[a-f0-9]{64}$/.test(digest))throw Error('COMMAND_ACK_HOLD');
    reviewDraft={proposal,operation,digest,version,selection:JSON.stringify(current)};
    previewText.textContent=operation==='retract'?'Undo the saved '+label.toLowerCase()+' change? The previous approved value will return, or it will be Not recorded.':label+' '+value;
    previewSource.textContent=current.messages[0].content;
    sourceReceipt.textContent=JSON.stringify(proposal,null,2);
    previewTitle.textContent=operation==='retract'?'Review undo':'Review this change';
    saveButton.textContent=operation==='retract'?'Confirm undo':'Save change';
    preview.hidden=false;previewTitle.focus?.();syncDemo();
}
async function reviewChange(){
    if(!current||!demoReady)return;
    const spec=fieldSpecs[fieldChoice.value];if(!spec)return;
    const value=valueInput.value.trim();
    if(!unknownInput.checked&&(!value||value.length>256)){friendlyStatus.textContent='Enter a short value, or choose Not recorded.';valueInput.focus?.();return;}
    cancelReview();const local=reviewVersion,token=version;
    const previous=last.manual.current.find(f=>JSON.stringify(f.key)===JSON.stringify(spec.key));
    const change={field:spec.key[0],subject:spec.key[1],layer:spec.key[2],value:unknownInput.checked?null:value,certainty:unknownInput.checked?'unknown':'known'};
    const identity='demo-change-'+(++proposalSerial);
    const result=await send('propose',{event_id:identity,corrects:previous?.event_id??'',source:current.messages[0].source,actor:'aoi-test',agency:'companion',changes:[change]});
    if(local!==reviewVersion||token!==version||!result)return;
    const proposal=result.manual.proposals.find(p=>p.id===identity);
    if(!proposal||proposal.status!=='proposed')throw Error('COMMAND_ACK_HOLD');
    stageReview(proposal,'commit',spec.label,change.certainty==='known'?value:'Not recorded');
    friendlyStatus.textContent='Preview only. Nothing has been saved yet.';
}
function reviewUndo(){
    if(!current||!demoReady)return;
    cancelReview();const spec=fieldSpecs[fieldChoice.value];
    const fact=last.manual.current.find(f=>JSON.stringify(f.key)===JSON.stringify(spec?.key));
    const proposal=last.manual.proposals.find(p=>p.id===fact?.event_id&&p.effective&&p.status==='committed');
    if(!proposal){friendlyStatus.textContent='There is no saved change to undo for this field.';return;}
    stageReview(proposal,'retract',spec.label,'');
    friendlyStatus.textContent='Review the undo, then choose Confirm undo.';
}
async function saveReview(){
    const draft=reviewDraft;
    if(!draft||draft.version!==version||draft.selection!==JSON.stringify(current))throw Error('Selected source changed; new consent required');
    const note=noteInput.value.trim();if(note.length>256){friendlyStatus.textContent='Keep the note to 256 characters or fewer.';return;}
    // Consume the displayed review before awaiting: no duplicate Save/approval.
    cancelReview();editOpen=false;
    const result=await send('decide',{action:draft.operation,decision_id:draft.proposal.id,operator:'test-operator',reason:note||(draft.operation==='retract'?'I reviewed the displayed demo change and explicitly chose Confirm undo.':'I reviewed the displayed demo change and explicitly chose Save change.'),confirmation:draft.digest});
    if(!result||draft.version!==version||!current)return;
    friendlyStatus.textContent=draft.operation==='retract'?'Change undone. The approved state is shown in Character State.':'Change saved. The approved state is shown in Character State.';
}
function friendlyButton(button,operation){listen(button,'click',()=>{
    if(ended||button.disabled||demoBusy)return;
    demoBusy=true;syncDemo();
    let token=version;
    Promise.resolve().then(()=>{if(ended||token!==version)return;const pending=operation();token=version;return pending;}).catch(error=>{if(!ended&&token===version){void withdraw();setStatus(String(error));}}).finally(()=>{if(ended||disposed||token!==version)return;demoBusy=false;syncDemo();});
});}
listen(backButton,'click',()=>{if(ended)return;editOpen=false;cancelReview();syncDemo();editButton.focus?.();});
listen(editButton,'click',()=>{if(ended)return;editOpen=!editOpen;cancelReview();syncDemo();if(editOpen)fieldChoice.focus?.();});
friendlyButton(startDemo,start);
friendlyButton(loadDemo,async()=>{const token=version,result=await send('next',{message_id:'manual-m2',turn_index:1});if(result&&token===version&&current){demoReady=true;editOpen=true;syncDemo();setStatus(result.status);fieldChoice.focus?.();}});
friendlyButton(reviewButton,reviewChange);friendlyButton(saveButton,saveReview);friendlyButton(undoButton,reviewUndo);
listen(cancelButton,'click',()=>{cancelReview();syncDemo();friendlyStatus.textContent='Review cancelled. No change was saved.';(editOpen?reviewButton:undoButton).focus?.();});
listen(stopDemo,'click',()=>{void withdraw();});
listen(preview,'keydown',event=>{if(event.key==='Escape'){event.preventDefault?.();cancelButton.click();}});
const onHide=()=>void withdraw(true);
listen(lifecycle,'pagehide',onHide);
let removed=false;
return Object.freeze({async destroy(){
    if(removed)return;
    ended=true;
    for(const [target,args] of subscriptions)target.removeEventListener(...args);
    subscriptions.length=0;
    lifecycle.removeEventListener('pagehide',onHide);
    // Await revocation before another editor can own the canonical TEST session.
    await withdraw();
    if(blocked)throw Error('CLOSE_HOLD: stop the owning disposable TEST fixture');
    disposed=true;root.remove();removed=true;
}, root});
}
