/* Account UI */
document.addEventListener('DOMContentLoaded', () => {
 const b=document.getElementById('account-signin');
 if(b) b.onclick=()=>window.MTAccount?.signIn();
});
