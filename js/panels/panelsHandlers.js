
// List of events to be attached to element.
const events = {
  ".imgInp" : { "event" : "change", "func" : function() { uploadData( this, "img") } },
  ".videoInp" : { "event" : "change", "func" : function() { uploadData( this, "vid" ) } },
  ".audioInp" : { "event" : "change", "func" : function() { uploadData( this, "aud" ) } },
  ".wwwInp" : { "event" : "click", "func" : function() { uploadData( this ) } },
  ".textInp" : { "event" : "change", "func" : function() { uploadData( this ) } },
  ".closeCross" : { "event" : "click", "func" : function() { closePanel( this ) } },

  // DEBUG

  "#BTN1" : { "event" : "click", "func" : function() { Overlay.show(); } },
  "#BTN2" : { "event" : "click", "func" : function() { Overlay.hide(); } },
  "#BTN3" : { "event" : "click", "func" : function() {  } },
  ".resizeB" : { "event" : "click", "func" : function() { resizePanel(this) } },

};

for ( var key in events ) {
  if (!events.hasOwnProperty(key)) continue;
  $(document).on( events[key].event, key, events[key].func );
}

///////////////////////////////////////////////////////////////////
// Functions attached to panels.
//
///////////////////////////////////////////////////////////////////

function uploadData( input, type ) {
  
  if ( input.files ) {

    var reader = new FileReader();

    if ( type == "img" ) {

      if ( input.files.length == 1 ) {

          reader.onload = function ( e ) {
            createImage ( e, input );
          }
        }

        if ( input.files.length > 1 ) {

          reader.onload = function ( e ) {
            createGallery ( e, input );
          }
        }
    }

    if ( type == "vid" ) {
      reader.onload = function ( e ) {
        createVideo ( e, input );
      }
    }

    if ( type == "aud" ) {
      reader.onload = function ( e ) {
        createAudio ( e, input );
      }
    }

    reader.onloadend = function () {
      const targetID = input.getAttribute( "targetID" );
      Panels.getByProp("uuid", targetID).setPlaneSizeToHTML();
    }

    reader.readAsDataURL( input.files[0] );

  }

};

function createImage ( e, element ) {


  var img = document.createElement( 'img' );
  img.setAttribute( "src", e.target.result );


  img.className =  "mediaImg";

  const panel3D = getMyPanel3D( element );
  panel3D.getElementsByClassName( "mediaTarget" )[0].innerHTML = img.outerHTML;

}

function createVideo ( e, element ) {

  var video = document.createElement( "video" );

  video.setAttribute( "src", e.target.result );
  video.setAttribute( "controls", "true");

  video.className =  "mediaImg";



  const panel3D = getMyPanel3D( element );
  var mediaTarget = panel3D.getElementsByClassName( "mediaTarget" )[0];
  mediaTarget.style.width = "";
  mediaTarget.style.height = "";
  mediaTarget.innerHTML = video.outerHTML;
}

function createAudio ( e, element ) {

  var audio = document.createElement( "audio" );
  // const targetID = input.getAttribute( "targetID" );
  audio.setAttribute( "src", e.target.result );
  audio.setAttribute( "controls", "true");
  console.log(e);

  audio.className =  "mediaImg";

  const panel3D = getMyPanel3D( element );
  panel3D.getElementsByClassName( "mediaTarget" )[0].innerHTML = audio.outerHTML;

  // Panels.getByProp("uuid", targetID).setPlaneSizeToHTML();

}

function createGallery () {

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

function getMyPanel3D ( element ) {
  const parents = $( element ).parents();
  for (var i = 0; i < parents.length; i++ ) {
    if ( parents[i]["className"] == "panel3D" ) {
       return parents[i];
    }
  }
  console.error("This element does not have Panel3D parent.");
}

// DEBUG

function resizePanel ( element ) {
  Panels.getByProp("uuid", getMyPanel3D(element).id).setPlaneSizeToHTML();
  console.log("pini");

}
