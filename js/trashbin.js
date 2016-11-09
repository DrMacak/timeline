
// Changing from MESH > helix to helix > mesh idea
function TheHelixCurveCONSTR () {

  var self = this;

  // Some basic parameters of the Helix

  // radius
  this.radius = 120;

  //slope
  this.slope = 0;

  // number or threads
  this.rotations = 1 ;

  // When slope is inited its too much because its ms of time so it should be reduced.
  var slopeReduce = 100000000;

  // T limits for generating only segment of whole helix
  this.dT = 0;
  this.lT = 1;

  // Time parameters
  this.startDate = 0;
  this.endDate = 0;

  // place to store segment object???
  // this.info = {};

  this.Object3D = undefined;

  // ---

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
    var tL = self.tDateLimit(t+this.dT);

    if (pure) { tL = t }

    var radiusLoc = radiusOffset + this.radius || this.radius;
    var zOffLoc = zOffset || 0;


    var t2 = tL*(Math.PI*2)*this.rotations;
    var tx = Math.cos( t2 )*radiusLoc,
      ty = Math.sin( t2 )*radiusLoc,
      tz = this.slope * tL + zOffLoc;
    return new THREE.Vector3( tx, ty, tz );
  }

  //  This method check the lT (T limit). This should be redone to stretch part of whole t to small one.
  this.tDateLimit = function(t) {
    if (t >= this.lT) {
      return this.lT;
    }
    return t;
  }

   // Generate THREE curve based on helix function
  this.helixCurve = THREE.Curve.create(
    function() {},
    function( t ) {
      return self.helixFunction(t);
   }
  );

  // Set upper and lower T limit for segment. Based on segment times of end/start
  this.setSegment =  function(segStart, segEnd) {
     this.dT = self.getTFromZ((segStart - this.startDate )/slopeReduce);
     this.lT = self.getTFromZ((segEnd - this.startDate)/slopeReduce);
    //  console.log(this.dT, this.lT);
  }

  this.getTimeFromPoint = function (point) {
    // console.log(self.getTFromZ(point));
    return (self.getTFromZ(point.z) * this.slope * slopeReduce + this.startDate.getTime());
  }

  this.getTFromZ = function (z) {
    if (z > this.slope) {console.log("Warning - T from Z: z is too high returning 1. z: " + z); return 1;}
    if (z < 0) {console.log("Warning - T from Z: z is too low returning 0. z: " + z); return 0;}
    return z/this.slope;
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
    var reducedPolygons =  Math.floor(((this.lT - this.dT) / 1)*polygons);
    if (reducedPolygons > threshHold) {
      return reducedPolygons;
    } else {
      return threshHold;
    }
  }

  this.getAngle = function(point) {
    // var rotations = {
    //   x: 0,
    //   y: 0
    // }
    var polarity = 1;
    if (point.y < 0) { polarity = -1 }
    var X = self.helixFunction(self.getTFromZ(point.z), true).x/this.radius;
    // var Y = self.helixFunction(self.getTFromZ(point.z), true).y/this.radius;
    var angle = Math.acos(X*polarity);
    // rotations.y = Math.acos(X*-1)*-1;

    return angle;
  }

  // Who is that???
  this.TALK = function() {
    console.log("This is segment '"+ this.info.uuid +"' starts at: "+ this.info.start +" and ends at: "+ this.info.end);
  }

  this.create3Dsegment = function (info) {


  }
}
