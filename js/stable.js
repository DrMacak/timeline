///////////////////////////////////////////////////////////////////
// Stuff that is considered stable and doesnt need any changes.
//
///////////////////////////////////////////////////////////////////


function onWindowResize() {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
				cssRenderer.setSize( window.innerWidth, window.innerHeight );

}

function onMouseMove( event ) {
	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1; //1.009
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1; //1.015
}


///////////////////////////////////////////////////////////////////
// Creates CSS Renderer
//
///////////////////////////////////////////////////////////////////

function createCssRenderer() {
  var cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.position = 'absolute';
  // renderer.domElement.style.zIndex = 0;
  cssRenderer.domElement.style.top = 0;
  return cssRenderer;
}


///////////////////////////////////////////////////////////////////
// Creates WebGL Renderer
//
///////////////////////////////////////////////////////////////////

function createGlRenderer() {
 var glRenderer = new THREE.WebGLRenderer({alpha:true});
 glRenderer.setSize(window.innerWidth, window.innerHeight);
 glRenderer.domElement.style.position = 'absolute';
 glRenderer.domElement.style.zIndex = 1;
 glRenderer.domElement.style.top = 0;
 // glRenderer.setPixelRatio(window.devicePixelRatio);
 glRenderer.setClearColor(0xECF8FF);
 return glRenderer;
}
