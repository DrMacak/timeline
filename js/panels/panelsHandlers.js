function uploadData( input ) {
  console.log("pini");
  if (input.files && input.files.length == 1) {
      var reader = new FileReader();

      reader.onload = function ( e ) {
          var img = document.createElement( 'img' );
          const targetID = input.getAttribute( "targetID" );
          img.setAttribute( "src", e.target.result );
          // console.log(e);

          img.className =  "mediaImg";
          document.getElementById( targetID ).innerHTML = img.outerHTML;

          Panels.getByProp("uuid", targetID).setPlaneSizeToHTML();
          // console.log(Panels.getByProp("uuid", targetID));
          // Panels.getByProp().setSize(clientWidth;
          // var height = img.clientHeight;
      }

      reader.readAsDataURL(input.files[0]);
  } else if ( input.files.length > 1 ) {
    alert("too many pictures, pico");
  }
}
