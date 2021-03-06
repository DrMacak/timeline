
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
  ".closeCross" : { "event" : "click", "func" : function() { panels.removePanel( panels.getPanelByElement( this ) ) } },
  ".hideOverlay" : { "event" : "click", "func" : function() { overlay.hide() } },
  ".toOverlay" : { "event" : "click", "func" : function() { showInOverlay( this ) } },

  // Login screen in overlay
  "#loginBtn" : { "event" : "click", "func" : function() { nodeJS.sendLogin( this.parentElement ); return false;  } },
  "#createUserBtn" : { "event" : "click", "func" : function() { nodeJS.createAccount( this.parentElement ); return false;  } },

  // DEBUG
  "#BTN1" : { "event" : "click", "func" : function() { cinemator.showSplines(); } },
  "#BTN2" : { "event" : "click", "func" : function() { panels.slideShow() } },
  "#BTN3" : { "event" : "click", "func" : function() { cinemator.pause(); } },
  "#BTN4" : { "event" : "click", "func" : function() { camera.position.copy( new THREE.Vector3( helix.height, helix.height, helix.height/2)); controls.target.copy( new THREE.Vector3(0, 0, helix.height/2)); camera.up.copy(  new THREE.Vector3( 0, 0, 1 )); } },
  "#BTN5" : { "event" : "click", "func" : function() { cinemator.animateCameraToB(new THREE.Vector3(1000, 1000, 1000 ) ); cinemator.animateTargetToB(new THREE.Vector3(100, 100, 500 ) ); } },
  "#BTN6" : { "event" : "click", "func" : function() { cinemator.animateCameraToB( new THREE.Vector3( helix.height, helix.height, helix.height/2)); cinemator.animateTargetToB( new THREE.Vector3(0, 0, helix.height/2));  cinemator.animateRotationToB( new THREE.Vector3( 0, 0, 1 ));} }
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

function createImage ( src, panelHtml, name ) {

  var img = document.createElement( 'img' );
  img.setAttribute( "src", src + name );

  img.className = "mediaImg";

  panelHtml.getElementsByClassName( "mediaTarget" )[0].innerHTML = img.outerHTML;

  // fitPanelOfElement( panelHtml );

  var panel = panels.getByProp( "uuid", panelHtml.id );

  panel.setPlaneSizeToHTML();

  // Add name of file to list of files.
  panel.o.files.push( name );

  // panel.saveToNode();
}

function createVideo ( src, panelHtml, name ) {

  var video = document.createElement( "video" );

  video.setAttribute( "src", src + name );
  video.setAttribute( "controls", "true");

  video.className =  "mediaImg";

  panelHtml.getElementsByClassName( "mediaTarget" )[0].innerHTML = video.outerHTML;

  var panel = panels.getByProp( "uuid", panelHtml.id );

  panel.setPlaneSizeToHTML();

  // Add name of file to list of files.
  panel.o.files.push( name );
}

function createAudio ( src, panelHtml, name ) {

  var audio = document.createElement( "audio" );

  audio.setAttribute( "src", src + name );
  audio.setAttribute( "controls", "true");

  audio.className =  "mediaImg";

  panelHtml.getElementsByClassName( "mediaTarget" )[0].innerHTML = audio.outerHTML;

  var panel = panels.getByProp( "uuid", panelHtml.id );

  panel.setPlaneSizeToHTML();

  // Add name of file to list of files.
  panel.o.files.push( name );

}

function createGallery () {

}

function editPanelText( element ) {
  console.log("pini");
  const panelHtml = panels.getHtmlPanelByElement( element );
  const mediaTarget = panelHtml.getElementsByClassName( "mediaTarget" )[0];
  var textArea = document.createElement("textarea");
  textArea.innerHTML = "Enter your text";
  //
  // if (panelHtml.getElementsByClassName("textField")[0]){
  //  var previouseText = panelHtml.getElementsByClassName("textField")[0].textContent;
  // }

  mediaTarget.innerHTML = textArea.outerHTML;
  // textArea.focus();

  var panel = panels.getByProp("uuid", panelHtml.id);
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


// function deletePanel ( element ) {
//
//   const panelHtml = panels.getHtmlPanelByElement( element );
//   const panel3D = panels.getByProp( "uuid", panelHtml.id );
//
//   // Send delete request to backend so we dont need to store it.
//   if ( panelHtml.getElementsByClassName("mediaImg")[0] ) {
//
//     const mediaPath = panelHtml.getElementsByClassName("mediaImg")[0].getAttribute("src");
//     const fileName = mediaPath.substr( mediaPath.lastIndexOf("/") + 1 );
//
//     // Deletes data from BE and after success removes  panel.
//     nodeJS.removeData( fileName, panel3D );
//
//   } else {
//
//     console.log("Panel doesnt contain media. No need to call BE");
//     panels.removePanelLocally( panel3D );
//
//   }
//
//
//
// }

function deleteObjectWRP ( uuids ) {

  for (var i=0; i < uuids.length; i++ ) {

    var uuid = uuids[i];

    var segment = helix.getByProp("uuid", uuid);

    if ( segment !== undefined ){

      helix.removeSegment ( segment );

      panels.getByProp( "template", "mouseoverSegment" ).visible(false);

    }

    var panel = panels.getByProp("uuid", uuid);

    if ( panel !== undefined) {

      panels.removePanelLocally( panel );

    }
  }
}

function startNewSegmentWRP ( T1, PanelUuid ) {

    helix.segmentBuffer.active = true;
    // helix.segmentBuffer.shadowSegment.visible( true );

    helix.segmentBuffer.T1 = parseFloat( T1 );

    var panel = panels.getByProp("uuid", PanelUuid);

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
  const panel = panels.getHtmlPanelByElement(element);
  const media = panel.getElementsByClassName("mediaTarget")[0];
  console.log(media);
  overlay.show();
  overlay.pushHtml(media);
}

function fitPanelOfElement ( element ) {
  panels.getByProp("uuid", panels.getHtmlPanelByElement(element).id).setPlaneSizeToHTML();
}

// function getMyHtmlPanel ( element ) {
//
//   if( element.className.indexOf("panel3D") > - 1) {
//     return element;
//   }
//
//   const parents = $( element ).parents();
//
//   for (var i = 0; i < parents.length; i++ ) {
//     if ( parents[i]["className"] == "panel3D" ) {
//        return parents[i];
//     }
//   }
//
//   console.error("This element does not have panelHtml parent.");
// }
