////////////////////////////////////////////////////////////////////////////////
///// Getting AJAX data in advance
////////////////////////////////////////////////////////////////////////////////

var templator = {

  templates : {},

  templateExtraOptions : {
    mouseOverSegment : {
      unique : true,
      lookAtCamera : true,
      save : false
    },
    leftClickSegment : {
      unique : false,
      lookAtCamera : false,
      save : true
    },
    rightClickSegment : {
      unique : false,
      lookAtCamera : true,
      save : false
    }
  },

  defaultTemplates : ["rightClickSegment", "leftClickSegment", "rightClickPanel", "default", "mouseOverSegment", "overlay", "login", "loader"],

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

      if ( this.templates[templateName] ) {

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
  },

customizeOptions : function ( newOptions ) {

  // Do we have some extra options for this template?
  if ( this.templateExtraOptions[newOptions.template] != undefined ) {

    const extraOptions = this.templateExtraOptions[newOptions.template];

    Object.keys( extraOptions ).map( function( key ) {
      newOptions[key] = extraOptions[key];
    });

  }

}
}


templator.init();
