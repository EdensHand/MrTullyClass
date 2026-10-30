/* Optional account interface. Guest code always remains usable. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const bind = (id, cb) => { const el = $(id); if (el) el.addEventListener("click", cb); };
  async function submit() {
    if (!window.MTAccount?.signedIn) return;
    const lessonId = decodeURIComponent(location.hash.slice(1));
    const lesson = (window.MT_ASSIGNMENTS || []).find(l => l.id === lessonId);
    if (!lesson) return;
    const code = $("code-editor").value;
    const filename = lesson.type === "java" ? "Main.java" : lessonId + "." +
      (lesson.type === "html" ? "html" : "js");
    const button = $("submit-work");
    button.disabled = true;
    try {
      window.MTAccount.storage.setItem("mrtullyclass:v1:draft:" + lessonId, code);
      const receipt = await window.MTAccount.submitWork({
        lessonId, course: lesson.course, filename, code
      });
      if (receipt) alert("Submitted. Your teacher can review this copy.");
    } catch (error) {
      alert(error?.message || "Submission did not finish. Your local draft is saved.");
    } finally { button.disabled = false; }
  }
  function saveCurrentBeforeNavigation() {
    const id=decodeURIComponent(location.hash.slice(1));
    const lesson=(window.MT_ASSIGNMENTS||[]).find(l=>l.id===id);
    if(!lesson)return;
    try {
      const key="mrtullyclass:v1:draft:"+id;
      if(window.MTAccount?.storage)window.MTAccount.storage.setItem(key,$("code-editor").value);
      else localStorage.setItem(key,$("code-editor").value);
    } catch (_) { /* The existing download/backup option remains available. */ }
  }
  function start() {
    bind("account-signin", () => { saveCurrentBeforeNavigation(); window.MTAccount?.signIn(); });
    bind("account-signout", () => { saveCurrentBeforeNavigation(); window.MTAccount?.signOut(); });
    bind("account-classes", () => window.MTAccount?.openClasses());
    bind("account-import-guest", () => window.MTAccount?.importGuest());
    bind("submit-work", () => void submit());
    bind("close-classes", () => $("classes-dialog")?.close());
    bind("dismiss-classes", () => $("classes-dialog")?.close());
    document.addEventListener("mrtully-account-ready", () => {
      document.querySelector(".assignment-item.active")?.click();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else start();
})();
