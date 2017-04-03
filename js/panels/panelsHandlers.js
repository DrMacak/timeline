
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
  ".closeCross" : { "event" : "click", "func" : function() { deletePanel( this )  } },
  ".hideOverlay" : { "event" : "click", "func" : function() { overlay.hide() } },
  ".toOverlay" : { "event" : "click", "func" : function() { showInOverlay( this ) } },

  // Login screen in overlay
  "#loginBtn" : { "event" : "click", "func" : function() { nodeJS.sendLogin( this.parentElement ); return false;  } },
  "#createUserBtn" : { "event" : "click", "func" : function() { nodeJS.createAccount( this.parentElement ); return false;  } },

  // DEBUG
  "#BTN1" : { "event" : "click", "func" : function() { } },
  "#BTN2" : { "event" : "click", "func" : function() { nodeJS.loadData("panels"); } },
  "#BTN3" : { "event" : "click", "func" : function() { savePanels(); } }
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

// { panels: [ { uuid: 1324, o: options }, .. ] };

function savePanels () {
  var data = [];

  for (var i=0, len = panels.objects.length; i < len; i++ ) {
    var options = panels.objects[i]["getOptions"]();

    // Dont save time panel.
    if ( options.template != "mouseoverSegment" ) {
      data.push({ uuid : options.uuid, o : options })
    };

  }

  // return { panels: data };
  nodeJS.saveData({ panels: data });
}

function loadPanels ( data ) {

  var uuids = [];
  var objects = data.message.panels;

  for (var i=0, len = panels.objects.length; i < len; i++ ) {
    uuids.push(panels.objects[i]["o"]["uuid"]);
  }

  for (var i=0, len = objects.length; i < len; i++ ) {

    // Check if loaded panel is not already in scene
    if ( uuids.indexOf(objects[i]["uuid"]) < 0 ) {

      var unzipedOptions = panels.unzipOptions(JSON.parse(objects[i]["options"]));
      panels.createPanel( unzipedOptions );

    }

  }

}

function createImage ( panel3D, src ,names ) {

  var img = document.createElement( 'img' );
  img.setAttribute( "src", src + names );

  img.className =  "mediaImg";

  panel3D.getElementsByClassName( "mediaTarget" )[0].innerHTML = img.outerHTML;

  fitPanelOfElement(panel3D);
  // var panel = panels.getByProp("uuid", panel3D.id);
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

  // var panel = panels.getByProp("uuid", panel3D.id);
  // panel.setPlaneSizeToHTML();

  fitPanelOfElement(panel3D);
}

function createAudio ( panel3D, src, names ) {

  var audio = document.createElement( "audio" );

  audio.setAttribute( "src", src + names );
  audio.setAttribute( "controls", "true");

  audio.className =  "mediaImg";

  panel3D.getElementsByClassName( "mediaTarget" )[0].innerHTML = audio.outerHTML;

  // var panel = panels.getByProp("uuid", panel3D.id);
  // panel.setPlaneSizeToHTML();
  fitPanelOfElement(panel3D);

}

function createGallery () {

}

function editPanelText( element ) {
  console.log("pini");
    const htmlPanel = getMyHtmlPanel( element );
    const mediaTarget = htmlPanel.getElementsByClassName( "mediaTarget" )[0];
    var textArea = document.createElement("textarea");
    textArea.innerHTML = "Enter your text";
    //
    // if (htmlPanel.getElementsByClassName("textField")[0]){
    //  var previouseText = htmlPanel.getElementsByClassName("textField")[0].textContent;
    // }

    mediaTarget.innerHTML = textArea.outerHTML;
    // textArea.focus();

    var panel = panels.getByProp("uuid", htmlPanel.id);
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


function deletePanel ( element ) {

  const panelHtml = getMyHtmlPanel( element );
  const panel3D = panels.getByProp( "uuid", panelHtml.id );

  // Send delete request to backend so we dont need to store it.
  if ( panelHtml.getElementsByClassName("mediaImg")[0] ) {

    const mediaPath = panelHtml.getElementsByClassName("mediaImg")[0].getAttribute("src");
    const fileName = mediaPath.substr( mediaPath.lastIndexOf("/") + 1 );

    // Deletes data from BE and after success removes panel.
    nodeJS.removeData( fileName, panel3D );

  } else {

    console.log("Panel doesnt contain media. No need to call BE");
    panels.removeObject( panel3D );

  }



}

function deleteObjectWRP ( uuids ) {

  for (var i=0; i < uuids.length; i++ ) {

    var uuid = uuids[i];

    var segment = Helix.getByProp("uuid", uuid);

    if ( segment !== undefined ){

      Helix.removeSegment ( segment );

      panels.getByProp( "template", "mouseoverSegment" ).visible(false);

    }

    var panel = panels.getByProp("uuid", uuid);

    if ( panel !== undefined) {

      panels.removeObject( panel );

    }
  }
}

function startNewSegmentWRP ( T1, PanelUuid ) {

    Helix.segmentBuffer.active = true;
    // Helix.segmentBuffer.shadowSegment.visible( true );

    Helix.segmentBuffer.T1 = parseFloat( T1 );

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
  const panel = getMyHtmlPanel(element);
  const media = panel.getElementsByClassName("mediaTarget")[0];
  console.log(media);
  overlay.show();
  overlay.pushHtml(media);
}

function fitPanelOfElement ( element ) {
  panels.getByProp("uuid", getMyHtmlPanel(element).id).setPlaneSizeToHTML();
}

function getMyHtmlPanel ( element ) {

  if( element.className.indexOf("panel3D") > - 1) {
    return element;
  }

  const parents = $( element ).parents();

  for (var i = 0; i < parents.length; i++ ) {
    if ( parents[i]["className"] == "panel3D" ) {
       return parents[i];
    }
  }

  console.error("This element does not have HtmlPanel parent.");
}
