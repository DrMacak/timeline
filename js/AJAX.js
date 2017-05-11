////////////////////////////////////////////////////////////////////////////////
///// Getting AJAX data in advance
////////////////////////////////////////////////////////////////////////////////

// var templatesG = {};
//
// const templateFiles = ["rightClickSegment", "leftClickSegment", "rightClickPanel", "default", "mouseoverSegment", "overlay", "login"];
// populateHtmlTemplates(templateFiles);
//
// function populateHtmlTemplates (templateFiles) {
//
//   var tempPutter = function(tempName, i){
//     return function(data) {
//       // console.log("AJAX Data recieved" + tempName);
//       templatesG[tempName] = data;
//       if (templateFiles.length == i + 1) {
//         templatesG.finished = true;
//       }
//     };
//   }
//
//   for (var i = 0, len = templateFiles.length; i < len; i++) {
//    var templateFileName = templateFiles[i];
//   //  console.log("Geting AJAX data for template " + templateFiles[i]);
//    $.get("data/" + templateFileName + ".htm", tempPutter(templateFileName, i) );
//
//  }
// }
//
//
// // TBD
// function getTemplate ( tempName, callback ) {
//   $.get("data/" + tempName + ".htm", callback( data ) );
// }

var templator = {

  templates : {},

  defaultTemplates : ["rightClickSegment", "leftClickSegment", "rightClickPanel", "default", "mouseoverSegment", "overlay", "login"],

  init : function () {

      var tempPutter = function( tempName ){
        return function(data) {

          this.templates[tempName] = data;

        };
      }

      for (var i = 0, len = this.defaultTemplates.length; i < len; i++) {

       var templateFileName = this.defaultTemplates[i];
       this.fetchTemplate( templateFileName,  function ( data ) {});

     }

  },

  getTemplate : function ( templateName, callback ) {

      if (this.templates[templateName]) {

        console.log("Template requested, serving cache.", templateName);
        callback(this.templates[templateName]);
        return;

      } else {

        console.log("Template requested, fetching fil.", templateName);
        this.fetchTemplate(templateName, callback);
        return;

      }
  },

  fetchTemplate : function ( templateName, callback ) {

    const wrapper = function (_this, _templateName ) {
                      return function ( data ) {
                        _this.templates[_templateName] = data;
                        callback( data );
                      }
                    };

    $.get("data/" + templateName + ".htm", wrapper( this, templateName ));
  }
}

templator.init();
