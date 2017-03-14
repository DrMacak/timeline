// console.log("Man".charCodeAt(0).toString(2));

function Encode( input ) {

  var str = input;
  var pad = 0;
  var binStr = "";
  var baseStr = "";
  var Base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

  for (var i = 0; i < str.length; i++) {

    var bin = str.charCodeAt(i).toString(2)

    for (var y = 0; y <= ( 8 - bin.length ); y++) {
      bin = "0" + bin;
    }

    binStr += bin;

  }

  for (var i = 0; i < binStr.length; i += 6) {

    var charCode = binStr.substr(i,6);

    for (var y = 0, len = charCode.length; y < ( 6 - len ); y++) {
      charCode = charCode + "0";
      pad++;
    }

    baseStr += Base64[parseInt(charCode, 2)];

  }

  for (var i = 0; i < pad; i ++) {
    baseStr += "=";
  }

  return baseStr;
}


function Decode( input ) {

  var inptArr = input.split("");
  var binStr = "";
  var baseStr = "";
  var Base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";


  for (var i = 0; i < inptArr.length; i++) {

    if ( inptArr[i] == "=" ) { break; }

    var bin = Base64.indexOf( inptArr[i] ).toString(2)


    for (var y = 0, len = bin.length; y < ( 6 - len ); y++) {
      bin = "0" + bin;
    }

    binStr += bin;
  }

  for (var i = 0, len = binStr.length; i < len; i += 8) {

    var charCode = parseInt( binStr.substr( i, 8 ), 2 );
    baseStr += String.fromCharCode( charCode );
    
  }

 return baseStr;
}
