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
  function start() {
    bind("account-signin", () => window.MTAccount?.signIn());
    bind("account-signout", () => window.MTAccount?.signOut());
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
