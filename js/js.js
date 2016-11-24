// These globals I would like to avoid in future.
var camera, scene, renderer,
  controls,
  cssRenderer, cssScene;

var raycaster, currentIntersected, donutMesh;
var mouse, INTERSECTED;

// DEBUG
var cssObject, plane;
var debug = false;

// This should be globals
// Birth date, its begining of Timeline to now
var birthDateINP = new Date("03 24 2013");

// List of segments. Segments are by default years and part before birth and after present.
// Plus user selected time segments, these are stored in user or backend storage
var Helix;

// List of panels and other non-segment objects.
var Panels;

// list of start and end of segment

///////////////////////////////////////////////////////////////////
// 3D segment constructor.
//
///////////////////////////////////////////////////////////////////

function SegmentCONSTR ( options ) {

  var self = this;

  this.o = options;

  this.Mesh = undefined;

  this.cap = undefined;

  // Some basic geometry settings
  var polygons = 1000;
  var radialPolygons = 14;
  var closed = false;

  // Function to generate helix points t is from 0 to 1. When pure true there is not T stretching.
  this.helixFunction = function (t, pure, radiusOffset, zOffset) {

    var Tl = self._tStrech( t );

    if ( pure ) { Tl = t }

    var radius = radiusOffset + this.o.helix.radius || this.o.helix.radius;
    var zOffLoc = zOffset || 0;

    var Tpi = Tl*(Math.PI*2)*this.o.helix.rotations;

    var tx = Math.cos( Tpi ) * radius,
        ty = Math.sin( Tpi ) * radius,
        tz = this.o.helix.height * Tl + zOffLoc;

    return new THREE.Vector3( tx, ty, tz );
  }

  // This method streatch input t (0 to 1) to fit the segment limits.
  this._tStrech = function (t) {
    var sT = t * (this.o.T2-this.o.T1) + this.o.T1;
    return sT;
  }

  // TBD This should be possible to make smarter???
  this.getCenterFromSurface = function(mousePoint, radiusOffset, zOffset) {

    var offsetR =  radiusOffset || 0;
    var offsetZ =  zOffset || 0;

    // get some inacurate center point based on simple Z coordinates
    var T = this.o.helix.getTFromZ(mousePoint.z);

    // Get distance of surface point and this calculated inacurate point
    var distanceA = self.getPointsDist(mousePoint, self.helixFunction(T, true));
    var distanceB = distanceA;

    // Delta T is the step for finding the minimun distance
    var deltaT = 0.0001;
    var direction = 1;

    // Am I under the center or above? If above we have to go down
    if (distanceA < self.getPointsDist(mousePoint, self.helixFunction(T+deltaT, true))) {
      direction = -1;
    }

    // I have to find minimal distance
    do {
      distanceA = distanceB;
      T = T + deltaT*direction;
      distanceB = self.getPointsDist(mousePoint, self.helixFunction(T, true))
    }
    while (distanceA > distanceB)

    // I will substract the last step to get the minimal T
    return self.helixFunction(T - deltaT*direction, true, offsetR, offsetZ);
  }

  // There is function for this in THREE js so obsolete?
  this.getPointsDist = function (pA, pB) {
    return (Math.sqrt(Math.pow((pB.x-pA.x),2)+Math.pow((pB.y-pA.y),2)+Math.pow((pB.z-pA.z),2)));
  }

  // Is reducing polygons based on ration of segment to whole helix
  this._getReducedPolygons = function(polygons) {

    var threshHold = 100;

    var reducedPolygons =  Math.floor(((this.o.T2 - this.o.T1) / 1) * polygons);

    if (reducedPolygons > threshHold) {
      return reducedPolygons;
    } else {
      return threshHold;
    }

  }

  this._putCap = function ( T ) {


    var material = new THREE.MeshBasicMaterial( {
      color: this.o.color,
      opacity: this.o.opacity,
      transparent: true
    } );

    material.side = THREE.DoubleSide;

    var geometry = new THREE.CircleGeometry(this.o.thickness, radialPolygons);

    var capMesh =  new THREE.Mesh(geometry, material)
    capMesh.position.copy( self.helixFunction( T, true ) );
    capMesh.visible = this.o.visible;

    var helixVector = self.helixFunction( T + 0.0001, true );

    capMesh.lookAt( helixVector );

    capMesh.name = "interactive";

    this.cap = capMesh;
    this.cap.dad = this;

  }

  this.create3Dsegment = function () {

    var material = new THREE.MeshBasicMaterial( {
      color: this.o.color,
      opacity: this.o.opacity,
      transparent: true
    } );

    material.side = THREE.DoubleSide;

    var geometry = new THREE.TubeGeometry(new self._helixCurve(),
      self._getReducedPolygons( polygons ),
      this.o.thickness,
      radialPolygons,
      closed);

    var tubeMesh =  new THREE.Mesh ( geometry, material);

    tubeMesh.visible = this.o.visible;
    tubeMesh.name = "interactive";

    this.Mesh = tubeMesh;

    this.Mesh.dad = this;

    this.o.uuid = tubeMesh.uuid;

    // Place caps on segment
    if ( this.o.topCap ) {
      self._putCap( this.o.T2 );
    }

    if ( this.o.bottomCap ) {
      self._putCap( this.o.T1 );
    }

    // return this.Mesh;
  }

  // Generate THREE curve based on helix function
  this._helixCurve = THREE.Curve.create(
    function() {},
    function( t ) {
      return self.helixFunction( t );
    }
  );

  // This will give you angle to the center of helix
  this.getAngle = function(point) {

    var polarity = 1;
    if (point.y < 0) { polarity = -1 }

    var X = self.helixFunction(this.o.helix.getTFromZ(point.z), true).x / this.o.radius;
    // var Y = self.helixFunction(this.o.helix.getTFromZ(point.z), true).y/this.radius;
    var angle = Math.acos(X*polarity);

    return angle;
  }

  // Update geometry of segment so new options will be rendered.
  this.updateGeometry = function () {

    var object = new THREE.TubeGeometry(new self._helixCurve(),
    self._getReducedPolygons( polygons ),
    this.o.thickness,
    radialPolygons,
    closed);

    this.Mesh.geometry = object;
  }

  this.visible = function ( visible ) {

    if ( visible ) {

      infoLog(" Making segment visible.")

      this.o.visible = true;
      this.Mesh.visible = true;

    } else {

      infoLog(" Making segment NOT visible.")

      this.o.visible = false;
      this.Mesh.visible = false;

    }

  }

  // Who is that???
  this.TALK = function() {
    console.log("This is segment '"+ this.o.uuid +"' starts at: "+ this.o.T1 +" and ends at: "+ this.o.T2);
  }

  // Call it during init
  this.create3Dsegment();
}

///////////////////////////////////////////////////////////////////
// MIGHTY HELIX CONSTRUCTOR
//
///////////////////////////////////////////////////////////////////

function HelixCONSTR (scene, segmentConst, birthDate) {
  var self = this;

  function segmentOptionsCONSTR () {
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
  this.radius = 500;
  this.height = 0;
  this.rotation = 1;
  this.startDate = 0;
  this.endDate = 0;

  // When slope is inited its too much because its ms of time so it should be reduced.
  var heightReduce = 100000000/2;

  // Initiliazing function with help of birth date.
  this.init = function() {
    var now = new Date();
    this.startDate = new Date("01 01 " + this.birthDate.getFullYear());
    this.endDate = new Date("12 31 " + now.getFullYear());
    this.height = (this.endDate - this.startDate) / heightReduce;
    this.rotations = now.getFullYear() - this.birthDate.getFullYear() + 1;

    // create shadow segments
    // var shadowSegOpt = new segmentOptionsCONSTR();
    // shadowSegOpt.T1 = this.segmentBuffer.T1;
    // shadowSegOpt.T2 = this.segmentBuffer.T2;
    // shadowSegOpt.opacity = 0.5;
    // shadowSegOpt.color = 0xFFFF00;
    // shadowSegOpt.thickness += 10;
    // shadowSegOpt.visible = false;
    //
    // this.segmentBuffer.shadowSegment = self.addSegmentToScene(shadowSegOpt);

  }

  this.getByProp = function ( prop, value) {

    infoLog("Looking for prop: "+prop+ " val: "+ value + "In segments");
    for (var i = 0; i < this.segments.length; i++) {

        if (this.segments[i]["o"][prop] == value) {
          return this.segments[i];
        }

    }

    return undefined;
  }

  this.getTimeFromT = function ( T ) {

    var time = new Date();

    return time.setTime((this.endDate - this.startDate) * T);
  }

  this.getTFromTime = function ( time ) {

    var T = (time - this.startDate)  / (this.endDate - this.startDate);

    return T;
  }

  this.getTimeFromPoint = function ( point ) {

    return (self.getTFromZ(point.z) * this.height * heightReduce + this.startDate.getTime());

  }

  this.getNiceTimeFromZ = function ( z ) {
    var time = new Date();
    time.setTime( self.getTimeFromPoint({z}) );
    // console.log(time);
    var niceTime =  time.getDate() + "-" + (parseInt(time.getMonth())+1) + "-" +time.getFullYear();
    return niceTime;
  }

  this.getTFromZ = function ( z ) {

    if (z > this.height) {infoLog("Warning - T from Z: z is too high returning 1. z: " + z); return 1;}
    if (z < 0) {infoLog("Warning - T from Z: z is too low returning 0. z: " + z); return 0;}

    return z / this.height;

  }

  // Put one segment to scene
  this.addSegmentToScene = function ( options ) {

    options.helix = this;
    var newSegment = new self.segmentConstructor( options );

    this.scene3d.add(newSegment.Mesh);

    if ( newSegment.cap !== undefined ) {
      this.scene3d.add(newSegment.cap);
    }

    return newSegment;
  }

  // Generating Default list of segments
  this.genDefaultSegments = function () {
    var interuptions = [];

    var now = new Date();
    var years = this.rotations;

    interuptions.push(self.getTFromTime(this.startDate));
    interuptions.push(self.getTFromTime(this.birthDate));

    for (var i=1; i < years; i++) {
      var newYear = new Date(this.birthDate.getFullYear()+i, 0, 1);
      interuptions.push(self.getTFromTime(newYear));
    }

    interuptions.push(self.getTFromTime(now));

    // var lastDay = new Date(now.getFullYear(), 11, 31, 23, 59);
    interuptions.push(self.getTFromTime(this.endDate));

    // After generating time interuptions we can create list of segment objects with parameters
    var segmentsList = [];

    for (var i = 0; i < interuptions.length - 1; i++) {

      var newOpts = new segmentOptionsCONSTR();
      // newOpts.birthDate = bDate;
      newOpts.T1 = interuptions[i];
      newOpts.T2 = interuptions[i+1];
      newOpts.name = "Segment #"+i;
      newOpts.color = Math.random() * 0xffffff;

      if ( i == 1 ) {
        newOpts.bottomCap = true;
      }

      if ( i == interuptions.length - 3 ) {
        newOpts.topCap = true;
      }



      if ( i + 2 == interuptions.length || i == 0 ) {
          newOpts.visible = false;
      }


      var newSegment = self.addSegmentToScene( newOpts );
      this.segments.push(newSegment);
    }

  }

  // creates segments from options object in list from DB
  this.genSegmentsFromOptList =  function (optionsList) {
  }

  // push segment from segmentBuffer**
  this.pushSegment = function ( ) {

    // number of segment in seglist in which pushed segment starts
    var startSeg = 0;

    for (var i=0; i < this.segments.length; i++){
      if (this.segmentBuffer.T1 > this.segments[i].o.T1) {startSeg = i;}
    }

    // number of segment in seglist in which pushed segment ends
    var endSeg = 0;

    for (var i=0; i < this.segments.length; i++){
      if (this.segmentBuffer.T2 < this.segments[i].o.T2) {endSeg = i; break;}
    }

    console.log(startSeg, endSeg);
    var startSegment = this.segments[startSeg];
    var endSegment = this.segments[endSeg];

    var pushedSegOpt = new segmentOptionsCONSTR();
    pushedSegOpt.helix = this;
    pushedSegOpt.name = "pushed";
    pushedSegOpt.color = Math.random() * 0xffffff;


    pushedSegOpt.T1 = this.segmentBuffer.T1;
    pushedSegOpt.T2 = this.segmentBuffer.T2;
    var pushedSegment = self.addSegmentToScene( pushedSegOpt );

    if ((endSeg - startSeg) >= 1 ) {
      console.log(" Pushed segment is coming thru one or more segment");

      startSegment.o.T2 = this.segmentBuffer.T1;
      endSegment.o.T1 = this.segmentBuffer.T2;

      startSegment.updateGeometry();
      endSegment.updateGeometry();

      var removedSegments = this.segments.splice(startSeg+1, (endSeg - startSeg - 1), pushedSegment);

      console.log(removedSegments);

      for (var i=0; i < removedSegments.length; i++){
        self.removeSegment(removedSegments[i]);
      }
    } else if (endSeg == startSeg) {
      console.log(" Pushed segment is in one segment");

      // Shrink the segment

      var lastSegOpt = Object.assign({}, startSegment.o);
      lastSegOpt.T1 = this.segmentBuffer.T2;
      var lastSegment = self.addSegmentToScene( lastSegOpt );

      startSegment.o.T2 = this.segmentBuffer.T1;
      startSegment.updateGeometry();

      this.segments.splice(startSeg+1, 0, pushedSegment);
      this.segments.splice(startSeg+2, 0, lastSegment);

    }

  }

  // remove segment from segmentsG and scene
  this.removeSegment = function ( segment ){

    var index = this.segments.indexOf(segment);

    if (index > 0) {
      this.segments.splice(index,1);
    }

    this.scene3d.remove(segment.Mesh);
    this.scene3d.remove(segment.cap);

  }

  // Init during instancing.
  this.init();
}

///////////////////////////////////////////////////////////////////
// 3D panel constructor.
//
///////////////////////////////////////////////////////////////////

function The3DpanelCONSTR ( options ) {

  var self = this;

  this.o = options;

  this.css3d = undefined;
  this.plane = undefined;
  this.html = undefined;

  this.line = undefined;
  this.ring = undefined;

  this._createPlane = function ( ) {

    var material = new THREE.MeshBasicMaterial({
     color: 0x000000,
     opacity: 0.0,
     side: THREE.DoubleSide
    });

   var geometry = new THREE.RoundedSquare( this.o.width, this.o.height );
   var mesh = new THREE.Mesh(geometry, material);

   mesh.position.copy( self.getPanelPosition() );
   mesh.rotation.x = this.o.rotation.x;
   mesh.rotation.y = this.o.rotation.y;
   mesh.rotation.z = this.o.rotation.z;

  //  mesh.name = "interactive";

   this.plane = mesh;

   this.plane.dad = this;

  }

  this._createCssObject = function ( ) {

    var cssObject = new THREE.CSS3DObject( this.html );

    cssObject.position.copy( self.getPanelPosition() );
    cssObject.rotation.x = this.o.rotation.x;
    cssObject.rotation.y = this.o.rotation.y;
    cssObject.rotation.z = this.o.rotation.z;

    this.css3d = cssObject;

    this.css3d.dad = this;

    // return cssObject;

  }

  this.setTemplateElements = function ( ) {

    var tempHTML = templatesG[this.o.template];

    var info = undefined;

    if (this.o.buddy !== undefined ) {
      info = this.o.buddy.o;
    }

    infoLog(" setting Template for options: ");
    infoLog(info);

    // Creating container div
    var div = document.createElement('div');
    div.innerHTML = tempHTML;

    div.className = "panel";

    div.style.width = this.o.width;
    div.style.height = this.o.height;

    // div.style.cssText = ("visibility: visible");


    //  div.setAttribute("myPlaneID", planeID);

    //  Closing cross
    if (div.getElementsByClassName('glyphicon-remove')[0] !== undefined ) {
      infoLog("glyphicon-remove found");
      var closeCross = div.getElementsByClassName('glyphicon-remove')[0];
      closeCross.setAttribute("onclick", "deleteObjectWRP(['" + this.o.uuid + "'])");
    }

    //  Time label
    if (div.getElementsByClassName('timeLabel')[0] !== undefined ) {
      infoLog("timeLabel found");
      var segment = this.o.buddy;
      var timeLabel = div.getElementsByClassName('timeLabel')[0];
      timeLabel.innerHTML = Helix.getNiceTimeFromZ(this.o.centerPosition.z);
    }

    //  Start New Segment button
    if (div.getElementsByClassName('startBtn')[0] !== undefined ) {
      infoLog("startBtn found");
      var startBtn = div.getElementsByClassName('startBtn')[0];
      startBtn.setAttribute("onclick", "startNewSegmentWRP('" + Helix.getTFromZ(this.o.centerPosition.z) + "','" + this.o.uuid + "')");
    }

    //  Delete Button
    if (div.getElementsByClassName('delBtn')[0] !== undefined ) {
      infoLog("delBtn found");
      var delBtn = div.getElementsByClassName('delBtn')[0];
      delBtn.innerHTML = "Delete " + info.uuid + " ?";
      delBtn.style.cssText = ("background-color: " +   self._decToColor(info.color));
      delBtn.setAttribute("onclick", "deleteObjectWRP(['" + info.uuid + "','" + this.o.uuid + "'])");
    }

    //  Color Input field
    if (div.getElementsByClassName('colInp')[0] !== undefined ) {
      infoLog("colInp found");
      var colInp = div.getElementsByClassName('colInp')[0];
      // colInp.style.cssText = ("background-color: " +   self._decToColor(info.color));
      colInp.setAttribute("placeholder", self._decToColor(info.color));
      delBtn.style.cssText = ("text-color: " +   self._decToColor(info.color));
      colInp.setAttribute("id", info.uuid + "ColInp");
      colInp.setAttribute("onchange", "changeObjectPars('"+ info.uuid + "ColInp" +"')");
    }

    // this.html = div;
    return div;
  }

  this._createLine = function ( ) {

    var lineGeometry = new THREE.Geometry();

    var lineMaterial = new THREE.LineDashedMaterial({
      //  linewidth: 100,
	     color: 0x000000
    });

    var segment = this.o.buddy;

    // Start on center of segment
    lineGeometry.vertices.push( this.o.centerPosition );
    // ends on edge of panel
    lineGeometry.vertices.push( self.getPanelPosition() );

    var line = new THREE.Line( lineGeometry, lineMaterial );

    this.line = line;

    // this.scene3d.add(line);
  }

  this._updateLineVertices = function ( ) {
    var newPoints = [];

    var segment = this.o.buddy;

    newPoints.push( this.o.centerPosition );

    newPoints.push( self.getPanelPosition() );

    this.line.geometry.vertices = newPoints;

    this.line.geometry.verticesNeedUpdate = true;
  }

  this._createPositionRing = function ( ) {

    var segment = this.o.buddy;

    var material = new THREE.MeshBasicMaterial( { color: 0x000000 });
    var geometry = new THREE.TorusGeometry(segment.o.thickness, 10, 20, 100);
    this.ring = new THREE.Mesh( geometry, material );

    self._updateRingPositionAndRotation();
  }

  this._updateRingPositionAndRotation = function () {

    var segment = this.o.buddy;

    // var helixCenter = segment.helixFunction(Helix.getTFromZ(this.o.timePosition), true);

    this.ring.position.copy( this.o.centerPosition );

    var helixVector = segment.helixFunction(Helix.getTFromZ(this.o.centerPosition.z) + 0.0001, true);

    this.ring.lookAt( helixVector );
  }

  this.create3dPanel = function() {

    // if ( this.o.template.indexOf('rightClick') >= 0 || this.o.template == "default" || this.o.template.indexOf('mouseover') >= 0) {
    //   this.o.type = "FreePanel";
    // } else {
    //   this.o.type = "FixPanel";
    // }

    infoLog(" Creating html panel with html from template: " + this.o.template);
    debugLog(self.getPanelPosition());

    self._createPlane();
    this.o.uuid = this.plane.uuid;

    this.html = self.setTemplateElements();

    // debugLog(this.html);

    self._createCssObject();
    this.css3d.uuid = this.plane.uuid;

    self._createLine();
    self._createPositionRing();
  }

  this._decToColor = function ( dec ) {
      return Math.floor(dec).toString(16).replace("0x","#").toUpperCase() ;
  }

  this.updateObject = function ( newOptions ) {

    var newO = newOptions;

    if ( newO.uuid !== this.o.uuid ) {
      this.o.uuid = newO.uuid;
    }

    if ( newO.template !== this.o.template ) {
      this.o.template = newO.template;
      // self.putTemplate()
    }

    if ( newO.width !== this.o.width ) {
      this.o.width = newO.width;
    }
    // this.type = "FreePanel",
    // this.uuid = "",
    // this.template = "default",
    // this.width = 250,
    // this.height = 150,
    // this.position = new THREE.Vector3(0, 0, 0),
    // this.rotation = new THREE.Vector3(Math.PI/2, 0, 0),
    // this.timePosition = 0,
    // this.color = 0xFFFFFF,
    // this.visible = true,
    // this.transparency = 0,
    // this.buddy = undefined
  }

  this.putTemplate = function ( templateN, object ) {

    this.o.template = templateN;

    infoLog(" templateName: "+ templateN);
    var emptyTemplate = templatesG[this.o.template];

    var filledTemplate = self.setTemplateElements( );

    infoLog(" Filled template from putTemplate: ");
    debugLog(filledTemplate);

    this.html.innerHTML = filledTemplate.innerHTML;
  }

  this.setRotationY = function ( angle ) {

    this.plane.rotation.y = angle;
    this.css3d.rotation.y = angle;
    this.o.rotation = this.plane.rotation;

  }

  this.getPanelPosition = function ( ) {
    return this.o.buddy.helixFunction(
      Helix.getTFromZ(this.o.centerPosition.z),
      true,
      this.o.offsetX,
      this.o.offsetY);
  }

  this.updateCenterPosition = function ( newPosition ) {
    this.o.centerPosition = newPosition;
    this.plane.position.copy(self.getPanelPosition());
    this.css3d.position.copy(self.getPanelPosition());
    self.updateAccessories();
    // self._updateLineVertices();
    // self.__updateRingPositionAndRotation();

  }

  this.setNewOffsets = function ( xOff, yOff ) {

    this.o.offsetX = xOff;
    this.o.offsetY = yOff;

    self.updatePosition();

  }

  this.setRotation = function ( rotation ) {

    this.o.rotation = rotation;

    this.plane.rotation.x = rotation.x;
    this.plane.rotation.y = rotation.y;
    this.plane.rotation.z = rotation.z;

    this.css3d.rotation.x = rotation.x;
    this.css3d.rotation.y = rotation.y;
    this.css3d.rotation.z = rotation.z;

  }

  this.updateAccessories = function () {
    self._updateRingPositionAndRotation();
    self._updateLineVertices();
    this.html.innerHTML = self.setTemplateElements().innerHTML;
  }

  this.setSize = function ( w, h ) {

    if ( this.o.width != w || this.o.height != h ) {

      this.html.style.width = w;
      this.html.style.height = h;

      this.o.width = w;
      this.o.height = h;

      this.plane.geometry = new THREE.RoundedSquare(w, h);
    }
  }

  this.visible = function ( visible ) {

    if (visible) {

      infoLog(" Making panel visible.")

      this.o.visible = true;
      this.plane.visible = true;
      this.css3d.visible = true;
      this.line.visible = true;
      this.ring.visible = true;

      this.html.style.visibility = "visible";
    } else {

      infoLog(" Making panel NOT visible.")

      this.o.visible = false;
      this.plane.visible = false;
      this.css3d.visible = false;
      this.line.visible = false;
      this.ring.visible = false;

      this.html.style.visibility = "hidden";

    }

  }

  // create 3D panel during init.
  this.create3dPanel();
}

///////////////////////////////////////////////////////////////////
// 3D pointer constructor. DONUT
//
///////////////////////////////////////////////////////////////////

// function ThePointerCONSTR (options) {
  // var self = this;
  //
  // this.o = options;
  //
  // this.Mesh = undefined;
  //
  // this.visible = function ( visible ) {
  //   if ( visible ) {
  //
  //     // infoLog(" Making pointer visible.");
  //
  //     this.o.visible = true;
  //     this.Mesh.visible = true;
  //   } else {
  //
  //     // infoLog(" Making pointer NOT visible.");
  //
  //     this.o.visible = false;
  //     this.Mesh.visible = false;
  //   }
  // }
  //
  // this.putPosition =  function ( position ) {
  //   this.Mesh.position.copy(position);
  //   this.o.position = position;
  // }
  //
  // this.createPointer = function () {
  //   var material = new THREE.MeshBasicMaterial( { color: this.o.color });
  //   var geometry = new THREE.TorusGeometry(this.o.radius, this.o.thickness, 20, 100);
  //   this.Mesh = new THREE.Mesh( geometry, material );
  //   this.Mesh.visible = this.o.visible;
  // }
  //
  // this.createPointer()
// }

///////////////////////////////////////////////////////////////////
// LIST OF PANELS CONSTR
//
///////////////////////////////////////////////////////////////////

function ObjectsListCONSTR(scene, cssScene, panelConst) {

  var self = this;

  this.scene3d = scene;
  this.css3dScene = cssScene;

  this.panelConstructor = panelConst;
  // this.pointerConstructor = pointerConst;

  function objectOptionsCONST () {
    this.uuid = "",
    this.template = "default",
    this.width = 350,
    this.height = 250,
    this.centerPosition = new THREE.Vector3(0, 0, 0),
    this.offsetX = 200,
    this.offsetY = 150,
    this.panelPosition = new THREE.Vector3(0, 0, 0),
    this.rotation = new THREE.Vector3(Math.PI/2, 0, 0),
    this.visible = true,
    this.justRing = false,
    this.buddy = undefined
    // this.color = 0xFFFFFF,
    // this.timePosition = 0,
    // this.transparency = 0,
    // this.type = "FreePanel",
  }

  // function pointerOptionsCONST () {
  //   this.type = "Pointer",
  //   this.uuid = "",
  //   this.radius = 10,
  //   this.thickness = 3,
  //   this.position = new THREE.Vector3(0, 0, 0),
  //   this.rotation = new THREE.Vector3(Math.PI/2, 0, 0),
  //   this.timePosition = 0,
  //   this.color = 0x000000,
  //   this.visible = true,
  //   this.transparency = 0
  // }

  this.objects = [];

  this.isTypeInList = function ( type ) {

    for(var i = 0; i < this.objects.length; i++) {

      if (this.objects[i].o.type == type) {
        return this.objects[i];
      }

    }
    return false;
  }

  this.getByProp = function ( prop, value ) {
    infoLog("Looking for prop: "+prop+ " val: "+ value + " in Objects");
    for (var i = 0; i < this.objects.length; i++) {

        if (this.objects[i]["o"][prop] == value) {
          return this.objects[i];
        }

    }

    return undefined;
  }

  this.removeObject = function ( object ) {

    infoLog("Removing object:");
    infoLog(object);

    var index = this.objects.indexOf( object );

    this.scene3d.remove( object.plane );
    this.scene3d.remove( object.line );
    this.scene3d.remove( object.ring );

    this.css3dScene.remove( object.css3d );

    this.objects.splice( index, 1 );

  }

  this.placePanel = function ( action, onObject, mousePointer, unique ) {

      var template = action + onObject.o.type;


      var panel = self.getByProp( "template", template );

      if ( panel !== undefined && unique ) {

        var newZ = onObject.getCenterFromSurface(mousePointer).z;
        var oldZ = panel.o.centerPosition.z;

        if ( Math.floor(newZ) == Math.floor(oldZ) ) {
          // infoLog("Skipping the update");
          return panel;
        }

        // Update dont remove
        // console.log("PANEL FOUND UPDATING");
        infoLog(onObject.o.name + " - for");
        panel.o.buddy = onObject;

        // panel.o.timePosition = onObject.getCenterFromSurface(mousePointer).z;

        // var xOffset = panel.o.width/2 + onObject.o.thickness + 250;
        // var yOffset = panel.o.height/2 + onObject.o.thickness + 100 ;

        panel.updateCenterPosition( onObject.getCenterFromSurface( mousePointer ) );
        panel.setRotation( camera.rotation );
        panel.updateAccessories();
        panel.setTemplateElements();
        // panel.html
        // self.removeObject( panel );
        panel.visible(true);

        return panel;
      }

    // console.log("PANEL NOT FOUND CREATING NEW");

    var newOpts = new objectOptionsCONST ();

    newOpts.buddy = onObject;

    // var xOffset = newOpts.width / 2 + onObject.o.thickness;
    // var yOffset = newOpts.height / 2 + onObject.o.thickness;

    var centerPoint = onObject.getCenterFromSurface(mousePointer);
    // var offsetPoint = onObject.getCenterFromSurface(mousePointer, xOffset, yOffset);

    newOpts.centerPosition =  centerPoint;


    // newOpts.timePosition = centerPoint.z;

    newOpts.rotation = new THREE.Vector3(camera.rotation.x, camera.rotation.y, camera.rotation.z);

    newOpts.template = template;

    return self.createPanel( newOpts );
  }

  this.createPanel = function ( options ) {

    var newPanel = new self.panelConstructor( options );

    this.scene3d.add(newPanel.plane);

    this.scene3d.add(newPanel.line);
    this.scene3d.add(newPanel.ring);

    this.css3dScene.add(newPanel.css3d);

    this.objects.push(newPanel);

    return newPanel;
  }

  // this.placePointerOnHelix = function (segment, mousePoint) {
  //
  //   var pointer = self.isTypeInList("Pointer");
  //
  //   if (pointer !== false) {
  //
  //     // infoLog(pointer.o.position.z +" =? "+segment.getCenterFromSurface( mousePoint ).z);
  //     // if (pointer.o.position.z === segment.getCenterFromSurface( mousePoint ).z) {
  //     //   return;
  //     // }
  //
  //     var pointerRadius = pointer.Mesh.geometry.parameters.radius;
  //
  //     if (pointerRadius == segment.o.thickness) {
  //
  //       pointer.visible(true);
  //
  //       pointer.putPosition( segment.getCenterFromSurface( mousePoint ) );
  //
  //       var helixVector = segment.helixFunction(Helix.getTFromZ(pointer.o.position.z)+0.0001, true);
  //
  //       pointer.Mesh.lookAt( helixVector );
  //
  //       return;
  //
  //     } else {
  //
  //       self.removeObject(pointer);
  //
  //     }
  //
  //   }
  //
  //   var pointerOpts = new pointerOptionsCONST();
  //
  //   pointerOpts.radius = segment.o.thickness;
  //
  //   self.createPointer(pointerOpts);
  //
  // }

  this.createPointer = function (options) {

    var newPointer = new this.pointerConstructor( options );

    this.scene3d.add( newPointer.Mesh );

    this.objects.push( newPointer );

  }
}

///////////////////////////////////////////////////////////////////
// Main INIT
//
///////////////////////////////////////////////////////////////////

function init(birthDate){

  var viewDistance = 10000;

  raycaster = new THREE.Raycaster();
  raycaster.near = 1;
  raycaster.far = viewDistance;

  mouse = new THREE.Vector2();

  renderer = createGlRenderer();
  cssRenderer = createCssRenderer();

  // debugLog(renderer.getPrecision ());
  document.body.appendChild(cssRenderer.domElement);
  // This is important so you can click on embeded html!
  renderer.domElement.style.pointerEvents = "none";

  cssRenderer.domElement.appendChild(renderer.domElement);

  // DEBUG
  cssRenderer.domElement.appendChild( stats.dom );
  // DEBUG

  scene = new THREE.Scene();
  cssScene = new THREE.Scene();

  Panels = new ObjectsListCONSTR(scene, cssScene, The3DpanelCONSTR);

  Helix = new HelixCONSTR(scene, SegmentCONSTR, birthDate);

  Helix.genDefaultSegments();

  // console.log(Panels);

  // set some camera attributes
  var VIEW_ANGLE = 45,
    ASPECT = window.innerWidth / window.innerHeight,
    NEAR = 0.1;

  camera = new THREE.PerspectiveCamera(
      VIEW_ANGLE,
      ASPECT,
      NEAR,
      viewDistance);

  camera.position.z = 200;
  camera.position.x = 200;
  camera.position.y = -2000;

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
  // scene.add( sphereInter );

  // Rounded Square
  // geometry = new THREE.RoundedSquare(100, 50, 5);
  // var testSQ = new THREE.Mesh( geometry, material );
  // scene.add( testSQ );


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

  // Controls
  controls = new THREE.TrackballControls( camera );
  controls.target.set( 0, 0, 0 );
  controls.rotateSpeed = 4;
  controls.zoomSpeed = 0.1;
  // controls.panSpeed = 0.4;
  controls.noZoom = false;

  // cube.rotateX(90);
  // axes
  axes = new THREE.AxisHelper( 100 );
  scene.add( axes );

  controls.addEventListener( 'change', render );
  window.addEventListener( 'resize', onWindowResize, false );
  document.addEventListener( 'mousemove', onMouseMove, false );
  document.addEventListener( 'mousedown', function(e) { if (e.which == 1) {leftCliked(circleTest);} else if (e.which == 3) {rightCliked();} }, false );
  // debugger;
}

///////////////////////////////////////////////////////////////////
// Seetings Panel Wrappers
//
///////////////////////////////////////////////////////////////////

function deleteObjectWRP ( uuids ) {

  for (var i=0; i < uuids.length; i++ ) {

    var uuid = uuids[i];

    var segment = Helix.getByProp("uuid", uuid);

    if ( segment !== undefined ){

      Helix.removeSegment ( segment );

      Panels.getByProp( "template", "mouseoverSegment" ).visible(false);

    }

    var panel = Panels.getByProp("uuid", uuid);

    if ( panel !== undefined) {

      Panels.removeObject( panel );

    }
  }
}

function startNewSegmentWRP ( T1, PanelUuid ) {

    Helix.segmentBuffer.active = true;
    // Helix.segmentBuffer.shadowSegment.visible( true );

    Helix.segmentBuffer.T1 = parseFloat( T1 );

    var panel = Panels.getByProp("uuid", PanelUuid);

    if ( panel !== undefined) {

      panel.visible(false);

    }
}

function changeSegmentWRP (segInfo) {
  changeSegmentPars (segInfo);
  hidePanel(panelId);
}


function hidePanel (id) {
  document.getElementById(id).style.cssText += ("visible: false");
}

///////////////////////////////////////////////////////////////////
// Mouse clicks
//
///////////////////////////////////////////////////////////////////

/////////////////////// LEFT CLICK ////////////////////////////////

function leftCliked( circleObj ) {

  var action = "leftClick";

  var intersects = raycaster.intersectObjects( scene.children );

    for (var i = 0; i < intersects.length; i++) {

      var intersecObj = intersects[ i ].object;

      if ( intersecObj.hasOwnProperty("dad") ) {

      // intersecObj.updateVertices();

      var segment = intersecObj.dad;
      var mousePointer = intersects[ i ].point;
      var centerPoint = segment.getCenterFromSurface(mousePointer);
      console.log(intersecObj);
      segment.TALK();

      if ( Helix.segmentBuffer.active ) {

        Helix.segmentBuffer.T2 = Helix.getTFromZ(centerPoint.z);

        if ( Helix.getTFromZ(centerPoint.z) < Helix.segmentBuffer.T1) {
          Helix.segmentBuffer.T2 = Helix.segmentBuffer.T1;
          Helix.segmentBuffer.T1 = Helix.getTFromZ(centerPoint.z);
        }


        Helix.pushSegment();
        Helix.segmentBuffer.active = false;
      }

      break;
    } else {
      console.log("Ce ne pas helix");
    }
  }
}

//////////////// RIGHT CLICK ///////////////////

function rightCliked() {

  const action = "rightClick";

  var intersects = raycaster.intersectObjects( scene.children );

    for (var i = 0; i < intersects.length; i++) {

      var intersecObj = intersects[ i ].object;

      // To know If I clicked on some of mine helix objects.
      if (intersecObj.hasOwnProperty("dad")) {

        doAction( action, intersecObj, intersects[ i ].point);

        break;
    }
  }
}

function doAction (action, onObject, mousePointer) {

  var segment = onObject.dad;

  var centerPoint = segment.getCenterFromSurface(mousePointer);

  // DEBUG
  console.log(onObject);
  segment.TALK();

  if (action.indexOf('rightClick') >= 0) {

    var freePanel = Panels.placePanel( action, segment, mousePointer, true );

  } else if (action.indexOf('leftClick') >= 0) {
    // generate mediaPanel
  } else {
    console.log("ERROR: Unknow action");
  }

}

///////////////////////////////////////////////////////////////////
// ANIMATE
//
///////////////////////////////////////////////////////////////////

function animate() {
  controls.update();
  render();
  requestAnimationFrame( animate );
}

///////////////////////////////////////////////////////////////////
// Renderer
//
///////////////////////////////////////////////////////////////////

function render() {

  var action = "mouseover";

  raycaster.setFromCamera( mouse, camera );

  var intersects = raycaster.intersectObjects( scene.children );

  // debugLog(intersects);

    for (var i = 0; i < intersects.length; i++) {

      var intersecObj = intersects[ i ].object;

      // console.log(i +": " + intersecObj.name);

      if ( intersecObj.name == "interactive" ) {

        var segment = intersecObj.dad;

        if ( segment.o.type == "Segment" ) {


          // segment.updateVertices();

          // Time Panel
          var timePanel = Panels.placePanel( action, segment, intersects[ i ].point, true);

          timePanel.setSize(100, 50);
          // debugger;

          // Segment preview
          // Helix.segmentBuffer.putT( Helix.getTFromZ( intersects[ 0 ].z) );
          // Helix.segmentBuffer.shadowSegment.updateGeometry();

          break;

        }

      } else {

        // var pointer = Panels.isTypeInList( "Pointer" );
        //
        // if ( pointer !== false ){
        //
        //   pointer.visible( false );
        //
        // }

      }


}

  // var timer = Date.now() * 0.0001;
  // tubeMesh.rotation.z = timer * 2.5;

  renderer.render(scene, camera);

  // DEBUG
  stats.update();
  // DEBUG

  cssRenderer.render(cssScene, camera);
}

// when ready, start.
$(document).ready(function() {

  init(birthDateINP);

  animate();
});
