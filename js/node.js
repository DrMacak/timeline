function NodeJS ( url ) {
  this.url = url || "http://85.255.4.87/";
  this.dataFolder = "uploads/";
  this.filesRoute = "api/uploads/";
  this.delRoute = "api/uploads/";
  this.dataRoute = "api/userdata/";
  this.loginRoute = "login";
  this.createUserRoute = "createUser";

  this.quedCallback = [];

  this.token = {
    raw : "",
    header : {},
    body : {},
    tail : ""
  }

  this.init();
}

NodeJS.prototype.init = function( ) {

  if ( !window.localStorage ) { console.error("Browser doesnt support LocalStorage!"); return;};

  this.testConnection();

  // Check if some token is stored and if it is valid.
  if ( !this.loadToken() ) {
    overlay.login();
    overlay.show();
    return;
  };

  overlay.fastHide();
}

//
// NodeJS.prototype.isOK = function () {
//
//   if ( !this.isTokenValid() ) {
//     overlay.login();
//     overlay.setHeader("Your session expired");
//     overlay.show();
//     return false;
//   };
//
//   return true;
// }

NodeJS.prototype.testConnection = function( ) {
  $.get(this.url, function ( data ) {

    if ( data == "Timelix BackEND" ) {
      console.log("Back-end is OK");
      return true;
    } else {
      console.error("Back-end connection doesn't work");
      return false;
    }
  });
}

NodeJS.prototype.sendLogin = function ( form ) {

  // console.log("login called");
  // console.dir(form);
  // console.log($(form).serialize());

  const url = this.url + this.loginRoute;

  const username = form.getElementsByClassName("inputUserName")[0].value;
  const pwd = form.getElementsByClassName("inputPassword")[0].value;

  if ( username == "" || pwd == "" ) { overlay.setHeader("Username or password cannot be blank"); return false; }

  const payLoad =  {
    name : username,
    pwd : pwd
  };

  const successfulLogin = function ( _this ) {

    return function ( data ) {

      if ( _this.saveToken( data.token ) ) {

        overlay.setHeader( "Welcome to Timelix " + _this.token.body.username );

        if ( _this.quedCallback.length != 0 ) {

          for (var i = 0; i < _this.quedCallback.length; i++ ) {
            _this.quedCallback[i]();

          }

          _this.quedCallback = [];

        }

        setTimeout( function() {
          overlay.purgeHide();
        }, 1000);

        console.log("Token initialized");
        return;
      }

      console.error("Cannot be logged, Token is not working.");
      return;
    }

  }

  $.ajax({
      url: url,
      type: 'POST',
      data: JSON.stringify( payLoad ),
      processData: false,
      contentType: "application/json; charset=utf-8",
      // success: doneWrap( this ),
      statusCode: {
                    401: function() {
                      console.log( "Login is incorrect" );
                      overlay.setHeader("User not found, do you wish to create new one?")
                      overlay.loginShowCreateBtn();
                    }
                  }

    })

    .done( successfulLogin( this ) );

}

NodeJS.prototype.createAccount = function ( form ) {

  const url = this.url + this.createUserRoute;

  const username = form.getElementsByClassName("inputUserName")[0].value;
  const pwd = form.getElementsByClassName("inputPassword")[0].value;

  const payLoad =  {
    name : username,
    pwd : pwd
  };

  var accountCreated = function ( _this ) {

    // const doneWrap = function ( _this, _doneCallback ) {

      return function ( data ) {

        // Save token
        if ( _this.saveToken( data.token ) ) {

          // Set overlay header to welcom new user
          overlay.setHeader( "Welcome to Timelix newbie " + _this.token.body.username + "!");

          // Check if we dont have any callbacks qued
          if ( _this.quedCallback.length != 0 ) {

            for (var i = 0; i < _this.quedCallback.length; i++ ) {
              _this.quedCallback[i]();
            }

            _this.quedCallback = [];

          }

          setTimeout(function() {
            overlay.purgeHide();
          }, 1000);

          console.log("Token initialized");
          return;
        }

        console.error("Cannot be logged, Token is not working.");
        return;
      }

    // }

  }

  $.ajax({
      url: url,
      type: 'POST',
      data: JSON.stringify( payLoad ),
      processData: false,
      contentType: "application/json; charset=utf-8",
      statusCode: {
                    409: function() {
                      console.log( "Name is already taken" );
                      overlay.setHeader("Choose different name.");
                    }
                  }

    })

    .done( accountCreated( this ) )

    .fail( function() {
      console.error("Connection to "+ url +" failed!");
    });

}

NodeJS.prototype.uploadData = function ( inputEl, type ) {

  // In case token is not valid que this function call to quedCallback to fire it after successful login.
  // quedCallback is selfInvoked closure to store input data
  if ( !this.isTokenValid() ) {
    this.quedCallback.push( ( function ( _inputEl, _type, _this ) { return function () { _this.uploadData( _inputEl, _type ) } } )( inputEl, type, this ) );
    overlay.login();
    overlay.setHeader("Your session expired");
    overlay.show();
    return;
  }

  // setting for storage link
  const src = this.url + this.dataFolder;
  const upSrc = this.url + this.filesRoute;

  if ( !inputEl.files ) { return; }

    const HtmlPanel = getMyHtmlPanel( inputEl );

    var formData = new FormData();

    var reader = new FileReader();

    for (var i = 0; i < inputEl.files.length; i++) {
      formData.append('uploads[]', inputEl.files[i], inputEl.files[i].name);
    }

    // Closure to get needed data into AJAX
    var wrapper = function ( _src, _type, _panelHtml ) {

      return function setMediaElement( data ) {

            if ( _type == "img" ) {

              createImage ( _src, _panelHtml, data.message );

            } else if ( _type == "vid" ) {

              createVideo ( _src, _panelHtml, data.message );

            } else if ( _type == "aud" ) {

              createAudio ( _src, _panelHtml, data.message );

            }
        }
    }

    // var errorWrap = function ( _src ) {
    //   function ( error ) {
      // console.error("Uploading file to "+ _src +" failed!");
    // }
    // }


  $.ajax({
      url: upSrc,
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      headers: { "Authorization" : this.token.raw },
      // success: wrapper( src, type, HtmlPanel ),

      xhr: function( HtmlPanel ) {
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

  .done( wrapper( src, type, HtmlPanel ) )

  .fail( function ( ) {
    console.error("Uploading file to "+ src +" failed!");
  });

}

// NodeJS.prototype.removeFile = function ( fileName, panel3D ) {
//
//   if ( !this.isTokenValid() ) {
//     this.quedCallback.push( ( function ( _fileName, _panel3D, _this ) { return function () { _this.removeFile( _fileName, _panel3D ) } } )( fileName, panel3D, this ) );
//     overlay.login();
//     overlay.setHeader("Your session expired");
//     overlay.show();
//     return;
//   }
//
//   const url = this.url + this.delRoute + fileName;
//
//   $.ajax({
//     url: url,
//     type: 'DELETE',
//     // data: JSON.stringify( url + fileName ),
//     processData: false,
//     headers: { "Authorization": this.token.raw }
//     // contentType: "application/json; charset=utf-8"
//
//   })
//
//   .done( function( data ) {
//
//     panels.removePanelLocally( panel3D );
//
//   })
//
//   .fail( function() {
//     console.error("Removing file "+ fileName +" from "+ url +" failed!");
//   });
//
//   // $.post( url + fileName, function( data ) {
//   //     console.log("File successfuly deleted.");
//   //   })
//   //   .fail( function() {
//   //     console.error("Removing file "+ fileName +" from "+ url +" failed!");
//   //   });
//
// }

NodeJS.prototype.saveData = function ( data )  {

  console.log(data);

  const url = this.url + this.dataRoute;

  $.ajax({
    url: url,
    type: 'POST',
    data: JSON.stringify( data ),
    processData: false,
    headers: { "Authorization": this.token.raw },
    contentType: "application/json; charset=utf-8"

  })

  .done( function( data ) {

    console.log("Data uploaded successfuly" + data);

  })

  .fail( function() {
    console.error("Data upload to "+ url +" failed!");
  });

}

// Load data from BE. You can choose which kind of data to load.
// Panels, segments, helix
NodeJS.prototype.loadData = function ( type )  {

  const url = this.url + this.dataRoute + type;

  $.ajax({
    url: url,
    type: 'GET',
    // data: JSON.stringify( data ),
    processData: false,
    headers: { "Authorization": this.token.raw }
    // contentType: "application/json; charset=utf-8"

  })

  .done( function( data ) {
    loadPanels( data );
    console.log("Data recieved successfuly" + data);

  })

  .fail( function() {
    console.error("Data loading from "+ url +" failed!");
  });

}

NodeJS.prototype.removeData = function ( uuid, callback ) {

  if ( !this.isTokenValid() ) {
    this.quedCallback.push( ( function ( _uuid, _callback, _this ) { return function () { _this.removeData( _uuid, _callback ) } } )( uuid, callback, this ) );
    overlay.login();
    overlay.setHeader("Your session expired");
    overlay.show();
    return;
  }

  const url = this.url + this.dataRoute + uuid;

  $.ajax({
    url: url,
    type: 'DELETE',
    processData: false,
    headers: { "Authorization": this.token.raw }
  })

  .done( function( data ) {
    callback();
  })

  .fail( function() {
    console.error("Removing object "+ uuid +" from "+ url +" failed!");
  });

}

NodeJS.prototype.logOut = function ()  {
  localStorage.removeItem('token');
  this.token = null;
}


// Try to load token from local storage and eval if its not expired. If everything is alright save token.
NodeJS.prototype.loadToken = function ()  {

  const rawToken = localStorage.getItem('token');

  if ( !rawToken ) { console.log("None token stored. Please login to get new token."); overlay.setHeader("Welcome, new user!"); return false; }

  var token = this.parseToken( rawToken );

  if ( !token ) { console.log("Token is corrupted. Please login to get new token."); return false; }

  var now = new Date();
  var exp = new Date( token.body.exp * 1000 );

  if ( exp < now ) { console.log("Your token expired. Please login to get new token."); return false; }

  console.log("Token is valid. Saving to memory.");

  return this.saveToken( rawToken );
}

// Recieves raw token from backend and parse it.
NodeJS.prototype.saveToken = function( rawToken ) {

  this.token.raw = rawToken;
  localStorage.setItem('token', rawToken);

  const parsedToken = this.parseToken ( rawToken );

  if( !parsedToken ) { return false; }

  this.token.header = parsedToken.header;
  this.token.body = parsedToken.body;
  this.token.tail = parsedToken.tail;

  return true;
}

NodeJS.prototype.isTokenValid = function ()  {

  if ( this.token.raw == "" ) { console.error("Token not initialized."); return false; }

  var now = new Date();
  var exp = new Date( this.token.body.exp * 1000 );

  if ( exp < now ) { console.error("Your token expired. Please login to get new token."); return false; }

  console.log("Token is valid.");

  return true;
}

// Recieves raw token from backend and parse it.
NodeJS.prototype.parseToken = function( rawToken ) {

  const _bodyStart = rawToken.indexOf( "." );
  const _bodyEnd= rawToken.indexOf( ".", _bodyStart + 1 );

  const _rawHeader = rawToken.substr(0, _bodyStart);
  const _rawBody = rawToken.substr( _bodyStart + 1, _bodyEnd - _bodyStart - 1 );

  const tail = rawToken.substr( _bodyEnd + 1 );

  try {
    JSON.parse( this.base64Decode(_rawHeader) );
    JSON.parse( this.base64Decode(_rawBody) );
  } catch ( e ) {
    console.error("Token is corrupted");
    console.error(e);
    return undefined;
  }

  const header = JSON.parse( this.base64Decode(_rawHeader) );
  const body =  JSON.parse( this.base64Decode(_rawBody) );

  return { header: header, body: body, tail: tail }
}

// NodeJS.prototype.base64DecodeOLD = function ( base64str ) {
//
 //  var base64Arr = base64str.split("");
 //  var binStr = "";
 //  var baseStr = "";
 //  var Base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
 //
 //  for (var i = 0; i < base64Arr.length; i++) {
 //
 //    if ( base64Arr[i] == "=" ) { break; }
 //
 //    var bin = Base64.indexOf( base64Arr[i] ).toString(2);
 //
 //    for (var y = 0, len = bin.length; y < ( 6 - len ); y++) {
 //      bin = "0" + bin;
 //    }
 //
 //    binStr += bin;
 //  }
 //  // i+8 Protection from missing padding =
 //  for (var i = 0, len = binStr.length; i + 8 <= len; i += 8) {
 //
 //    var charCode = parseInt( binStr.substr( i, 8 ), 2 );
 //    baseStr += String.fromCharCode( charCode );
 //
 //  }
 //
 // return baseStr;
// }

NodeJS.prototype.base64Decode = function ( base64Str ) {

var Base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

var buffer = new ArrayBuffer( ( base64Str.length * 6 ) / 8 );
var charNum = new Uint8Array( buffer );

var output = "";

for ( var i = 0, len = charNum.length; i < len; i++ ) {

	var quotient = Math.floor( i / 3 );
  var mod = i % 3;

  var rightShift = 4 - 2 * mod;
	var leftShift = 6 - rightShift;
  var y = i + quotient;

  if( base64Str[ y + 1 ] != "=" ) {
 	  charNum[i] = ( Base64.indexOf( base64Str[ y ] ) << leftShift ) |  ( Base64.indexOf( base64Str[ y + 1 ] ) >> rightShift );
	}

  output += String.fromCharCode( charNum[i] );
}

  return output;
}
