function NodeJS ( url ) {
  this.url = url || "http://13.81.213.87/";
  this.dataFolder = "uploads/";
  this.upRoute = "upload";
  this.loginRoute = "login";
  this.delRoute = "remove/";

  this.test();
}

NodeJS.prototype.test = function( ) {
  $.get(this.url, function ( data ) {
    if (data = "Timelix BackEND") {
      console.log("Backend is OK");
    } else {
      console.error("Backend connection doesn't work");
    }
  });
}

NodeJS.prototype.uploadData = function ( inputEl, type ) {
  // setting for storage link
  const src = this.url + this.dataFolder;
  const upSrc = this.url + this.upRoute;

  if ( !inputEl.files ) { return; }

    const panel3D = getMyPanel3D( inputEl );

    var formData = new FormData();

    var reader = new FileReader();

    for (var i = 0; i < inputEl.files.length; i++) {
      formData.append('uploads[]', inputEl.files[i], inputEl.files[i].name);
    }

    // Closure to get needed data into AJAX
    var wrapper = function ( src, type, panel3D ) {

      return function setMediaElement( names ) {

            if ( type == "img" ) {
              createImage ( panel3D, src, names );
            }

            if ( type == "vid" ) {
              createVideo ( panel3D, src, names );
            }

            if ( type == "aud" ) {
              createAudio ( panel3D, src, names );
            }
        }
    }

    var errorWrap = function ( src ) {
      return function ( error ) {
        console.error("Uploading file to "+ src +" failed!");
      }
    }

  $.ajax({
      url: upSrc,
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: wrapper( src, type, panel3D ),

      xhr: function( panel3D ) {
        // create an XMLHttpRequest
        var xhr = new XMLHttpRequest();
        // listen to the 'progress' event
        xhr.upload.addEventListener( 'progress', function(evt) {
          if ( evt.lengthComputable ) {
            var percentComplete = evt.loaded / evt.total;
            percentComplete = parseInt( percentComplete * 100 );
            console.log( "pini" );
            $( '.progress-bar' ).width( percentComplete + '%' );
          }
        } , false);
      return xhr; }
  })
  .fail( errorWrap( upSrc ) );

}

NodeJS.prototype.removeData = function ( fileName ) {

  const url = this.url + this.delRoute;

  $.post( url + fileName, function( data ) {
      console.log("File successfuly deleted.");
    })
    .fail( function() {
      console.error("Removing file "+ fileName +" from "+ url +" failed!");
    });

}

NodeJS.prototype.sendLogin = function ( form ) {

  const url = this.url + this.loginRoute;

  const username = form.getElementsByClassName("inputUserName")[0].value;
  const pwd = form.getElementsByClassName("inputPassword")[0].value;

  const payLoad =  {
    name : username,
    pwd : pwd
  };

  $.ajax({
      url: url,
      type: 'POST',
      data: JSON.stringify( payLoad ),
      processData: false,
      contentType: "application/json; charset=utf-8",
    })

    .done( function( data ) {
      // if usercreated or user logged.
      
    })

    .fail( function() {
      console.error("Connection to "+ url +" failed!");
    });

}
