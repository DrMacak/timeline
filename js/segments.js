///////////////////////////////////////////////////////////////////
// SEGMENTS
//
///////////////////////////////////////////////////////////////////

// Put one segment to scene
function addSegmentToScene (segment, scene, bD) {

  var polygons = 1000;
  var radius = 8;
  var radialPolygons = 12;
  // var closed = false;
  // var taper = true;

  // Set what kind of object it is
  segment.type = "Segment";

  var HelixOBJ = new TheHelixCurveCONSTR ();
  HelixOBJ.init(bD);

  HelixOBJ.setSegment(segment.start, segment.end);

  HelixOBJ.info = segment;
  var randColor = Math.random() * 0xffffff;

  // var material = new THREE.MeshBasicMaterial( { color: segment.color } );
  var material = new THREE.MeshBasicMaterial( { color: randColor} );
  segment.color = Math.floor(randColor).toString(16);


  material.side = THREE.DoubleSide;
  // console.log(HelixOBJ.getSegmentRatio());
  var object = new THREE.TubeGeometry(new HelixOBJ.helixCurve(), HelixOBJ.getReducedPolygons(polygons), radius, radialPolygons, closed);
  var tubeMesh =  new THREE.Mesh ( object, material);
  tubeMesh.name = segment.uuid;
  tubeMesh.helix = HelixOBJ;

  scene.add(tubeMesh);
}

// Create segment object
function createSegment (start, end, uuid, color, visible, transparency, type) {
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

// Generating list of segments
function genSegments (bDate) {
  // in future there will some cookies(backend) check or what-ever to get users stored data
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
    var segmentO = createSegment(interuptions[i], interuptions[i+1], "Segment #"+i)
    segmentsList.push(segmentO);
  }
  console.log(segmentsList);
  return segmentsList;
}

// push segment into segmentsG
function pushSegment (segmentObj, segments) {
  // TBD I should order segmentList by start time to be sure.
  var changedSegments = [];
  console.log(segmentObj);
  // number of segment in seglist in which pushed segment starts
  var startSeg = 0;
  for (var i=0; i < segments.length; i++){
    if (segmentObj.start > segments[i].start) {startSeg = i;}
  }

  // number of segment in seglist in which pushed segment ends
  var endSeg = 0;
  for (var i=0; i < segments.length; i++){
    if (segmentObj.end < segments[i].end) {endSeg = i; break;}
  }

  console.log(startSeg, endSeg);

  if ((endSeg - startSeg) == 1 ) {
    console.log("Thru TWO seg");
    segments[startSeg].end = segmentObj.start;
    segments[endSeg].start = segmentObj.end;

    changedSegments = [segments[startSeg].uuid, segments[endSeg].uuid, segmentObj.uuid];

    segments.splice(startSeg+1,0,segmentObj);

  } else if (endSeg == startSeg) {
    console.log("In one segment");
    var segmentClon = Object.assign({}, segments[startSeg]);

    var origName = segments[startSeg].uuid;

    segments[startSeg].uuid = segments[startSeg].uuid + "A";
    segments[startSeg].end = segmentObj.start;
    segmentClon.uuid = segmentClon.uuid + "B";
    segmentClon.start = segmentObj.end;

    changedSegments = [segments[startSeg].uuid, segmentClon.uuid, segmentObj.uuid];
    changedSegments.push(origName);

    segments.splice(startSeg+1,0,segmentObj);
    segments.splice(startSeg+2,0,segmentClon);


  } else {
    console.log("Comming thru more segments");

    segments[startSeg].end = segmentObj.start;
    segments[endSeg].start = segmentObj.end;
    changedSegments = [segments[startSeg].uuid, segments[endSeg].uuid, segmentObj.uuid];
    var removedSegments = segments.splice(startSeg+1,endSeg-startSeg-1,segmentObj);

    for (var i=0; i < removedSegments.length; i++){
      changedSegments.push(removedSegments[i].uuid);
    }

  }
  console.log("ChangedSeg "+changedSegments);
  return changedSegments;
}

// remove segment from segmentsG and scene
function removeSegment (name){
  for (var i=0; i < segmentsG.length; i++) {
    // console.log(segmentsG[i].uuid);
    if (segmentsG[i].uuid ==  name) {
      segmentsG.splice(i,1);
      console.log("removing and disposing segment: " + name);
      scene.getObjectByName(name).dispose();
      scene.remove(scene.getObjectByName(name));
    }
  }
}

function changeSegmentPars (pars){
  console.log("pini change");
  return;
}

// updates timeline segments based on which segments needs to change
function updateTimeline (scene, segments, changed) {
  // TBD make it so, that when changed not defined it just refresh all segments
  for (var i=0; i < changed.length; i++){
    var selectedObject = scene.getObjectByName(changed[i]);
    if (selectedObject != undefined) {
      console.log("Removing segment: " + changed[i]);
      scene.remove( selectedObject );
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
