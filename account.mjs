/* Optional GitHub sign-in + synced practice. No credentials are required to code as a guest.
 * The public Supabase project URL and publishable key come from account-config.js.
 * OAuth client secrets and teacher credentials NEVER belong in this site.
 */
import {ScopedStorage, PREFIX, DRAFT, FINISHED, resourceForKey, validateSource} from "./account-model.mjs";

const config=window.MT_CONFIG||{};
const enabled=!!(typeof config.supabaseUrl==="string" && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.supabaseUrl) &&
  typeof config.publishableKey==="string" && config.publishableKey.length>=20);
const LESSONS=Object.fromEntries((window.MT_ASSIGNMENTS||[]).map(l=>[l.id,l]));
const browserStorage=localStorage;
const queuePrefix=PREFIX+"pending:";
let client=null,user=null,storage=new ScopedStorage(browserStorage,null,LESSONS);
let revisions=new Map(),queue=[],synced=false,syncing=false,flushTimer=null,classes=[],teacher=false,booted=false;
let message=enabled?"Checking GitHub session…":"Guest mode · saved only on this device";
const el=id=>document.getElementById(id);

function notify(value) {
  if(value)message=value;
  const status=el("account-status");
  if(status)status.textContent=message;
  if(el("account-signin"))el("account-signin").hidden=!enabled||!!user;
  if(el("account-signout"))el("account-signout").hidden=!user;
  if(el("account-classes"))el("account-classes").hidden=!user;
  if(el("account-import-guest"))el("account-import-guest").hidden=!user;
  if(el("submit-work"))el("submit-work").hidden=!user;
  document.dispatchEvent(new CustomEvent("mrtully-account-status",{detail:{signedIn:!!user,pending:queue.length}}));
}
function getQueueKey(){return queuePrefix+user.id;}
function persistQueue(){if(user)browserStorage.setItem(getQueueKey(),JSON.stringify(queue));}
function enqueue(key,value) {
  const meta=resourceForKey(key,LESSONS);if(!user||!meta)return;
  const index=queue.findIndex(task=>task.key===key);
  const expected=index>=0?queue[index].expected:(revisions.get(meta.lessonId)||0);
  const next={key,value,expected};
  if(index>=0)queue[index]=next;
  else queue.push(next);
  persistQueue();notify("Saved on this device · "+queue.length+" change(s) syncing");
  clearTimeout(flushTimer);flushTimer=setTimeout(()=>void flush(),1200);
}
function localItem(k){try{return browserStorage.getItem(k)}catch{return null;}}
function safeRestorePath(v) {
  try {const u=new URL(v,location.origin);
    const base=new URL("./",location.href);
    if(u.origin===location.origin && u.pathname.startsWith(base.pathname))return u.pathname+u.search+u.hash;
  }catch{}
  return new URL("./",location.href).pathname;
}
function backupPending() {
  const blob=new Blob([JSON.stringify({version:1,savedAt:new Date().toISOString(),pending:queue},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download="mrtullyclass-unsynced.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function initializeClient() {
  const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2.118.0");
  client=createClient(config.supabaseUrl,config.publishableKey,{
    auth:{storageKey:"mrtullyclass-auth-v1",flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}
  });
}
async function signIn(){
  if(!client) {notify("Cloud sign-in is not configured.");return;}
  if(user)return;
  try {
    sessionStorage.setItem("mrtullyclass-return-to",safeRestorePath(location.href));
    notify("Opening GitHub sign-in…");
    const {error}=await client.auth.signInWithOAuth({provider:"github",options:{redirectTo:new URL("auth-callback.html",location.href).href}});
    if(error)throw error;
  }catch(error){notify("Unable to open GitHub sign-in: "+error.message);}
}
async function signOut(){
  if(!client||!user)return;
  await flush();
  if(queue.length){if(!confirm("Some changes have not synced. Download a copy and sign out anyway?"))return;backupPending();}
  account.signingOut=true;
  const oldUser=user;const {error}=await client.auth.signOut({scope:"local"});
  if(error){account.signingOut=false;notify("Could not sign out; please retry.");return;}
  storage.clearAccount();
  // Prevent pagehide's editor autosave from rewriting account work after sign-out.
  account.signingOut=true;
  storage={getItem(){return null;},setItem(){},removeItem(){}};
  user=null;
  try{if(!queue.length)browserStorage.removeItem(queuePrefix+oldUser.id)}catch{}
  location.reload();
}
async function hydrate(){
  if(!user||!client)return;
  const pending=new Set(queue.map(t=>t.key));
  const [draftResponse,progressResponse]=await Promise.all([
    client.from("mrtully_drafts").select("lesson_id,course_id,filename,source_code,revision").eq("user_id",user.id).limit(1000),
    client.from("mrtully_progress").select("lesson_id,completed").eq("user_id",user.id).limit(1000)
  ]);
  if(draftResponse.error||progressResponse.error)throw draftResponse.error||progressResponse.error;
  for(const row of draftResponse.data||[]){
    if(!LESSONS[row.lesson_id]||!validateSource(row.source_code))continue;
    revisions.set(row.lesson_id,row.revision);
    const key=DRAFT+row.lesson_id;
    if(!pending.has(key))browserStorage.setItem(storage.scope(key),row.source_code);
  }
  for(const row of progressResponse.data||[]){
    if(!LESSONS[row.lesson_id])continue;
    const key=FINISHED+row.lesson_id;
    if(!pending.has(key)){
      if(row.completed)browserStorage.setItem(storage.scope(key),"yes");
      else browserStorage.removeItem(storage.scope(key));
    }
  }
  synced=true;
}
async function flush(){
  if(!user||!client||syncing||!queue.length)return;
  syncing=true;
  try{
    while(queue.length){
      const task=queue[0],meta=resourceForKey(task.key,LESSONS);
      if(!meta){queue.shift();persistQueue();continue;}
      let error=null,revision;
      if(meta.kind==="draft"){
        const source=task.value===null?"":task.value;
        if(!validateSource(source)){notify("Draft too large to sync; download a backup.");break;}
        const result=await client.rpc("mrtully_save_draft",{
          p_lesson:meta.lessonId,p_course:meta.course,p_filename:meta.file,
          p_source:source,p_expected:task.expected
        });
        error=result.error;revision=result.data?.revision;
      }else{
        const result=await client.from("mrtully_progress").upsert({
          user_id:user.id,lesson_id:meta.lessonId,course_id:meta.course,completed:task.value==="yes"
        },{onConflict:"user_id,lesson_id"});
        error=result.error;
      }
      if(error){
        if(/conflict|revision/i.test(error.message))notify("Draft conflict: the cloud version changed. Download a backup before editing further.");
        else notify("Saved locally; cloud sync unavailable. "+String(error.message).slice(0,120));
        break;
      }
      if(meta.kind==="draft" && Number.isSafeInteger(revision))revisions.set(meta.lessonId,revision);
      if(queue[0]===task){
        queue.shift();
      }else if(queue[0]?.key===task.key) {
        queue[0].expected=revision||0;
      }
      persistQueue();
    }
    if(!queue.length)notify("Cloud drafts synced · "+(user.user_metadata?.user_name||"GitHub account"));
  }catch(error){notify("Saved locally; cloud connection failed.");}
  finally{syncing=false;}
}
async function refreshClasses() {
  if(!user||!client)return [];
  const {data,error}=await client.rpc("mrtully_my_classes");
  if(error){notify("Class list could not load: "+error.message);return [];}
  teacher=!!data?.teacher;
  classes=Array.isArray(data?.classes)?data.classes:[];
  return classes;
}
function node(tag,textValue,cls){
  const n=document.createElement(tag);
  if(textValue!==undefined)n.textContent=textValue;
  if(cls)n.className=cls;
  return n;
}
async function openClasses(){
  const dlg=el("classes-dialog"), area=el("classes-content");
  if(!dlg||!area)return;
  area.replaceChildren(node("p","Loading classes…"));
  dlg.showModal();
  await refreshClasses();
  if(!dlg.open)return;
  area.replaceChildren();
  const title=node("h3","My classes");area.append(title);
  const list=node("ul");area.append(list);
  if(!classes.length)list.append(node("li","No classes yet."));
  for(const c of classes){
    const li=node("li",c.name+" · "+c.course_id+" · "+(c.status||"Teacher"));
    if(c.join_code)li.append(node("span"," · Code: "+c.join_code));
    if(c.status==="approved")li.append(node("span"," · Can submit"));
    list.append(li);
  }
  const heading=node("h3","Join a classroom");area.append(heading);
  const help=node("p","Ask your teacher for a join code. Your submitted code will be visible to the teacher once they approve your request.");area.append(help);
  const form=node("form");form.className="account-class-join";
  const code=node("input");code.placeholder="Class join code";code.required=true;code.maxLength=20;code.setAttribute("aria-label","Class join code");
  const name=node("input");name.placeholder="Display name for your teacher";name.required=true;name.maxLength=80;name.setAttribute("aria-label","Display name for your teacher");
  const submit=node("button","Request to join");submit.type="submit";form.append(code,name,submit);
  const result=node("p");result.setAttribute("role","status");form.append(result);
  form.onsubmit=async event=>{
    event.preventDefault();submit.disabled=true;
    const {error}=await client.rpc("mrtully_join_class",{p_code:code.value.trim(),p_name:name.value.trim()});
    result.textContent=error?"Join failed: "+error.message:"Request sent. Your teacher must approve you before you can submit.";
    submit.disabled=false;if(!error)await refreshClasses();
  };
  area.append(form);
  if(teacher){
    const section=node("h3","Teacher dashboard");area.append(section);
    const classForm=node("form");classForm.className="account-class-join";
    const newName=node("input");newName.required=true;newName.placeholder="Class name";newName.maxLength=80;newName.setAttribute("aria-label","Class name");
    const select=node("select");select.setAttribute("aria-label","Course");
    for(const course of ["CSF","CS3","AP CSA"]){const o=node("option",course);o.value=course;select.append(o);}
    const create=node("button","Create class");create.type="submit";classForm.append(newName,select,create);
    classForm.onsubmit=async event=>{
      event.preventDefault();create.disabled=true;
      const {error}=await client.rpc("mrtully_create_class",{p_name:newName.value,p_course:select.value});
      create.disabled=false;if(error)alert("Could not create class: "+error.message);
      else await openClassesInto(dlg,area);
    };area.append(classForm);
    for(const c of classes.filter(c=>c.role==="teacher")){
      const button=node("button","Review "+c.name+" — students and submissions");
      button.type="button";button.onclick=()=>void showTeacherClass(c,area);
      area.append(button);
    }
  }
}
async function openClassesInto(dlg,area){if(dlg.open)await openClasses();}

async function showTeacherClass(c,area){
  const box=node("section");box.className="teacher-review";area.append(box);
  box.replaceChildren(node("p","Loading roster and submissions…"));
  const [roster,handins]=await Promise.all([
    client.rpc("mrtully_teacher_roster",{p_class:c.id}),
    client.rpc("mrtully_teacher_submissions",{p_class:c.id})
  ]);
  box.replaceChildren(node("h3",c.name+" · teacher review"));
  if(roster.error||handins.error){box.append(node("p","Could not load class records."));return;}
  box.append(node("h4","Student roster"));
  for(const entry of (roster.data||[])){
    const item=node("div",(entry.display_name||"Student")+" · "+entry.status);
    if(entry.status==="pending"){
      const approve=node("button","Approve");
      approve.onclick=async()=>{
        const {error}=await client.rpc("mrtully_set_member_status",{p_class:c.id,p_student:entry.user_id,p_status:"approved"});
        if(error)alert(error.message);else {approve.disabled=true;item.append(node("span"," · approved"));}
      };item.append(approve);
    }
    box.append(item);
  }
  box.append(node("h4","Submitted work"));
  for(const work of (handins.data||[])){
    const item=node("details");
    item.append(node("summary",(work.display_name||"Student")+" · "+work.lesson_id+" · "+new Date(work.submitted_at).toLocaleString()));
    const pre=node("pre",work.source_code);pre.className="submission-source";item.append(pre);box.append(item);
  }
  if(!handins.data?.length)box.append(node("p","No submitted work yet."));
}
async function submitWork({lessonId,course,filename,code}){
  if(!user||!client)throw new Error("Sign in with GitHub to submit work.");
  if(!validateSource(code))throw new Error("Submission is too large.");
  await refreshClasses();
  const eligible=classes.filter(c=>c.status==="approved"&&c.course_id===course);
  if(!eligible.length)throw new Error("Join a "+course+" class and ask your teacher to approve you first.");
  const picked=eligible.length===1?eligible[0]:eligible.find(c=>c.id===window.prompt("Choose a class ID:\n"+eligible.map(x=>x.name+": "+x.id).join("\n")));
  if(!picked)throw new Error("Submission cancelled.");
  if(!confirm("Submit a copy of "+filename+" for "+picked.name+"? This creates a permanent hand-in; saving drafts alone does not submit."))return null;
  const {data,error}=await client.from("mrtully_submissions").insert({
    user_id:user.id,class_id:picked.id,lesson_id:lessonId,course_id:course,filename,source_code:code
  }).select("id,submitted_at").single();
  if(error)throw error;
  notify("Submitted · "+new Date(data.submitted_at).toLocaleString());
  return data;
}
async function importGuest(){
  if(!user)return;
  if(!confirm("Import unassigned guest drafts from this browser? Only do this if this is your own work. Existing account drafts will not be overwritten."))return;
  const keys=Object.keys(LESSONS).flatMap(id=>[DRAFT+id,FINISHED+id]);
  const count=storage.importGuest(keys,false);
  if(count)await flush();
  document.dispatchEvent(new Event("mrtully-account-ready"));
  notify("Imported "+count+" guest saves into your account.");
}
const account={
  get enabled(){return enabled;},get signedIn(){return !!user;},get ready(){return booted;},
  get user(){return user;},get pending(){return queue.length;},
  get storage(){return storage;},get classes(){return classes;},
  signingOut:false,signIn,signOut,submitWork,refreshClasses,openClasses,importGuest,flush
};
window.MTAccount=account;

async function initialize(){
  if(!enabled){booted=true;notify();return;}
  try {
    await initializeClient();
    if(location.pathname.endsWith("/auth-callback.html")){
      const params=new URLSearchParams(location.search),code=params.get("code"),status=el("account-callback-status");
      if(!code){if(status)status.textContent="No sign-in response found. Return to the classroom.";return;}
      const {error}=await client.auth.exchangeCodeForSession(code);
      history.replaceState(null,"",location.pathname);
      if(error){if(status)status.textContent="Sign-in failed: "+error.message;return;}
      const back=safeRestorePath(sessionStorage.getItem("mrtullyclass-return-to")||"./");
      sessionStorage.removeItem("mrtullyclass-return-to");
      location.replace(back);return;
    }
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    user=data.session?.user||null;
    if(user){
      storage=new ScopedStorage(browserStorage,user.id,LESSONS,enqueue);
      try{queue=JSON.parse(localItem(getQueueKey())||"[]");if(!Array.isArray(queue))queue=[];}catch{queue=[];}
      queue=queue.filter(item=>item&&resourceForKey(item.key,LESSONS)&&typeof item.expected==="number");
      await hydrate();
      await refreshClasses();
      await flush();
      notify(queue.length?"Signed in · unsynced work":"Signed in as "+(user.user_metadata?.user_name||"GitHub student")+" · cloud save ready");
    }else notify("Guest mode · saved only on this device");
    client.auth.onAuthStateChange((event,session)=>{
      if(!account.signingOut&&(event==="SIGNED_OUT"||(session?.user?.id||null)!==(user?.id||null)))location.reload();
    });
    window.addEventListener("online",()=>void flush());
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")void flush();});
  }catch(error){notify("Cloud account unavailable; guest saves still work. "+String(error.message).slice(0,80));}
  finally{
    booted=true;notify();document.dispatchEvent(new Event("mrtully-account-ready"));
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void initialize(),{once:true});
else void initialize();
