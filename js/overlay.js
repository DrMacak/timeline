function Overlay ( elementId ) {
  this.el = document.getElementById( elementId );
  this.header = undefined;
  this.content = undefined;
  this.visible = true;
  this.loginLoaded = false;


  this.init();
}

Overlay.prototype.init = function () {

  const wrapper = function ( _this ) {

    return function (data) {

      _this.el.innerHTML = data;
      _this.content = _this.el.getElementsByClassName( "overlayContent" )[0];
      _this.header = _this.el.getElementsByClassName( "overlayHeader" )[0];

    } };

  templator.getTemplate( "overlay", wrapper( this ));

  // this.el.innerHTML = templatesG["overlay"];
  // this.content = this.el.getElementsByClassName( "overlayContent" )[0];
  // this.header = this.el.getElementsByClassName( "overlayHeader" )[0];
}

Overlay.prototype.show = function () {

  if ( !this.visible ) { $( this.el ).fadeIn("slow"); }
  // console.log("SHOW Ovelay");
  // this.el.style.visibility = "visible";
  this.visible = true;
  pauseRaycaster = true;

  if (controls) {
    controls.enabled = false;
  }
  // To fully disable controls check also dragging/resizing.
  // console.log("SHOW");
}

Overlay.prototype.hide = function () {

  if ( this.visible ) {  $( this.el ).fadeOut( 100 ); }

  this.visible = false;
  pauseRaycaster = false;

  if (controls) {
    controls.enabled = true;
  }

}

Overlay.prototype.purgeHide = function () {
  this.hide();
  this.clearHtml();
  this.setHeader("");
}

Overlay.prototype.fastHide = function () {
  this.el.style.display = "none";
  this.visible = false;
  pauseRaycaster = false;

  if (controls) {
    controls.enabled = true;
  }
  
}

Overlay.prototype.pushHtml = function ( html ) {
  this.content.innerHTML = html.innerHTML;
  this.loginLoaded = false;
}

Overlay.prototype.clearHtml = function () {
  this.content.innerHTML = "";
  this.setHeader("");
  this.loginLoaded = false;
}

Overlay.prototype.setHeader = function ( header ) {
  const fadingSpeed = 100;

  var wrap = function ( self, header ) {
    return function ( ) {
      self.header.innerHTML = header;
    }
  }

  $(this.header).fadeOut( fadingSpeed ,  wrap( this, header))

  $(this.header).fadeIn( fadingSpeed );

}

Overlay.prototype.login = function () {

  const wrapper = function ( _this ) {

    return function (data) {

      _this.content.innerHTML = data;
      _this.loginLoaded = true;

    }
  };

  templator.getTemplate( "login", wrapper (this) );

  // this.content.innerHTML = templatesG["login"];
  // this.loginLoaded = true;
}

Overlay.prototype.loginShowCreateBtn = function () {
  // this.content.innerHTML = templatesG["login"];
  if ( !this.loginLoaded ) { console.error("Login screen is not loaded. Cannot show creat button."); return; }

  var createBtn = this.content.getElementsByClassName("btn-create")[0];
  createBtn.style.visibility = "visible";
  createBtn.style.height = "36px";
  var birthDateInputs = this.content.getElementsByClassName("birthDateInputs")[0];
  birthDateInputs.style.visibility = "visible";
  birthDateInputs.style.height = "initial";

}

Overlay.prototype.loginHideCreateBtn = function () {

  if ( !this.loginLoaded ) { console.error("Login screen is not loaded. Cannot hide creat button."); return; }

  var createBtn = this.content.getElementsByClassName("btn-create")[0];
  createBtn.style.visibility = "hidden";
  createBtn.style.height = "0px";

}
