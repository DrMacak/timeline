// These globals I would like to avoid in future.
var camera, controls,
    scene, renderer,
    cssScene,  cssRenderer;

var raycaster, currentIntersected, donutMesh;
var INTERSECTED;
var mouse = new THREE.Vector2();

var pauseRaycaster = false;
var updatepanels = false;



// DEBUG
var cssObject, plane;
var debug = false;

// This should be globals
// Birth date, its begining of Timeline to now
var birthDateINP = new Date("03 24 2010");

// List of segments. Segments are by default years and part before birth and after present.
// Plus user selected time segments, these are stored in user or backend storage
var Helix;

// List of panels and other non-segment objects.
var panels;

// HTML Overlay for showing galleries and fullscreenmode
var Overlay;

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

  var radius = radiusOffset + this.o.helix.radius || this.o.helix.radius;


  var _zOffset = zOffset || 0;

  var Tpi = Tl*(Math.PI*2) * this.o.helix.rotations;

  var tz = this.o.helix.height * Tl + _zOffset;

  // can create conus instead of helix
  // radius += tz;

  var tx = Math.sin( Tpi ) * radius;
  var ty = Math.cos( Tpi ) * radius;

  return new THREE.Vector3( tx, ty, tz );
}

SegCurve.prototype._tStrech = function ( t ) {

  var sT = t * ( this.o.T2 - this.o.T1 ) + this.o.T1;
  return sT;
}


function Segment ( options ) {

  // this.self = this;

  this.o = options;

  this.curve = new SegCurve( options );

  this.Mesh = undefined;

  this.cap = undefined;

  // Some basic geometry settings
  this._polygons = 1000;
  this._radialPolygons = 30;
  this._closed = false;

  // Call it during init
  // this.create3Dsegment();

}

Segment.prototype = {

  constructor: Segment,

  // Returns options of object for BE saving.
  getOptions : function () {
    return { options : this.o }
  },

  // TBD This should be possible to make smarter???
  getCenterFromSurface: function(mousePoint, radiusOffset, zOffset) {

    var _radiusOffset =  radiusOffset || 0;
    var _zOffset =  zOffset || 0;

    // get some inacurate center point based on simple Z coordinates
    var T = this.o.helix.getTFromZ(mousePoint.z);

    // Get distance of surface point and this calculated inacurate point
    var distanceA = this.getPointsDist(mousePoint, this.curve.getPoint(T, true));
    var distanceB = distanceA;

    // Delta T is the step for finding the minimun distance
    var deltaT = 0.0001;
    var direction = 1;

    // Am I under the center or above? If above we have to go down
    if (distanceA < this.getPointsDist(mousePoint, this.curve.getPoint(T+deltaT, true))) {
      direction = -1;
    }

    // I have to find minimal distance
    do {
      distanceA = distanceB;
      T = T + deltaT*direction;
      distanceB = this.getPointsDist(mousePoint, this.curve.getPoint(T, true))
    }
    while (distanceA > distanceB)

    // I will substract the last step to get the minimal T
    return this.curve.getPoint(T - deltaT*direction, true, _radiusOffset, _zOffset);
  },

  // There is function for this in THREE js so obsolete?
  getPointsDist: function (pA, pB) {
    return (Math.sqrt(Math.pow((pB.x-pA.x),2)+Math.pow((pB.y-pA.y),2)+Math.pow((pB.z-pA.z),2)));
  },

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

    const geometry = new THREE.TubeGeometry(this.curve,
      this._getReducedPolygons( this._polygons ),
      this.o.thickness,
      this._radialPolygons,
      this._closed);

    var tubeMesh =  new THREE.Mesh ( geometry, material);

    tubeMesh.visible = this.o.visible;
    tubeMesh.click = "interactive";

    this.Mesh = tubeMesh;

    this.Mesh.dad = this;

    this.o.uuid = tubeMesh.uuid;

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

  // var self = this;

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
    this.helix = undefined

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

  // Whole HELIX
  this.birthDate = birthDate;
  this.height = 0;
  this.rotation = 1;
  this.startDate = 0;
  this.endDate = 0;

  // When slope is inited its too much because its ms of time so it should be reduced.
  this.radius = 500;
  this.heightReduce = 100000000/2;

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

  getByProp : function ( prop, value) {

    infoLog("Looking for prop: "+prop+ " val: "+ value + "In segments");
    for (var i = 0; i < this.segments.length; i++) {

        if (this.segments[i]["o"][prop] == value) {
          return this.segments[i];
        }

    }

    return undefined;
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
    time.setTime( this.getTimeFromPoint( { z } ) );
    var niceTime =  time.getDate() + "-" + (parseInt(time.getMonth())+1) + "-" +time.getFullYear();

    return niceTime;
  },

  getTFromZ : function ( z ) {

    if (z > this.height) {infoLog("Warning - T from Z: z is too high returning 1. z: " + z); return 1;}
    if (z < 0) {infoLog("Warning - T from Z: z is too low returning 0. z: " + z); return 0;}

    return z / this.height;
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

  // Generating Default list of segments
  genDefaultSegments : function () {

    // After generating time interuptions we can create list of segment objects with parameters
    const interuptions = this.genInterupts("years");

    var segmentsList = [];

    for (var i = 0; i < interuptions.length - 1; i++) {

      var newOpts = new this.SegmentOptions();

      newOpts.T1 = this.getTFromTime( interuptions[i] );
      newOpts.T2 = this.getTFromTime( interuptions[i+1] );
      newOpts.click = "Segment #"+i;
      newOpts.color = Math.random() * 0xffffff;

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

  // remove segment from segmentsG and scene
  removeSegment : function ( segment ){

    const index = this.segments.indexOf(segment);

    if (index > 0) {
      this.segments.splice(index,1);
    }

    this.scene3d.remove(segment.Mesh);
    this.scene3d.remove(segment.cap);

  },

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
  }

    // console.log(this.genInterupts("days"));
  // Init during instancing.
  // this.init();

}

///////////////////////////////////////////////////////////////////
// 3D panel constructor.
//
///////////////////////////////////////////////////////////////////

function Panel ( options ) {

  // var self = this;

  this.o = options;

  this.css3d = undefined;
  this.plane = undefined;
  // this.html = undefined;

  this.line = undefined;
  this.ring = undefined;

  this.mathPlane = new THREE.Plane();

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
    exportOptions.buddy = "";
    exportOptions.centerPosition = { x: this.o.centerPosition.x, y: this.o.centerPosition.y, z:this.o.centerPosition.z };
    exportOptions.panelPosition = { x: this.o.panelPosition.x, y: this.o.panelPosition.y, z:this.o.panelPosition.z };
    exportOptions.rotation = { x: this.o.rotation.x, y: this.o.rotation.y, z:this.o.rotation.z };
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

    this.o.html = this.o.html || this.setTemplateElements();

    // debugLog(this.o.html);

    this._createCssObject();
    this.css3d.uuid = this.plane.uuid;

    nodeScriptReplace(this.o.html);

    this._createLine();
    this._createPositionRing();

    // self.setLineTouchingPoint();

  },

  // Makes 3D plane with 0 opacity as mask for CSS3D
  _createPlane : function ( ) {

    const material = new THREE.MeshBasicMaterial({
                          color: 0x000000,
                          opacity: 0.0,
                          // transparent: true,
                          side: THREE.DoubleSide
                        });

     const geometry = new THREE.RoundedSquare( this.o.width, this.o.height );
     var mesh = new THREE.Mesh( geometry, material );

     mesh.uuid = this.o.uuid || mesh.uuid;

     mesh.position.copy( this.o.panelPosition );
     mesh.rotation.x = this.o.rotation.x;
     mesh.rotation.y = this.o.rotation.y;
     mesh.rotation.z = this.o.rotation.z;

     if ( this.o.template != "mouseoverSegment" ) {
       mesh.click = "inhibit";
     }

     this.plane = mesh;

     this.plane.dad = this;

  },

  // Creates math plane. Planes thats defined by 3 coplanar points is used for moving 3d plane around.
  _setMathPlane : function () {

    var pointC = this.o.buddy.curve.getPoint(
      Helix.getTFromZ(this.o.centerPosition.z),
      true,
      this.o.offsetX + 100,
      this.o.offsetY + 100);

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

    var tempHTML = templatesG[this.o.template];

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
      timeLabel.innerHTML = Helix.getNiceTimeFromZ(this.o.centerPosition.z);
    }

    //  Start New Segment button
    if ( div.getElementsByClassName('startBtn')[0] ) {
      infoLog("startBtn found");
      var startBtn = div.getElementsByClassName('startBtn')[0];
      startBtn.setAttribute("onclick", "startNewSegmentWRP('" + Helix.getTFromZ(this.o.centerPosition.z) + "','" + this.o.uuid + "')");
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
    this._updateLineVertices();
  },

  // Updates ring position and rotation
  _updateRingPositionAndRotation : function () {

    var segment = this.o.buddy;

    // var helixCenter = segment.getPoint(Helix.getTFromZ(this.o.timePosition), true);

    this.ring.position.copy( this.o.centerPosition );

    var helixVector = segment.curve.getPoint(Helix.getTFromZ(this.o.centerPosition.z) + 0.0001, true);

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
    return this.o.buddy.curve.getPoint(
      Helix.getTFromZ(this.o.centerPosition.z),
      true,
      this.o.offsetX,
      this.o.offsetY);
    },

  // Set size of Plane to match the size of html panel. This has to be called after the html is rendered otherwise it sets 0,0
  _updateSize : 0,

  setPlaneSizeToHTML : function () {

    if (!this._updateSize) {
      this._updateSize = 100;
      return;
    }

    this.o.html.style.width = "";
    this.o.html.style.height = "";

    this.setExcentricSize( this.o.html.offsetWidth+1, this.o.html.offsetHeight+1 );
    this._width = this.o.html.offsetWidth+1;
    this._height = this.o.html.offsetHeight+1;

    this._updateSize--;
  },

  // Offsets the panel so its enlarged in direction from center of Helix.
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
      // if ( this.o.rotation.y == Helix.getAngle ( this.o.panelPosition ) ) { pol = -1 };

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
      Helix.getTFromZ(this.o.centerPosition.z),
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
  switchYRotation : function ( ) {

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

  // create 3D panel during init.
  // this.create3dPanel();

// }

resizeToNewCorner : function ( point ) {

  var pol = 1;
  const sizeLimit = 50;

  // We have to get point of old corner, that is center minus half of W and H.
  this._vectorBuffer.vA = point;

  // if vB = 0 its first iteration so we need one more.
  if ( this._vectorBuffer.vB != 0 ) {
    var dOffsets = this.getDeltaOffsets( this._vectorBuffer.vA, this._vectorBuffer.vB );

    // Check if the panel is mirrored or not.
    if ( this.o.rotation.y == Helix.getAngle ( this.o.panelPosition ) ) { pol = -1 };

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

  console.log(newWidth+" newW");

  if ( newRatio > ratio ) {
    return { W : newWidth, H : newWidth / ratio };
  } else {
    return { W : newHeight * ratio , H : newHeight };
  }

  return { W : newWidth , H : newHeight }
}

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
    this.html = undefined
    // this.color = 0xFFFFFF,
    // this.timePosition = 0,
    // this.transparency = 0,
    // this.type = "FreePanel",
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

  unzipOptions : function ( zippedO ) {

    zippedO.centerPosition = new THREE.Vector3 ( zippedO.centerPosition.x, zippedO.centerPosition.y, zippedO.centerPosition.z );
    zippedO.panelPosition = new THREE.Vector3 ( zippedO.panelPosition.x, v.panelPosition.y, zippedO.panelPosition.z );
    zippedO.rotation = new THREE.Vector3 ( zippedO.rotation.x, zippedO.rotation.y, zippedO.rotation.z );
    zippedO.buddy = "";

   return zippedO;
 },

  removeObject : function ( object ) {

    infoLog("Removing object:");
    infoLog(object);

    var index = this.objects.indexOf( object );

    this.scene3d.remove( object.plane );
    this.scene3d.remove( object.line );
    this.scene3d.remove( object.ring );

    this.css3dScene.remove( object.css3d );

    this.objects.splice( index, 1 );

  },

  placePanel : function ( action, onObject, mousePointer, unique ) {

      // Template name is combination of action and object.
      var template = action + onObject.o.type;

      var panel = this.getByProp( "template", template );

      // If panel exists and is meant only once in scene
      if ( panel && unique ) {

        var newZ = onObject.getCenterFromSurface(mousePointer).z;
        var oldZ = panel.o.centerPosition.z;

        // If panel position did not changed significantly, dont do anything.
        if ( Math.floor(newZ) == Math.floor(oldZ) ) {
          // infoLog("Skipping the update");
          return panel;
        }

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

    newOpts.buddy = onObject;

    // Center positio
    const centerPoint = onObject.getCenterFromSurface(mousePointer);
    newOpts.centerPosition = centerPoint;

    // Rotation
    if ( action.indexOf('leftClick') >= 0 ) {

      newOpts.rotation = new THREE.Vector3( Math.PI/2, Helix.getAngle( centerPoint ), 0);

    } else {

      newOpts.rotation = camera.rotation ;

    }

    newOpts.template = template;

    var newPanel = this.createPanel( newOpts );

    updateRenderes();
    // debugger;
    newPanel.setPlaneSizeToHTML();

    return newPanel;
  },

  createPanel : function ( options ) {

    var newPanel = new this.panelConstructor( options );

    this.scene3d.add(newPanel.plane);

    this.scene3d.add(newPanel.line);
    this.scene3d.add(newPanel.ring);

    this.css3dScene.add(newPanel.css3d);

    this.objects.push(newPanel);

    // updateRenderes()

    return newPanel;
  },



// Removing last panel
removeLastPanel : function ( ) {
  if (this.objects.length > 0) {
    this.removeObject(this.objects[this.objects.length-1]);
  }
},

// detects if media panel should be mirrored in order to face toward camera
faceTowardCamera : function ( ) {

  var cameraAngleY = Helix.getAngle( camera.position );

  for (var i = 0; i <  this.objects.length; i++) {

    if (this.objects[i].o.template == "leftClickSegment") {

      var panel = this.objects[i];
      var panelRotY = panel.o.rotation.y;
      var panelAngleY = Helix.getAngle( panel.o.panelPosition );

      var diffAngle = ( Math.PI - cameraAngleY );

      var correctedAngle = panelAngleY + diffAngle;

      if ( correctedAngle > Math.PI && correctedAngle < Math.PI*2 || correctedAngle < 0) {
        if ( panelRotY != panelAngleY ) {
          panel.setRotationY( panelAngleY );
        }
      } else {
        if ( Math.floor(panelRotY * 100 ) === Math.floor( panelAngleY * 100 ) ) {
          panel.switchYRotation();
        }
      }

    }

  }
}
}
///////////////////////////////////////////////////////////////////
// Main INIT
//
///////////////////////////////////////////////////////////////////

function init( birthDate ){

  const viewDistance = 50000;

  placeEventListeners();

  raycaster = new THREE.Raycaster();
  raycaster.near = 1;
  raycaster.far = viewDistance;

// PROTO
  // mouse = new THREE.Vector2();

  // TBD clean this up.
  mouse.dragging = false;
  mouse.resizing = false;

  // Should be remove as it is not needed anymore?
  // mouse.leftCliked = 0;
  // mouse.rightCliked = 0;

  renderer = createGlRenderer();
  cssRenderer = createCssRenderer();

  document.body.appendChild(cssRenderer.domElement);
  // This is important so you can click on embeded html!
  renderer.domElement.style.pointerEvents = "none";

  cssRenderer.domElement.appendChild(renderer.domElement);

  // DEBUG
  cssRenderer.domElement.appendChild( stats.dom );
  // DEBUG

  scene = new THREE.Scene();
  cssScene = new THREE.Scene();

  panels = new Panels(scene, cssScene, Panel);

  Helix = new Helix(scene, Segment, birthDate);

  Helix.genDefaultSegments();

  // set some camera attributes
  var VIEW_ANGLE = 45,
    ASPECT = window.innerWidth / window.innerHeight,
    // should be higher to improve zbuffer resolution.
    NEAR = 100;

  camera = new THREE.PerspectiveCamera(
      VIEW_ANGLE,
      ASPECT,
      NEAR,
      viewDistance);

  camera.position.z = Helix.height/2;
  camera.position.x = 3000;
  camera.position.y = 0;

  // Controls
  controls = new THREE.TrackballControls( camera );
  controls.target.set( 0, 0, Helix.height/2 );
  controls.rotateSpeed = 4;
  controls.zoomSpeed = 0.1;
  controls.panSpeed = 0.4;
  controls.noZoom = false;
  controls.addEventListener( 'change', render );

  overlay = new Overlay("Overlay");
  // overlay.fastHide();

  nodeJS = new NodeJS();

  // camera.rotation.x = Math.PI/2;
  scene.background = new THREE.Color( 0xFFFF00 );
  scene.add(camera);

  // Lights
  light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 10, 20, 30 );
	scene.add( light );

	light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( -10, -20, -30 );
	scene.add( light );

	light = new THREE.AmbientLight( 0xffffff, 1, 5000  );
	scene.add( light );

  var map = new THREE.TextureLoader().load( 'img/UV_Grid_Sm.jpg' );
  				map.wrapS = map.wrapT = THREE.RepeatWrapping;
  				map.anisotropy = 16;


  // Some geometry //
  // var lineMaterial = new THREE.LineDashedMaterial({
  //     dashSize : 10,
  //     gapSize : 5,
  //     color: 0x000000
  // });
  // var lineGeometry = new THREE.Geometry();
  // lineGeometry.vertices.push(new THREE.Vector3(0,0,0));
  // lineGeometry.vertices.push(new THREE.Vector3(500,300,100));
  // var line = new THREE.Line(lineGeometry, lineMaterial);
  //
  // scene.add(line);

  // group = new THREE.Group();
  // scene.add(group);

  // Some box
  // var geometry = new THREE.BoxGeometry( 100, 50, 25 );
  // var material = new THREE.MeshBasicMaterial( { color: 0xffffff} );
  // material.side = THREE.DoubleSide;
  // cube = new THREE.Mesh( geometry, material );

  // Helix


  // THREE.SceneUtils.createMultiMaterialObject( object, [
  // 				new THREE.MeshLambertMaterial({
  // 					color: 0x000000
  // 				}),
  // 				new THREE.MeshBasicMaterial({
  // 					color: 0xFF0000,
  // 					opacity: 0.3,
  // 					wireframe: true,
  // 					transparent: true
  // 			})]);

  // scene.add(cube);


  // Spehere
  geometry = new THREE.SphereGeometry( 1 );
	material = new THREE.MeshBasicMaterial( { color: 0xff0000 });
  sphereInter = new THREE.Mesh( geometry, material );
  sphereInter.visible = false;
  scene.add( sphereInter );

  // Donut
  // geometry = new THREE.TorusGeometry(8, 1, 20, 100);
  // // material.emissive.setRGB(0.8,0.1,0.1);
  // // material.specular.setRGB(0.9,0.9,0.9);
  // donutMesh = new THREE.Mesh( geometry, material );
  // scene.add( donutMesh );

  // Circle
  geometry = new THREE.CircleGeometry( 20, 64);
  material = new THREE.MeshBasicMaterial( { map:map, color: 0xff0000 });
  material.side = THREE.DoubleSide;
  circleTest = new THREE.Mesh( geometry, material );
  // circleTest.visible = false;
  // circleTest.rotation.x =  Math.PI / 2;
  scene.add( circleTest );

  if (debug) {
    createGUI();
  }

  // var planeMesh = addPanelToScene(scene);


  // cube.rotateX(90);
  // axes
  axes = new THREE.AxisHelper( 100 );
  scene.add( axes );

  function placeEventListeners (){

  window.addEventListener( 'resize', onWindowResize, false );
  document.addEventListener( 'mousemove', onMouseMove, false );
  document.addEventListener( 'mousedown', function (e) { mouseDown(e) }, false );

  // function(e) {
  //   if (e.which == 1) {
  //     console.log("leftDOWN");
  //     mouse.leftCliked = true;
  //     leftCliked(e);
  //   } else if (e.which == 3) {
  //     mouse.rightCliked = true;
  //     rightCliked(e);
  //   }
  // }

  document.addEventListener( 'mouseup', function(e) {
    if (e.which == 1) {
      // console.log("leftUP");
      // mouse.leftCliked = false;

      mouse.dragging = false;
      mouse.resizing = false;

      controls.enabled = true;

      if (mouse.activePanel) {
        // mouse.activePanel.flushOffsetBuffer();
        mouse.activePanel._vectorBuffer.clear();
      }
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

}


///////////////////////////////////////////////////////////////////
// Mouse clicks
//
///////////////////////////////////////////////////////////////////


/////////////////////// MOUSE CLICK ////////////////////////////////

function mouseDown ( e ) {
  // console.log(Helix.getAngle(camera.position) + ": camera rotation");

  var action = "";

  if (e.which == 1) {

    action = "leftClick";
    // mouse.leftCliked = true;

  } else if (e.which == 3) {

    action = "rightClick";
    // mouse.rightCliked = true;

  }

  var intersects = raycaster.intersectObjects( scene.children );

    for (var i = 0; i < intersects.length; i++) {

      var intersect = intersects[ i ];

      if ( intersect.object.click == "inhibit" ) {

        checkDragging( action, intersect.object, e );

        break;
      }

      if ( intersect.object.click == "interactive" ) {

        doAction( action, intersect.object, intersect.point );

        break;
      }

  }

}

///////////////////////////////////////////////////////////////////
// DO ACTION
//
///////////////////////////////////////////////////////////////////

function checkDragging ( action, panel, e ) {

  if (action.indexOf('leftClick') >= 0) {

    var x = mouse.clientX, y = mouse.clientY;
    var elementMouseIsOver = document.elementFromPoint(x, y);

    // IF IM ON DRAGABLE ELEMENT
    if ( elementMouseIsOver.className.indexOf("draggable") > -1 ) {

      e.preventDefault();

      controls.enabled = false;
      mouse.dragging = true;
      // console.log("drg");
      mouse.activePanel = panel.dad;
    }

    // IF IM ON resizing ELEMENT
    if ( elementMouseIsOver.className.indexOf("resizer") > -1 ) {

      e.preventDefault();

      controls.enabled = false;
      mouse.resizing = true;
      // console.log("drg");
      mouse.activePanel = panel.dad;
    }

    // // IF IM ON resizing ELEMENT
    // if ( elementMouseIsOver.className.indexOf("panel") > -1 ) {
    //   debugger;
    //   e.stopPropagation();
    //
    // }
  }

}

function doAction (action, onObject, mousePointer) {

  var segment = onObject.dad;

  var centerPoint = segment.getCenterFromSurface(mousePointer);

  // DEBUG
  // console.log(onObject);
  // segment.TALK();

  // RIGHT CLICK
  if (action.indexOf('rightClick') >= 0) {

    var panel = panels.placePanel( action, segment, mousePointer, true );
    panel.setPlaneSizeToHTML();


  // LEFT CLICK
  } else if ( action.indexOf('leftClick') >= 0 ) {

    var centerPoint = segment.getCenterFromSurface(mousePointer);

    // segment.TALK();
    // if we are drawing new segment dont place mediaPanel
    if ( Helix.segmentBuffer.active ) {

      Helix.segmentBuffer.T2 = Helix.getTFromZ(centerPoint.z);

      if ( Helix.getTFromZ(centerPoint.z) < Helix.segmentBuffer.T1) {
        Helix.segmentBuffer.T2 = Helix.segmentBuffer.T1;
        Helix.segmentBuffer.T1 = Helix.getTFromZ(centerPoint.z);
      }

      Helix.segmentBuffer.active = false;

      Helix.pushSegment();
    } else {

      var panel = panels.placePanel( action, segment, mousePointer, false );
      panel.setPlaneSizeToHTML();
    }

  } else {
    console.log("ERROR: Unknow action " + action);
  }

}

///////////////////////////////////////////////////////////////////
// ANIMATE
//
///////////////////////////////////////////////////////////////////

function animate() {

  // debugger;
  for (var i = 0; i < panels.objects.length;i++ ) {

    const panel = panels.objects[i];

    if ( panel._updateSize ) {
      panel.setPlaneSizeToHTML();
    }

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

  var action = "mouseover";

  panels.faceTowardCamera();

  raycaster.setFromCamera( mouse, camera );

  var intersects = raycaster.intersectObjects( scene.children );

  // debugLog(intersects);

    for (var i = 0; i < intersects.length; i++) {

      var intersecObj = intersects[ i ].object;
      var intersecPoint = intersects[ i ].point;

      if ( intersecObj.click == "inhibit" ) {

        panels.getByProp("template", "mouseoverSegment").visible(false);

        var panel = intersecObj.dad;

        break;
      }

      if ( intersecObj.click == "interactive" ) {

        var segment = intersecObj.dad;

        if ( segment.o.type == "Segment" ) {

          // Time Panel
          var timePanel = panels.placePanel( action, segment, intersects[ i ].point, true);

          // Segment preview
          // Helix.segmentBuffer.putT( Helix.getTFromZ( intersects[ 0 ].z) );
          // Helix.segmentBuffer.shadowSegment.updateGeometry();

          break;

        }

      }

    }

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

// when ready, start.
$( document ).ready(function() {

  init( birthDateINP );

  animate();
});
