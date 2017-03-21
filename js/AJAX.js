////////////////////////////////////////////////////////////////////////////////
///// Getting AJAX data in advance
////////////////////////////////////////////////////////////////////////////////

var templatesG = {};

const templateFiles = ["rightClickSegment", "leftClickSegment", "rightClickPanel", "default", "mouseoverSegment", "overlay", "login"];
populateHtmlTemplates(templateFiles);

function populateHtmlTemplates (templateFiles) {

  var tempPutter = function(tempName){
    return function(data) {
      // console.log("AJAX Data recieved" + tempName);
      templatesG[tempName] = data;
    };
  }

  for (var i = 0; i < templateFiles.length; i++) {
   var templateFileName = templateFiles[i];
  //  console.log("Geting AJAX data for template " + templateFiles[i]);
   $.get("data/" + templateFileName + ".htm", tempPutter(templateFileName) );
 }
}
