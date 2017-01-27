
// List of events to be attached to element.
const events = {
  ".imgInp" : { "event" : "change", "func" : function() { uploadData( this, "img") } },
  ".videoInp" : { "event" : "change", "func" : function() { uploadData( this, "vid" ) } },
  ".audioInp" : { "event" : "change", "func" : function() { uploadData( this, "aud" ) } },
  ".wwwInp" : { "event" : "click", "func" : function() { uploadData( this ) } },
  ".textInp" : { "event" : "change", "func" : function() { uploadData( this ) } }
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
  console.log("pini");
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


    reader.readAsDataURL( input.files[0] );
  }
};

function createImage ( e, input ) {
  var img = document.createElement( 'img' );
  const targetID = input.getAttribute( "targetID" );
  img.setAttribute( "src", e.target.result );
  console.log(e);

  img.className =  "mediaImg";
  document.getElementById( targetID ).innerHTML = img.outerHTML;

  Panels.getByProp("uuid", targetID).setPlaneSizeToHTML();

}

function createVideo ( e, input ) {

  var video = document.createElement( "video" );
  const targetID = input.getAttribute( "targetID" );
  video.setAttribute( "src", e.target.result );
  video.setAttribute( "controls", "true");
  console.log(e);

  video.className =  "mediaImg";
  document.getElementById( targetID ).innerHTML = video.outerHTML;

  Panels.getByProp("uuid", targetID).setPlaneSizeToHTML();

}

function createAudio ( e, input ) {

  var audio = document.createElement( "audio" );
  const targetID = input.getAttribute( "targetID" );
  audio.setAttribute( "src", e.target.result );
  audio.setAttribute( "controls", "true");
  console.log(e);

  audio.className =  "mediaImg";
  document.getElementById( targetID ).innerHTML = audio.outerHTML;

  Panels.getByProp("uuid", targetID).setPlaneSizeToHTML();

}

function createGallery () {

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
