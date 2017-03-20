
// List of events to be attached to element.
const events = {
  // MediaPanel buttons
  ".imgInp" : { "event" : "change", "func" : function() { nodeJS.uploadData( this, "img")  } },
  ".videoInp" : { "event" : "change", "func" : function() { nodeJS.uploadData( this, "vid" )  } },
  ".audioInp" : { "event" : "change", "func" : function() { nodeJS.uploadData( this, "aud" )  } },
  ".wwwInp" : { "event" : "click", "func" : function() { uploadData( this ) } },
  ".textInp" : { "event" : "click", "func" : function() { editPanelText( this ) } },
  "textarea" : { "event" : "keydown", "func" : function( e ) { saveText( this, e ) } },
  "p" : { "event" : "click", "func" : function( ) { editText( this ) } },


  // Panel controls
  ".closeCross" : { "event" : "click", "func" : function() { if ( nodeJS.isOK() ) { closePanel( this ) } } },
  ".hideOverlay" : { "event" : "click", "func" : function() { overlay.hide() } },
  ".toOverlay" : { "event" : "click", "func" : function() { showInOverlay( this ) } },

  // Login screen in overlay
  "#loginBtn" : { "event" : "click", "func" : function() { nodeJS.sendLogin( this.parentElement, nodeJS.quedCallback ); return false; } },
  "#createUserBtn" : { "event" : "click", "func" : function() { nodeJS.createAccount( this.parentElement ); return false; } },

  // DEBUG
  "#BTN1" : { "event" : "click", "func" : function() { overlay.login(); overlay.show(); } },
  "#BTN2" : { "event" : "click", "func" : function() { overlay.hide(); } },
  "#BTN3" : { "event" : "click", "func" : function() {  } }
  // ".resizeB" : { "event" : "click", "func" : function() { fitPanelOfElement(this) } },

};

for ( var key in events ) {
  if (!events.hasOwnProperty(key)) continue;
    $(document).on( events[key].event, key, events[key].func );
}

///////////////////////////////////////////////////////////////////
// Functions attached to panels.
//
///////////////////////////////////////////////////////////////////

// function uploadData( inputEl, type ) {
//
//   nodeJS.uploadData( inputEl, type );
//
// }

function createImage ( panel3D, src ,names ) {

  var img = document.createElement( 'img' );
  img.setAttribute( "src", src + names );

  img.className =  "mediaImg";

  panel3D.getElementsByClassName( "mediaTarget" )[0].innerHTML = img.outerHTML;

  fitPanelOfElement(panel3D);
  // var panel = Panels.getByProp("uuid", panel3D.id);
  // panel.setPlaneSizeToHTML();

}

function createVideo ( panel3D, src, names ) {

  var video = document.createElement( "video" );

  video.setAttribute( "src", src + names );
  video.setAttribute( "controls", "true");

  video.className =  "mediaImg";

  var mediaTarget = panel3D.getElementsByClassName( "mediaTarget" )[0];
  // mediaTarget.style.width = "";
  // mediaTarget.style.height = "";
  mediaTarget.innerHTML = video.outerHTML;

  // var panel = Panels.getByProp("uuid", panel3D.id);
  // panel.setPlaneSizeToHTML();

  fitPanelOfElement(panel3D);
}

function createAudio ( panel3D, src, names ) {

  var audio = document.createElement( "audio" );

  audio.setAttribute( "src", src + names );
  audio.setAttribute( "controls", "true");

  audio.className =  "mediaImg";

  panel3D.getElementsByClassName( "mediaTarget" )[0].innerHTML = audio.outerHTML;

  // var panel = Panels.getByProp("uuid", panel3D.id);
  // panel.setPlaneSizeToHTML();
  fitPanelOfElement(panel3D);

}

function createGallery () {

}

function editPanelText( element ) {
  console.log("pini");
    const htmlPanel = getMyPanel3D( element );
    const mediaTarget = htmlPanel.getElementsByClassName( "mediaTarget" )[0];
    var textArea = document.createElement("textarea");
    textArea.innerHTML = "Enter your text";
    //
    // if (htmlPanel.getElementsByClassName("textField")[0]){
    //  var previouseText = htmlPanel.getElementsByClassName("textField")[0].textContent;
    // }

    mediaTarget.innerHTML = textArea.outerHTML;
    // textArea.focus();

    var panel = Panels.getByProp("uuid", htmlPanel.id);
    panel.setPlaneSizeToHTML();
    // mediaTarget.querySelector("textarea").focus();
}

function saveText ( element, e ) {
  var key = e.which || e.keyCode;
  // 13 == Enter
  if (key === 13) {

    // Have to rush resize since the element will be overwritten soon.
    fitPanelOfElement( element );

    var p = document.createElement("p");
    p.innerHTML = element.value;
    element.outerHTML = p.outerHTML;
    // console.log(pEl);

  }
}

function editText( element ) {

  fitPanelOfElement( element );

  var textAreaElement = document.createElement("textarea");
  textAreaElement.innerHTML  = element.innerHTML;
  element.outerHTML = textAreaElement.outerHTML;

}


function closePanel ( element ) {
  const htmlPanel = getMyPanel3D( element );
  const panel = Panels.getByProp( "uuid", htmlPanel.id );
  Panels.removeObject( panel );

}

function deleteObjectWRP ( uuids ) {

  for (var i=0; i < uuids.length; i++ ) {

    var uuid = uuids[i];

    var segment = Helix.getByProp("uuid", uuid);

    if ( segment !== undefined ){

      Helix.removeSegment ( segment );

      Panels.getByProp( "template", "mouseoverSegment" ).visible(false);

    }

    var panel = Panels.getByProp("uuid", uuid);

    if ( panel !== undefined) {

      Panels.removeObject( panel );

    }
  }
}

function startNewSegmentWRP ( T1, PanelUuid ) {

    Helix.segmentBuffer.active = true;
    // Helix.segmentBuffer.shadowSegment.visible( true );

    Helix.segmentBuffer.T1 = parseFloat( T1 );

    var panel = Panels.getByProp("uuid", PanelUuid);

    if ( panel !== undefined) {

      panel.visible(false);

    }
}


// function chanegePositionWRP ( uuid ) {
//   console.log(mouse);
//   mouse.dragging = true;
//     // while (mouse.leftCliked) {
//     //   console.log("pini");
//     // }
// }

// function changeSegmentWRP (segInfo) {
//   changeSegmentPars (segInfo);
//   hidePanel(panelId);
// }
//
//
// function hidePanel (id) {
//   document.getElementById(id).style.cssText += ("visible: false");
// }

function checkFileType() {

}

function showInOverlay ( element ) {
  const panel = getMyPanel3D(element);
  const media = panel.getElementsByClassName("mediaTarget")[0];
  console.log(media);
  overlay.show();
  overlay.pushHtml(media);
}

function fitPanelOfElement ( element ) {
  Panels.getByProp("uuid", getMyPanel3D(element).id).setPlaneSizeToHTML();
}

function getMyPanel3D ( element ) {

  if( element.className.indexOf("panel3D") > - 1) {
    return element;
  }

  const parents = $( element ).parents();

  for (var i = 0; i < parents.length; i++ ) {
    if ( parents[i]["className"] == "panel3D" ) {
       return parents[i];
    }
  }

  console.error("This element does not have Panel3D parent.");
}
