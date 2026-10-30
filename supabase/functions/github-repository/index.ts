// Supabase Edge Function: authenticated, repo-scoped GitHub App save/load.
// Deploy under: supabase/functions/github-repository/index.ts
// Server-only secrets: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY.
// No repository token or private key is ever returned to the browser.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { SignJWT, importPKCS8 } from "npm:jose@6.1.0";

const origin = Deno.env.get("ALLOWED_ORIGIN") ?? "https://edenshand.github.io";
const api = "https://api.github.com";
const headers = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
});

type Input = {
  action: "check"|"load"|"save";
  installationId: number;
  repository: string;
  lessonId?: string;
  course?: string;
  filename?: string;
  source?: string;
  expectedSha?: string|null;
};
const fail = (message: string, code = 400) => reply({error: message}, code);
async function github(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(api + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  let body: any;
  try { body = await response.json(); } catch { body = {}; }
  return {status:response.status, ok:response.ok, body};
}
async function appJwt() {
  const id = Deno.env.get("GITHUB_APP_ID");
  const key = Deno.env.get("GITHUB_APP_PRIVATE_KEY")?.replace(/\\n/g,"\n");
  if (!id || !key) throw new Error("GitHub App is not configured.");
  const signingKey=await importPKCS8(key,"RS256");
  const now=Math.floor(Date.now()/1000);
  return await new SignJWT({iat:now-60,exp:now+540,iss:id})
    .setProtectedHeader({alg:"RS256"}).sign(signingKey);
}
function encodeSource(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i=0;i<bytes.length;i+=8192) {
    binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  }
  return btoa(binary);
}
function decodeSource(value: string) {
  const binary = atob(value.replace(/\s/g,""));
  const bytes = Uint8Array.from(binary, c=>c.charCodeAt(0));
  return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
}
Deno.serve(async (request) => {
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers});
  if (request.method!=="POST") return fail("Method not allowed",405);
  if (request.headers.get("Origin")!==origin) return fail("Origin not allowed",403);
  const bearer=request.headers.get("Authorization")||"";
  if (!/^Bearer \S+$/.test(bearer)) return fail("Sign in first.",401);
  const contentLength=Number(request.headers.get("content-length")||"0");
  if (contentLength>150000) return fail("Request too large",413);
  let input: Input;
  try {input=await request.json();} catch {return fail("Invalid JSON");}
  if (!["check","load","save"].includes(input?.action) ||
      !Number.isSafeInteger(input.installationId) || input.installationId<1 ||
      typeof input.repository!=="string" ||
      !/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository)) {
    return fail("Invalid repository or installation.");
  }
  const [owner,repository]=input.repository.split("/");
  if ([".",".."].includes(repository) || repository.endsWith(".git")) return fail("Invalid repository name.");
  let relativePath="";
  if(input.action!=="check"){
    if (typeof input.lessonId!=="string" ||
        !/^[a-z0-9-]{1,100}$/.test(input.lessonId) ||
        !["CSF","CS3","AP CSA"].includes(input.course||"") ||
        typeof input.filename!=="string" ||
        !/^(?:Main\.java|[a-z0-9-]{1,100}\.(?:js|html))$/.test(input.filename)) {
      return fail("Invalid classroom file.");
    }
    if (input.filename!=="Main.java" && input.filename.slice(0,-3)!==input.lessonId &&
        input.filename!==input.lessonId+".html") return fail("File and lesson do not match.");
    if (input.filename==="Main.java" && input.course!=="AP CSA") return fail("Invalid Java assignment.");
    relativePath="classwork/"+input.course.toLowerCase().replace(/ /g,"-")+
      "/"+input.lessonId+"/"+input.filename;
  }
  if(input.action==="save" &&
      (typeof input.source!=="string" || input.source.length>100000 ||
       !(input.expectedSha===null || (typeof input.expectedSha==="string"&&/^[0-9a-f]{40}$/.test(input.expectedSha))))) {
    return fail("Invalid source or expected revision.");
  }
  try {
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
    if(!supabaseUrl || !anonKey) return fail("Authentication service not configured.",503);
    const accessToken=bearer.slice(7);
    const sb=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:bearer}}});
    const verified=await sb.auth.getUser(accessToken);
    if(verified.error||!verified.data.user) return fail("Session expired. Sign in again.",401);
    // Returns the verified OAuth provider's immutable numeric GitHub ID,
    // never a mutable username or a value submitted by the browser.
    const identity=await sb.rpc("mrtully_my_github_provider_id");
    const githubId=identity.data==null?null:String(identity.data);
    if(identity.error||!githubId||!/^\d{1,20}$/.test(githubId)) return fail("Verified GitHub identity required.",403);

    const jwt=await appJwt();
    const access=await github("/app/installations/"+input.installationId+"/access_tokens",jwt,{
      method:"POST",
      body:JSON.stringify({repositories:[repository],permissions:{contents:"write"}})
    });
    if(!access.ok || typeof access.body.token!=="string") {
      return fail("Install the MrTullyClass GitHub App on that repository first.",403);
    }
    const installationToken=access.body.token as string;
    const repoInfo=await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(repository),installationToken);
    if(!repoInfo.ok) return fail("Repository could not be accessed.",403);
    if(String(repoInfo.body.owner?.id)!==githubId ||
       String(repoInfo.body.full_name).toLowerCase()!==input.repository.toLowerCase() ||
       repoInfo.body.owner?.type!=="User") return fail("Only repositories owned by your signed-in GitHub account are allowed.",403);
    // Contents: write was restricted in the installation token above.
    // GitHub validates protected branches and actual write permission on PUT.
    if(input.action==="check") return reply({repository:repoInfo.body.full_name,private:repoInfo.body.private});

    const ref=repoInfo.body.default_branch;
    if(typeof ref!=="string"||!ref) return fail("Repository must have an initialized default branch.",409);
    const fileEndpoint="/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(repository)+
      "/contents/"+relativePath.split("/").map(encodeURIComponent).join("/");
    const current=await github(fileEndpoint+"?ref="+encodeURIComponent(ref),installationToken);
    if(!current.ok && current.status!==404) return fail("Unable to read repository file.",502);
    const priorSha=current.ok?current.body.sha:null;
    if(input.action==="load"){
      if(!current.ok||current.body.type!=="file"||typeof current.body.content!=="string")return fail("No saved file found for this assignment.",404);
      const source=decodeSource(current.body.content);
      if(source.length>100000)return fail("Remote file is too large to load.",413);
      return reply({repository:repoInfo.body.full_name,path:relativePath,sha:priorSha,source});
    }
    if(priorSha!==input.expectedSha){
      return fail("GitHub file changed since your last load/save. Load the newer version or keep a backup before overwriting.",409);
    }
    const payload:any={
      message:"MrTullyClass: save "+input.course+" / "+input.lessonId,
      content:encodeSource(input.source!),
      branch:ref
    };
    if(priorSha)payload.sha=priorSha;
    const result=await github(fileEndpoint,installationToken,{method:"PUT",body:JSON.stringify(payload)});
    if(!result.ok) return fail("GitHub could not save the file: "+String(result.body.message||"unknown error").slice(0,120),result.status===409?409:502);
    return reply({repository:repoInfo.body.full_name,path:relativePath,
      sha:result.body.content?.sha,url:result.body.content?.html_url,commit:result.body.commit?.sha});
  }catch(error){
    console.error("Repository function error:",error instanceof Error?error.message:"unknown");
    return fail("GitHub save service is unavailable. Your browser draft is unaffected.",503);
  }
});
