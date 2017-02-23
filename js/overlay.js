function Overlay ( elementId ) {
  this.el = document.getElementById( elementId );
  this.content = this.el.getElementsByClassName( "overlayContent" )[0];
  this.visible = false;
}

Overlay.prototype.show = function () {
  this.el.style.visibility = "visible";
  this.visible = true;
  pause = true;
}

Overlay.prototype.hide = function () {
  this.el.style.visibility = "hidden";
  this.visible = false;
  pause = false;
}

Overlay.prototype.pushHtml = function ( html ) {
  this.content.innerHTML = html.innerHTML;
}

Overlay.prototype.clearHtml = function () {
  this.content.innerHTML = "";
}
