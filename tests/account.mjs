import assert from "node:assert/strict";
import fs from "node:fs";
import {ScopedStorage,DRAFT,FINISHED,resourceForKey,validateSource} from "../account-model.mjs";

class MemoryStorage {
  constructor(){this.data=new Map();}
  get length(){return this.data.size;}
  key(n){return [...this.data.keys()][n]??null;}
  getItem(k){return this.data.has(k)?this.data.get(k):null;}
  setItem(k,v){this.data.set(k,String(v));}
  removeItem(k){this.data.delete(k);}
}
const lessons={
  "csf-hello":{course:"CSF",type:"javascript"},
  "ap-java":{course:"AP CSA",type:"java"}
};
const backend=new MemoryStorage(), changes=[];
const guest=new ScopedStorage(backend,null,lessons);
const alice=new ScopedStorage(backend,"alice",lessons,(...v)=>changes.push(v));
const bob=new ScopedStorage(backend,"bob",lessons);
guest.setItem(DRAFT+"csf-hello","guest source");
alice.setItem(DRAFT+"csf-hello","alice source");
bob.setItem(DRAFT+"csf-hello","bob source");
assert.equal(guest.getItem(DRAFT+"csf-hello"),"guest source");
assert.equal(alice.getItem(DRAFT+"csf-hello"),"alice source");
assert.equal(bob.getItem(DRAFT+"csf-hello"),"bob source");
assert.equal(changes.length,1);
assert.equal(changes[0][0],DRAFT+"csf-hello");
assert.equal(alice.importGuest([DRAFT+"csf-hello"]),0,"Do not overwrite account drafts");
assert.equal(alice.getItem(DRAFT+"csf-hello"),"alice source");
guest.setItem(FINISHED+"csf-hello","yes");
assert.equal(alice.importGuest([FINISHED+"csf-hello"]),1);
assert.equal(alice.getItem(FINISHED+"csf-hello"),"yes");
assert.equal(bob.getItem(FINISHED+"csf-hello"),null);
alice.clearAccount();
assert.equal(alice.getItem(DRAFT+"csf-hello"),null);
assert.equal(guest.getItem(DRAFT+"csf-hello"),"guest source");
assert.equal(bob.getItem(DRAFT+"csf-hello"),"bob source");
assert.equal(resourceForKey(DRAFT+"ap-java",lessons).file,"Main.java");
assert.equal(resourceForKey(DRAFT+"not-in-catalog",lessons),null);
assert.equal(resourceForKey("mrtullyclass:v1:sidebarCollapsed",lessons),null);
assert.equal(validateSource("x".repeat(100000)),true);
assert.equal(validateSource("x".repeat(100001)),false);

const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("app.js","utf8");
const auth=fs.readFileSync("account.mjs","utf8");
const authUI=fs.readFileSync("account-ui.js","utf8");
const config=fs.readFileSync("account-config.js","utf8");
const sql=fs.readFileSync("supabase/schema.sql","utf8");
for (const id of ["account-signin","account-signout","account-classes","account-import-guest","submit-work","classes-dialog"]) {
  assert.ok(html.includes('id="'+id+'"'),"Missing account control "+id);
  assert.ok(authUI.includes(id),"Account control not wired: "+id);
}
assert.ok(html.includes('src="./account-config.js"'));
assert.ok(html.includes('src="./account-ui.js"'));
assert.ok(html.includes('src="./account.mjs"'));
assert.ok(app.includes("window.MTAccount?.storage"),"Draft operations must use guest/account scope");
assert.ok(auth.includes('signInWithOAuth({provider:"github"'));
assert.ok(auth.includes('flowType:"pkce"'));
assert.ok(auth.includes("mrtully_save_draft") && auth.includes("mrtully_submissions"));
assert.ok(auth.includes('await client.auth.signOut({scope:"local"})'));
assert.ok(auth.includes("storage.clearAccount()"));
assert.ok(auth.includes("queue[index]=next"),"New edits must not mutate an in-flight request");
assert.ok(auth.includes("if(!confirm("),"Explicit submit requires user confirmation");
assert.ok(!auth.includes("github_pat_"),"Never embed repository access tokens");
assert.ok(!config.includes("service_role"),"Public config must never include privileged credentials");
assert.ok(sql.includes("row level security"),"Database needs RLS");
assert.ok(sql.includes("approved_submission_insert"));
assert.ok(sql.includes("mrtully_private.is_teacher()"),"Teacher access must derive from provider identities");
assert.ok(sql.includes("auth.identities"),"Teacher roles require verified provider identities");
assert.ok(sql.includes("mrtully_teacher_submissions"));
assert.ok(!html.includes("github_pat_"));
console.log("Guest isolation, optional sign-in, submission controls and RLS contract checks passed.");
