// These globals I would like to avoid in future.
var camera, controls,
    scene, renderer,
    cssScene,  cssRenderer;

var cinemator;

var frames = 0;

var raycaster, currentIntersected, donutMesh;
var INTERSECTED;

var pauseRaycaster = false;
var updatepanels = false;

// DEBUG
// var cssObject, plane;
var debug = false;

// This should be globals
// Birth date, its begining of Timeline to now
var birthDateINP = new Date("03 24 1987");

// List of segments. Segments are by default years and part before birth and after present.
// Plus user selected time segments, these are stored in user or backend storage
var helix;

// List of panels and other non-segment objects.
var panels;

// HTML Overlay for showing galleries and fullscreenmode
var Overlay;


function Mouse () {
  this.x = 0;
  this.y = 0;

  this.diffX = 0;
  this.diffY = 0;

  this.clientX = 0;
  this.clientY = 0;

  this.dragging = false;
  this.resizing = false;
  this.activePanel = undefined;
}

Mouse.prototype = THREE.Vector2.prototype;

var mouse = new Mouse();

// Checking stuff if its neccessary to update DB
var watchDog = {

  hashes : {},

  ignoredTemplates : ["",""],

  firstRun : true,

  init : function () {
    console.log("pini");
    this.scanForChanges();
    this.firstRun = false;
  },

  scanForChanges : function () {

    // In this list I will cumulate all uuids that are in scene.
    var uuidList = [];

    if (helix) {

      var uuids = [];

      // One thing is changes in options and another is added/removed object.
      for ( var i = 0, len = helix.segments.length; i < len; i++) {

        var segmentOptions = helix.segments[i].getOptions();
        var uuid = segmentOptions.uuid;


        uuidList.push(uuid);

        var optionsHash = nodeJS.md5(JSON.stringify(segmentOptions));

        // if uuid is not in hashes then create it.
        if ( !this.hashes[uuid] ) {
          this.hashes[uuid] = optionsHash;

          // If scan is not runned for first time save to DB.
          if ( !this.firstRun ) {
            uuids.push(uuid);
          }
        }

        // Something changed, update the BE.
        if ( this.hashes[uuid] != optionsHash ) {
          this.hashes[uuid] = optionsHash;
          uuids.push(uuid);
        }

      }

      if ( uuids.length > 0 ) {

        helix.saveSegments(uuids);

      }
    }

    if ( panels ) {

      var uuids = [];

      for ( var i = 0, len = panels.objects.length; i < len; i++) {

        var template = panels.objects[i].o.template;

        if ( template == "mouseoverSegment" || template == "rightClickSegment" ) {
          continue;
        }

        var panelOptions = panels.objects[i].getOptions();
        var uuid = panelOptions.uuid;

        uuidList.push(uuid);

        var optionsHash = nodeJS.md5(JSON.stringify(panelOptions));

        // if uuid is not in hashes then create it.
        if ( !this.hashes[uuid] ) {
          this.hashes[uuid] = optionsHash;

          // If scan is not runned for first time save to DB.
          if ( !this.firstRun ) {
            uuids.push(uuid);
          }
        }

        // Something changed, update the BE.
        if ( this.hashes[uuid] != optionsHash ) {
          this.hashes[uuid] = optionsHash;
          uuids.push(uuid);
        }

      }

      if ( uuids.length > 0 ) {
        panels.savePanels( uuids );
      }

    }
    // this.firstRun = false;
  }

};


///////////////////////////////////////////////////////////////////
// Timelix main object.
//
///////////////////////////////////////////////////////////////////

function Timelix () {

  this.viewDistance = 100000;
  this.near = 1;
  this.birthDate = 0;
  // uuid : hash

  this.templateProxy = {
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
    },
  }

  this.obejctTypes = {
    segment : { onMouse : { rightClick: "rightClickSegment",
                            leftClick: "leftClickSegment",
                            mouseOver : "mouseOverSegment" },
                            save : true

                          },
    mouseOverSegment : { onMouse : { rightClick: "inhibit",
                            leftClick: "inhibit",
                            mouseOver : "mouseOverSegment" },
                  unique : true,
                  lookAtCamera : true,
                  save : false
                  // template : "mouseOverSegment"
                },
    mouseOverPanel : { onMouse : { rightClick: "inhibit",
                            leftClick: "inhibit",
                            mouseOver : "inhibit" },
                  unique : true,
                  lookAtCamera : true,
                  save : false
                  // template : "mouseOverSegment"
                },

    leftClickSegment : { onMouse : { rightClick: "inhibit",
                            leftClick: "inhibit",
                            mouseOver : "inhibit" },
                  unique : false,
                  lookAtCamera : false,
                  save : true
                  // template : "leftClickSegment"
                },
    rightClickSegment : { onMouse : { rightClick: "inhibit",
                            leftClick: "inhibit",
                            mouseOver : "inhibit" },
                  unique : false,
                  lookAtCamera : true,
                  save : false
                  // template : "rightClickSegment"
                }

  }

  this.onMouse = {
    Segment : {
      rightClick: "rightClickSegment",
      leftClick: "leftClickSegment",
      mouseOver : "mouseOverSegment"
    },
    Panel : {
      rightClick: "inhibit",
      leftClick: "inhibit",
      mouseOver : "inhibit"
    },
  }



}

Timelix.prototype.init = function ( birthDate ) {

  const self = this;

  this.birthDate = birthDate;

  this.placeEventListeners();

  this.createRaycaster();

  renderer = createGlRenderer();

  cssRenderer = createCssRenderer();

  document.body.appendChild(cssRenderer.domElement);
  // This is important so you can click on embeded html!
  renderer.domElement.style.pointerEvents = "none";

  cssRenderer.domElement.appendChild(renderer.domElement);

  cssRenderer.domElement.appendChild( stats.dom );

  scene = new THREE.Scene();

  cssScene = new THREE.Scene();

  // ASYNC load helix

  overlay = new Overlay("Overlay");

  overlay.loader();

  nodeJS = new NodeJS();

  panels = new Panels(scene, cssScene, Panel);

  // helix = new Helix(scene, Segment, birthDate);


  if ( nodeJS.isTokenValid() ) {

    helix = new Helix(scene, Segment, new Date( nodeJS.token.body.birthDate ));

    nodeJS.loadData("segment", function ( data ) {

      // Generate segments default as fallback in case of some issues.
      if ( data.success ) {
        helix.createSegmentsFromData( data );
      } else {
        console.error("No segments found for this user. Something is wrong");
        helix.genDefaultSegments();
      }

      // Nested call for loading Panels
      nodeJS.loadData("panel", function ( data ) {
        if ( data.success ) {

          panels.createPanelsFromData( data );

          overlay.hide();

          watchDog.init();

        } else {

          overlay.hide();

          watchDog.init();

          console.log("No panels found for this user.");
        }
      });

    });

  } else {

    // Token is not Valid userloging is needed. Show him login screen.
    overlay.login();
    overlay.show();

    // Push callback to queue to be executed after successful login.
    nodeJS.queuedCallback.push( function () {

      helix = new Helix(scene, Segment, new Date( nodeJS.token.body.birthDate ));

      nodeJS.loadData("segment", function (data) {

        if ( data.success ) {

          helix.createSegmentsFromData( data );

          // Nested call for loading Panels
          nodeJS.loadData("panel", function ( data ) {
            if ( data.success ) {

              panels.createPanelsFromData( data );

              watchDog.init();

            } else {
              console.log("No panels found for this user.");
            }
          });


        } else {

          helix.genDefaultSegments();

          // If logged for first time save segments to BE.
          if ( nodeJS.firstLogin ) {
            helix.saveSegments();
          }

          watchDog.init();
        }

      });

    });

  }

  // helix.genDefaultSegments();
  // this.loadUserData();

  this.placeLights();

  this.setBackground();

  this.placeGeometry();

  // SomeHow camera has to be below helix otherwise it doesnt show segments.
  this.placeCamera();

  this.setControls();

  // cinemator = new Cinemator( sphereInter, sphereInter2.position );
  cinemator = new Cinemator( camera, controls.target );

  if (debug) {
    createGUI();
    // DEBUG
    // DEBUG
  }

}

Timelix.prototype.setBackground =  function () {

  scene.background = new THREE.Color( 0xFFFF00 );

  // var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
  // hemiLight.color.setHSL( 0.6, 1, 0.6 );
  // hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
  // hemiLight.position.set( 0, 500, 0 );
  // scene.add( hemiLight );
  //
  // // SKYDOME
  //
  // var vertexShader = document.getElementById( 'vertexShader' ).textContent;
  // var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
  // var uniforms = {
  //   topColor:    { value: new THREE.Color( 0x0077ff ) },
  //   bottomColor: { value: new THREE.Color( 0xffffff ) },
  //   offset:      { value: 33 },
  //   exponent:    { value: 0.6 }
  // };
  // uniforms.topColor.value.copy( hemiLight.color );
  //
  // // scene.fog.color.copy( uniforms.bottomColor.value );
  //
  // var skyGeo = new THREE.SphereGeometry( 4000, 32, 15 );
  // var skyMat = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
  //
  // var sky = new THREE.Mesh( skyGeo, skyMat );
  // scene.add( sky );

},

Timelix.prototype.createRaycaster = function () {
  raycaster = new THREE.Raycaster();
  raycaster.near = this.near;
  raycaster.far = this.viewDistance;
}

Timelix.prototype.placeCamera = function () {
  // set some camera attributes
  const VIEW_ANGLE = 45;
  const  ASPECT = window.innerWidth / window.innerHeight;

  // should be higher to improve zbuffer resolution.
  const NEAR = 100;

  camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, this.viewDistance);

  // camera.position.z = helix.height/2;
  camera.position.z = 10000;
  camera.position.x = 0;
  camera.position.y = 0;

  scene.add(camera);
}

Timelix.prototype.placeLights = function () {
  // Lights
  var light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 10, 20, 30 );
	scene.add( light );

	light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( -10, -20, -30 );
	scene.add( light );

	light = new THREE.AmbientLight( 0xffffff, 1, 5000  );
	scene.add( light );
}

Timelix.prototype.placeGeometry = function () {

  var map = new THREE.TextureLoader().load( 'img/UV_Grid_Sm.jpg' );
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 16;

  // Spehere
  geometry = new THREE.SphereGeometry( 10 );
	material = new THREE.MeshBasicMaterial( { color: 0xff0000 });
  sphereInter = new THREE.Mesh( geometry, material );
  sphereInter.visible = true;
  scene.add( sphereInter );

  geometry = new THREE.SphereGeometry( 10 );
  material = new THREE.MeshBasicMaterial( { color: 0x00F });
  sphereInter2 = new THREE.Mesh( geometry, material );
  sphereInter.visible = true;
  scene.add( sphereInter2 );

  // Circle
  geometry = new THREE.CircleGeometry( 20, 64);
  material = new THREE.MeshBasicMaterial( { map:map, color: 0xff0000 });
  material.side = THREE.DoubleSide;
  circleTest = new THREE.Mesh( geometry, material );
  // circleTest.visible = false;
  // circleTest.rotation.x =  Math.PI / 2;
  scene.add( circleTest );

  // var planeMesh = addPanelToScene(scene);

  // cube.rotateX(90);
  // axes
  axes = new THREE.AxisHelper( 100 );
  scene.add( axes );

}

Timelix.prototype.setControls = function () {

  controls = new THREE.TrackballControls( camera );
  controls.target.set( 0, 0, 500);
  controls.rotateSpeed = 4;
  controls.zoomSpeed = 0.1;
  controls.panSpeed = 0.4;
  controls.noZoom = false;
  // controls.noRotate = true;
  controls.addEventListener( 'change', render );

}


Timelix.prototype.placeEventListeners = function () {

    window.addEventListener( 'resize', onWindowResize, false );

    // document.addEventListener( 'click', mouseClick, false );

    document.addEventListener( 'mousedown', mouseDown, false );

    document.addEventListener( 'mousemove', onMouseMove, false );

    document.addEventListener( 'mouseup', function(e) {

      // Left button UP
      if (e.which == 1) {
        mouse.dragging = false;
        mouse.resizing = false;

        controls.enabled = true;

        if ( mouse.activePanel ) {
          // mouse.activePanel.flushOffsetBuffer();
          mouse.activePanel._vectorBuffer.clear();
          mouse.activePanel.updatePrivateDimensions();
        }
      // Right button UP
      } else if (e.which == 3) {

        // mouse.rightCliked = false;

      }
    }, false );

    document.addEventListener( 'keydown', function (e) {
      var key = e.which || e.keyCode;
      if (key === 27) {
        if (overlay.visible) {
          overlay.purgeHide();
          return;
        }
        panels.removeLastPanel();
      }

      // if (key === 106) {
      //   panels.removeLastPanel();
      //
      // }
    }, false );


}

Timelix.prototype.loadUserData = function ( ) {

  // Load segments if specified.

  var uuids = [];

  if (!data.success) {
    console.log("No data for this user.");
    return;
  }

  var objects = data.message;

  for (var i=0, len = panels.objects.length; i < len; i++ ) {
    uuids.push(panels.objects[i]["o"]["uuid"]);
  }

  for (var i=0, len = objects.length; i < len; i++ ) {

    // Check if loaded panel is not already in scene
    if ( uuids.indexOf(objects[i]["uuid"]) < 0 ) {

      var unzipedOptions = panels.unzipOptions(JSON.parse(objects[i]["options"]));
      panels.createPanel( unzipedOptions );

    }

  }
}

Timelix.prototype.checkChanges = function () {
  this.checker

}


///////////////////////////////////////////////////////////////////
// 3D segment constructor.
//
///////////////////////////////////////////////////////////////////

// SEGMENT CURVE Is extending THREE JS Curve
function SegCurve ( options ) {
  this.o = options;
}

// Give all your methods
SegCurve.prototype = THREE.Curve.prototype;

SegCurve.prototype.constructor = SegCurve;

// Plus two mine
SegCurve.prototype.getPoint = function (t, pure, radiusOffset, zOffset) {
  // debugger;

  var Tl = this._tStrech( t );

  if ( pure ) { Tl = t }

  var radius = radiusOffset + helix.radius || helix.radius;


  var _zOffset = zOffset || 0;

  var Tpi = Tl*(Math.PI*2) * helix.rotations;

  var tz = helix.height * Tl + _zOffset;

  // can create conus instead of helix
  radius += tz/30;

  var tx = Math.sin( Tpi ) * radius;
  var ty = Math.cos( Tpi ) * radius;

  return new THREE.Vector3( tx, ty, tz );
}

// SegCurve.prototype.getOffsets = function ( point ) {
//   // debugger;
//
//   // var Tl = this._tStrech( t );
//
//   // if ( pure ) { Tl = t }
//
//   var radius = helix.radius;
//
//   // var radiusOffset =
//
//   var _zOffset =  0;
//
//   // var tz = helix.height * Tl + _zOffset;
//   var tz = ( point.z - _zOffset ) / helix.height ;
//
//
//   // var tz = helix.height * Tl + _zOffset;
//
//   // can create conus instead of helix
//   // radius += tz/30;
//   var Tpi = tz*(Math.PI*2) * helix.rotations;
//
//   var tx = Math.sin( Tpi ) * radius;
//   var ty = Math.cos( Tpi ) * radius;
//
//   // var tx = Math.asin( point.x / radius ) / ( Math.PI*2 ) * helix.rotations;
//   // var ty = Math.acos( point.y / radius ) / ( Math.PI*2 ) * helix.rotations;
//
//   // var Tpi = Tl*(Math.PI*2) * helix.rotations;
//   // var Tpi = Tl*(Math.PI*2) * helix.rotations;
//
//
//   // can create conus instead of helix
//   // radius += tz/30;
//
//   // var tx = Math.sin( Tl*(Math.PI*2) * helix.rotations ) * radius;
//
//
//   // var ty = Math.cos( Tl*(Math.PI*2) * helix.rotations ) * radius;
//
//   return {tx, ty, tz};
// }

SegCurve.prototype._tStrech = function ( t ) {

  var sT = t * ( this.o.T2 - this.o.T1 ) + this.o.T1;
  return sT;
}


function Segment ( options ) {

  this.type = "Segment";

  this.o = options;

  this.curve = new SegCurve( options );

  this.Mesh = undefined;

  this.cap = undefined;

  // Some basic geometry settings
  this._polygons = 100;
  this._radialPolygons = 30;
  this._closed = false;

  // Call it during init
  // this.create3Dsegment();

}

Segment.prototype = {

  constructor: Segment,

  // Returns options of object for BE saving.
  getOptions : function () {

      var exportOptions = Object.assign({}, this.o);

      exportOptions.helix = "";

      return exportOptions;

  },

  // TBD This should be possible to make smarter???
  getCenterFromSurface: function(mousePoint, radiusOffset, zOffset) {

    var _radiusOffset =  radiusOffset || 0;
    var _zOffset =  zOffset || 0;

    // get some inacurate center point based on simple Z coordinates
    var T = this.o.helix.getTFromZ(mousePoint.z);

    // Get distance of surface point and this calculated inacurate point
    var distanceA = mousePoint.distanceTo( helix.curve.getPoint( T ) );
    // this.getPointsDist(mousePoint, this.curve.getPoint(T, true));
    var distanceB = distanceA;

    // console.log( this.o.thickness +  " + " + distanceA +" + " + Math.acos( this.o.thickness / distanceA ) );
    // console.log( Math.PI/2 - helix._angle + " =? " + Math.acos( this.o.thickness / distanceA ) + " asin = " + Math.asin( this.o.thickness / distanceA ));

    // Delta T is the step for finding the minimun distance
    var deltaT = 0.0001;
    var direction = 1;

    // Am I under the center or above? If above we have to go down
    if (distanceA < mousePoint.distanceTo( this.curve.getPoint(T+deltaT, true) ) ) {
      direction = -1;
    }

    // I have to find minimal distance
    do {
      distanceA = distanceB;
      T = T + deltaT*direction;
      distanceB = mousePoint.distanceTo( this.curve.getPoint(T, true));
    }
    while (distanceA > distanceB)

    // console.log(this.curve.getOffsets(mousePoint));
    // console.log("T "+ T);
    // I will substract the last step to get the minimal T
    return this.curve.getPoint(T - deltaT*direction, true, _radiusOffset, _zOffset);
  },

  // There is function for this in THREE js so obsolete?
  // getPointsDist: function (pA, pB) {
  //   return (Math.sqrt(Math.pow((pB.x-pA.x),2)+Math.pow((pB.y-pA.y),2)+Math.pow((pB.z-pA.z),2)));
  // },

  // Is reducing polygons based on ration of segment to whole helix
  _getReducedPolygons: function( polygons ) {

    const threshHold = 10;

    const reducedPolygons =  Math.floor(((this.o.T2 - this.o.T1) / 1) * polygons );

    if ( reducedPolygons > threshHold ) {
      return reducedPolygons;
    } else {
      return threshHold;
    }

  },

  _putCap: function ( T ) {

    const material = new THREE.MeshBasicMaterial( {
      color: this.o.color,
      opacity: this.o.opacity,
      transparent: true
    } );

    material.side = THREE.DoubleSide;

    const geometry = new THREE.CircleGeometry(this.o.thickness, this._radialPolygons);

    var capMesh =  new THREE.Mesh(geometry, material)
    capMesh.position.copy( this.curve.getPoint( T, true ) );
    capMesh.visible = this.o.visible;

    const helixVector = this.curve.getPoint( T + 0.0001, true );

    capMesh.lookAt( helixVector );

    capMesh.click = "interactive";

    this.cap = capMesh;
    this.cap.dad = this;

  },

  create3Dsegment: function () {

    const material = new THREE.MeshBasicMaterial( {
      color: this.o.color,
      opacity: this.o.opacity,
      transparent: true
    } );

    material.side = THREE.DoubleSide;
    // debugger;
    // this._getReducedPolygons( this._polygons )
    const geometry = new THREE.TubeGeometry(this.curve,
      this._polygons ,
      this.o.thickness,
      this._radialPolygons,
      this._closed);

    var tubeMesh =  new THREE.Mesh ( geometry, material);

    tubeMesh.visible = this.o.visible;

    tubeMesh.click = "interactive";

    // tubeMesh.type = "Segment";

    this.Mesh = tubeMesh;

    this.Mesh.dad = this;

    if ( this.o.uuid ) {

      tubeMesh.uuid = this.o.uuid;

    } else {
      this.o.uuid = tubeMesh.uuid;
    }

    // Place caps on segment
    if ( this.o.topCap ) {
      this._putCap( this.o.T2 );
    }

    if ( this.o.bottomCap ) {
      this._putCap( this.o.T1 );
    }

    // return this.Mesh;
  },

  // Update geometry of segment so new options will be rendered.
  updateGeometry: function () {

    const newGeometry = new THREE.TubeGeometry(new SegCurve( this.o ),
    this._getReducedPolygons( this._polygons ),
    this.o.thickness,
    this._radialPolygons,
    this._closed);

    this.Mesh.geometry = newGeometry;
  },


  visible: function ( visible ) {

    if ( visible ) {

      // infoLog(" Making segment visible.")

      this.o.visible = true;
      this.Mesh.visible = true;

    } else {

      // infoLog(" Making segment NOT visible.")

      this.o.visible = false;
      this.Mesh.visible = false;

    }

  },

  // Who is that???
  TALK: function() {
    console.log("This is segment '"+ this.o.uuid +"' starts at: "+ this.o.T1 +" and ends at: "+ this.o.T2);
  }

}


///////////////////////////////////////////////////////////////////
// MIGHTY HELIX CONSTRUCTOR
//
///////////////////////////////////////////////////////////////////

function Helix (scene, segmentConst, birthDate) {

  this.type = "helix";

  this.SegmentOptions = function segOpts () {
    this.uuid = "",
    this.type = "Segment",
    this.T1 = 0,
    this.T2 = 1,
    this.thickness = 90,
    this.color = 0xFFFFFF,
    this.visible = true,
    this.opacity = 1,
    this.bottomCap = false,
    this.topCap = false,
    this.helix = undefined,
    this.save = true

  }

  this.segmentBuffer = {
    // putT: function ( Tn ){
    //   if ( Tn > this.T1 ) {
    //     this.T2 = Tn;
    //   }
    //   if ( Tn < this.T2 ) {
    //     this.T2
    //     this.T1 = Tn;
    //   }
    // },
    // show: false,
    active: false,
    T1:0,
    T2:1,
    shadowSegment : undefined
  };


  this.scene3d = scene;
  this.segmentConstructor = segmentConst;

  // list of segments
  this.segments = [];

  this.curve = new SegCurve({ T1:0, T2:1 })

  // Whole HELIX
  this.birthDate = birthDate;
  this.height = 0;
  this.rotations = 1;
  this.startDate = 0;
  this.endDate = 0;

  // When slope is inited its too much because its ms of time so it should be reduced.
  this.radius = 800;
  this.heightReduce = 100000000/2;

  this._angle = undefined;

  this.init();

  }

  Helix.prototype = {

    constructor: Helix,

  // Initiliazing function with help of birth date.
  init : function() {
    const now = new Date();
    this.startDate = new Date("01 01 " + this.birthDate.getFullYear());
    this.endDate = new Date("12 31 " + now.getFullYear());
    // height equals time in ms but its reduced not to be too high.
    this.height = (this.endDate - this.startDate) / this.heightReduce;
    this.rotations = now.getFullYear() - this.birthDate.getFullYear() + 1;

    this._angle = Math.atan( this.height / (2*Math.PI*this.radius) );

    // create shadow segments
    // var shadowSegOpt = new SegmentOptions();
    // shadowSegOpt.T1 = this.segmentBuffer.T1;
    // shadowSegOpt.T2 = this.segmentBuffer.T2;
    // shadowSegOpt.opacity = 0.5;
    // shadowSegOpt.color = 0xFFFF00;
    // shadowSegOpt.thickness += 10;
    // shadowSegOpt.visible = false;
    //
    // this.segmentBuffer.shadowSegment = self.addSegmentToScene(shadowSegOpt);

  },

  getOptions : function ( ) {
    return { radius : this.radius, heightReduce : this.heightReduce }
  },

  unzipOptions : function ( zippedO ) {

    zippedO.helix = this;

   return zippedO;
  },

  getByProp : function ( prop, value) {

    infoLog("Looking for prop: "+prop+ " val: "+ value + "In segments");
    for (var i = 0; i < this.segments.length; i++) {

        if (this.segments[i]["o"][prop] == value) {
          return this.segments[i];
        }

    }

    return undefined;
  },

  // Returns segment on which is located coordinate z
  getSegmentOnZ : function ( z ) {

    const Tz = this.getTFromZ( z );

    for ( var i = 0, len = this.segments.length; i < len; i++ ) {

    if ( this.segments[i].o.T1 < Tz && Tz < this.segments[i].o.T2 ) {
      return this.segments[i];
    }
  }
    console.error("Segment was not found for this Z");
    return this.segments[this.segments.length-1];
    // return undefined;
  },

  getTimeFromT : function ( T ) {

    var time = new Date();

    return time.setTime(( this.endDate - this.startDate ) * T);
  },

  getTFromTime : function ( time ) {

    const T = (time - this.startDate)  / (this.endDate - this.startDate);

    return T;
  },

  getTimeFromPoint : function ( point ) {

    return (this.getTFromZ(point.z) * this.height * this.heightReduce + this.startDate.getTime());

  },

  getNiceTimeFromZ : function ( z ) {

    var time = new Date();
    time.setTime( this.getTimeFromPoint( { z : z } ) );
    var niceTime =  time.getDate() + "." + (parseInt(time.getMonth())+1) + "." +time.getFullYear();

    return niceTime;
  },

  getTFromZ : function ( z ) {

    if (z > this.height) {infoLog("Warning - T from Z: z is too high returning 1. z: " + z); return 1;}
    if (z < 0) {infoLog("Warning - T from Z: z is too low returning 0. z: " + z); return 0;}

    return z / this.height;
  },

  // Return angle 0 - 360 from position on helix.
  getAngle : function( point ) {

    var polarity = 1;
    var offset = 0;

    if (point.y < 0) {
      polarity = -1;
      offset = Math.PI;
    }

    // var X = this.getPoint(this.o.helix.getTFromZ(point.z), true).x / this.o.helix.radius;

    // var angle = Math.acos(X*polarity) + offset;

    const angle = offset + polarity * ( Math.atan2( point.y, point.x ) * polarity - offset );

    return angle;
  },

  // Put one segment to scene
  addSegmentToScene : function ( options ) {

    options.helix = this;
    // debugger;
    var newSegment = new this.segmentConstructor( options );

    newSegment.create3Dsegment();

    this.scene3d.add( newSegment.Mesh );

    if ( newSegment.cap ) {
      this.scene3d.add( newSegment.cap );
    }

    return newSegment;
  },

  // creates interupion times that can be used for segent generation.
  genInterupts : function ( period, start, end ) {

    var stops = [];

    // If wanted interuptions can be generated for provided time window
    const _start = start || this.birthDate;
    const _end =  end || new Date();

    // 0 for week start on sunday
    const startMonday = 1;

    stops.push(_start);

    // this works for weeks and days, it gets to the begining of week
    var stop = new Date ( _start.getFullYear(),
                          _start.getMonth(),
                          _start.getDate() - _start.getDay() + startMonday );

    if ( period == "years" || period == "months" ) {
      stop = new Date ( _start.getFullYear(), 0 );
    }

    while ( stop < _end ) {

      if ( period == "years" ) {
          stop.setFullYear( stop.getFullYear() + 1 );
      } else if ( period == "months" ) {
          stop.setMonth( stop.getMonth() + 1 );
      } else if ( period == "weeks" ) {
          stop.setHours( stop.getHours() + 24 * 7 );
      } else if ( period == "days" ) {
          stop.setHours( stop.getHours() + 24 );
      }

      // I want stuff between start and now only.
      if ( stop > _start && stop < _end ) {
        stops.push( new Date( stop ) );
      }
    }

    // adds date of now.
    stops.push(_end);

    return stops;
  },



  getColorInterval : function ( colorHex1, colorHex2, steps ) {

    var colorInterval = [];

    var R1 = Number.parseInt(colorHex1.substr(2,2), 16);
    var G1 = Number.parseInt(colorHex1.substr(4,2), 16);
    var B1 = Number.parseInt(colorHex1.substr(6,2), 16);

    var R2 = Number.parseInt(colorHex2.substr(2,2), 16);
    var G2 = Number.parseInt(colorHex2.substr(4,2), 16);
    var B2 = Number.parseInt(colorHex2.substr(6,2), 16);

    var Rd = R2 - R1;
    var Gd = G2 - G1;
    var Bd = B2 - B1;

    var Rst = Rd / steps;
    var Gst = Gd / steps;
    var Bst = Bd / steps;

    for (var i = 0; i <= steps; i++ ) {

    	var Ri = Math.round(R1 + Rst * i);
      var padRi = "";
      if (Ri < 16) {
        var padRi = "0";
      }

      var Gi = Math.round(G1 + Gst * i);
      var padGi = "";
      if (Gi < 16) {
        var padGi = "0";
      }

    	var Bi = Math.round(B1 + Bst * i);
      var padBi = "";
      if (Bi < 16) {
        var padBi = "0";
      }

      colorInterval.push(Number.parseInt( padRi + Ri.toString(16) + padGi + Gi.toString(16) + padBi + Bi.toString(16), 16));
    }

      return colorInterval;
  },


  // Generating Default list of segments
  genDefaultSegments : function () {

    // After generating time interuptions we can create list of segment objects with parameters
    const interuptions = this.genInterupts("years");

    var segmentsList = [];

    // 0xddf00f 0x8875dc
    const startColor = "0x" + Math.round(Math.random() * 0xffffff).toString(16);
    const endColor =  "0x" + Math.round(Math.random() * 0xffffff).toString(16);

    console.log(startColor, endColor);

    var colorList = this.getColorInterval("0xddf00f", "0x8875dc", interuptions.length)

    for (var i = 0; i < interuptions.length - 1; i++) {

      var newOpts = new this.SegmentOptions();

      newOpts.T1 = this.getTFromTime( interuptions[i] );
      newOpts.T2 = this.getTFromTime( interuptions[i+1] );
      newOpts.click = "Segment #"+i;
      // newOpts.color = Math.random() * 0xffffff;
      newOpts.color = colorList[i];
      // console.log(colorList[i], colorList[i].toString(16));

      if ( i == 0 ) {
        newOpts.bottomCap = true;
      }

      if ( i == interuptions.length - 2 ) {
        newOpts.topCap = true;
      }

      const newSegment = this.addSegmentToScene( newOpts );
      this.segments.push( newSegment );
    }

  },

  // creates segments from options object in list from DB
  // this.genSegmentsFromOptList =  function (optionsList) {
  // }

  // push segment from segmentBuffer
  pushSegment : function ( ) {

    // number of segment in seglist in which pushed segment starts
    var startSeg = 0;

    for (var i=0; i < this.segments.length; i++){
      if (this.segmentBuffer.T1 > this.segments[i].o.T1) { startSeg = i; }
    }

    // number of segment in seglist in which pushed segment ends
    var endSeg = 0;

    for (var i=0; i < this.segments.length; i++){
      if (this.segmentBuffer.T2 < this.segments[i].o.T2) { endSeg = i; break; }
    }

    // console.log(startSeg, endSeg);
    var startSegment = this.segments[startSeg];
    var endSegment = this.segments[endSeg];

    var pushedSegOpt = new this.SegmentOptions();
    pushedSegOpt.helix = this;
    pushedSegOpt.click = "pushed";
    pushedSegOpt.color = Math.random() * 0xffffff;


    pushedSegOpt.T1 = this.segmentBuffer.T1;
    pushedSegOpt.T2 = this.segmentBuffer.T2;
    var pushedSegment = this.addSegmentToScene( pushedSegOpt );

    // This means new segment is starting in one segment and ending in different
    // Therefore I have to shrink the first one and last one. And delet the one inside the new one.
    if ((endSeg - startSeg) >= 1 ) {
      // console.log(" Pushed segment is coming thru one or more segment");

      startSegment.o.T2 = this.segmentBuffer.T1;
      endSegment.o.T1 = this.segmentBuffer.T2;

      startSegment.updateGeometry();
      endSegment.updateGeometry();

      var removedSegments = this.segments.splice(startSeg + 1, (endSeg - startSeg - 1), pushedSegment);

      console.log(removedSegments);

      for (var i = 0; i < removedSegments.length; i++){
        this.removeSegment(removedSegments[i]);
      }

    } else if (endSeg == startSeg) {
      // console.log(" Pushed segment is in one segment");

      // Copy segment options to crete new indentical one.
      var lastSegOpt = Object.assign({}, startSegment.o);
      lastSegOpt.bottomCap = false;
      lastSegOpt.T1 = this.segmentBuffer.T2;
      var lastSegment = this.addSegmentToScene( lastSegOpt );

      startSegment.o.T2 = this.segmentBuffer.T1;
      startSegment.updateGeometry();

      this.segments.splice(startSeg+1, 0, pushedSegment);
      this.segments.splice(startSeg+2, 0, lastSegment);

    }

  },

  // Take data from BE as input and generates segments.
  createSegmentsFromData : function ( data ) {

    var uuids = [];

    if ( !data.success ) {
      console.log("No data for this user.");
      return;
    }

    var recievedSegments = data.message;

    // Get list of UUIDs
    for (var i=0, len = this.segments.length; i < len; i++ ) {
      uuids.push(this.segments[i]["o"]["uuid"]);
    }

    for (var i=0, len = recievedSegments.length; i < len; i++ ) {

      // Check if loaded segment is not already in scene
      if ( uuids.indexOf(recievedSegments[i]["uuid"]) < 0 ) {

        var unzipedOptions = this.unzipOptions(JSON.parse(recievedSegments[i]["options"]));

        const newSegment = this.addSegmentToScene( unzipedOptions );
        this.segments.push( newSegment );

      }

    }

  },

  // saveSegment : function ( uuid ) {
  //
  //   var data = [];
  //
  //   var options = this.getByProp("uuid", uuid)["getOptions"]();
  //   data.push({ type: "segment", uuid : options.uuid, o : options })
  //
  //   nodeJS.saveData( data );
  // },


  saveSegments : function ( uuids ) {

    var data = [];

    // If uuids provided save only these uuids. If uuids = [] I dont care.
    if ( uuids ) {

      for (var i=0, len = uuids.length; i < len; i++ ) {
        var options = this.getByProp("uuid", uuids[i])["getOptions"]();
        data.push({ type: "segment", uuid : options.uuid, o : options })
      }

    // If parameter is not provided save all segments.
    } else {

      for (var i=0, len = this.segments.length; i < len; i++ ) {

        var options = this.segments[i]["getOptions"]();
        data.push({ type: "segment", uuid : options.uuid, o : options })
      }

    }

    nodeJS.saveData( data );
  },

  // remove segment from segmentsG and scene
  removeSegment : function ( segment ){

    const index = this.segments.indexOf(segment);

    if (index > 0) {
      this.segments.splice(index,1);
    }

    this.scene3d.remove(segment.Mesh);
    this.scene3d.remove(segment.cap);

  }

    // console.log(this.genInterupts("days"));
  // Init during instancing.
  // this.init();

}

///////////////////////////////////////////////////////////////////
// 3D panel constructor.
// Panel is object that is constructed from panelHtml and panel3D
///////////////////////////////////////////////////////////////////

function Panel ( options ) {

  this.type = "Panel";

  this.o = options;

  // css3d Three object to work with Html
  this.css3d = undefined;
  // Three 3D Plane as background to make 3D Html work.
  this.plane = undefined;

  this.line = undefined;
  this.ring = undefined;

  this.mathPlane = new THREE.Plane();

  // native/absolute w and h
  this._width = 0;
  this._height = 0;

  this.create3dPanel();

}

// this.uuid = "",
// this.template = "default",
// this.width = 10,
// this.height = 10,
// this.centerPosition = new THREE.Vector3(0, 0, 0),
// this.offsetX = 200,
// this.offsetY = 150,
// this.panelPosition = new THREE.Vector3(0, 0, 0),
// this.rotation = new THREE.Vector3(Math.PI/2, 0, 0),
// this.visible = true,
// this.justRing = false,
// this.buddy = undefined,
// this.html = undefined

Panel.prototype = {

  constructor : Panel,

  getOptions : function () {

    var exportOptions = Object.assign({}, this.o);

    // converts all complex objects to data neccessary for reconstruction.
    exportOptions.buddy = this.o.buddy.uuid;
    exportOptions.centerPosition = { x: this.o.centerPosition.x, y: this.o.centerPosition.y, z:this.o.centerPosition.z };
    exportOptions.panelPosition = { x: this.o.panelPosition.x, y: this.o.panelPosition.y, z:this.o.panelPosition.z };
    exportOptions.rotation = { x: this.o.rotation.x, y: helix.getAngle( this.o.panelPosition ), z:this.o.rotation.z };

    // var panelAngleY = helix.getAngle( panel.o.panelPosition );

    exportOptions.html = this.o.html.innerHTML;

    return exportOptions;
  },

  // Creates 3D panel that means CSS3D based on template name, 3D plane, line and ring on segment.
  create3dPanel : function() {

    infoLog(" Creating html panel with html from template: " + this.o.template);
    // debugLog(self._getPanelPosition());
    this.o.panelPosition = this._getPanelPosition();

    this._createPlane();
    this.o.uuid = this.plane.uuid;

    this._setMathPlane();

    // In case we already has html. Like when loaded from BE.
    this.o.html = this.o.html || this.setTemplateElements();

    // Set native/absolute w and h
    this._width = this.o.width;
    this._height = this.o.height;

    // debugLog(this.o.html);

    this._createCssObject();
    this.css3d.uuid = this.plane.uuid;

    // Makes possible to import JS from templates.
    nodeScriptReplace(this.o.html);

    this._createLine();
    this._createPositionRing();

    this.setLineTouchingPoint();

  },

  // Makes 3D plane with 0 opacity as mask for CSS3D
  _createPlane : function ( ) {

    const material = new THREE.MeshBasicMaterial({
                          color: 0x000000,
                          opacity: 0.0,
                          // transparent: true,
                          side: THREE.DoubleSide
                        });

     const geometry = new THREE.RoundedSquare( this.o.width, this.o.height, 4 );
     var mesh = new THREE.Mesh( geometry, material );

     mesh.uuid = this.o.uuid || mesh.uuid;

     mesh.position.copy( this.o.panelPosition );
     mesh.rotation.x = this.o.rotation.x;
     mesh.rotation.y = this.o.rotation.y;
     mesh.rotation.z = this.o.rotation.z;

     if ( this.o.template != "mouseoverSegment" ) {
       mesh.click = "inhibit";
     }

     mesh.type = "Panel";

     this.plane = mesh;

     this.plane.dad = this;

  },

  // Creates math plane. Planes thats defined by 3 coplanar points is used for moving 3d plane around.
  _setMathPlane : function () {

    var pointC = new THREE.Vector3( this.o.centerPosition.x, this.o.centerPosition.y, this.o.centerPosition.z+10 );
    // this.o.buddy.curve.getPoint(
    //   helix.getTFromZ(this.o.centerPosition.z),
    //   true,
    //   this.o.offsetX + 100,
    //   this.o.offsetY + 100);

    this.mathPlane.setFromCoplanarPoints( this.o.centerPosition, this.o.panelPosition, pointC );

  },

  //  Creates CSS3D object same parameters as 3D plane.
  _createCssObject : function ( ) {

    var cssObject = new THREE.CSS3DObject( this.o.html );

    cssObject.position.copy( this.o.panelPosition );
    cssObject.rotation.x = this.o.rotation.x;
    cssObject.rotation.y = this.o.rotation.y;
    cssObject.rotation.z = this.o.rotation.z;

    this.css3d = cssObject;

    this.css3d.dad = this;

    // return cssObject;

  },

  // Line is connecting position ring on segment and panel.
  _createLine : function ( ) {

    const lineGeometry = new THREE.Geometry();

    const lineMaterial = new THREE.LineDashedMaterial({
      // Line width doesn work under windows
      //  linewidth: 100,
      color: 0x000000
    });

    // TBD should Start on edge of position ring
    lineGeometry.vertices.push( this.o.centerPosition );

    // Should end on edge of panel
    lineGeometry.vertices.push( this.o.panelPosition );

    var line = new THREE.Line( lineGeometry, lineMaterial );

    this.line = line;
  },

  // Ring showing exact time position of panel on segment.
  _createPositionRing : function ( ) {

    var segment = this.o.buddy;

    const ringThickness = 5;
    const radialSegments = 20;
    const tubularSegments = 100;

    var material = new THREE.MeshBasicMaterial( { color: 0x000000 });

    var geometry = new THREE.TorusGeometry(segment.o.thickness,
                              ringThickness,
                              radialSegments,
                              tubularSegments);

    this.ring = new THREE.Mesh( geometry, material );

    this._updateRingPositionAndRotation();
  },

  // Set Template elements if they are found.
  setTemplateElements : function ( ) {

    var tempHTML = templator.templates[this.o.template];

    const info = this.o.buddy.o;

    // if (this.o.buddy ) {
    //   info = this.o.buddy.o;
    // }

    infoLog(" setting Template for options: ");
    infoLog(info);

    // Creating container div
    var div = document.createElement('div');
    div.innerHTML = tempHTML;

    div.className = "panel3D";
    div.setAttribute("id", this.o.uuid);

    // div.style.width = this.o.w;
    // div.style.height = this.o.h;

    //  Closing cross
    // if ( div.getElementsByClassName('glyphicon-remove')[0] ) {
    //   infoLog("glyphicon-remove found");
    //   var closeCross = div.getElementsByClassName('glyphicon-remove')[0];
    //   closeCross.setAttribute("onclick", "deleteObjectWRP(['" + this.o.uuid + "'])");
    // }

    // .glyphicon-fullscreen
    // if (div.getElementsByClassName('glyphicon-fullscreen')[0] ) {
    //   infoLog("glyphicon-fullscreen found");
    //   var positionCross = div.getElementsByClassName('glyphicon-fullscreen')[0];
    //   positionCross.setAttribute("onclick", "chanegePositionWRP('" + this.o.uuid + "')");
    // }

    //  Time label
    if ( div.getElementsByClassName('timeLabel')[0] ) {
      infoLog("timeLabel found");
      var segment = this.o.buddy;
      var timeLabel = div.getElementsByClassName('timeLabel')[0];
      timeLabel.innerHTML = helix.getNiceTimeFromZ(this.o.centerPosition.z);
    }

    //  Start New Segment button
    if ( div.getElementsByClassName('startBtn')[0] ) {
      infoLog("startBtn found");
      var startBtn = div.getElementsByClassName('startBtn')[0];
      startBtn.setAttribute("onclick", "startNewSegmentWRP('" + helix.getTFromZ(this.o.centerPosition.z) + "','" + this.o.uuid + "')");
    }

    //  Delete Button
    if ( div.getElementsByClassName('delBtn')[0] ) {
      infoLog("delBtn found");
      var delBtn = div.getElementsByClassName('delBtn')[0];
      delBtn.innerHTML = "Delete " + info.uuid + " ?";
      delBtn.style.cssText = ("background-color: " +   this._decToColor(info.color));
      delBtn.setAttribute("onclick", "deleteObjectWRP(['" + info.uuid + "','" + this.o.uuid + "'])");
    }

    //  Color Input field
    if ( div.getElementsByClassName('colInp')[0] ) {
      infoLog("colInp found");
      var colInp = div.getElementsByClassName('colInp')[0];
      // colInp.style.cssText = ("background-color: " +   this._decToColor(info.color));
      colInp.setAttribute("placeholder", this._decToColor(info.color));
      delBtn.style.cssText = ("text-color: " +   this._decToColor(info.color));
      colInp.setAttribute("id", info.uuid + "ColInp");
      colInp.setAttribute("onchange", "changeObjectPars('"+ info.uuid + "ColInp" +"')");
    }

    //  File Input field
    // if ( div.getElementsByClassName('filesInp')[0] ) {
    //   console.log("pini");
    //   var fileInps = div.getElementsByClassName('filesInp');
    //   for ( var i = 0; i < fileInps.length; i++ ) {
    //
    //     fileInps[i].setAttribute("targetID", this.o.uuid);
    //
    //   }
    // }

    // Panel body on 3D panel add uid of plane to it so I can fill it with media.
    // if ( div.getElementsByClassName('panel-body')[0] ) {
    //   infoLog("panel-body found");
    //   var colInp = div.getElementsByClassName('panel-body')[0];
    //   // colInp.style.cssText = ("background-color: " +   this._decToColor(info.color));
    //   colInp.setAttribute("id", this.o.uuid);
    // }

    return div;
  },

  // Updates line and ring if options are changed
  updateAccessories : function () {
    this._updateRingPositionAndRotation();
    this.setLineTouchingPoint();
  },

  // Updates ring position and rotation
  _updateRingPositionAndRotation : function () {

    var segment = this.o.buddy;

    // var helixCenter = segment.getPoint(helix.getTFromZ(this.o.timePosition), true);

    this.ring.position.copy( this.o.centerPosition );

    var helixVector = segment.curve.getPoint(helix.getTFromZ(this.o.centerPosition.z) + 0.0001, true);

    this.ring.lookAt( helixVector );
  },

  // updates line start and end
  _updateLineVertices : function ( panelPoint, segmentPoint ) {
    var newPoints = [];

    const _firstPoint = segmentPoint || this.o.centerPosition;
    const _secondPoint = panelPoint || this.o.panelPosition;

    const segment = this.o.buddy;

    newPoints.push( _firstPoint );

    newPoints.push( _secondPoint );

    this.line.geometry.vertices = newPoints;

    this.line.geometry.verticesNeedUpdate = true;
  },

  _decToColor : function ( dec ) {
    return Math.floor(dec).toString(16).replace("0x","#").toUpperCase() ;
  },

  // Return panel position computed from center position and offsets.
  _getPanelPosition : function ( ) {
    // return this.o.buddy.curve.getPoint(
    //   helix.getTFromZ(this.o.centerPosition.z),
    //   true,
    //   this.o.offsetX,
    //   this.o.offsetY);
      return helix.curve.getPoint(
        helix.getTFromZ(this.o.centerPosition.z),
        true,
        this.o.offsetX,
        this.o.offsetY);
    },

  updatePrivateDimensions : function () {

    this._width = this.o.width;
    this._height = this.o.height;

  },

  // Set size of Plane to match the size of html panel. This has to be called after the html is rendered otherwise it sets 0,0
  _updateSize : 0,

  setPlaneSizeToHTML : function () {

    if (!this._updateSize) {
      this._updateSize = 80;
      return;
    }

    this.o.html.style.width = "";
    this.o.html.style.height = "";

    this.setExcentricSize( this.o.html.offsetWidth+1, this.o.html.offsetHeight+1 );
    this._width = this.o.html.offsetWidth+1;
    this._height = this.o.html.offsetHeight+1;

    this._updateSize--;
  },

  // Offsets the panel so its enlarged in direction from center of helix.
  // means less probability to go thru helix when img loaded.
  setExcentricSize : function ( w, h ) {

    if ( this.o.width != w || this.o.height != h ) {

      this.moveOffset( (this.o.width-w) / -2 , (this.o.height-h) / 2 );
      this.setSize( w, h);

    }

  },

  // sets size of 3D plane and also CSS element.
  // Also makes new geometry of rounded square.
  setSize : function ( w, h ) {

    // Do not change if its the same
    if ( this.o.width != w || this.o.height != h ) {

      this.o.html.style.width = w;
      this.o.html.style.height = h;

      // var pol = 1;
      // if ( this.o.rotation.y == helix.getAngle ( this.o.panelPosition ) ) { pol = -1 };

      // this.moveOffset( (this.o.width-w) / -2 , (this.o.height-h) / 2 );

      this.o.width = w;
      this.o.height = h;

      this.plane.geometry = new THREE.RoundedSquare(w, h, 4);

      this.setLineTouchingPoint();

    }
  },

  // adds differential offset
  moveOffset : function ( offsetDiffX, offsetDiffY ) {

    this.o.offsetX += offsetDiffX;
    this.o.offsetY += offsetDiffY;
    this.o.panelPosition = this._getPanelPosition();
    this.plane.position.copy( this.o.panelPosition );
    this.css3d.position.copy( this.o.panelPosition );
    this._updateLineVertices();
    // update position and line
  },

  // Simple buffer for storing two vectors3
  _vectorBuffer : {
    vA : 0,
    vB : 0,
    clear : function () {
      this.vA = 0;
      this.vB = 0;
    },
    shift : function ( next ) {
      this.vB = this.vA;
      this.vA = next;
    }
  },

  // Dragging function thats setting offset of panel so it the position of panel is same in regard to cursor position.
  setOffsetToCursor : function ( point ) {

    this._vectorBuffer.vA = point;

    // if vB = 0 its first iteration so we need one more.
    if ( this._vectorBuffer.vB != 0 ) {
      var dOffsets = this.getDeltaOffsets( this._vectorBuffer.vA, this._vectorBuffer.vB );
      this.moveOffset( dOffsets.dX, dOffsets.dY );

      // Shift vector buffer
      this._vectorBuffer.shift(this._vectorBuffer.vA);

      return;
    }

    // Shift vector buffer
    this._vectorBuffer.shift(this._vectorBuffer.vA);

    return;
  },

  // Gets two points and return X and Y delta offsets.
  getDeltaOffsets : function ( A, B ) {

    const vectorLen = A.distanceTo( B );

    const dYOffset = A.z - B.z;

    var pol = 1;
    if ( Math.abs( A.x ) < Math.abs( B.x ) ) {  pol = -1; }

    const dXOffset = Math.sqrt( Math.pow( vectorLen, 2) - Math.pow( dYOffset, 2) ) * pol;

    return { "dX" : dXOffset, "dY" : dYOffset };

  },

  // This set end point of Line to just touch panel and dont go in center.
  // TBD limit start of line to the surface of segment + rounded corners are not taken into account.
  setLineTouchingPoint : function () {

    const gamma = Math.atan( (this.o.width/2) / (this.o.height/2) );
    const alpha = Math.atan( this.o.offsetX / this.o.offsetY );

    var deltaOffsetY = 0 ;
    var deltaOffsetX = 0 ;

    // detecting corner of panel gamma is angle of the corner.
    if ( gamma > Math.abs(alpha) ) {
      deltaOffsetY = this.o.height / 2;
      deltaOffsetX = Math.abs( Math.tan(alpha) * deltaOffsetY );
    } else {
      deltaOffsetX = this.o.width / 2;
      deltaOffsetY =  Math.abs( Math.tan(Math.PI/2 - alpha) * deltaOffsetX );
    }

    // I want to decreas offset everytime.
    if ( this.o.offsetX > 0 )  { deltaOffsetX *= -1}
    if ( this.o.offsetY > 0 )  { deltaOffsetY *= -1}

    // Getting the edge point from helix functing
    var edgePoint = this.o.buddy.curve.getPoint(
      helix.getTFromZ(this.o.centerPosition.z),
      true,
      this.o.offsetX + deltaOffsetX,
      this.o.offsetY + deltaOffsetY);

    this._updateLineVertices( edgePoint );

    // console.log(this.o.offsetX, deltaOffsetX, this.o.offsetY, deltaOffsetY);
    // console.log(alpha/Math.PI*180,delta/Math.PI*180, gamma/Math.PI*180);

  },

  updateCenterPosition : function ( newPosition ) {

    this.o.centerPosition = newPosition;
    this.o.panelPosition = this._getPanelPosition();
    this.plane.position.copy( this.o.panelPosition );
    this.css3d.position.copy( this.o.panelPosition );
    this.updateAccessories();

  },

  // Rotates panel only in Y
  setRotationY : function ( angle ) {

    this.plane.rotation.y = angle;
    this.css3d.rotation.y = angle;
    this.o.rotation = this.plane.rotation;

  },

  // Detects if panel is correctly mirrored towards camera. And corrects it.
  switchRotationY : function ( ) {

    var pol = 1;

    if ( ( this.o.rotation.y + Math.PI ) >= 2*Math.PI ) {
      pol = -1;
    }

    const newAngle =  this.o.rotation.y + Math.PI * pol;
    this.setRotationY( newAngle );

  },

  setRotation : function ( rotation ) {

    this.o.rotation = rotation;

    this.plane.rotation.x = rotation.x;
    this.plane.rotation.y = rotation.y;
    this.plane.rotation.z = rotation.z;

    this.css3d.rotation.x = rotation.x;
    this.css3d.rotation.y = rotation.y;
    this.css3d.rotation.z = rotation.z;

  },

  updateTemplate : function () {

    this.o.html.innerHTML = this.setTemplateElements().innerHTML;

  },

  // Sets all components of 3D Panel visibility
  visible : function ( visible ) {

    if ( visible ) {

      infoLog(" Making panel visible.")

      this.o.visible = true;
      this.plane.visible = true;
      this.css3d.visible = true;
      this.line.visible = true;
      this.ring.visible = true;

      this.o.html.style.visibility = "visible";

    } else {

      infoLog(" Making panel NOT visible.")

      this.o.visible = false;
      this.plane.visible = false;
      this.css3d.visible = false;
      this.line.visible = false;
      this.ring.visible = false;

      this.o.html.style.visibility = "hidden";

    }
  },

  resizeToNewCorner : function ( point ) {

    var pol = 1;
    const sizeLimit = 50;

    // We have to get point of old corner, that is center minus half of W and H.
    this._vectorBuffer.vA = point;

    // if vB = 0 its first iteration so we need one more.
    if ( this._vectorBuffer.vB != 0 ) {
      var dOffsets = this.getDeltaOffsets( this._vectorBuffer.vA, this._vectorBuffer.vB );

      // Check if the panel is mirrored or not.
      if ( this.o.rotation.y == helix.getAngle ( this.o.panelPosition ) ) { pol = -1 };

      this._width = this._width - dOffsets.dX * pol;
      this._height = this._height - dOffsets.dY;

      if ( this._width > sizeLimit && this._height > sizeLimit ) {

        const ratioDimensions = this.respectRatio( this._width, this._height );

        const rdOffsetdX = ( this.o.width - ratioDimensions.W ) * pol;
        const rdOffsetdY = this.o.height - ratioDimensions.H;

        // Set new size
        this.setSize ( ratioDimensions.W, ratioDimensions.H );


        // Move offset by half of delta.
        this.moveOffset( rdOffsetdX / 2 , rdOffsetdY /2 );

      }

      // Shift vector buffer
      this._vectorBuffer.shift(this._vectorBuffer.vA);

      return;
  }

  // Shift vector buffer
  this._vectorBuffer.shift(this._vectorBuffer.vA);

  return;
  },

respectRatio : function ( newWidth, newHeight ) {

  const ratio = this.o.width  / this.o.height;
  const newRatio = newWidth / newHeight;
  // debugger;

  // console.log(newWidth+" newW");

  if ( newRatio > ratio ) {
    return { W : newWidth, H : newWidth / ratio };
  } else {
    return { W : newHeight * ratio , H : newHeight };
  }

  return { W : newWidth , H : newHeight }
},

// saveToNode : function () {
//   nodeJS.savePanel( this );
// }

}

///////////////////////////////////////////////////////////////////
// LIST OF panels CONSTR
//
///////////////////////////////////////////////////////////////////

function Panels(scene, cssScene, panelConst) {

  // var self = this;

  this.scene3d = scene;
  this.css3dScene = cssScene;

  this.panelConstructor = panelConst;

  this.PanelOptions = function () {
    this.uuid = "",
    this.template = "default",
    this.width = 10,
    this.height = 10,
    this.centerPosition = new THREE.Vector3(0, 0, 0),
    this.offsetX = 200,
    this.offsetY = 150,
    this.panelPosition = new THREE.Vector3(0, 0, 0),
    this.rotation = new THREE.Vector3(Math.PI/2, 0, 0),
    this.visible = true,
    this.justRing = false,
    this.buddy = undefined,
    this.html = undefined,
    this.files = [],
    this.type = "Panel",

    // Extra setting that will be used during panel creating. But may be modified by template specific settings.
    this.unique = false,
    this.save = true,
    this.faceToCamera = false
  }

  this.objects = [];
}

Panels.prototype = {

  constructor : Panels,

  getByProp : function ( prop, value ) {
    infoLog("Looking for prop: "+prop+ " val: "+ value + " in Objects");
    for (var i = 0; i < this.objects.length; i++) {

        if (this.objects[i]["o"][prop] == value) {
          return this.objects[i];
        }

    }

    return undefined;
  },

  // Get Panel by one of its HTML elements
  getPanelByElement : function ( htmlElement ) {
      const panelHtml = this.getHtmlPanelByElement( htmlElement );
      return this.getByProp( "uuid", panelHtml.id );
  },

  // Get PanelHtml by one of its html elements
  getHtmlPanelByElement : function ( htmlElement ) {

    if( htmlElement.className.indexOf("panel3D") > - 1) {
      return htmlElement;
    }

    const parents = $( htmlElement ).parents();

    for (var i = 0; i < parents.length; i++ ) {
      if ( parents[i]["className"] == "panel3D" ) {
         return parents[i];
      }
    }

    console.error("This element does not have panelHtml parent.");
  },

  // Unzipping options from BE. Mean recreates object based on ziped data.
  unzipOptions : function ( zippedO ) {
    // console.log(zippedO);

    zippedO.centerPosition = new THREE.Vector3 ( zippedO.centerPosition.x, zippedO.centerPosition.y, zippedO.centerPosition.z );
    zippedO.panelPosition = new THREE.Vector3 ( zippedO.panelPosition.x, zippedO.panelPosition.y, zippedO.panelPosition.z );
    zippedO.rotation = new THREE.Vector3 ( zippedO.rotation.x, zippedO.rotation.y, zippedO.rotation.z );

    var div = document.createElement('div');
    div.innerHTML = zippedO.html;
    div.className = "panel3D";
    div.setAttribute("id", zippedO.uuid);
    div.style.width = zippedO.width;
    div.style.height = zippedO.height;

    zippedO.html = div;


    // Is possible that buddy (usualy segment) was not loaded yet. Or doesnt exist. So if not found in scene. Let get default on based on panel position.
    zippedO.buddy = scene.getObjectByProperty( "uuid", zippedO.buddy ) || helix.getSegmentOnZ( zippedO.centerPosition.z );

   return zippedO;
  },

  createPanelsFromData : function ( data ) {

      var uuids = [];

      if (!data.success) {
        console.log("No data for this user.");
        return;
      }

      var panelsData = data.message;

      for (var i=0, len = this.objects.length; i < len; i++ ) {
        uuids.push(this.objects[i]["o"]["uuid"]);
      }

      for (var i=0, len = panelsData.length; i < len; i++ ) {

        // Check if loaded panel is not already in scene
        if ( uuids.indexOf(panelsData[i]["uuid"]) < 0 ) {

          var unzipedOptions = this.unzipOptions(JSON.parse(panelsData[i]["options"]));
          templator.customizeOptions( unzipedOptions );
          this.createPanel( unzipedOptions );

        }

      }

  },

  // Removing panel calls BE and then it removes panel locally
  removePanel : function ( panel ) {

   if ( panel.o.uuid ) {

    //  if ( panel.o.html.getElementsByClassName("mediaImg")[0] ) {

         var callback = function ( _panel, _this ) { return function () { _this.removePanelLocally( _panel ); } };

         nodeJS.removeData( panel.o.uuid, callback( panel, this ) );

      //  } else {
       //
      //    console.log("Panel doesnt contain media. No need to call BE");
      //    panels.removePanelLocally( panel );
       //
      //  }

   } else {
     console.error("Invalid panel object. UUID not found.");
   }

  },

  // Removes panel locally after its removed from BE
  removePanelLocally : function ( panel ) {

    infoLog("Removing locally object:");
    infoLog(panel);

    var index = this.objects.indexOf( panel );

    this.scene3d.remove( panel.plane );
    this.scene3d.remove( panel.line );
    this.scene3d.remove( panel.ring );

    this.css3dScene.remove( panel.css3d );

    this.objects.splice( index, 1 );

  },

  placePanel : function ( action, onObject, mousePointer, unique ) {

      // Template name is combination of action and object.
      var template = action + onObject.o.type;

      var panel = this.getByProp( "template", template );

      // If panel exists and is meant only once in scene
      if ( panel && timelix.templateProxy[template]["unique"] ) {

        const newZ = onObject.getCenterFromSurface(mousePointer).z;
        const oldZ = panel.o.centerPosition.z;

        // If panel position did not changed significantly, dont do anything.
        if ( Math.floor(newZ*10) == Math.floor(oldZ*10) ) {
          // infoLog("Skipping the update");
          return panel;
        }

        // MOVE TO panel.update
        // If panel exist and its position changed Update panel data.
        panel.o.buddy = onObject;

        panel.updateCenterPosition( onObject.getCenterFromSurface( mousePointer ) );

        panel.setRotation( camera.rotation );

        panel.updateAccessories();
        panel.updateTemplate();

        // panel.setTemplateElements();
        panel.visible(true);

        // updateRenderes();
        panel.setPlaneSizeToHTML();

        return panel;
      }

    // PANEL NOT FOUND CREATING NEW

    var newOpts = new this.PanelOptions ();

    newOpts.template = template;

    // Accepts new options with filled template and customizes some options based on config object.
    // This is used to provide different behaviour based on template/kind of panel.
    // This can be also solved by applying OOP with panel as basic and extended by kids.
    templator.customizeOptions( newOpts );

    newOpts.buddy = onObject;

    // Center positio
    const centerPoint = onObject.getCenterFromSurface(mousePointer);
    newOpts.centerPosition = centerPoint;

    // Rotation
    if ( action.indexOf('leftClick') >= 0 ) {

      newOpts.rotation = new THREE.Vector3( Math.PI/2, helix.getAngle( centerPoint ), 0);

    } else {

      newOpts.rotation = camera.rotation ;

    }



    var newPanel = this.createPanel( newOpts );

    updateRenderes();
    // debugger;
    newPanel.setPlaneSizeToHTML();

    return newPanel;
  },

  updatePanel : function ( onObject, mousePointer ) {
    // panel.o.buddy = onObject;
    //
    // panel.updateCenterPosition( onObject.getCenterFromSurface( mousePointer ) );
    //
    // panel.setRotation( camera.rotation );
    //
    // panel.updateAccessories();
    // panel.updateTemplate();
    //
    // // panel.setTemplateElements();
    // panel.visible(true);
    //
    // // updateRenderes();
    // panel.setPlaneSizeToHTML();
    //
    // return panel;
  },

  // Recalculate panel position in case helix radius was changed.
  recalculatePositions : function ( ) {

    for (var i=0, len = panels.objects.length; i < len; i++ ) {

      var panel = panels.objects[i];

      var newCenter = helix.curve.getPoint( helix.getTFromZ( panel.o.centerPosition.z ) );

      panel.updateCenterPosition( newCenter );

    }

  },


  createPanel : function ( options ) {

    var newPanel = new this.panelConstructor( options );

    this.scene3d.add( newPanel.plane );

    this.scene3d.add( newPanel.line );
    this.scene3d.add( newPanel.ring );

    this.css3dScene.add( newPanel.css3d );

    this.objects.push( newPanel );

    // updateRenderes()

    return newPanel;
  },

  // savePanel : function ( uuid ) {
  //
  //   var data = [];
  //
  //   var options = panels.getByProp("uuid", uuid)["getOptions"]();
  //
  //   data.push({ type: "panel", uuid : options.uuid, o : options })
  //
  //   nodeJS.saveData( data );
  // },

  savePanels : function ( uuids ) {

    var data = [];

    // If uuids provided save only these uuids. If uuids = [] I dont care.
    if ( uuids ) {

      for (var i=0, len = uuids.length; i < len; i++ ) {
        var options = this.getByProp("uuid", uuids[i])["getOptions"]();
        data.push({ type: "panel", uuid : options.uuid, o : options })
      }

    // If parameter is not provided save all panels.
    } else {

      for (var i=0, len = panels.objects.length; i < len; i++ ) {
        var options = panels.objects[i]["getOptions"]();

        // Dont save time panel.
        if ( options.template != "mouseoverSegment" ) {
          data.push({ type: "panel", uuid : options.uuid, o : options })
        };

      }

    }

    nodeJS.saveData( data );
  },

  // Removing last panel
  removeLastPanel : function ( ) {

    if (this.objects.length > 0) {
      this.removePanel(this.objects[this.objects.length-1]);
    }

  },

  // detects if media panel should be mirrored in order to face toward camera
  faceTowardCamera : function ( ) {

    var cameraAngleY = helix.getAngle( camera.position );

    for (var i = 0; i <  this.objects.length; i++) {

      // Ignore setting panels
      if (this.objects[i].o.template != "leftClickSegment") { continue; };

      var panel = this.objects[i];
      var panelRotY = panel.o.rotation.y;
      var panelAngleY = helix.getAngle( panel.o.panelPosition );

      var diffAngle = ( Math.PI - cameraAngleY );

      var correctedAngle = panelAngleY + diffAngle;

      if ( correctedAngle > Math.PI && correctedAngle < Math.PI*2 || correctedAngle < 0) {

        if ( panelRotY != panelAngleY ) {
          panel.setRotationY( panelAngleY );
        }

      } else {

        if ( Math.floor(panelRotY * 100 ) === Math.floor( panelAngleY * 100 ) ) {
          panel.switchRotationY();
        }

      }


    }
  },

  // Returns list of panels in time order. The lowest one to the most upper on helix.
  getPanelSortedByTime : function () {

    // As first sort panels by that how high they are on helix. To go from the lowest to the most upper.
    var sortedPanels = [];

    // Push one panel as seed.
    sortedPanels.push( this.objects[0] );

    // start from 1 because 0 is already pushed
    for ( var i = 1, len = this.objects.length; i < len; i++ ) {

      const panel = this.objects[i];

      // Go thru sortedPanels
      for (var j = 0, lenS = sortedPanels.length; j < lenS; j++ ) {

        var sortedPanel = sortedPanels[j];

        // If the compared panel is higher then current its sliced on its position
        if ( sortedPanels[j].o.centerPosition.z > panel.o.centerPosition.z ) {
          sortedPanels.splice( j, 0, panel);
          break;
        }

        // If we are on the end of sorted list and none panel was higher then this one is the highest.
        if ( j+1 == lenS ) {
          sortedPanels.push(panel);
        }

      }

    }

    return sortedPanels;
  },



  // Creating panels slideShow. Means creating array of coordinates that are pushed to Cinametor queue to create fly from one panel to another.
  slideShow : function () {

    // As first sort panels by that how high they are on helix. To go from the lowest to the most upper.
    var sortedPanels = this.getPanelSortedByTime();

    // // Push one panel as seed.
    // sortedPanels.push( this.objects[0] );
    //
    // // start from 1 because 0 is already pushed
    // for ( var i = 1, len = this.objects.length; i < len; i++ ) {
    //
    //   const panel = this.objects[i];
    //
    //   // Go thru sortedPanels
    //   for (var j = 0, lenS = sortedPanels.length; j < lenS; j++ ) {
    //
    //     var sortedPanel = sortedPanels[j];
    //
    //     // If the compared panel is higher then current its sliced on its position
    //     if ( sortedPanels[j].o.centerPosition.z > panel.o.centerPosition.z ) {
    //       sortedPanels.splice( j, 0, panel);
    //       break;
    //     }
    //
    //     // If we are on the end of sorted list and none panel was higher then this one is the highest.
    //     if ( j+1 == lenS ) {
    //       sortedPanels.push(panel);
    //     }
    //
    //   }
    //
    // }

    // Division of year
    var threshHoldZ = (helix.height / helix.rotations) / 8;

    var cameraCurve = [];
    var rotationCurve = [];
    var targetCurve = [];

    var delayCurve = [];

    const defPanelOptions = new panels.PanelOptions();

    const offsets = { x: defPanelOptions.offsetX, y: defPanelOptions.offsetY };

    for ( var i = 0, len = sortedPanels.length; i < len; i++ ) {

      const panel = sortedPanels[i];
      const previousePanel = sortedPanels[i-1];

      // Check if the previousePanel is defined
      if ( previousePanel ) {

        // Check if the difference between two panels is more then threshHoldZ
        if ( panel.o.centerPosition.z - previousePanel.o.centerPosition.z > threshHoldZ ) {

          // Get the Z difference between two panels
          const deltaZ = panel.o.centerPosition.z - previousePanel.o.centerPosition.z;

          // get how many times the threshold fits in
          const quotient = Math.floor( deltaZ / threshHoldZ );

          // Create step from the quotient and deltaZ to spread keyPoints equaly on time
          const stepZ = deltaZ / quotient;

          // Insert keyPoints between two panels in order to lead camera and target on helix
          for (var x = 1;  x < quotient; x++) {



            const cameraPostion = helix.curve.getPoint( helix.getTFromZ( previousePanel.o.centerPosition.z + stepZ * x - 50), false, 600 );
            const targetPosition = helix.curve.getPoint( helix.getTFromZ( previousePanel.o.centerPosition.z + stepZ * x ), false, offsets.x, offsets.y );

            cameraCurve.push(cameraPostion);
            rotationCurve.push(new THREE.Vector3( 0, 0, 1 ));
            targetCurve.push(targetPosition);

            delayCurve.push( new THREE.Vector2( cameraPostion.z, 3) );

          }

        }

      }

      var cameraPostion = new THREE.Vector3();

      // Calculate distance from the panel based on panels diagonal to fit into camera's view
      const distance = ( Math.sqrt(panel.o.width*panel.o.width + panel.o.height*panel.o.height) / 2 ) / Math.tan( THREE.Math.degToRad( camera.fov ) / 2 );

      // Use panel normal for getting camera position. Negate it to look at panel from the side of lower time.
      cameraPostion.copy( panel.mathPlane.normal ).negate().multiplyScalar(distance).add( panel.o.panelPosition );

      // .add( panel.o.panelPosition )
      // sphereInter.position.copy( cameraPostion );
      cameraCurve.push( cameraPostion );
      rotationCurve.push( new THREE.Vector3( 0, 0, 1 ) );
      targetCurve.push( panel.o.panelPosition );

      delayCurve.push( new THREE.Vector2( cameraPostion.z, 10) );


      // keyPoints.push( cameraPostion, new THREE.Vector3( 0, 0, 1 ), panel.o.panelPosition, 50 );
    }

    cinemator.createCameraTargetPath( cameraCurve, rotationCurve, targetCurve, delayCurve );

  },


slider : function () {

  var cameraCurve = [];
  var rotationCurve = [];
  var targetCurve = [];

  const numberOfStepsPerRotation = 25;
  const minimalStep = ( helix.height / helix.rotations ) / numberOfStepsPerRotation;


  const steps = helix.height / minimalStep;

  const startPoint = helix.curve.getPoint( helix.segments[0].o.T1, false, 300 );
  const startCamera = helix.curve.getPoint( helix.segments[0].o.T1 - 0.01, false, 300 );

  // cinemator.pushToAnimationQueue( startCamera, new THREE.Vector3( 0, 0, 1 ), startPoint )

  for ( var i = 0; i < steps; i++) {

    const target = helix.curve.getPoint( helix.getTFromZ( startPoint.z + i * minimalStep ), false, 100 );
    const camera = helix.curve.getPoint( helix.getTFromZ( startPoint.z + i * minimalStep - 50), false, 600 );

    targetCurve.push( target );
    cameraCurve.push( camera );
    rotationCurve.push( new THREE.Vector3( 0, 0, 1 ) );
    // cinemator.pushToAnimationQueue( camera, new THREE.Vector3( 0, 0, 1 ), target, 0, 500 / numberOfStepsPerRotation )

  }

  cinemator.createCameraTargetPath( cameraCurve, rotationCurve, targetCurve );

  // const resolution  = 500;
  //
  // const targetPoints = targetCurve.getPoints(resolution);
  // const cameraPoints = cameraCurve.getPoints(resolution);
  //
  // for (var i = 0; i < resolution; i++) {
  //   cinemator.pushToAnimationQueue( cameraPoints[i], new THREE.Vector3( 0, 0, 1 ), targetPoints[i], 0, 5 )
  // }


}

}

///////////////////////////////////////////////////////////////////
// Mouse clicks
//
///////////////////////////////////////////////////////////////////


/////////////////////// MOUSE CLICK ////////////////////////////////

function mouseDown ( e ) {
  // console.log(helix.getAngle(camera.position) + ": camera rotation");

  var action = "";

  if (e.which == 1) {

    action = "leftClick";
    // mouse.leftCliked = true;

  } else if (e.which == 3) {

    action = "rightClick";
    // mouse.rightCliked = true;

  }

  doMouseAction( e, action );

  // var intersects = raycaster.intersectObjects( scene.children );
  //
  //   for (var i = 0; i < intersects.length; i++) {
  //
  //     var intersect = intersects[ i ];
  //
  //     if ( intersect.object.click == "inhibit" ) {
  //
  //       checkDragging( action, intersect.object, e );
  //
  //       break;
  //     }
  //
  //     if ( intersect.object.click == "interactive" ) {
  //
  //       doAction( action, intersect.object, intersect.point );
  //
  //       break;
  //     }
  //
  // }

}


function doMouseAction ( event, mouseAction ) {

  // Draggin/Resizing of panels has the highest priority

  if ( mouseAction == "leftClick" ) {



      if ( event.target.className.indexOf("draggable") > -1 ) {

        event.preventDefault();

        const panel = panels.getPanelByElement( event.target );

        controls.enabled = false;
        mouse.dragging = true;
        // console.log("drg");
        mouse.activePanel = panel;

        return;
      }

      // IF IM ON resizing ELEMENT
      if ( event.target.className.indexOf("resizer") > -1 ) {

        event.preventDefault();

        const panel = panels.getPanelByElement( event.target );

        controls.enabled = false;
        mouse.resizing = true;
        // console.log("drg");
        mouse.activePanel = panel;

        return;
    }

  }

  // Now check 3D objects.
  var intersects = raycaster.intersectObjects( scene.children );

  // If there is not any intersection hide TimePanel and return.
  if ( intersects.length == 0 && panels.getByProp("template", "mouseOverSegment") ) {
    panels.getByProp("template", "mouseOverSegment").visible( false );
    return;
  }

    // Check each object
    for (var i = 0; i < intersects.length; i++) {

      const object = intersects[ i ].object;
      const mousePointer = intersects[ i ].point;

      var type = undefined;
      if ( object.dad != undefined ) {
        type = object.dad.o.type;

      if ( timelix.onMouse[type] != undefined && timelix.onMouse[type][mouseAction] == "inhibit" ) {


        panels.getByProp("template", "mouseOverSegment").visible( false );


        break;
      }

      }


      // If we are in process of creating new segment and leftClicked on segment. Override
      if ( helix.segmentBuffer.active && mouseAction == "leftClick" && type == "segment") {

        const centerPoint = segment.getCenterFromSurface(mousePointer);

        helix.segmentBuffer.T2 = helix.getTFromZ(centerPoint.z);

        if ( helix.getTFromZ(centerPoint.z) < helix.segmentBuffer.T1 ) {
          helix.segmentBuffer.T2 = helix.segmentBuffer.T1;
          helix.segmentBuffer.T1 = helix.getTFromZ( centerPoint.z );
        }

        helix.segmentBuffer.active = false;

        helix.pushSegment();
      }

      // Check if there is template for this action on object
      if ( templator.defaultTemplates.indexOf( mouseAction + type ) >= 0 ) {

        var panel = panels.placePanel( mouseAction, object.dad, mousePointer, timelix.obejctTypes[mouseAction + type].unique );

        panel.setPlaneSizeToHTML();

        break;
      }

  }








}

///////////////////////////////////////////////////////////////////
// DO ACTION
//
///////////////////////////////////////////////////////////////////

// function checkDragging ( action, panel, e ) {
//
//   if (action.indexOf('leftClick') >= 0) {
//
//     // var x = mouse.clientX, y = mouse.clientY;
//     // var elementMouseIsOver = document.elementFromPoint(x, y);
//
//     // IF IM ON DRAGABLE ELEMENT
//     if ( e.target.className.indexOf("draggable") > -1 ) {
//
//       e.preventDefault();
//
//       controls.enabled = false;
//       mouse.dragging = true;
//       // console.log("drg");
//       mouse.activePanel = panel.dad;
//     }
//
//     // IF IM ON resizing ELEMENT
//     if ( e.target.className.indexOf("resizer") > -1 ) {
//
//       e.preventDefault();
//
//       controls.enabled = false;
//       mouse.resizing = true;
//       // console.log("drg");
//       mouse.activePanel = panel.dad;
//     }
//
//     // // IF IM ON resizing ELEMENT
//     // if ( elementMouseIsOver.className.indexOf("panel") > -1 ) {
//     //   debugger;
//     //   e.stopPropagation();
//     //
//     // }
//   }
//
// }

// function doAction (action, onObject, mousePointer) {
//
//   var segment = onObject.dad;
//
//   // var centerPoint = segment.getCenterFromSurface(mousePointer);
//
//   // DEBUG
//   // console.log(onObject);
//   // segment.TALK();
//
//   // RIGHT CLICK
//   if (action.indexOf('rightClick') >= 0) {
//
//     var panel = panels.placePanel( action, segment, mousePointer, true );
//     panel.setPlaneSizeToHTML();
//
//
//   // LEFT CLICK
//   } else if ( action.indexOf('leftClick') >= 0 ) {
//
//     var centerPoint = segment.getCenterFromSurface(mousePointer);
//
//     // if we are drawing new segment dont place mediaPanel
//     if ( helix.segmentBuffer.active ) {
//
//       helix.segmentBuffer.T2 = helix.getTFromZ(centerPoint.z);
//
//       if ( helix.getTFromZ(centerPoint.z) < helix.segmentBuffer.T1) {
//         helix.segmentBuffer.T2 = helix.segmentBuffer.T1;
//         helix.segmentBuffer.T1 = helix.getTFromZ(centerPoint.z);
//       }
//
//       helix.segmentBuffer.active = false;
//
//       helix.pushSegment();
//     } else {
//
//       var panel = panels.placePanel( action, segment, mousePointer, false );
//       panel.setPlaneSizeToHTML();
//     }
//
//   } else {
//     console.log("ERROR: Unknow action " + action);
//   }
//
// }

///////////////////////////////////////////////////////////////////
// ANIMATE
//
///////////////////////////////////////////////////////////////////

function animate() {

  panels.faceTowardCamera();


  // HACK
  for (var i = 0; i < panels.objects.length;i++ ) {

    const panel = panels.objects[i];

    if ( panel._updateSize ) {
      panel.setPlaneSizeToHTML();
    }

  }


  frames++;

  if ( frames > 200 ) {
    watchDog.scanForChanges();
    frames = 0;
  }
  //
  // setTimeout( function() {
  //
  //      requestAnimationFrame( animate );
  //
  //  }, 10000 / 30 );
  //
  // if ( !pauseRaycaster ) {

  controls.update();

  cinemator.animate();

  raycaster.setFromCamera( mouse, camera );

  // }

  render();

  requestAnimationFrame( animate );
}

// function updatepanelsizes () {
//
//   for (var i = 0; i < panels.objects.length;i++ ) {
//     const panel = panels.objects[i];
//     panel.setPlaneSizeToHTML();
//   }
//
// updatepanels = false;
//
// }


///////////////////////////////////////////////////////////////////
// Renderer
//
///////////////////////////////////////////////////////////////////

function render() {

  if ( !pauseRaycaster ) {

  // var action = "mouseover";
  //
  // var intersects = raycaster.intersectObjects( scene.children );
  //
  // // debugLog(intersects);
  // if ( 0 == intersects.length ) {
  //   if ( panels.getByProp("template", "mouseoverSegment") ) {
  //     panels.getByProp("template", "mouseoverSegment").visible( false );
  //   }
  // }
  //
  //   for (var i = 0; i < intersects.length; i++) {
  //
  //     var intersecObj = intersects[ i ].object;
  //     var intersecPoint = intersects[ i ].point;
  //
  //     if ( intersecObj.click == "inhibit" ) {
  //
  //       if ( panels.getByProp("template", "mouseoverSegment") ) {
  //         panels.getByProp("template", "mouseoverSegment").visible( false );
  //       }
  //
  //       var panel = intersecObj.dad;
  //
  //       break;
  //     }
  //
  //     if ( intersecObj.click == "interactive" ) {
  //
  //       var segment = intersecObj.dad;
  //
  //       if ( segment.o.type == "Segment" ) {
  //
  //         // Time Panel
  //         var timePanel = panels.placePanel( action, segment, intersects[ i ].point, true);
  //
  //         // Segment preview
  //         // helix.segmentBuffer.putT( helix.getTFromZ( intersects[ 0 ].z) );
  //         // helix.segmentBuffer.shadowSegment.updateGeometry();
  //
  //         break;
  //
  //       }
  //
  //     }

    // }

  }

  // var timer = Date.now() * 0.0001;
  // tubeMesh.rotation.z = timer * 2.5;

  updateRenderes();

  // DEBUG
  stats.update();
  // DEBUG

}

function updateRenderes () {
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}


$( document ).ready(function() {

    timelix = new Timelix()

    timelix.init( birthDateINP );

    // init( birthDateINP );

    animate();
  });
