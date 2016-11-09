THREE.RoundedSquare = function (width, height, radius, segments) {

  // Default radius based on width and height, when not specified.
  var _radius = radius || ( (width + height) / 30 );
  var _segments = segments || 8;

	var offsetH = (width - 2*_radius) / 2;
  var offsetV = (height - 2*_radius) / 2;

  var geometry = new THREE.Geometry();

	var corner = new THREE.CircleGeometry(_radius, _segments, (Math.PI * 2 / 4) * 1, Math.PI * 2 / 4);
	var matrix = new THREE.Matrix4();

	matrix.makeTranslation(0-offsetH, 0+offsetV, 0);
	geometry.merge(corner, matrix);

	corner = new THREE.CircleGeometry(_radius, _segments, (Math.PI * 2 / 4) * 0, Math.PI * 2 / 4);
	matrix.makeTranslation(0+offsetH, 0+offsetV, 0);
	geometry.merge(corner, matrix);

	corner = new THREE.CircleGeometry(_radius, _segments, (Math.PI * 2 / 4) * 3, Math.PI * 2 / 4);
	matrix.makeTranslation(0+offsetH, 0-offsetV, 0);
	geometry.merge(corner, matrix);

	corner = new THREE.CircleGeometry(_radius, _segments, (Math.PI * 2 / 4) * 2, Math.PI * 2 / 4);
	matrix.makeTranslation(0-offsetH, 0-offsetV, 0);
	geometry.merge(corner, matrix);

	var planeA = new THREE.PlaneGeometry(width, height-2*_radius);
	geometry.merge(planeA);

	var planeB = new THREE.PlaneGeometry(width-2*_radius, height);
	geometry.merge(planeB);

  geometry.parameters = {
    width,
    height,
    radius : _radius,
    segments : _segments
  };

	return geometry;
}
