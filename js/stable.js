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

	// if ( mouse.leftCliked ) {
	// 	event.stopPropagation();
	// }
	mouse.diffX = mouse.clientX - event.clientX;
	mouse.diffY = mouse.clientY - event.clientY;

	mouse.clientX = event.clientX;
	mouse.clientY = event.clientY;
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

///////////////////////////////////////////////////////////////////
// Makes executable JS from imported <script> in templates
// http://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
// author: momomo
///////////////////////////////////////////////////////////////////

function nodeScriptReplace(node) {
        if ( nodeScriptIs(node) === true ) {
                node.parentNode.replaceChild( nodeScriptClone(node) , node );
        }
        else {
                var i        = 0;
                var children = node.childNodes;
                while ( i < children.length ) {
                        nodeScriptReplace( children[i++] );
                }
        }

        return node;
}
function nodeScriptIs(node) {
        return node.tagName === 'SCRIPT';
}
function nodeScriptClone(node){
        var script  = document.createElement("script");
        script.text = node.innerHTML;
        for( var i = node.attributes.length-1; i >= 0; i-- ) {
                script.setAttribute( node.attributes[i].name, node.attributes[i].value );
        }
        return script;
}
