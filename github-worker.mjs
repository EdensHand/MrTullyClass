/* MrTullyClass GitHub-only backend, deployed as a Cloudflare Worker.
 * No Supabase or database. Students authorize a narrowly scoped GitHub App.
 * Only the Worker knows the GitHub App client secret and session encryption key.
 */
const ALLOWED_COURSES = new Set(["CSF","CS3","AP CSA"]);
const MAX_SOURCE = 100000;
const ghHeaders = token => ({
  "Accept":"application/vnd.github+json",
  "Authorization":"Bearer "+token,
  "User-Agent":"MrTullyClass",
  "X-GitHub-Api-Version":"2026-03-10"
});
export function filePath({course,lessonId,filename,mode}) {
  if(!ALLOWED_COURSES.has(course) ||
      typeof lessonId!=="string" || !/^[a-z0-9-]{1,100}$/.test(lessonId) ||
      typeof filename!=="string" ||
      !/^(?:Main\.java|main\.js|index\.html|[a-z0-9-]{1,100}\.(?:js|html))$/.test(filename) ||
      !["assignment","portfolio"].includes(mode)) throw new Error("Invalid assignment file");
  if(filename==="Main.java" && course!=="AP CSA") throw new Error("Java file requires AP CSA");
  if(mode==="assignment"){
    if(!["Main.java","main.js","index.html"].includes(filename))throw new Error("Invalid assignment root file");
    return filename;
  }
  if(filename!=="Main.java" && filename!==lessonId+".js" && filename!==lessonId+".html")
    throw new Error("Portfolio file name mismatch");
  return "classwork/"+course.toLowerCase().replace(/\s+/g,"-")+"/"+lessonId+"/"+filename;
}
function validRepo(value) {
  return typeof value==="string" && /^[a-zA-Z0-9-]{1,39}\/[a-zA-Z0-9_.-]{1,100}$/.test(value) &&
    !value.endsWith(".git") && !value.endsWith("/.") && !value.endsWith("/..");
}
function b64utf8(source) {
  const bytes=new TextEncoder().encode(source);
  let binary="";
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
function utf8b64(encoded) {
  const binary=atob(encoded.replace(/\s+/g,""));
  return new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
}
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const fromB64url=value=>Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function sessionKey(env) {
  if(!/^[0-9a-fA-F]{64}$/.test(env.SESSION_KEY||""))throw Error("SESSION_KEY must be 32 random bytes encoded as hex");
  const bytes=new Uint8Array(env.SESSION_KEY.match(/../g).map(h=>parseInt(h,16)));
  return crypto.subtle.importKey("raw",bytes,"AES-GCM",false,["encrypt","decrypt"]);
}
async function seal(env,data) {
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const encoded=new TextEncoder().encode(JSON.stringify(data));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce},await sessionKey(env),encoded);
  return "v1."+b64url(nonce)+"."+b64url(new Uint8Array(ciphertext));
}
async function unseal(env,ticket) {
  if(typeof ticket!=="string" || ticket.length>3000 || !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ticket))
    throw Error("Invalid session");
  const [,n,c]=ticket.split(".");
  const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromB64url(n)},await sessionKey(env),fromB64url(c));
  const record=JSON.parse(new TextDecoder().decode(raw));
  if(typeof record.token!=="string" || typeof record.exp!=="number" || record.exp<=Date.now())
    throw Error("Session expired");
  return record.token;
}
const httpResponse=(body,status,origin)=>{
  return new Response(JSON.stringify(body),{status,headers:{
    "Content-Type":"application/json; charset=utf-8",
    "Access-Control-Allow-Origin":origin,
    "Access-Control-Allow-Headers":"authorization, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Cache-Control":"no-store","Vary":"Origin"
  }});
};
async function github(path,token,init={}) {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch("https://api.github.com"+path,{
      ...init,headers:{...ghHeaders(token),...(init.body?{"Content-Type":"application/json"}:{})},signal:controller.signal
    });
    let data={};try{data=await response.json();}catch{}
    return {ok:response.ok,status:response.status,data};
  }finally{clearTimeout(timeout);}
}
function checkJson(input) {
  if(!input || typeof input!=="object" || !validRepo(input.repo))throw Error("Choose an authorized GitHub repository");
  const path=filePath(input);
  return {repo:input.repo,path};
}
async function loadRepos(token) {
  const result=[];
  const installs=await github("/user/installations?per_page=100",token);
  if(!installs.ok)throw Error("GitHub installations unavailable. Install the GitHub App on your repository first.");
  for(const installation of (installs.data.installations||[]).slice(0,10)){
    const found=await github("/user/installations/"+installation.id+"/repositories?per_page=100",token);
    if(!found.ok)continue;
    for(const repo of found.data.repositories||[]){
      if(repo.permissions?.push===true || repo.permissions?.admin===true){
        result.push({full_name:repo.full_name,private:!!repo.private,html_url:repo.html_url,default_branch:repo.default_branch});
      }
    }
  }
  return result.slice(0,300);
}
async function accessible(token,fullName) {
  const repos=await loadRepos(token);
  const item=repos.find(r=>r.full_name.toLowerCase()===fullName.toLowerCase());
  if(!item)throw Error("The repository is not available to this GitHub App and user.");
  if(!item.default_branch)throw Error("Initialize the repository with a README before saving.");
  return item;
}
function apiFail(message,status,origin) {
  return httpResponse({error:String(message).slice(0,220)},status,origin);
}
async function handle(input,token,origin) {
  if(input.action==="user"){
    const result=await github("/user",token);
    if(!result.ok)return apiFail("GitHub session expired. Sign in again.",401,origin);
    return httpResponse({id:result.data.id,login:result.data.login,avatar_url:result.data.avatar_url},200,origin);
  }
  if(input.action==="repos") return httpResponse({repositories:await loadRepos(token)},200,origin);
  if(input.action==="load"||input.action==="save"||input.action==="submit"){
    const {repo,path}=checkJson(input);
    const found=await accessible(token,repo);
    const prefix="/repos/"+repo.split("/").map(encodeURIComponent).join("/");
    const fileUrl=prefix+"/contents/"+path.split("/").map(encodeURIComponent).join("/");
    if(input.action==="submit"){
      if(input.mode!=="assignment")return apiFail("Submit is only available for assignment repositories.",400,origin);
      if(typeof input.commitSha!=="string"||!/^[a-f0-9]{40}$/.test(input.commitSha))return apiFail("Save the assignment before submitting.",400,origin);
      const ref=await github(prefix+"/git/ref/heads/"+found.default_branch.split("/").map(encodeURIComponent).join("/"),token);
      if(!ref.ok||ref.data.object?.sha!==input.commitSha)
        return apiFail("The repository changed. Save again before submitting.",409,origin);
      const tag="submit/"+input.lessonId+"-"+Date.now()+"-"+crypto.randomUUID().slice(0,8);
      const created=await github(prefix+"/git/refs",token,{method:"POST",body:JSON.stringify({ref:"refs/tags/"+tag,sha:input.commitSha})});
      if(!created.ok)return apiFail("GitHub could not create a submission tag; check assignment settings.",502,origin);
      return httpResponse({tag,url:"https://github.com/"+found.full_name+"/tree/"+encodeURIComponent(tag)},200,origin);
    }
    const get=await github(fileUrl+"?ref="+encodeURIComponent(found.default_branch),token);
    if(!get.ok&&get.status!==404)return apiFail("Could not read the assignment file in GitHub.",502,origin);
    if(input.action==="load"){
      if(get.status===404)return apiFail("No saved code found for this assignment.",404,origin);
      if(get.data.type!=="file"||typeof get.data.content!=="string")return apiFail("Not a text file.",422,origin);
      const source=utf8b64(get.data.content);
      if(source.length>MAX_SOURCE)return apiFail("GitHub file is too large.",413,origin);
      return httpResponse({source,sha:get.data.sha,path,repo:found.full_name},200,origin);
    }
    if(typeof input.source!=="string"||input.source.length>MAX_SOURCE||
      !(input.expectedSha===null||(typeof input.expectedSha==="string"&&/^[a-f0-9]{40}$/.test(input.expectedSha))))
      return apiFail("Invalid code or file revision.",400,origin);
    const prior=get.ok?get.data.sha:null;
    if(prior!==input.expectedSha)return apiFail("A different GitHub revision exists. Load it before replacing it; your local draft is safe.",409,origin);
    const payload={message:"MrTullyClass: save "+input.lessonId,
      branch:found.default_branch,content:b64utf8(input.source)};
    if(prior)payload.sha=prior;
    const result=await github(fileUrl,token,{method:"PUT",body:JSON.stringify(payload)});
    if(!result.ok)return apiFail(result.status===409?"GitHub changed since your last save. Load before retrying.":"GitHub save failed: "+(result.data.message||"check app permissions"),result.status===409?409:502,origin);
    return httpResponse({repo:found.full_name,path,sha:result.data.content?.sha,
      commitSha:result.data.commit?.sha,url:result.data.content?.html_url},200,origin);
  }
  return apiFail("Unknown operation",400,origin);
}
export default {
  async fetch(request,env) {
    const origin=env.FRONTEND_ORIGIN||"https://edenshand.github.io";
    if(request.headers.get("Origin")!==origin)return apiFail("Origin not permitted",403,origin);
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{
      "Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, content-type",
      "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"
    }});
    if(request.method!=="POST")return apiFail("Use POST",405,origin);
    let input={};
    try{
      const raw=await request.text();if(raw.length>150000)return apiFail("Request too large",413,origin);
      input=JSON.parse(raw);
    }catch{return apiFail("Invalid JSON",400,origin);}
    if(input?.action==="exchange"){
      if(typeof input.code!=="string"||!/^[-_a-zA-Z0-9]{6,200}$/.test(input.code)||
          typeof input.verifier!=="string"||!/[A-Za-z0-9_-]{43,128}/.test(input.verifier)||
          input.verifier.length>128) return apiFail("Invalid login response",400,origin);
      if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return apiFail("GitHub App not configured",503,origin);
      const form=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,
        code:input.code,code_verifier:input.verifier,
        redirect_uri:origin+"/MrTullyClass/auth-callback.html"});
      try{
        const tokenResponse=await fetch("https://github.com/login/oauth/access_token",{
          method:"POST",headers:{"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"},body:form.toString()
        });
        const detail=await tokenResponse.json();
        if(!tokenResponse.ok||!detail.access_token)return apiFail("GitHub sign-in failed. Please try again.",401,origin);
        // No refresh token retained. Reauthenticate after the shorter of 6h or expiry.
        const lifetime=Math.max(60,Math.min(Number(detail.expires_in)||21600,21600));
        const expiresAt=Date.now()+lifetime*1000;
        const session=await seal(env,{token:detail.access_token,exp:expiresAt});
        return httpResponse({session,expiresAt},200,origin);
      }catch{return apiFail("Could not complete GitHub sign-in",503,origin);}
    }
    try{
      const bearer=request.headers.get("Authorization")||"";
      if(!bearer.startsWith("Bearer "))return apiFail("Sign in with GitHub first.",401,origin);
      const token=await unseal(env,bearer.slice(7));
      return await handle(input,token,origin);
    }catch(error){
      const message=error instanceof Error?error.message:"Connection failed";
      const invalid=/Invalid session|Session expired|decrypt/i.test(message);
      return apiFail(invalid?"GitHub session expired; sign in again.":message,invalid?401:503,origin);
    }
  }
};
