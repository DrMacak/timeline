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
var Segments;

// List of panels and other non-segment objects.
var Panels;

// list of start and end of segment
var segDurationG = 0;

///////////////////////////////////////////////////////////////////
// 3D segment constructor.
//
///////////////////////////////////////////////////////////////////

function SegmentCONSTR (options) {

  var self = this;

  this.o = options;

  // Whole helix
  this.startDate = 0;
  this.endDate = 0;

  // T limits for generating only segment of whole helix
  this.T1 = 0;
  this.T2 = 1;

  //height
  this.slope = 0;
  // When slope is inited its too much because its ms of time so it should be reduced.
  var slopeReduce = 100000000/2;

  this.Mesh = undefined;

  // Initiliazing function with help of birth date.
  this.init = function(bDate) {
    var now = new Date();
    this.startDate = new Date("01 01 " + bDate.getFullYear());
    this.endDate = new Date("12 31 " + now.getFullYear());
    this.slope = (this.endDate - this.startDate)/slopeReduce;
    this.rotations = now.getFullYear() - bDate.getFullYear() + 1;
  }

  // Function to generate helix points t is from 0 to 1. When pure true there is not T limit.
  this.helixFunction = function (t, pure, radiusOffset, zOffset) {

    var Tl = self.tStrech( t );

    if ( pure ) { Tl = t }

    var radius = radiusOffset + this.o.radius || this.o.radius;
    var zOffLoc = zOffset || 0;

    var Tpi = Tl*(Math.PI*2)*this.rotations;

    var tx = Math.cos( Tpi ) * radius,
        ty = Math.sin( Tpi ) * radius,
        tz = this.slope * Tl + zOffLoc;

    return new THREE.Vector3( tx, ty, tz );
  }

  // This method streatch input t (0 to 1) to fit the segment limits.
  this.tStrech = function (t) {
    var sT = t * (this.T2-this.T1) + this.T1;
    return sT;
  }

   // Generate THREE curve based on helix function
  this.helixCurve = THREE.Curve.create(
    function() {},
    function( t ) {
      return self.helixFunction( t );
   }
  );

  // Set upper and lower T limit for segment. Based on segment times of end/start
  this.setSegment =  function(segStart, segEnd) {

     this.T1 = self.getTFromZ((segStart - this.startDate ) / slopeReduce);
     this.T2 = self.getTFromZ((segEnd - this.startDate ) / slopeReduce);

  }

  this.getTimeFromPoint = function (point) {

    return (self.getTFromZ(point.z) * this.slope * slopeReduce + this.startDate.getTime());

  }

  this.getTFromZ = function (z) {

    if (z > this.slope) {infoLog("Warning - T from Z: z is too high returning 1. z: " + z); return 1;}
    if (z < 0) {infoLog("Warning - T from Z: z is too low returning 0. z: " + z); return 0;}

    return z / this.slope;

  }

  // There is function for this in THREE js so obsolete?
  this.getPointsDist = function (pA, pB) {
    return (Math.sqrt(Math.pow((pB.x-pA.x),2)+Math.pow((pB.y-pA.y),2)+Math.pow((pB.z-pA.z),2)));
  }

  // TBD This should be possible to make smarter???
  this.getCenterFromSurface = function(mousePoint, radiusOffset, zOffset) {

    var offsetR =  radiusOffset || 0;
    var offsetZ =  zOffset || 0;

    // get some inacurate center point based on simple Z coordinates
    var T = self.getTFromZ(mousePoint.z);

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

  // Is reducing polygons based on ration of segment to whole helix
  this.getReducedPolygons = function(polygons) {

    var threshHold = 100;

    var reducedPolygons =  Math.floor(((this.T2 - this.T1) / 1) * polygons);

    if (reducedPolygons > threshHold) {
      return reducedPolygons;
    } else {
      return threshHold;
    }

  }

  this.getAngle = function(point) {

    var polarity = 1;
    if (point.y < 0) { polarity = -1 }

    var X = self.helixFunction(self.getTFromZ(point.z), true).x / this.o.radius;
    // var Y = self.helixFunction(self.getTFromZ(point.z), true).y/this.radius;
    var angle = Math.acos(X*polarity);

    return angle;
  }

  // Who is that???
  this.TALK = function() {
    console.log("This is segment '"+ this.o.uuid +"' starts at: "+ this.o.start +" and ends at: "+ this.o.end);
  }

  this.create3Dsegment = function () {

    var polygons = 1000;
    // var tubeRadius = 40;
    var radialPolygons = 12;
    var closed = false;
    // var taper = true;

    self.init(this.o.birthDate);

    self.setSegment(this.o.start, this.o.end);

    // var randColor = Math.random() * 0xffffff;

    var material = new THREE.MeshBasicMaterial( { color: this.o.color } );
    // var material = new THREE.MeshBasicMaterial( { color: randColor} );
    // this.o.color = Math.floor(randColor).toString(16);

    material.side = THREE.DoubleSide;
    // console.log(HelixOBJ.getSegmentRatio());

    var object = new THREE.TubeGeometry(new self.helixCurve(),
      self.getReducedPolygons(polygons),
      this.o.thickness,
      radialPolygons,
      closed);

    var tubeMesh =  new THREE.Mesh ( object, material);
    // tubeMesh.name = segment.uuid;
    // tubeMesh.helix = HelixOBJ;

    this.Mesh = tubeMesh;

    // Watchout! >]
    this.Mesh.dad = this;

    this.o.uuid = tubeMesh.uuid;

    return this.Mesh;
  }

  this.create3Dsegment();

}

///////////////////////////////////////////////////////////////////
// LIST OF SEGMENTS CONSTR
//
///////////////////////////////////////////////////////////////////

function SegmentListCONSTR (scene, segmentConst, birhtDate) {
  var self = this;

  function optListCONSTR () {
    this.type = "Segment",
    this.uuid = "",
    this.birhtDate = 0,
    this.start = 0,
    this.end = 1,
    this.color = 0xFFFFFF,
    this.visible = true,
    this.transparency = 0,

    this.radius = 500,
    this.slope = 0,
    this.rotation = 1,
    this.thickness = 40
  }

  this.scene3d = scene;
  this.segmentConstructor = segmentConst;

  // list of segments
  this.segments = [];

  this.getByProp = function ( prop, value) {

    infoLog("Looking for prop: "+prop+ " val: "+ value);
    for (var i = 0; i < this.segments.length; i++) {

        if (this.segments[i]["o"][prop] == value) {
          return this.segments[i];
        }

    }

    return undefined;
  }
  // Put one segment to scene
  this.addSegmentToScene = function (options) {

    var newSegment = new self.segmentConstructor(options);

    this.segments.push(newSegment);

    this.scene3d.add(newSegment.Mesh);

  }

  // Create segment object
  this.createSegment = function (start, end, uuid, color, visible, transparency, type) {
    var segStart = new Date(start) || 0;
    var segEnd = new Date(end) || 0;

    var newSegment = new segmentInfoCONST();
      newSegment.start = (segStart < segEnd ? segStart : segEnd);
      newSegment.end = (segStart > segEnd ? segStart : segEnd);
      // TBD Protection to for name to be Unique
      newSegment.uuid = uuid || "seg #" + Math.floor(Math.random()*900+100);
      newSegment.color = color || "0xFFFF00";
      newSegment.visible = visible || true;
      newSegment.transparency = transparency || 0;
      newSegment.type = type || "NotDefined";
    return newSegment;
  }

  // Generating Default list of segments
  this.genDefaultSegments = function (bDate) {
    var interuptions = [];

    var now = new Date();
    var years = now.getFullYear() - bDate.getFullYear();
    var firstDay = new Date(bDate.getFullYear(), 0, 1);

    interuptions.push(firstDay);
    interuptions.push(bDate);

    for (var i=1; i <= years; i++) {
      var newYear = new Date(bDate.getFullYear()+i, 0, 1);
      interuptions.push(newYear);
    }

    interuptions.push(now);

    var lastDay = new Date(now.getFullYear(), 11, 31, 23, 59);
    interuptions.push(lastDay);

    // After generating time interuptions we can create list of segment objects with parameters
    var segmentsList = [];

    for (var i = 0; i+1 < interuptions.length; i++) {

      var newOpts = new optListCONSTR();
      newOpts.birthDate = bDate;
      newOpts.start = interuptions[i];
      newOpts.end = interuptions[i+1];
      newOpts.name = "Segment #"+i;
      newOpts.color = Math.random() * 0xffffff;

      self.addSegmentToScene(newOpts);

    }

  }

  // creates segments from options object in list from DB
  this.genSegmentsFromOptList =  function (optionsList) {

  }

  // push segment into segmentsG
  this.pushSegment = function (pushedSegment) {
    // TBD I should order segmentList by start time to be sure.
    var changedSegments = [];
    console.log(pushedSegment);
    // number of segment in seglist in which pushed segment starts
    var startSeg = 0;
    for (var i=0; i < this.segments.length; i++){
      if (pushedSegment.o.start > segments[i].o.start) {startSeg = i;}
    }

    // number of segment in seglist in which pushed segment ends
    var endSeg = 0;
    for (var i=0; i < segments.length; i++){
      if (pushedSegment.o.end < segments[i].o.end) {endSeg = i; break;}
    }

    console.log(startSeg, endSeg);

    if ((endSeg - startSeg) == 1 ) {
      infoLog(" Pushed segemnt is coming thru one segment");
      segments[startSeg].o.end = pushedSegment.o.start;
      segments[endSeg].o.start = pushedSegment.o.end;

      changedSegments = [segments[startSeg].o.uuid, segments[endSeg].o.uuid, pushedSegment.o.uuid];

      segments.splice(startSeg+1,0,pushedSegment);

    } else if (endSeg == startSeg) {
      infoLog(" Pushed segment is in one segment");
      var firstSegOpt = Object.assign({}, segments[startSeg].o);
      var secondSegOpt = Object.assign({}, segments[startSeg].o);
      // startSegOpt.end =
      // var segmentClon = new self.segmentConstructor(segments[startSeg].o);
      // var segmentClon = Object.assign({}, segments[startSeg]);

      var origName = segments[startSeg].o.uuid;

      // segments[startSeg].o.uuid = segments[startSeg].uuid + "A";
      firstSegOpt.end = pushedSegment.o.start;
      // segmentClon.o.uuid = segmentClon.uuid + "B";
      secondSegOpt.start = pushedSegment.o.end;

      var firstSegment = new new self.segmentConstructor(firstSegOpt);
      var secondSegment = new new self.segmentConstructor(secondSegOpt);


      changedSegments = [firstSegment.o.uuid, secondSegment.uuid, pushedSegment.o.uuid];

      // ????
      changedSegments.push(origName);

      segments.splice(startSeg,1,[firstSegment, pushedSegment, secondSegment]);
      // segments.splice(startSeg+1,0,pushedSegment);
      // segments.splice(startSeg+2,0,segmentClon);


    } else {
      infoLog(" Pushed segment is coming thru more segments");
      segments[startSeg].o.end = pushedSegment.o.start;
      segments[endSeg].o.start = pushedSegment.o.end;

      var firstSegOpt = Object.assign({}, segments[startSeg].o);
      var secondSegOpt = Object.assign({}, segments[endSeg].o);

      firstSegOpt.end = pushedSegment.o.start;
      secondSegOpt.start = pushedSegment.o.end;

      var firstSegment = new new self.segmentConstructor(firstSegOpt);
      var secondSegment = new new self.segmentConstructor(secondSegOpt);


      changedSegments = [segments[startSeg].o.uuid, segments[endSeg].o.uuid, pushedSegment.o.uuid];

      var removedSegments = segments.splice(startSeg,endSeg-startSeg,[firstSegment ,pushedSegment ,secondSegment]);

      for (var i=0; i < removedSegments.length; i++){
        changedSegments.push(removedSegments[i].o.uuid);
      }
    }

    debugLog(changedSegments);

    return changedSegments;
  }

  // remove segment from segmentsG and scene
  this.removeSegment = function (segment){

    for (var i=0; i < this.segments.length; i++) {

      if (this.segments[i].o.uuid ==  segment.o.uuid) {
        this.segments.splice(i,1);
        infoLog(" Removing and disposing segment: " + segment.o.uuid);
        // segment.Mesh.dispose();
        this.scene3d.remove(segment.Mesh);
      }

    }
  }

  this.changeSegmentPars = function (pars){
    console.log("pini change");
    return;
  }

  // updates timeline segments based on which segments needs to change
  this.updateTimeline = function ( segments, changed ) {
    // TBD make it so, that when changed not defined it just refresh all segments
    for (var i=0; i < changed.length; i++){

      var selectedObject = scene3d.getObjectByName(changed[i]);
      if (selectedObject != undefined) {
        console.log("Removing segment: " + changed[i]);
        scene3d.remove( selectedObject );
        // renderer.deallocateObject( selectedObject );
      }

      for (var y=0; y < segments.length; y++) {
        if (segments[y].uuid == changed[i]){
          console.log("Adding segment: " + segments[y].uuid);
          addSegmentToScene(segments[y], scene, birthDateINP);
        }
      }
    }
    console.log(segments);
  }

}

///////////////////////////////////////////////////////////////////
// 3D panel constructor.
//
///////////////////////////////////////////////////////////////////

function The3DpanelCONSTR (options) {

  var self = this;

  this.o = options;

  this.css3d = undefined;
  this.plane = undefined;
  this.html = undefined;
  this.line = undefined;

  this._createPlane = function ( ) {

    var material = new THREE.MeshBasicMaterial({
     color: 0x000000,
     opacity: 0.0,
     side: THREE.DoubleSide
    });

   var geometry = new THREE.RoundedSquare( this.o.width, this.o.height );
   var mesh = new THREE.Mesh(geometry, material);

   mesh.position.copy( this.o.position );
   mesh.rotation.x = this.o.rotation.x;
   mesh.rotation.y = this.o.rotation.y;
   mesh.rotation.z = this.o.rotation.z;

   this.plane = mesh;

   this.plane.dad = this;

  }

  this._createCssObject = function ( ) {

    var cssObject = new THREE.CSS3DObject( this.html );

    cssObject.position.copy( this.o.position );
    cssObject.rotation.x = this.o.rotation.x;
    cssObject.rotation.y = this.o.rotation.y;
    cssObject.rotation.z = this.o.rotation.z;

    this.css3d = cssObject;

    this.css3d.dad = this;

    // return cssObject;

  }

  this._setTemplateElements = function ( ) {

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

    div.style.width = this.o.width;
    div.style.height = this.o.height;

    //  div.setAttribute("myPlaneID", planeID);

    //  Closing cross
    if (div.getElementsByClassName('glyphicon-remove')[0] !== undefined ) {
      infoLog("glyphicon-remove found");
      var closeCross = div.getElementsByClassName('glyphicon-remove')[0];
      closeCross.setAttribute("onclick", "deleteObjectWRP(['" + this.o.uuid + "'])");
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

    this.html = div;
  }

  this._createLine = function ( ) {

    var lineGeometry = new THREE.Geometry();

    // Start on center of helix
    lineGeometry.vertices.push(new THREE.Vector3(0,0,0));
    // ends on edge of panel
    lineGeometry.vertices.push(new THREE.Vector3(500,300,100));

    var line = new THREE.Line(lineGeometry);

    scene.add(line);
  }

  this._createPositionRing = function ( ) {
    // similiar to pointer donut. But static on time, where mediapanel is placed
  }

  this.create3dPanel = function() {

    if ( this.o.template.indexOf('rightClick') >= 0 || this.o.template == "default" ) {
      this.o.type = "FreePanel";
    } else {
      this.o.type = "FixPanel";
    }

    infoLog(" Creating html panel with html from template: " + this.template);

    self._createPlane();
    this.o.uuid = this.plane.uuid;

    self._setTemplateElements();

    debugLog(this.html);

    self._createCssObject();
    this.css3d.uuid = this.plane.uuid;
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

    var filledTemplate = self._setTemplateElements( this.o.width, this.o.height, emptyTemplate, object.o, this.plane.uuid );

    infoLog(" Filled template from putTemplate: ");
    debugLog(filledTemplate);

    this.html.innerHTML = filledTemplate.innerHTML;
  }

  this.setRotationY = function ( angle ) {

    this.plane.rotation.y = angle;
    this.css3d.rotation.y = angle;
    this.o.rotation = this.plane.rotation;

  }

  this.setPosition = function ( newPosition ) {

    this.plane.position.copy(newPosition);
    this.css3d.position.copy(newPosition);

    this.o.position = newPosition;

  }

  this.setSize = function ( w, h ) {

    // var thisW = this.o.width;
    // var thisH = this.o.height;
    //
    // var scaleX =  w / thisW ;
    // var scaleY =  h / thisH;
    //
    //
    // if(scaleX != 1 && scaleY != 1){
    //
    //   infoLog("scaling X: " +scaleX+ " Y: "+scaleY);
    //
    //   this.plane.scale.x = scaleX;
    //   this.plane.scale.y = scaleY;
    //
      this.html.style.width = w;
      this.html.style.height = h;

      this.o.width = w;
      this.o.height = h;
    // }

    // var plane = self._createPlane( this.o.width, this.o.height, this.o.position, this.o.rotation);

    this.plane.geometry = new THREE.RoundedSquare(w, h);
  }

  this.visible = function ( visible ) {

    if (visible) {

      infoLog(" Making panel visible.")

      this.o.visible = true;
      this.plane.visible = true;
    } else {

      infoLog(" Making panel NOT visible.")

      this.o.visible = false;
      this.plane.visible = false;
    }

  }

  // create 3D panel during init.
  this.create3dPanel();
}

///////////////////////////////////////////////////////////////////
// 3D pointer constructor. DONUT
//
///////////////////////////////////////////////////////////////////

function ThePointerCONSTR (options) {

  var self = this;

  this.o = options;

  this.Mesh = undefined;

  this.visible = function ( visible ) {
    if ( visible ) {

      // infoLog(" Making pointer visible.");

      this.o.visible = true;
      this.Mesh.visible = true;
    } else {

      // infoLog(" Making pointer NOT visible.");

      this.o.visible = false;
      this.Mesh.visible = false;
    }
  }

  this.putPosition =  function ( position ) {
    this.Mesh.position.copy(position);
    this.o.position = position;
  }

  this.createPointer = function () {
    var material = new THREE.MeshBasicMaterial( { color: this.o.color });
    var geometry = new THREE.TorusGeometry(this.o.radius, this.o.thickness, 20, 100);
    this.Mesh = new THREE.Mesh( geometry, material );
    this.Mesh.visible = this.o.visible;
  }

  this.createPointer()
}

///////////////////////////////////////////////////////////////////
// LIST OF PANELS CONSTR
//
///////////////////////////////////////////////////////////////////

function ObjectsListCONSTR(scene, cssScene, panelConst, pointerConst) {

  var self = this;

  this.scene3d = scene;
  this.css3dScene = cssScene;

  this.panelConstructor = panelConst;
  this.pointerConstructor = pointerConst;

  function objectOptionsCONST () {
    this.type = "FreePanel",
    this.uuid = "",
    this.template = "default",
    this.width = 350,
    this.height = 250,
    this.position = new THREE.Vector3(0, 0, 0),
    this.rotation = new THREE.Vector3(Math.PI/2, 0, 0),
    this.timePosition = 0,
    this.color = 0xFFFFFF,
    this.visible = true,
    this.transparency = 0,
    this.buddy = undefined
  }

  function pointerOptionsCONST () {
    this.type = "Pointer",
    this.uuid = "",
    this.radius = 10,
    this.thickness = 3,
    this.position = new THREE.Vector3(0, 0, 0),
    this.rotation = new THREE.Vector3(Math.PI/2, 0, 0),
    this.timePosition = 0,
    this.color = 0x000000,
    this.visible = true,
    this.transparency = 0
  }

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
    infoLog("Looking for prop: "+prop+ " val: "+ value);
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
    this.css3dScene.remove( object.css3d );

    this.objects.splice( index, 1 );

  }

  this.placePanel = function ( action, onObject, mousePointer ) {

    var freePanel = self.getByProp( "type", "FreePanel" );

    if ( freePanel !== undefined ) {
      self.removeObject( freePanel );
    }

    var newOpts = new objectOptionsCONST ();

    newOpts.buddy = onObject;

    var xOffset = newOpts.width/2 + onObject.o.thickness;
    var yOffset = newOpts.height/2 + onObject.o.thickness;

    // var centerPoint = onObject.getCenterFromSurface(mousePointer);
    var offsetPoint = onObject.getCenterFromSurface(mousePointer, xOffset, yOffset);

    newOpts.position =  offsetPoint;

    newOpts.rotation = new THREE.Vector3(camera.rotation.x, camera.rotation.y, camera.rotation.z);

    newOpts.template = action + onObject.o.type;

    return self.createPanel( newOpts );
  }

  this.createPanel = function ( options ) {

    var newPanel = new self.panelConstructor( options );

    this.scene3d.add(newPanel.plane);
    this.css3dScene.add(newPanel.css3d);

    this.objects.push(newPanel);

    return newPanel;
  }

  this.placePointerOnHelix = function (helix, mousePoint) {

    var pointer = self.isTypeInList("Pointer");

    if (pointer !== false) {

      // infoLog(pointer.o.position.z +" =? "+helix.getCenterFromSurface( mousePoint ).z);
      // if (pointer.o.position.z === helix.getCenterFromSurface( mousePoint ).z) {
      //   return;
      // }

      var pointerRadius = pointer.Mesh.geometry.parameters.radius;

      if (pointerRadius == helix.o.thickness) {

        pointer.visible(true);

        pointer.putPosition( helix.getCenterFromSurface( mousePoint ) );

        var helixVector = helix.helixFunction(helix.getTFromZ(pointer.o.position.z)+0.0001, true);

        pointer.Mesh.lookAt( helixVector );

        return;

      } else {

        self.removeObject(pointer);

      }

    }

    var pointerOpts = new pointerOptionsCONST();

    pointerOpts.radius = helix.o.thickness;

    self.createPointer(pointerOpts);

  }

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

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

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

  Panels = new ObjectsListCONSTR(scene, cssScene, The3DpanelCONSTR, ThePointerCONSTR);

  Segments = new SegmentListCONSTR(scene, SegmentCONSTR);

  Segments.genDefaultSegments(birthDate);


  // console.log(Panels);

  // set some camera attributes
  var VIEW_ANGLE = 45,
    ASPECT = window.innerWidth / window.innerHeight,
    NEAR = 0.1,
    FAR = 100000;

  camera = new THREE.PerspectiveCamera(
      VIEW_ANGLE,
      ASPECT,
      NEAR,
      FAR);

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
  var lineGeometry = new THREE.Geometry();
  lineGeometry.vertices.push(new THREE.Vector3(0,0,0));
  lineGeometry.vertices.push(new THREE.Vector3(500,300,100));
  var line = new THREE.Line(lineGeometry);

  scene.add(line);

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

    var segment = Segments.getByProp("uuid", uuid);

    if ( segment !== undefined ){

      Segments.removeSegment ( segment );

      Panels.getByProp( "type", "Pointer" ).visible(false);

    }

    var panel = Panels.getByProp("uuid", uuid);

    if ( panel !== undefined) {

      Panels.removeObject( panel );

    }
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

function leftCliked(circleObj) {
  var action = "leftClick";
  var intersects = raycaster.intersectObjects( scene.children );
  // console.log(intersects);

    for (var i = 100; i < intersects.length; i++) {

      var intersecObj = intersects[ i ].object;

      if (intersecObj.hasOwnProperty("dad")) {

      var helix = intersecObj.helix;
      var mousePointer = intersects[ i ].point;
      var centerPoint = helix.getCenterFromSurface(mousePointer);
      console.log(intersecObj);
      helix.TALK();

      // $.get("data/panel.htm",function(data){

        var panel = create3dPanel(
          150, 100,
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(Math.PI/2, 0, 0),
          action + helix.info.type,
          helix.info);

        plane = panel[0];
        var cssObj = panel[1];

        var xOffset = 100;
        var yOffset = 50;

        var centerPoint = helix.getCenterFromSurface(mousePointer);
        var offsetPoint = helix.getCenterFromSurface(mousePointer, xOffset, yOffset)

        plane.position.copy(offsetPoint);
        cssObj.position.copy(offsetPoint);

        plane.rotation.y = helix.getAngle(centerPoint);
        cssObj.rotation.y = helix.getAngle(centerPoint);

        // plane.visible = false;
      // });



      // var centerPoint = helix.getCenterFromSurface(intersects[ i ].point);
      // var offset = 100;
      //
      // plane.position.copy(helix.getCenterFromSurface(intersects[ i ].point, offset));
      // cssObject.position.copy(helix.getCenterFromSurface(intersects[ i ].point, offset));
      //
      // cssObject.rotation.y = helix.getAngle(centerPoint);
      // plane.rotation.y = helix.getAngle(centerPoint);

      // Segments inserting START
      if (segDurationG == 0 ) {
        segDurationG = intersecObj.helix.getTimeFromPoint(centerPoint);
      } else {
        var changedSegments = pushSegment(createSegment(segDurationG, intersecObj.helix.getTimeFromPoint(centerPoint)), segmentsG);
        updateTimeline(scene, segmentsG, changedSegments);

        segDurationG = 0;
        animate();
      }
      // Segments inserting END

      // var dta = new Date();
      // dta.setTime(intersecObj.helix.getTimeFromPoint(circleObj.position));
      // console.log(dta);
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

  var helix = onObject.dad;

  var centerPoint = helix.getCenterFromSurface(mousePointer);

  // DEBUG
  console.log(onObject);
  helix.TALK();

  if (action.indexOf('rightClick') >= 0) {

    var freePanel = Panels.placePanel( action, helix, mousePointer );

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

  raycaster.setFromCamera( mouse, camera );

  var intersects = raycaster.intersectObjects( scene.children );

  // if ( intersects.length == 0 ) {Panels.getByProp( "type", "Pointer" ).visible(false)};

    for (var i = 0; i < intersects.length; i++) {

      var intersecObj = intersects[ i ].object;
      // console.log(intersecObj, i);

      if (intersecObj.hasOwnProperty( "dad" )) {

        var helix = intersecObj.dad;

        if ( helix.o.type == "Segment" ){

          Panels.placePointerOnHelix( helix, intersects[ 0 ].point );

          break;

        }

      } else {

        var pointer = Panels.isTypeInList( "Pointer" );

        if ( pointer !== false ){

          pointer.visible( false );

        }

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
