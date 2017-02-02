function Overlay ( elementId ) {
  this.el = document.getElementById( elementId );
}

Overlay.prototype.show = function () {
  this.el.style.visibility = "visible";
  pause = true;
}

Overlay.prototype.hide = function () {
  this.el.style.visibility = "hidden";
  pause = false;
}

Overlay.prototype.pushHtml = function ( html ) {
  this.el.innerHTML = html.innerHTML;
}

Overlay.prototype.clearHtml = function () {
  this.el.innerHTML = "";
}
