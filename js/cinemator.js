function Cinemator( camera, target ) {

  // TBD speed of animation based on time not on framerate so animation speed will be independent on FPS

  this._camera = camera;
  this._target =  target;

  this.cameraSpline =  new THREE.CatmullRomCurve3( );
  this.targetSpline =  new THREE.CatmullRomCurve3( );
  this.rotationSpline =  new THREE.CatmullRomCurve3( );

  // Delay spline is just 2D curve that controls size of incement of T and therefore speed of animation.
  this.delaySpline = new THREE.SplineCurve();

  this.enabled = true;

  this._steps = 1000;
  this._T = 1;

  // this._waitFor = 0;
}

// THREE.SplineCurve.prototype.getPoint = function ( t ) {
//
//   var points = this.points;
//   var point = ( points.length - 1 ) * t;
//
//   var intPoint = Math.floor( point );
//   var weight = point - intPoint;
//
//   var point0 = points[ intPoint === 0 ? intPoint : intPoint - 1 ];
//   var point1 = points[ intPoint ];
//   var point2 = points[ intPoint > points.length - 2 ? points.length - 1 : intPoint + 1 ];
//   var point3 = points[ intPoint > points.length - 3 ? points.length - 1 : intPoint + 2 ];
//
//   // var interpolate = exports.CurveUtils.interpolate;
//
//   return new THREE.Vector3(
//     1,
//     THREE.CurveUtils.interpolate( point0.y, point1.y, point2.y, point3.y, weight ),
//     THREE.CurveUtils.interpolate( point0.x, point1.x, point2.x, point3.x, weight )
//   );
//
// };



Cinemator.prototype.animate = function () {

  if ( !this.enabled ) {
    return;
  }

  if ( this._T < 1 ) {

    this._camera.position.copy(this.cameraSpline.getPoint(this._T));
    this._camera.up.copy(this.rotationSpline.getPoint(this._T));
    this._target.copy(this.targetSpline.getPoint(this._T));

    this._T += 1 / ( this._steps * this.delaySpline.getPoint(this._T).y );
  }


}

Cinemator.prototype.createCameraTargetPath = function ( cameraKeyPoints, rotationKeyPoints, targetKeyPoints, delayKeyPoints ) {

  this.cameraSpline.points = cameraKeyPoints;
  this.rotationSpline.points = rotationKeyPoints;
  this.targetSpline.points = targetKeyPoints;

  this.delaySpline.points = delayKeyPoints;

  this._T = 0;


}

Cinemator.prototype.pushKeyPointsToPaths = function ( cameraKeyPoint, cameraRotationKeyPoint, targetPositionKeyPoint, delayKeyPoint ) {


  this.cameraSpline.points.push( cameraKeyPoint );
  this.rotationSpline.points.push( cameraRotationKeyPoint );
  this.targetSpline.points.push( targetPositionKeyPoint );

  this.delaySpline.points.push( delayKeyPoint );

  this.enabled = true;
  this._T = 0;

}

// Used to stop animation
Cinemator.prototype.pause = function ( ) {
  if ( this.enabled ) {
    this.enabled = false;
    return;
  }

  this.enabled = true;
}

// Used to stop animation
Cinemator.prototype.stop = function ( ) {
  this._T = 1;
}

// Adds to scene camera, target paths. Useful for debugging.
Cinemator.prototype.showSplines = function () {

  var cameraGeometry = new THREE.Geometry();
  cameraGeometry.vertices = this.cameraSpline.getPoints( 200 );
  const cameraMaterial = new THREE.LineBasicMaterial( { color : 0xff0000 } );
  const cameraCurve = new THREE.Line( cameraGeometry, cameraMaterial );

  scene.add(cameraCurve);


  var rotationGeometry = new THREE.Geometry();
  rotationGeometry.vertices = this.rotationSpline.getPoints( 200 );
  const rotationMaterial = new THREE.LineBasicMaterial( { color : 0x00ff00 } );
  const rotationCurve = new THREE.Line( rotationGeometry, rotationMaterial );

  scene.add(rotationCurve);


  var targetGeometry = new THREE.Geometry();
  targetGeometry.vertices = this.targetSpline.getPoints( 200 );
  const targetMaterial = new THREE.LineBasicMaterial( { color : 0x0000ff } );
  const targetCurve = new THREE.Line( targetGeometry, targetMaterial );

  scene.add(targetCurve);

  // var delayGeometry = new THREE.Geometry();
  // delayGeometry.vertices = this.delaySpline.getPoints( 200 );
  // const delayMaterial = new THREE.LineBasicMaterial( { color : 0x000000 } );
  // const delayCurve = new THREE.Line( delayGeometry, delayMaterial );
  //
  // scene.add(delayCurve);


}
