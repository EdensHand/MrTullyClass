import assert from "node:assert/strict";
import fs from "node:fs";
import {filePath,default as worker} from "../github-worker.mjs";

// The Worker tests mock GitHub network responses; no real GitHub credentials.
const key="8f".repeat(32);
const env={
  FRONTEND_ORIGIN:"https://edenshand.github.io",
  GITHUB_CLIENT_ID:"Iv1_example",GITHUB_CLIENT_SECRET:"server-secret",
  SESSION_KEY:key
};
const source='console.log("Hello 🎓");';
const sha="b".repeat(40),commitSha="c".repeat(40);
let remoteSha=null,remoteSource="",createdTag=null;
const originalFetch=globalThis.fetch;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{"Content-Type":"application/json"}});
globalThis.fetch=async (url,init={})=>{
  const path=new URL(url).pathname;
  if(url.startsWith("https://github.com/login/oauth/access_token")){
    const p=new URLSearchParams(init.body);
    assert.equal(p.get("client_secret"),"server-secret");
    assert.equal(p.get("code_verifier"),"v".repeat(43));
    assert.equal(p.get("redirect_uri"),"https://edenshand.github.io/MrTullyClass/auth-callback.html");
    return json({access_token:"ghu_mock_secret_never_returned",expires_in:28800});
  }
  assert.ok(url.startsWith("https://api.github.com/"),"Unexpected external URL "+url);
  if(path==="/user")return json({id:12345,login:"student"});
  if(path==="/user/installations")return json({installations:[{id:51}]});
  if(path==="/user/installations/51/repositories")return json({repositories:[
    {full_name:"Classroom-Org/intro-1",private:true,default_branch:"main",html_url:"https://github.com/Classroom-Org/intro-1",permissions:{push:true}},
    {full_name:"Classroom-Org/read-only",private:true,default_branch:"main",html_url:"https://github.com/Classroom-Org/read-only",permissions:{push:false}}
  ]});
  if(path==="/repos/Classroom-Org/intro-1/contents/main.js"){
    if(init.method==="PUT"){
      const data=JSON.parse(init.body);
      assert.equal(data.branch,"main");
      assert.equal(data.message,"MrTullyClass: save csf-hello");
      assert.equal(Buffer.from(data.content,"base64").toString("utf8"),source);
      if(remoteSha)assert.equal(data.sha,remoteSha);
      remoteSha=sha;remoteSource=source;
      return json({content:{sha,html_url:"https://github.com/Classroom-Org/intro-1/blob/main/main.js"},commit:{sha:commitSha}},200);
    }
    if(remoteSha)return json({type:"file",sha:remoteSha,content:Buffer.from(remoteSource).toString("base64")});
    return json({message:"Not Found"},404);
  }
  if(path==="/repos/Classroom-Org/intro-1/git/ref/heads/main")return json({object:{sha:commitSha}});
  if(path==="/repos/Classroom-Org/intro-1/git/refs"){
    const tag=JSON.parse(init.body);createdTag=tag.ref;
    assert.equal(tag.sha,commitSha);
    return json({ref:createdTag},201);
  }
  throw Error("Unexpected GitHub mock URL: "+url);
};
function make(action,extra={},bearer=null,origin=env.FRONTEND_ORIGIN){
  return new Request("https://example.workers.dev",{
    method:"POST",headers:{"Content-Type":"application/json","Origin":origin,
      ...(bearer?{Authorization:"Bearer "+bearer}:{})},
    body:JSON.stringify({action,...extra})
  });
}
async function response(action,params={},ticket=null,origin=env.FRONTEND_ORIGIN){
  const r=await worker.fetch(make(action,params,ticket,origin),env);
  return {status:r.status,body:await r.json()};
}
assert.equal(filePath({course:"CSF",lessonId:"csf-hello",filename:"main.js",mode:"assignment"}),"main.js");
assert.equal(filePath({course:"AP CSA",lessonId:"ap-java",filename:"Main.java",mode:"assignment"}),"Main.java");
assert.equal(filePath({course:"CSF",lessonId:"csf-hello",filename:"csf-hello.js",mode:"portfolio"}),"classwork/csf/csf-hello/csf-hello.js");
assert.throws(()=>filePath({course:"CSF",lessonId:"../secrets",filename:"main.js",mode:"assignment"}),/Invalid assignment/);
assert.throws(()=>filePath({course:"CSF",lessonId:"csf-hello",filename:"Main.java",mode:"assignment"}),/Java/);
assert.throws(()=>filePath({course:"CSF",lessonId:"csf-hello",filename:"evil.js",mode:"assignment"}),/Invalid assignment root/);
assert.equal((await response("user")).status,401);
assert.equal((await response("exchange",{code:"realcode123",verifier:"short"})).status,400);
const auth=await response("exchange",{code:"realcode123",verifier:"v".repeat(43)});
assert.equal(auth.status,200);
const ticket=auth.body.session;
assert.ok(ticket.startsWith("v1."));
assert.ok(!ticket.includes("ghu_"),"OAuth token must not be returned to the client");
assert.equal((await response("user",{},ticket)).body.login,"student");
assert.equal((await response("user",{},ticket,"https://example.org")).status,403);
const repos=await response("repos",{},ticket);
assert.equal(repos.status,200);
assert.deepEqual(repos.body.repositories.map(r=>r.full_name),["Classroom-Org/intro-1"]);
const descriptor={
  repo:"Classroom-Org/intro-1",course:"CSF",lessonId:"csf-hello",
  filename:"main.js",mode:"assignment"
};
assert.equal((await response("load",descriptor,ticket)).status,404);
assert.equal((await response("save",{...descriptor,source,expectedSha:null},ticket)).status,200);
assert.equal((await response("save",{...descriptor,source,expectedSha:null},ticket)).status,409,
  "Saving without a known revision must not overwrite a remote file");
const loaded=await response("load",descriptor,ticket);
assert.equal(loaded.status,200);
assert.equal(loaded.body.source,source);
assert.equal(loaded.body.sha,sha);
assert.equal((await response("submit",{...descriptor,commitSha:"d".repeat(40)},ticket)).status,409);
const submitted=await response("submit",{...descriptor,commitSha},ticket);
assert.equal(submitted.status,200);
assert.match(createdTag,/^refs\/tags\/submit\/csf-hello-/);
assert.equal((await response("submit",{...descriptor,mode:"portfolio",filename:"csf-hello.js",commitSha},ticket)).status,400);
assert.equal((await response("save",{...descriptor,repo:"Classroom-Org/read-only",source,expectedSha:null},ticket)).status,503,
  "Read-only repositories must not be writable via this application");
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("app.js","utf8");
const frontend=fs.readFileSync("github-first.mjs","utf8");
const config=fs.readFileSync("github-config.js","utf8");
for(const id of ["github-signin","github-signout","github-connect","github-save","github-load","github-submit","github-repo-dialog"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing control "+id);
  assert.ok(frontend.includes(id),"Control not wired "+id);
}
assert.ok(frontend.includes('code_challenge_method:"S256"'),"OAuth must use PKCE");
assert.ok(frontend.includes("state!==request.state"),"OAuth state must be checked");
assert.ok(frontend.includes("crypto.subtle.digest("),"PKCE must use SHA-256");
assert.ok(frontend.includes("sessionStorage")||frontend.includes("window.sessionStorage"));
assert.ok(app.includes("window.MTCloud.storage.getItem(key) : localStorage.getItem(key)"),
  "Signed-in account storage must NEVER fall back to another user's guest draft");
assert.ok(frontend.includes("clearLocalAccount()"),"Sign-out must scrub account-local cache");
assert.ok(!config.includes("CLIENT_SECRET")&&!config.includes("SESSION_KEY"),"No backend secrets in public configuration");
assert.ok(!html.includes("supabase"));
globalThis.fetch=originalFetch;
console.log("GitHub-first OAuth, repo authorization, versioned saves and Classroom 50 tag submission tests passed.");
