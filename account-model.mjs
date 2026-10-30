/* Private account storage is deliberately separate from public guest drafts.
 * No auth tokens or other account settings are stored through this adapter.
 */
export const PREFIX = "mrtullyclass:v1:";
export const DRAFT = PREFIX + "draft:";
export const FINISHED = PREFIX + "finished:";
export const COURSES = ["CSF", "CS3", "AP CSA"];
export const MAX_CODE = 100000;

export function resourceForKey(key, courses = {}) {
  if (typeof key !== "string") return null;
  if (key.startsWith(DRAFT)) {
    const lessonId = key.slice(DRAFT.length);
    const lesson = courses[lessonId];
    return lesson && /^[a-z0-9-]+$/.test(lessonId)
      ? {kind:"draft", lessonId, course:lesson.course, file:lesson.type==="java"?"Main.java":lesson.type==="html"?lessonId+".html":"main.js"} : null;
  }
  if (key.startsWith(FINISHED)) {
    const lessonId = key.slice(FINISHED.length);
    const lesson = courses[lessonId];
    return lesson && /^[a-z0-9-]+$/.test(lessonId)
      ? {kind:"progress", lessonId, course:lesson.course} : null;
  }
  return null;
}

export class ScopedStorage {
  constructor(storage, userId=null, lessons={}, onChange=()=>{}) {
    this.storage=storage;
    this.userId=userId;
    this.lessons=lessons;
    this.onChange=onChange;
  }
  scope(key) {
    return this.userId && resourceForKey(key,this.lessons)
      ? PREFIX+"account:"+this.userId+":"+key : key;
  }
  getItem(key) { return this.storage.getItem(this.scope(key)); }
  setItem(key,value) {
    const raw=String(value);
    this.storage.setItem(this.scope(key),raw);
    if (this.userId && resourceForKey(key,this.lessons)) this.onChange(key,raw);
  }
  removeItem(key) {
    this.storage.removeItem(this.scope(key));
    if (this.userId && resourceForKey(key,this.lessons)) this.onChange(key,null);
  }
  importGuest(keys,overwrite=false) {
    let copied=0;
    for (const key of keys) {
      if (!resourceForKey(key,this.lessons)) continue;
      const value=this.storage.getItem(key);
      if (value===null || (!overwrite && this.getItem(key)!==null)) continue;
      this.setItem(key,value);
      copied++;
    }
    return copied;
  }
  clearAccount() {
    if (!this.userId) return;
    const prefix=PREFIX+"account:"+this.userId+":";
    for (let i=this.storage.length-1;i>=0;i--) {
      const key=this.storage.key(i);
      if (key?.startsWith(prefix)) this.storage.removeItem(key);
    }
  }
}

export function validateSource(text) {
  return typeof text==="string" && text.length<=MAX_CODE;
}
