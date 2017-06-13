function Cinemator( camera, target ) {

  this._camera = camera;
  this._target =  target;

  this.enabled = true;

  this._queue = [];

  this._pointA = new THREE.Vector3();
  this._pointB = new THREE.Vector3();

  this._targetA = new THREE.Vector3();
  this._targetB = new THREE.Vector3();

  this._rotationA = new THREE.Vector3();
  this._rotationB = new THREE.Vector3();

  this._steps = 250;
  this._counter = this._steps + 1;
  this._waitFor = 0;

  this._stepPosX = 0;
  this._stepPosY = 0;
  this._stepPosZ = 0;

  this._stepTarX = 0;
  this._stepTarY = 0;
  this._stepTarZ = 0;

  this._stepRotX = 0;
  this._stepRotY = 0;
  this._stepRotZ = 0;

  // Tudoo
  // Improve transmission to be non-linear, and to be sure you will get on final point.
  this._damping = 0;

}

Cinemator.prototype.animate = function () {

  if ( !this.enabled ) {
    return;
  }

  if ( this._counter <= this._steps ) {
    this._counter++;

    if ( !(this._stepPosX == 0 && this._stepPosY == 0 && this._stepPosZ == 0) ) {
      this._camera.position.copy( new THREE.Vector3( this._pointA.x + this._stepPosX * this._counter, this._pointA.y + this._stepPosY * this._counter , this._pointA.z + this._stepPosZ * this._counter ));
    }

    if ( !(this._stepRotX == 0 && this._stepRotY == 0 && this._stepRotZ == 0) ) {
      this._camera.up.copy( new THREE.Vector3( this._rotationA.x + this._stepRotX * this._counter, this._rotationA.y + this._stepRotY * this._counter , this._rotationA.z + this._stepRotZ * this._counter ));
    }

    if ( !(this._stepTarX == 0 && this._stepTarY == 0 && this._stepTarZ == 0) ) {
      this._target.copy( new THREE.Vector3( this._targetA.x + this._stepTarX * this._counter, this._targetA.y + this._stepTarY * this._counter , this._targetA.z + this._stepTarZ * this._counter ));
    }

  } else if ( this._waitFor > 0 ) {

    this._waitFor--;

  } else if ( this._queue.length > 0 ) {

    const newCoordinates = this._queue.shift();

    this.animateCameraToB( newCoordinates[0] );
    this.animateRotationToB( newCoordinates[1] );
    this.animateTargetToB( newCoordinates[2] );

    this._waitFor = newCoordinates[3];
    this._steps = newCoordinates[4];

    this._counter = 0;
  }

}

Cinemator.prototype.pushToAnimationQueue = function ( cameraPositionB, cameraRotationB, targetPositionB, waitFor, steps ) {

  var _cameraPositionB = new THREE.Vector3();
  _cameraPositionB.copy( cameraPositionB );

  var _cameraRotationB = new THREE.Vector3();
  _cameraRotationB.copy( cameraRotationB );

  var _targetPositionB = new THREE.Vector3();
  _targetPositionB.copy( targetPositionB );

  const _waitFor = waitFor || 0;
  const _steps = steps || 250;


  this._queue.push( [ _cameraPositionB, _cameraRotationB, _targetPositionB, _waitFor, _steps ] );
}

Cinemator.prototype.animateCameraToB = function ( pointB ) {

  var pointA = new THREE.Vector3();
  pointA.copy( this._camera.position );

  this.animateCameraFromAtoB( pointA, pointB );

}

Cinemator.prototype.animateCameraFromAtoB = function ( pointA, pointB ) {

  this._stepPosX = ( pointB.x - pointA.x ) / this._steps;
  this._stepPosY = ( pointB.y - pointA.y ) / this._steps;
  this._stepPosZ = ( pointB.z - pointA.z ) / this._steps;

  this._pointA.copy( pointA );
  this._pointB.copy( pointB );

  this._counter = 0;

}

Cinemator.prototype.animateRotationToB = function ( rotationB ) {

  var rotationA = new THREE.Vector3();
  rotationA.copy( this._camera.up );

  this.animateRotationFromAtoB( rotationA, rotationB );

}

Cinemator.prototype.animateRotationFromAtoB = function ( rotationA, rotationB ) {

  this._stepRotX = ( rotationB.x - rotationA.x ) / this._steps;
  this._stepRotY = ( rotationB.y - rotationA.y ) / this._steps;
  this._stepRotZ = ( rotationB.z - rotationA.z ) / this._steps;

  this._rotationA.copy( rotationA );
  this._rotationB.copy( rotationB );

  this._counter = 0;

}

Cinemator.prototype.animateTargetToB = function ( targetB ) {

  var targetA = new THREE.Vector3();
  targetA.copy( this._target );

  this.animateTargetFromAtoB( targetA, targetB );

}

Cinemator.prototype.animateTargetFromAtoB = function ( targetA, targetB ) {

  this._stepTarX = ( targetB.x - targetA.x ) / this._steps;
  this._stepTarY = ( targetB.y - targetA.y ) / this._steps;
  this._stepTarZ = ( targetB.z - targetA.z ) / this._steps;

  this._targetA.copy( targetA );
  this._targetB.copy( targetB );

  this._counter = 0;

}
