export function byId(id) {
    return document.getElementById(id);
  }
  
  export function setHtml(el, html) {
    el.innerHTML = html;
  }
  
  export function show(el) {
    el.style.display = "";
  }
  
  export function hide(el) {
    el.style.display = "none";
  }
  