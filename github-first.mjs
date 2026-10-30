/* Optional GitHub-only coursework sync; no Supabase.
 * Guest drafts always remain in browser localStorage. Signed-in drafts use
 * a separate account-scoped cache. GitHub commits require explicit clicks.
 */
const cfg=window.MT_GITHUB||{};
const configured=/^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(cfg.apiBase||"") &&
  /^[A-Za-z0-9_]+$/.test(cfg.clientId||"");
const KEY="mrtullyclass:github:";
const cache=window.localStorage;
const session=window.sessionStorage;
const lessons=Array.isArray(window.MT_ASSIGNMENTS)?window.MT_ASSIGNMENTS:[];
const byId=new Map(lessons.map(l=>[l.id,l]));
const el=id=>document.getElementById(id);
const callout=(value)=>{const target=el("github-status");if(target)target.textContent=value;};
let user=null,repositories=[],activeTicket=null,ready=false,signingOut=false,busy=false;
const savedCommits=new Map();
function scopeKey(key){
  if(user && /^mrtullyclass:v1:(?:draft|finished):[a-z0-9-]+$/.test(key))
    return "mrtullyclass:v1:account:"+user.id+":"+key;
  return key;
}
const storage={
  getItem(key){return cache.getItem(scopeKey(key));},
  setItem(key,value){cache.setItem(scopeKey(key),String(value));},
  removeItem(key){cache.removeItem(scopeKey(key));}
};
const cloud={
  get signedIn(){return !!user;},get ready(){return ready;},
  get user(){return user;},get storage(){return storage;},
  get signingOut(){return signingOut;}
};
window.MTCloud=cloud;
function clearLocalAccount(){
  if(!user)return;
  const prefix="mrtullyclass:v1:account:"+user.id+":";
  for(let i=cache.length-1;i>=0;i--){
    const key=cache.key(i);if(key?.startsWith(prefix))cache.removeItem(key);
  }
}
function selectionKey(lessonId){return KEY+"repo:"+user.id+":"+lessonId;}
function currentLesson(){
  const id=decodeURIComponent(location.hash.slice(1));
  return byId.get(id)||null;
}
function selected(){
  const lesson=currentLesson();
  if(!user||!lesson)return null;
  try{
    const s=JSON.parse(cache.getItem(selectionKey(lesson.id))||"null");
    if(s && ["assignment","portfolio"].includes(s.mode) && repositories.some(r=>r.full_name===s.repo))
      return s;
  }catch{}
  return null;
}
function fileDescriptor(lesson,choice) {
  return {
    repo:choice.repo,mode:choice.mode,lessonId:lesson.id,course:lesson.course,
    filename:lesson.type==="java"?"Main.java":lesson.id+"."+(lesson.type==="html"?"html":"js")
  };
}
function versionKey(descriptor) {
  return KEY+"revision:"+user.id+":"+descriptor.repo+":"+descriptor.mode+":"+descriptor.lessonId;
}
function getRevision(descriptor) {
  try{
    const version=JSON.parse(cache.getItem(versionKey(descriptor))||"null");
    return typeof version==="string"&&/^[a-f0-9]{40}$/.test(version)?version:null;
  }catch{return null;}
}
function saveRevision(descriptor,revision){
  if(revision && /^[a-f0-9]{40}$/.test(revision)) cache.setItem(versionKey(descriptor),JSON.stringify(revision));
}
function sessionInfo(){
  try {
    const value=JSON.parse(session.getItem(KEY+"session")||"null");
    if(value && typeof value.ticket==="string" && value.expiresAt>Date.now()+5000)return value;
  }catch{}
  return null;
}
async function backend(action,params={},auth=true) {
  if(!configured)throw new Error("GitHub App is not configured yet.");
  const info=auth?sessionInfo():null;
  if(auth && !info)throw new Error("GitHub session expired. Sign in again.");
  const response=await fetch(cfg.apiBase.replace(/\/$/,""),{
    method:"POST",headers:{"Content-Type":"application/json",
      ...(auth?{Authorization:"Bearer "+info.ticket}:{})},
    body:JSON.stringify({action,...params}),cache:"no-store"
  });
  let data;try{data=await response.json();}catch{throw new Error("GitHub service did not return JSON.");}
  if(!response.ok)throw new Error(String(data?.error||"GitHub request failed").slice(0,250));
  return data;
}
function randomB64(bytes=32){
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function login() {
  if(!configured)return alert("GitHub sign-in is not configured by your teacher yet.");
  const verifier=randomB64(64),state=randomB64(24);
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  session.setItem(KEY+"auth",JSON.stringify({state,verifier,started:Date.now(),
    back:location.pathname+location.hash}));
  const params=new URLSearchParams({
    client_id:cfg.clientId,redirect_uri:new URL("./auth-callback.html",location.href).href,
    state,code_challenge_method:"S256",code_challenge:challenge
  });
  location.assign("https://github.com/login/oauth/authorize?"+params);
}
async function callback() {
  const status=el("github-callback-status");
  const query=new URLSearchParams(location.search);
  const code=query.get("code"),state=query.get("state");
  history.replaceState(null,"",location.pathname);
  let request=null;
  try{request=JSON.parse(session.getItem(KEY+"auth")||"null");}catch{}
  session.removeItem(KEY+"auth");
  if(!code||!state||!request||state!==request.state||Date.now()-request.started>600000){
    if(status)status.textContent="Sign-in was not verified. Please return and try again.";return;
  }
  try{
    const result=await backend("exchange",{code,verifier:request.verifier},false);
    session.setItem(KEY+"session",JSON.stringify({ticket:result.session,expiresAt:result.expiresAt}));
    const back=new URL(request.back,location.origin);
    const base=new URL("./",location.href);
    location.replace(back.origin===location.origin && back.pathname.startsWith(base.pathname)
      ?back.pathname+back.hash:base.pathname);
  }catch(error){if(status)status.textContent=error.message||"Sign-in could not be completed.";}
}
function showButtons(){
  const update=(id,hidden)=>{const button=el(id);if(button)button.hidden=hidden;};
  update("github-signin",!configured||!!user);
  update("github-signout",!user);
  update("github-connect",!user);
  update("github-save",!user);
  update("github-load",!user);
  update("github-submit",!user);
  const identity=el("github-identity");
  if(identity)identity.textContent=user?"GitHub: "+user.login:"Guest · local browser saves";
  if(user){
    const choice=selected();
    callout(choice?"Selected repository: "+choice.repo+" ("+choice.mode+")":"Select a GitHub repository to save code.");
  }else callout(configured?"Sign in to save to GitHub; guest drafts save locally.":"Guest drafts save locally. GitHub setup is not configured yet.");
}
function openRepositoryDialog(){
  const dialog=el("github-repo-dialog"),picker=el("github-repository"),mode=el("github-repository-mode");
  if(!dialog||!picker||!mode)return;
  picker.replaceChildren();
  if(!repositories.length){
    const empty=new Option("No writable repositories available","");picker.add(empty);picker.disabled=true;
  }else{
    picker.disabled=false;
    for(const repo of repositories){
      const option=new Option(repo.full_name+(repo.private?" · private":""),repo.full_name);
      picker.add(option);
    }
  }
  const old=selected();
  if(old){picker.value=old.repo;mode.value=old.mode;}
  dialog.showModal();
}
async function connectRepo(){
  if(!user)return;
  const button=el("github-connect");button.disabled=true;
  try{
    const data=await backend("repos");
    repositories=data.repositories||[];
    openRepositoryDialog();
  }catch(error){callout(error.message);}
  finally{button.disabled=false;}
}
function chooseRepo(){
  const lesson=currentLesson();
  if(!user||!lesson)return;
  const repo=el("github-repository").value,mode=el("github-repository-mode").value;
  if(!repositories.some(r=>r.full_name===repo))return;
  cache.setItem(selectionKey(lesson.id),JSON.stringify({repo,mode}));
  el("github-repo-dialog").close();
  showButtons();
}
async function load(){
  const lesson=currentLesson(),choice=selected();
  if(!lesson||!choice)return alert("Select a repository for this assignment first.");
  const descriptor=fileDescriptor(lesson,choice);
  const editor=el("code-editor");
  if(!confirm("Load "+descriptor.filename+" from GitHub? This replaces the editor. Your current code will be backed up locally."))return;
  const current=editor.value;
  busy=true;
  try{
    const result=await backend("load",descriptor);
    cache.setItem(KEY+"backup:"+user.id+":"+lesson.id+":"+Date.now(),current);
    saveRevision(descriptor,result.sha);
    editor.value=result.source;
    editor.dispatchEvent(new Event("input",{bubbles:true}));
    callout("Loaded from "+result.repo+" · "+result.path);
  }catch(error){callout(error.message);}
  finally{busy=false;}
}
async function save(silent=false){
  const lesson=currentLesson(),choice=selected();
  if(!lesson||!choice){if(!silent)alert("Select a repository for this assignment first.");return null;}
  if(busy)return null;
  const descriptor=fileDescriptor(lesson,choice),source=el("code-editor").value;
  if(source.length>100000){callout("Code is too large; use Download.");return null;}
  // Always save the local draft first, even when GitHub cannot be reached.
  storage.setItem("mrtullyclass:v1:draft:"+lesson.id,source);
  busy=true;callout("Saving to GitHub…");
  try{
    const result=await backend("save",{...descriptor,source,expectedSha:getRevision(descriptor)});
    saveRevision(descriptor,result.sha);
    savedCommits.set(versionKey(descriptor),{sha:result.commitSha,source});
    callout("Saved to "+result.repo+" · commit "+String(result.commitSha||"").slice(0,8));
    return {...result,descriptor};
  }catch(error){callout(error.message+" Your local copy is still saved.");return null;}
  finally{busy=false;}
}
async function submit(){
  const choice=selected(),lesson=currentLesson();
  if(!choice||!lesson)return alert("Connect an assignment repository first.");
  if(choice.mode!=="assignment")return alert("Select Assignment repository mode for Classroom 50 submissions.");
  if(!confirm("Submit "+lesson.title+" on GitHub? MrTullyClass will save your latest code, then create a submit/ tag for the assignment grader."))return;
  const saved=await save(true);
  if(!saved)return;
  busy=true;
  try{
    const result=await backend("submit",{...saved.descriptor,commitSha:saved.commitSha});
    callout("Submitted GitHub tag "+result.tag+" · check your repository Actions and Classroom 50 grades.");
    const link=el("github-submission-link");
    if(link){link.href=result.url;link.textContent="View submission on GitHub";link.hidden=false;}
  }catch(error){callout(error.message+" Your saved code remains in GitHub.");}
  finally{busy=false;}
}
function signOut(){
  signingOut=true;
  session.removeItem(KEY+"session");
  if(user)clearLocalAccount();
  location.replace(new URL("./",location.href).href);
}
function bind(id,fn){el(id)?.addEventListener("click",fn);}
function begin(){
  bind("github-signin",()=>void login());
  bind("github-signout",signOut);
  bind("github-connect",()=>void connectRepo());
  bind("github-save",()=>void save());
  bind("github-load",()=>void load());
  bind("github-submit",()=>void submit());
  bind("github-repository-choose",chooseRepo);
  bind("github-repository-cancel",()=>el("github-repo-dialog").close());
  window.addEventListener("hashchange",showButtons);
  showButtons();
}
async function init() {
  if(location.pathname.endsWith("/auth-callback.html"))return void callback();
  begin();
  const info=sessionInfo();
  if(info&&configured){
    try{
      activeTicket=info.ticket;
      const data=await backend("user");
      if(Number.isSafeInteger(data.id)&&typeof data.login==="string")user=data;
      else throw Error("Invalid GitHub identity");
    }catch(error){session.removeItem(KEY+"session");callout(error.message);}
  }
  ready=true;
  showButtons();
  document.dispatchEvent(new Event("mrtully-cloud-ready"));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});
else void init();
