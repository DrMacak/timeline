// var newZ = onObject.getCenterFromSurface(mousePointer).z;
// var oldZ = panel.o.timePosition;
//
// if ( Math.floor(newZ) == Math.floor(oldZ) ) {
//   return panel;
// }

///////////////////////////////////////////////////////////////////
// Stuff only for DEBUGGIN stage
//
///////////////////////////////////////////////////////////////////

var infoLogging = true;
var debugLoging = true;

var stats;

function infoLog(txt) {
  if (infoLogging) {console.log("INFO:"+txt);}
}

function debugLog(txt) {
  if (debugLoging) {console.log(txt);}
}



// DEBUG Gui for debuggin
function createGUI (circleObj) {
  var gui = new dat.GUI();

				var effectController = {
					width: 150,
					height: 200
					// rotationZ: 0
				};

				var valuesChanger = function() {
          var freePanel = Panels.fetchFreePanel();

          freePanel.setSize(effectController.width, effectController.height);

          //  circleObj.rotateZ = effectController.rotationZ;
          // circleObj.updateMatrix();
          // console.log(circleObj.getWorldRotation());
				};

				valuesChanger();

				gui.add( effectController, "width", 50, 500, 0.1 ).onChange( valuesChanger );
				gui.add( effectController, "height", 50, 500, 0.1 ).onChange( valuesChanger );
				// gui.add( effectController, "rotationZ", -Math.PI*2, Math.PI*2, 0.1 ).onChange( valuesChanger );
				gui.close();
}


  stats = new Stats();
  // container.appendChild( stats.dom );
