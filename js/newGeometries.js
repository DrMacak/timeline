THREE.RoundedSquare = function (width, height, radius, segments) {

  // Default radius based on width and height, when not specified.
  const _radius = radius || ( (width + height) / 30 );
  const _segments = segments || 8;

	const offsetH = (width - 2*_radius) / 2;
  const offsetV = (height - 2*_radius) / 2;

  var geometry = new THREE.Geometry();

	var corner = new THREE.CircleGeometry( _radius, _segments, (Math.PI * 2 / 4) * 1, Math.PI * 2 / 4 );
	var matrix = new THREE.Matrix4();

	matrix.makeTranslation( 0-offsetH, 0+offsetV, 0 );
	geometry.merge(corner, matrix);

	corner = new THREE.CircleGeometry( _radius, _segments, (Math.PI * 2 / 4) * 0, Math.PI * 2 / 4 );
	matrix.makeTranslation( 0+offsetH, 0+offsetV, 0 );
	geometry.merge(corner, matrix);

	corner = new THREE.CircleGeometry( _radius, _segments, (Math.PI * 2 / 4) * 3, Math.PI * 2 / 4 );
	matrix.makeTranslation (0+offsetH, 0-offsetV, 0 );
	geometry.merge( corner, matrix );

	corner = new THREE.CircleGeometry( _radius, _segments, (Math.PI * 2 / 4) * 2, Math.PI * 2 / 4 );
	matrix.makeTranslation( 0-offsetH, 0-offsetV, 0 );
	geometry.merge( corner, matrix );

	const planeA = new THREE.PlaneGeometry(width, height-2*_radius);
	geometry.merge( planeA );

	const planeB = new THREE.PlaneGeometry(width-2*_radius, height);
	geometry.merge( planeB );

  geometry.parameters = {
    width,
    height,
    radius : _radius,
    segments : _segments
  };

	return geometry;
}
