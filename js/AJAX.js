////////////////////////////////////////////////////////////////////////////////
///// Getting AJAX data in advance
////////////////////////////////////////////////////////////////////////////////

var templator = {

  templates : {},

  defaultTemplates : ["rightClickSegment", "leftClickSegment", "rightClickPanel", "default", "mouseoverSegment", "overlay", "login", "loader"],

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
