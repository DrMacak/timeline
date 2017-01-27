// Should make class around it.
function userInput ( type, data ) {
  // type > panels, segments
  var retrievedObjects = localStorage.getItem(type);
  localStorage.setItem( type, JSON.stringify( retrievedObjects.push(data) ));
}


function cleanStorage ( ) {
  localStorage.clear();
}
