function NodeJS ( url ) {
  this.url = url || "http://85.255.4.87/";
  this.dataFolder = "uploads/";
  this.filesRoute = "api/uploads/";
  this.delRoute = "api/uploads/";
  this.loginRoute = "login";
  this.createUserRoute = "createUser";

  this.quedCallback = undefined;

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

  const doneWrap = function ( _this ) {

    return function ( data ) {

      if ( _this.saveToken( data.token ) ) {

        overlay.setHeader( "Welcome to Timelix " + _this.token.body.username );

        if ( _this.quedCallback ) {
          _this.quedCallback();
          _this.quedCallback = undefined;
          // return;
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

  }

  $.ajax({
      url: url,
      type: 'POST',
      data: JSON.stringify( payLoad ),
      processData: false,
      contentType: "application/json; charset=utf-8",
      success: doneWrap( this ),
      statusCode: {
                    401: function() {
                      console.log( "Login is incorrect" );
                      overlay.setHeader("User not found, do you wish to create new one?")
                      overlay.loginShowCreateBtn();
                    }
                  }

    })

}

NodeJS.prototype.createAccount = function ( form ) {

  const url = this.url + this.createUserRoute;

  const username = form.getElementsByClassName("inputUserName")[0].value;
  const pwd = form.getElementsByClassName("inputPassword")[0].value;

  const payLoad =  {
    name : username,
    pwd : pwd
  };

  var doneWrap = function ( _this ) {

    // const doneWrap = function ( _this, _doneCallback ) {

      return function ( data ) {
        if ( _this.saveToken( data.token ) ) {

          overlay.setHeader( "Welcome to Timelix " + _this.token.body.username );

          if ( _this.quedCallback ) { _this.quedCallback(); }

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

    .done( doneWrap( this ) )

    .fail( function() {
      console.error("Connection to "+ url +" failed!");
    });

}

NodeJS.prototype.uploadData = function ( inputEl, type ) {

  // var inputEl = _inputEl || inputEl;
  // var type = _type || inputEl;



  // In case token is not valid que this function call to quedCallback to fire it after successful login.
  // quedCallback is selfInvoked closure to store input data
  if ( !this.isTokenValid() ) {
    this.quedCallback = ( function ( inputEl, type ) { return function () { this.uploadData(  inputEl, type ) } } )( inputEl, type );
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
    var wrapper = function ( src, type, HtmlPanel ) {

      return function setMediaElement( data ) {

            if ( type == "img" ) {
              createImage ( HtmlPanel, src, data.message );
            }

            if ( type == "vid" ) {
              createVideo ( HtmlPanel, src, data.message );
            }

            if ( type == "aud" ) {
              createAudio ( HtmlPanel, src, data.message );
            }
        }
    }

    var errorWrap = function ( src ) {
      return function ( error ) {
        console.error("Uploading file to "+ src +" failed!");
      }
    }

    // var tokenWrap = function ( self ) {
    //   return function ( request ) {
    //     request.setRequestHeader("Authorization", "self.token.raw");
    //   }
    // }

  $.ajax({
      url: upSrc,
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      headers: { "Authorization" : this.token.raw },
      success: wrapper( src, type, HtmlPanel ),

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
  .fail( errorWrap( upSrc ) );

}

NodeJS.prototype.removeData = function ( fileName, panel3D ) {

  if ( !this.isTokenValid() ) {
    this.quedCallback = ( function ( _fileName, _panel3D ) { return function () { this.removeData( _fileName, _panel3D ) } } )( fileName, panel3D );
    overlay.login();
    overlay.setHeader("Your session expired");
    overlay.show();
    return;
  }

  const url = this.url + this.delRoute + fileName;

  $.ajax({
    url: url,
    type: 'DELETE',
    // data: JSON.stringify( url + fileName ),
    processData: false,
    headers: { "Authorization": this.token.raw }
    // contentType: "application/json; charset=utf-8"

  })

  .done( function( data ) {

    panels.removeObject( panel3D );

  })

  .fail( function() {
    console.error("Removing file "+ fileName +" from "+ url +" failed!");
  });

  // $.post( url + fileName, function( data ) {
  //     console.log("File successfuly deleted.");
  //   })
  //   .fail( function() {
  //     console.error("Removing file "+ fileName +" from "+ url +" failed!");
  //   });

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
  var exp = new Date(this.token.body.exp * 1000);

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
// NodeJS.prototype.isTokenValid = function ()  {
//
//   const rawToken = localStorage.getItem('token');
//
//   if ( !rawToken ) { console.log("None token stored. Please login to get new token."); overlay.setHeader("Welcome, new user!"); return false; }
//
//   var token = this.parseToken( rawToken );
//
//   if ( !token ) { console.log("Token is corrupted. Please login to get new token."); return false; }
//
//   var now = new Date();
//   var exp = new Date( token.body.exp * 1000 );
//
//   if ( exp < now ) { console.log("Your token expired. Please login to get new token."); return false; }
//
//   console.log("Token is valid. Saving to memory.");
//
//  return this.saveToken( rawToken );
// }



NodeJS.prototype.base64DecodeOLD = function ( base64str ) {

  var base64Arr = base64str.split("");
  var binStr = "";
  var baseStr = "";
  var Base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  for (var i = 0; i < base64Arr.length; i++) {

    if ( base64Arr[i] == "=" ) { break; }

    var bin = Base64.indexOf( base64Arr[i] ).toString(2);

    for (var y = 0, len = bin.length; y < ( 6 - len ); y++) {
      bin = "0" + bin;
    }

    binStr += bin;
  }
  // i+8 Protection from missing padding =
  for (var i = 0, len = binStr.length; i + 8 <= len; i += 8) {

    var charCode = parseInt( binStr.substr( i, 8 ), 2 );
    baseStr += String.fromCharCode( charCode );

  }

 return baseStr;
}

NodeJS.prototype.base64Decode = function ( base64Str ) {

var Base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

var buffer = new ArrayBuffer( ( base64Str.length * 6 ) / 8 );
var charNum = new Uint8Array( buffer );

var output = "";

for (var i = 0; i < charNum.length; i++) {

	var quotient = Math.floor(i / 3);
  var mod = i % 3;

  var rightShift = 4 - 2 * mod;
	var leftShift = 6 - rightShift;
  var y = i + quotient;

  if( base64Str[y+1] != "=" ) {
 	  charNum[i] = ( Base64.indexOf( base64Str[ y ] ) << leftShift ) |  ( Base64.indexOf( base64Str[ y + 1 ] ) >> rightShift );
	}

  output += String.fromCharCode(charNum[i]);
  // console.log(output);
}

  return output;
}
