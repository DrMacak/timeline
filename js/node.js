function NodeJS ( url ) {
  this.url = url || "http://85.255.4.87/";
  this.dataFolder = "uploads/";
  this.filesRoute = "api/uploads/";
  this.delRoute = "api/uploads/";
  this.dataRoute = "api/userdata/";
  this.loginRoute = "login";
  this.createUserRoute = "createUser";

  this.userName = "";
  this.firstLogin = false;
  this.queuedCallback = [];
  // this.queuedCallback.prototype.run =  function () {
  //   if ( _this.queuedCallback.length != 0 ) {
  //
  //     for (var i = 0; i < _this.queuedCallback.length; i++ ) {
  //       _this.queuedCallback[i]();
  //
  //     }
  //
  //     _this.queuedCallback = [];
  //
  //   }
  // }

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
  this.loadToken();
  // if ( !this.loadToken() ) {
  //   overlay.login();
  //   overlay.show();
  //   return;
  // };

  // overlay.fastHide();
}

NodeJS.prototype.testConnection = function( ) {
  $.get(this.url, function ( data ) {

    if ( data == "Timelix BackEND" ) {
      console.log("Back-end is OK");
      return true;
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

  // Not realy neccessary Browser is taking care of this by required param.
  // if ( username == "" || pwd == "" ) { overlay.setHeader("Username or password cannot be blank"); return false; }

  const payLoad =  {
    name : username,
    pwd : pwd
  };

  const successfulLogin = function ( _this ) {

    return function ( data ) {

      if ( _this.saveToken( data.token ) ) {

        overlay.setHeader( "Welcome to Timelix " + _this.token.body.username );

        this.firstLogin = false;

        if ( _this.queuedCallback.length != 0 ) {

          for (var i = 0; i < _this.queuedCallback.length; i++ ) {
            _this.queuedCallback[i]();

          }

          _this.queuedCallback = [];

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

  const bDay = form.getElementsByClassName("bDay")[0].value;
  const bMonth = form.getElementsByClassName("bMonth")[0].value;
  const bYear = form.getElementsByClassName("bYear")[0].value;

  // Check the input values by checking if the date was successful inited.
  const bDate = new Date(bMonth + " " + bDay + " " + bYear);

  if (bDate == "Invalid Date") {
    console.error("Ivalid birth Date");
  }

  const payLoad =  {
    name : username,
    pwd : pwd,
    bDate : bDate.getTime()
  };

  var accountCreated = function ( _this ) {

    // const doneWrap = function ( _this, _doneCallback ) {

      return function ( data ) {

        // Save token
        if ( _this.saveToken( data.token ) ) {

          // Set overlay header to welcom new user
          overlay.setHeader( "Welcome to Timelix newbie " + _this.token.body.username + "!");

          _this.firstLogin = true;

          // Check if we dont have any callbacks qued
          if ( _this.queuedCallback.length != 0 ) {

            for (var i = 0; i < _this.queuedCallback.length; i++ ) {
              _this.queuedCallback[i]();
            }

            _this.queuedCallback = [];

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

  // In case token is not valid que this function call to queuedCallback to fire it after successful login.
  // queuedCallback is selfInvoked closure to store input data
  if ( !this.isTokenValid() ) {
    this.queuedCallback.push( ( function ( _inputEl, _type, _this ) { return function () { _this.uploadData( _inputEl, _type ) } } )( inputEl, type, this ) );
    overlay.login();
    overlay.setHeader("Your session expired");
    overlay.show();
    return;
  }

  // setting for storage link
  const src = this.url + this.dataFolder;
  const upSrc = this.url + this.filesRoute;

  if ( !inputEl.files ) { return; }

    const HtmlPanel = panels.getHtmlPanelByElement( inputEl );

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

            // panel.saveToNode();

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
      statusCode: {
                    401: function() {
                      console.log( "Authentication failed" );
                      overlay.login();
                      overlay.setHeader("Your session expired");
                      overlay.show();
                    }
                  },
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
//     this.queuedCallback.push( ( function ( _fileName, _panel3D, _this ) { return function () { _this.removeFile( _fileName, _panel3D ) } } )( fileName, panel3D, this ) );
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

// Prepares data from one panel and sends it to saveData
NodeJS.prototype.savePanel = function ( panel ) {

  var options = panel.getOptions();

  // Dont save time panel.
  if ( options.template != "mouseoverSegment" ) {
    this.saveData( [{ type: "panel", uuid : options.uuid, o : options }] );
  };

}

// Accepts array of objects {type: "str", uuid:"str", o:"str"}
NodeJS.prototype.saveData = function ( data )  {

  console.log(data);

  const url = this.url + this.dataRoute;

  $.ajax({
    url: url,
    type: 'POST',
    data: JSON.stringify( { objects : data } ),
    processData: false,
    headers: { "Authorization": this.token.raw },
    contentType: "application/json; charset=utf-8",
    statusCode: {
                  401: function() {
                    console.log( "Authentication failed" );
                    overlay.login();
                    overlay.setHeader("Your session expired");
                    overlay.show();
                  }
                }

  })

  .done( function( data ) {

    if (data.success) {
      console.log("Data uploaded successfuly" + data);
    } else {
      console.error("Data not uploaded!");
    }

  })

  .fail( function() {
    console.error("Data upload to "+ url +" failed!");
  });

}

// Load data from BE. You can choose which kind of data to load.
// Panels, segments, helix
NodeJS.prototype.loadData = function ( type, callback )  {

  const url = this.url + this.dataRoute + type;

  $.ajax({
    url: url,
    type: 'GET',
    // data: JSON.stringify( data ),
    processData: false,
    headers: { "Authorization": this.token.raw },
    statusCode: {
                  401: function() {
                    console.log( "Authentication failed" );
                    overlay.login();
                    overlay.setHeader("Your session expired");
                    overlay.show();
                  }
                }
    // contentType: "application/json; charset=utf-8"

  })

  .done( function( data ) {
    callback( data );
    console.log("Data recieved successfuly" + data);

  })

  .fail( function() {
    console.error("Data loading from "+ url +" failed!");
  });

}

//  Remove data from DB, thats based only on uuid.
NodeJS.prototype.removeData = function ( uuid, callback ) {

  if ( !this.isTokenValid() ) {
    this.queuedCallback.push( ( function ( _uuid, _callback, _this ) { return function () { _this.removeData( _uuid, _callback ) } } )( uuid, callback, this ) );
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
    headers: { "Authorization": this.token.raw },
    statusCode: {
                  401: function() {
                    console.log( "Authentication failed" );
                    overlay.login();
                    overlay.setHeader("Your session expired");
                    overlay.show();
                  }
                }
  })

  .done( function( data ) {
    callback();
  })

  .fail( function() {
    console.error("Removing object "+ uuid +" from "+ url +" failed!");
  });

}

// Removes token from local Storage, and from memory.
NodeJS.prototype.logOut = function ()  {
  localStorage.removeItem('token');
  this.token = undefined;
}


// Try to load token from local storage and eval if its not expired. If everything is alright save token.
NodeJS.prototype.loadToken = function ()  {

  const rawToken = localStorage.getItem('token');

  if ( !rawToken ) { console.log("None token stored. Please login to get new token."); return false; }

  var token = this.parseToken( rawToken );

  if ( !token ) { console.log("Token is corrupted. Please login to get new token."); return false; }

  var now = new Date();
  var exp = new Date( token.body.exp * 1000 );

  if ( exp < now ) { console.log("Your token expired. Please login to get new token."); overlay.setHeader("Your token expired please login again."); return false; }

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

  // Protection from loggin as different user during one session
  if( this.token.body.username != parsedToken.body.username && this.token.body.username) {
      this.logOut();
      overlay.setHeader("Reaload page to log as different user during one session");
      console.error("Reaload page to log as different user during one session");
      return false;
  }

  this.token.body = parsedToken.body;
  this.token.tail = parsedToken.tail;

  return true;
}

NodeJS.prototype.isTokenValid = function ()  {

  if ( this.token.raw == "" ) { console.log("Token not initialized."); return false; }

  var now = new Date();
  var exp = new Date( this.token.body.exp * 1000 );

  if ( exp < now ) { console.log("Your token expired. Please login to get new token."); return false; }

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

NodeJS.prototype.md5 = function( input ) {
    /*
   * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
   * Digest Algorithm, as defined in RFC 1321.
   * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
   * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
   * Distributed under the BSD License
   * See http://pajhome.org.uk/crypt/md5 for more info.
   */

  /*
   * Configurable variables. You may need to tweak these to be compatible with
   * the server-side, but the defaults work in most cases.
   */
  var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
  var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

  /*
   * These are the functions you'll usually want to call
   * They take string arguments and return either hex or base-64 encoded strings
   */
  function hex_md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
  function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
  function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
  function hex_hmac_md5(k, d)
    { return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
  function b64_hmac_md5(k, d)
    { return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
  function any_hmac_md5(k, d, e)
    { return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

  /*
   * Perform a simple self-test to see if the VM is working
   */
  function md5_vm_test()
  {
    return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
  }

  /*
   * Calculate the MD5 of a raw string
   */
  function rstr_md5(s)
  {
    return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
  }

  /*
   * Calculate the HMAC-MD5, of a key and some data (raw strings)
   */
  function rstr_hmac_md5(key, data)
  {
    var bkey = rstr2binl(key);
    if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

    var ipad = Array(16), opad = Array(16);
    for(var i = 0; i < 16; i++)
    {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
    return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
  }

  /*
   * Convert a raw string to a hex string
   */
  function rstr2hex(input)
  {
    try { hexcase } catch(e) { hexcase=0; }
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var output = "";
    var x;
    for(var i = 0; i < input.length; i++)
    {
      x = input.charCodeAt(i);
      output += hex_tab.charAt((x >>> 4) & 0x0F)
             +  hex_tab.charAt( x        & 0x0F);
    }
    return output;
  }

  /*
   * Convert a raw string to a base-64 string
   */
  function rstr2b64(input)
  {
    try { b64pad } catch(e) { b64pad=''; }
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var output = "";
    var len = input.length;
    for(var i = 0; i < len; i += 3)
    {
      var triplet = (input.charCodeAt(i) << 16)
                  | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                  | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
      for(var j = 0; j < 4; j++)
      {
        if(i * 8 + j * 6 > input.length * 8) output += b64pad;
        else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
      }
    }
    return output;
  }

  /*
   * Convert a raw string to an arbitrary string encoding
   */
  function rstr2any(input, encoding)
  {
    var divisor = encoding.length;
    var i, j, q, x, quotient;

    /* Convert to an array of 16-bit big-endian values, forming the dividend */
    var dividend = Array(Math.ceil(input.length / 2));
    for(i = 0; i < dividend.length; i++)
    {
      dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
    }

    /*
     * Repeatedly perform a long division. The binary array forms the dividend,
     * the length of the encoding is the divisor. Once computed, the quotient
     * forms the dividend for the next step. All remainders are stored for later
     * use.
     */
    var full_length = Math.ceil(input.length * 8 /
                                      (Math.log(encoding.length) / Math.log(2)));
    var remainders = Array(full_length);
    for(j = 0; j < full_length; j++)
    {
      quotient = Array();
      x = 0;
      for(i = 0; i < dividend.length; i++)
      {
        x = (x << 16) + dividend[i];
        q = Math.floor(x / divisor);
        x -= q * divisor;
        if(quotient.length > 0 || q > 0)
          quotient[quotient.length] = q;
      }
      remainders[j] = x;
      dividend = quotient;
    }

    /* Convert the remainders to the output string */
    var output = "";
    for(i = remainders.length - 1; i >= 0; i--)
      output += encoding.charAt(remainders[i]);

    return output;
  }

  /*
   * Encode a string as utf-8.
   * For efficiency, this assumes the input is valid utf-16.
   */
  function str2rstr_utf8(input)
  {
    var output = "";
    var i = -1;
    var x, y;

    while(++i < input.length)
    {
      /* Decode utf-16 surrogate pairs */
      x = input.charCodeAt(i);
      y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
      {
        x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
        i++;
      }

      /* Encode output as utf-8 */
      if(x <= 0x7F)
        output += String.fromCharCode(x);
      else if(x <= 0x7FF)
        output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                      0x80 | ( x         & 0x3F));
      else if(x <= 0xFFFF)
        output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                      0x80 | ((x >>> 6 ) & 0x3F),
                                      0x80 | ( x         & 0x3F));
      else if(x <= 0x1FFFFF)
        output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                      0x80 | ((x >>> 12) & 0x3F),
                                      0x80 | ((x >>> 6 ) & 0x3F),
                                      0x80 | ( x         & 0x3F));
    }
    return output;
  }

  /*
   * Encode a string as utf-16
   */
  function str2rstr_utf16le(input)
  {
    var output = "";
    for(var i = 0; i < input.length; i++)
      output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                    (input.charCodeAt(i) >>> 8) & 0xFF);
    return output;
  }

  function str2rstr_utf16be(input)
  {
    var output = "";
    for(var i = 0; i < input.length; i++)
      output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                     input.charCodeAt(i)        & 0xFF);
    return output;
  }

  /*
   * Convert a raw string to an array of little-endian words
   * Characters >255 have their high-byte silently ignored.
   */
  function rstr2binl(input)
  {
    var output = Array(input.length >> 2);
    for(var i = 0; i < output.length; i++)
      output[i] = 0;
    for(var i = 0; i < input.length * 8; i += 8)
      output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
    return output;
  }

  /*
   * Convert an array of little-endian words to a string
   */
  function binl2rstr(input)
  {
    var output = "";
    for(var i = 0; i < input.length * 32; i += 8)
      output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
    return output;
  }

  /*
   * Calculate the MD5 of an array of little-endian words, and a bit length.
   */
  function binl_md5(x, len)
  {
    /* append padding */
    x[len >> 5] |= 0x80 << ((len) % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    var a =  1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d =  271733878;

    for(var i = 0; i < x.length; i += 16)
    {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;

      a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
      d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
      c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
      b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
      a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
      d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
      c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
      b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
      a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
      d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
      c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
      b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
      a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
      d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
      c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
      b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

      a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
      d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
      c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
      b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
      a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
      d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
      c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
      b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
      a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
      d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
      c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
      b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
      a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
      d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
      c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
      b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

      a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
      d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
      c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
      b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
      a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
      d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
      c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
      b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
      a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
      d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
      c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
      b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
      a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
      d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
      c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
      b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

      a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
      d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
      c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
      b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
      a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
      d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
      c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
      b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
      a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
      d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
      c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
      b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
      a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
      d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
      c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
      b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

      a = safe_add(a, olda);
      b = safe_add(b, oldb);
      c = safe_add(c, oldc);
      d = safe_add(d, oldd);
    }
    return Array(a, b, c, d);
  }

  /*
   * These functions implement the four basic operations the algorithm uses.
   */
  function md5_cmn(q, a, b, x, s, t)
  {
    return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
  }
  function md5_ff(a, b, c, d, x, s, t)
  {
    return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function md5_gg(a, b, c, d, x, s, t)
  {
    return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function md5_hh(a, b, c, d, x, s, t)
  {
    return md5_cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5_ii(a, b, c, d, x, s, t)
  {
    return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   */
  function safe_add(x, y)
  {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  /*
   * Bitwise rotate a 32-bit number to the left.
   */
  function bit_rol(num, cnt)
  {
    return (num << cnt) | (num >>> (32 - cnt));
  }

return hex_md5(input);
}
