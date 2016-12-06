// These globals I would like to avoid in future.
var camera, scene, renderer,
  controls,
  cssRenderer, cssScene;

var raycaster, currentIntersected, donutMesh;
var INTERSECTED;
var mouse;

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

    capMesh.click = "interactive";

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
    tubeMesh.click = "interactive";

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
  this.getAngle = function( point ) {

    var polarity = 1;
    if (point.y < 0) { polarity = -1 }

    var X = self.helixFunction(this.o.helix.getTFromZ(point.z), true).x / this.o.helix.radius;
    // console.log(self.helixFunction(this.o.helix.getTFromZ(point.z), true));
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
      newOpts.click = "Segment #"+i;
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
    pushedSegOpt.click = "pushed";
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
      lastSegOpt.bottomCap = false;
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

  // Creates 3D panel that means CSS3D based on template name, 3D plane, line and ring on segment.
  this.create3dPanel = function() {

    infoLog(" Creating html panel with html from template: " + this.o.template);
    // debugLog(self._getPanelPosition());
    this.o.panelPosition = self._getPanelPosition();

    self._createPlane();
    this.o.uuid = this.plane.uuid;

    this.html = self.setTemplateElements();

    // debugLog(this.html);

    self._createCssObject();
    this.css3d.uuid = this.plane.uuid;

    nodeScriptReplace(this.html);

    self._createLine();
    self._createPositionRing();

  }

  // Makes 3D plane with 0 opacity as mask for CSS3D
  this._createPlane = function ( ) {

    var material = new THREE.MeshBasicMaterial({
     color: 0x000000,
     opacity: 0.0,
     side: THREE.DoubleSide
    });

   var geometry = new THREE.RoundedSquare( this.o.width, this.o.height );
   var mesh = new THREE.Mesh(geometry, material);

   mesh.position.copy( this.o.panelPosition );
   mesh.rotation.x = this.o.rotation.x;
   mesh.rotation.y = this.o.rotation.y;
   mesh.rotation.z = this.o.rotation.z;

   if ( this.o.template != "mouseoverSegment" ) {
     mesh.click = "inhibit";
   }

   this.plane = mesh;

   this.plane.dad = this;

  }

  //  Creates CSS3D object same parameters as 3D plane.
  this._createCssObject = function ( ) {

    var cssObject = new THREE.CSS3DObject( this.html );

    cssObject.position.copy( this.o.panelPosition );
    cssObject.rotation.x = this.o.rotation.x;
    cssObject.rotation.y = this.o.rotation.y;
    cssObject.rotation.z = this.o.rotation.z;

    this.css3d = cssObject;

    this.css3d.dad = this;

    // return cssObject;

  }

  // Line is connecting position ring on segment and panel.
  this._createLine = function ( ) {

    var lineGeometry = new THREE.Geometry();

    var lineMaterial = new THREE.LineDashedMaterial({
      //  linewidth: 100,
      color: 0x000000
    });

    var segment = this.o.buddy;

    // TBD should Start on edge of position ring
    lineGeometry.vertices.push( this.o.centerPosition );

    // TBD should end on edge of panel
    lineGeometry.vertices.push( this.o.panelPosition );
    // console.log(new THREE.Vector3(0,0));

    var line = new THREE.Line( lineGeometry, lineMaterial );

    this.line = line;

  }

  // Ring showing exact time position of panel on segment.
  this._createPositionRing = function ( ) {

    var segment = this.o.buddy;

    var material = new THREE.MeshBasicMaterial( { color: 0x000000 });
    var geometry = new THREE.TorusGeometry(segment.o.thickness, 10, 20, 100);
    this.ring = new THREE.Mesh( geometry, material );

    self._updateRingPositionAndRotation();
  }

  // Set Template elements if they are found.
  this.setTemplateElements = function ( ) {

    var tempHTML = templatesG[this.o.template];

    var info = this.o.buddy.o;

    // if (this.o.buddy !== undefined ) {
    //   info = this.o.buddy.o;
    // }

    infoLog(" setting Template for options: ");
    infoLog(info);

    // Creating container div
    var div = document.createElement('div');
    div.innerHTML = tempHTML;

    div.className = "panel3D";

    // div.style.width = this.o.width;
    // div.style.height = this.o.height;

    // div.style.cssText = ("visibility: visible");


    //  div.setAttribute("myPlaneID", planeID);

    //  Closing cross
    if (div.getElementsByClassName('glyphicon-remove')[0] !== undefined ) {
      infoLog("glyphicon-remove found");
      var closeCross = div.getElementsByClassName('glyphicon-remove')[0];
      closeCross.setAttribute("onclick", "deleteObjectWRP(['" + this.o.uuid + "'])");
    }

    // .glyphicon-fullscreen
    if (div.getElementsByClassName('glyphicon-fullscreen')[0] !== undefined ) {
      infoLog("glyphicon-fullscreen found");
      var positionCross = div.getElementsByClassName('glyphicon-fullscreen')[0];
      positionCross.setAttribute("onclick", "chanegePositionWRP('" + this.o.uuid + "')");
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

    //  File Input field
    if (div.getElementsByClassName('fileInp')[0] !== undefined ) {
      infoLog("fileInp found");
      var fileInp = div.getElementsByClassName('fileInp')[0];
      fileInp.setAttribute("targetID", this.o.uuid);
    }

    // Panel body on 3D panel add uid of plane to it so I can fill it with media.
    if (div.getElementsByClassName('panel-body')[0] !== undefined ) {
      infoLog("panel-body found");
      var colInp = div.getElementsByClassName('panel-body')[0];
      // colInp.style.cssText = ("background-color: " +   self._decToColor(info.color));
      colInp.setAttribute("id", this.o.uuid);
    }



    // this.html = div;
    return div;
  }

  // Updates line and ring if options are changed
  this.updateAccessories = function () {
    self._updateRingPositionAndRotation();
    self._updateLineVertices();
  }

  // Updates ring position and rotation
  this._updateRingPositionAndRotation = function () {

    var segment = this.o.buddy;

    // var helixCenter = segment.helixFunction(Helix.getTFromZ(this.o.timePosition), true);

    this.ring.position.copy( this.o.centerPosition );

    var helixVector = segment.helixFunction(Helix.getTFromZ(this.o.centerPosition.z) + 0.0001, true);

    this.ring.lookAt( helixVector );
  }

  // updates line start and end
  this._updateLineVertices = function ( ) {
    var newPoints = [];

    var segment = this.o.buddy;

    newPoints.push( this.o.centerPosition );

    newPoints.push( this.o.panelPosition );

    this.line.geometry.vertices = newPoints;

    this.line.geometry.verticesNeedUpdate = true;
  }

  this._decToColor = function ( dec ) {
    return Math.floor(dec).toString(16).replace("0x","#").toUpperCase() ;
  }

  // Return panel position computed from center position and offsets.
  this._getPanelPosition = function ( ) {
    return this.o.buddy.helixFunction(
      Helix.getTFromZ(this.o.centerPosition.z),
      true,
      this.o.offsetX,
      this.o.offsetY);
    }

  // Set size of Plane to match the size of html panel. This has to be called after the html is rendered otherwise it sets 0,0
  this.setPlaneSizeToHTML = function () {

      self.setSize( this.html.offsetWidth, this.html.offsetHeight );

      this.html.style.width = "";
      this.html.style.height = "";

      // console.log( this.html.offsetWidth+ " w and h " +this.html.offsetHeight );

  }

  // adds offset
  this.moveOffset =  function ( offsetDiffX, offsetDiffY ) {

    this.o.offsetX += offsetDiffX;
    this.o.offsetY += offsetDiffY;
    this.o.panelPosition = self._getPanelPosition();
    this.plane.position.copy(this.o.panelPosition);
    this.css3d.position.copy(this.o.panelPosition);
    self._updateLineVertices();
    // update position and line
  }

  var vA = 0;
  var vB = 0;

  this.setOffsetToCursor = function ( point ) {

    vA = point;

    var dxOffset = 0;
    var dyOffset = 0;

    if ( vB != 0 ) {
      getOffsets( vA, vB);
      self.moveOffset( dxOffset, dyOffset );
      vB = vA;
      return;
    }

    vB = vA;

    // console.log(vA, vB);


    function getOffsets( A, B ) {
      var vector = new THREE.Vector3();
      vector.subVectors( A, B );
      // console.log( vector );

      var manhLength = vector.length();
      dyOffset = A.z - B.z;
      var pol = 1;
      if ( A.x >  B.x ) { pol = -1}
      dxOffset = Math.sqrt( Math.pow(manhLength, 2) - Math.pow(dyOffset, 2) ) * pol;

      console.log("dXO: " + dxOffset + " dY0: " + dyOffset);

    }

    return;
  }

  this.flushOffsetBuffer = function () {
    vA = 0;
    vB = 0;
  }

  this.updateCenterPosition = function ( newPosition ) {

    this.o.centerPosition = newPosition;
    this.o.panelPosition = self._getPanelPosition();
    this.plane.position.copy(this.o.panelPosition);
    this.css3d.position.copy(this.o.panelPosition);
    self.updateAccessories();
    // self._updateLineVertices();
    // self.__updateRingPositionAndRotation();

  }

  // this.setNewOffsets = function ( xOff, yOff ) {
  //
  //   this.o.offsetX = xOff;
  //   this.o.offsetY = yOff;
  //
  //   self.updatePosition();
  //
  // }


  this.setRotationY = function ( angle ) {

    this.plane.rotation.y = angle;
    this.css3d.rotation.y = angle;
    this.o.rotation = this.plane.rotation;

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

  this.updateTemplate = function () {

    this.html.innerHTML = self.setTemplateElements().innerHTML;

  }

  // sets size of 3D plane and also CSS element.
  // Also makes new geometry of rounded square.
  this.setSize = function ( w, h ) {

    // Do not change if its the same
    if ( this.o.width != w || this.o.height != h ) {

      this.html.style.width = w;
      this.html.style.height = h;

      this.o.width = w;
      this.o.height = h;

      this.plane.geometry = new THREE.RoundedSquare(w, h, 4);
    }
  }

  // Sets all components of 3D Panel visibility
  this.visible = function ( visible ) {

    if ( visible ) {

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
// LIST OF PANELS CONSTR
//
///////////////////////////////////////////////////////////////////

function ObjectsListCONSTR(scene, cssScene, panelConst) {

  var self = this;

  this.scene3d = scene;
  this.css3dScene = cssScene;

  this.panelConstructor = panelConst;

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

  this.objects = [];

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

      // Template name is combination of action and object.
      var template = action + onObject.o.type;

      var panel = self.getByProp( "template", template );

      // If panel exists and is meant only once in scene
      if ( panel !== undefined && unique ) {

        var newZ = onObject.getCenterFromSurface(mousePointer).z;
        var oldZ = panel.o.centerPosition.z;

        // If panel position did not changed significantly, dont do anythin.
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

    // console.log("PANEL NOT FOUND CREATING NEW");

    var newOpts = new objectOptionsCONST ();

    newOpts.buddy = onObject;

    var centerPoint = onObject.getCenterFromSurface(mousePointer);
    // var offsetPoint = onObject.getCenterFromSurface(mousePointer, xOffset, yOffset);

    newOpts.centerPosition =  centerPoint;

    console.log(action.indexOf('leftClick'));

    if ( action.indexOf('leftClick') >= 0 ) {

      // panel.setRotationY(  );


      newOpts.rotation = new THREE.Vector3( Math.PI/2, onObject.getAngle( centerPoint ), 0);
      // controls.target.set( newOpts.centerPosition );

    } else {

      newOpts.rotation = camera.rotation ;

    }

    newOpts.template = template;

    var newPanel = self.createPanel( newOpts );

    updateRenderes( );

    newPanel.setPlaneSizeToHTML();

    return newPanel;
  }

  this.createPanel = function ( options ) {

    var newPanel = new self.panelConstructor( options );

    this.scene3d.add(newPanel.plane);

    this.scene3d.add(newPanel.line);
    this.scene3d.add(newPanel.ring);

    this.css3dScene.add(newPanel.css3d);

    this.objects.push(newPanel);

    // updateRenderes()

    return newPanel;
  }


  // this.createPointer = function (options) {
  //
  //   var newPointer = new this.pointerConstructor( options );
  //
  //   this.scene3d.add( newPointer.Mesh );
  //
  //   this.objects.push( newPointer );
  //
  // }
}

///////////////////////////////////////////////////////////////////
// Main INIT
//
///////////////////////////////////////////////////////////////////

function init(birthDate){

  var viewDistance = 10000;

  placeEventListeners();

  raycaster = new THREE.Raycaster();
  raycaster.near = 1;
  raycaster.far = viewDistance;

// PROTO
  mouse = new THREE.Vector2();

  mouse.dragging = false;
  mouse.leftCliked = 0;
  mouse.rightCliked = 0;



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

  // Controls
  controls = new THREE.TrackballControls( camera );
  controls.target.set( 0, 0, 0 );
  controls.rotateSpeed = 4;
  controls.zoomSpeed = 0.1;
  controls.panSpeed = 0.4;
  controls.noZoom = false;
  controls.addEventListener( 'change', render );

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
      console.log("leftUP");
      mouse.leftCliked = false;
    } else if (e.which == 3) {
      mouse.rightCliked = false;
    }
  }, false );
}

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


function chanegePositionWRP ( uuid ) {
  console.log(mouse);
  mouse.dragging = true;
    // while (mouse.leftCliked) {
    //   console.log("pini");
    // }
}

// function changeSegmentWRP (segInfo) {
//   changeSegmentPars (segInfo);
//   hidePanel(panelId);
// }
//
//
// function hidePanel (id) {
//   document.getElementById(id).style.cssText += ("visible: false");
// }

///////////////////////////////////////////////////////////////////
// Mouse clicks
//
///////////////////////////////////////////////////////////////////


/////////////////////// MOUSE CLICK ////////////////////////////////

function mouseDown ( e ) {

  var action = "";

  if (e.which == 1) {

    action = "leftClick";
    mouse.leftCliked = true;

  } else if (e.which == 3) {

    action = "rightClick";
    mouse.rightCliked = true;

  }

  var intersects = raycaster.intersectObjects( scene.children );

    for (var i = 0; i < intersects.length; i++) {

      var intersect = intersects[ i ];

      if ( intersect.object.click == "inhibit" ) {
        break;
      }

      if ( intersect.object.click == "interactive" ) {

        doAction( action, intersect.object, intersect.point );

        break;
      }

  }

}


/////////////////////// LEFT CLICK ////////////////////////////////

// function leftCliked( event ) {
//
//   var action = "leftClick";
//
// // PROTO
//   // var x = event.clientX, y = event.clientY,
//   // elementMouseIsOver = document.elementFromPoint(x, y);
//   // console.log(elementMouseIsOver);
//   //
//   // if ( elementMouseIsOver.hasAttribute("dragable")) {
//   //   console.log("pini1234");
//   //
//   //   while (mouse.leftCliked) {
//   //     console.log("pini");
//   //   }
//   // }
//
//   // PROTO
//
//   var intersects = raycaster.intersectObjects( scene.children );
//
//     for (var i = 0; i < intersects.length; i++) {
//
//       var intersecObj = intersects[ i ].object;
//
//       if ( intersecObj.click == "inhibit" ) {
//         break;
//       }
//
//       if ( intersecObj.click == "interactive" ) {
//
//         doAction( action, intersecObj, intersects[ i ].point);
//
//       // intersecObj.updateVertices();
//
//       break;
//     }
//
//   }
// }

//////////////// RIGHT CLICK ///////////////////

// function rightCliked( event ) {
//
//   const action = "rightClick";
//
//   var intersects = raycaster.intersectObjects( scene.children );
//
//     for (var i = 0; i < intersects.length; i++) {
//
//       var intersecObj = intersects[ i ].object;
//
//       if ( intersecObj.click == "inhibit" ) {
//         break;
//       }
//
//       // To know if I clicked on some of mine helix objects.
//       if ( intersecObj.click == "interactive" ) {
//
//         doAction( action, intersecObj, intersects[ i ].point);
//
//         break;
//     }
//   }
// }

///////////////////////////////////////////////////////////////////
// DO ACTION
//
///////////////////////////////////////////////////////////////////

function doAction (action, onObject, mousePointer) {

  var segment = onObject.dad;

  var centerPoint = segment.getCenterFromSurface(mousePointer);

  // DEBUG
  console.log(onObject);
  segment.TALK();

  // RIGHT CLICK
  if (action.indexOf('rightClick') >= 0) {

    var panel = Panels.placePanel( action, segment, mousePointer, true );
    panel.setPlaneSizeToHTML();


  // LEFT CLICK
  } else if (action.indexOf('leftClick') >= 0) {



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

      var panel = Panels.placePanel( action, segment, mousePointer, false );
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
  //
  // setTimeout( function() {
  //
  //      requestAnimationFrame( animate );
  //
  //  }, 10000 / 30 );
  //

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
      var intersecPoint = intersects[ i ].point;

      if ( intersecObj.click == "inhibit" ) {

        Panels.getByProp("template", "mouseoverSegment").visible(false);

        // PROTO
        // IF LEFT button is pressed
        var panel = intersecObj.dad;

        sphereInter.visible =true;
        sphereInter.position.copy ( intersecPoint );

        if ( mouse.leftCliked ) {
          console.log("leftCliked");
          var x = mouse.clientX, y = mouse.clientY,
          elementMouseIsOver = document.elementFromPoint(x, y);

          // IF IM ON DRAGABLE ELEMENT
          if ( elementMouseIsOver.hasAttribute("dragable")) {

            // mouse.dragging = true;
            controls.enabled = false;

            panel.setOffsetToCursor( intersecPoint );

          }

        } else {
          panel.flushOffsetBuffer();
        }

        break;
      }

      // console.log(i +": " + intersecObj.click);

      if ( intersecObj.click == "interactive" ) {

        var segment = intersecObj.dad;

        if ( segment.o.type == "Segment" ) {

          // Time Panel
          var timePanel = Panels.placePanel( action, segment, intersects[ i ].point, true);

          // timePanel.setSize(100, 50);
          // debugger;

          // Segment preview
          // Helix.segmentBuffer.putT( Helix.getTFromZ( intersects[ 0 ].z) );
          // Helix.segmentBuffer.shadowSegment.updateGeometry();

          break;

        }

      }

}

  // var timer = Date.now() * 0.0001;
  // tubeMesh.rotation.z = timer * 2.5;

  updateRenderes();

  // if ( ! mouse.dragging ) {
  //
  // }
  controls.enabled = true;

  mouse.dragging = false;

  // console.log("dragging NOT");
  // DEBUG
  stats.update();
  // DEBUG

}

function updateRenderes () {
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}

// when ready, start.
$(document).ready(function() {

  init(birthDateINP);

  animate();
});
