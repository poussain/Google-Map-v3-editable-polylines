var mSize = new google.maps.Size(32, 32);
var mOrigin= new google.maps.Point(0,0);
var mAnchor = new google.maps.Point(10, 30);


var endMarkerImage = new google.maps.MarkerImage('edit_marker_end.png',
    mSize,
    mOrigin,
    mAnchor);
var midMarkerImage = new google.maps.MarkerImage('edit_marker_mid.png',
 		mSize,
		mOrigin,
		mAnchor);


function radius(p1, p2) {
  if (!p1 || !p2) {
    return 0;
  }
  var R = 6371; // Radius of the Earth in km
  var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
  var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
};

function EditablePolyline(options) {
	this.attached_data = false;
	this.is_editing = false;
	this.setOptions(options);
	this.editPolyline = new google.maps.Polyline({
	  strokeOpacity: 0.4,
		strokeWeight: 3
	
	});
	this.editMarkers = [];	
	this.drawMarkers = [];	
}

EditablePolyline.prototype = new google.maps.Polyline();

//This could be fired when a polyline with an empty path is added to a map, but "onAdd" doesn't seem to work
EditablePolyline.prototype.startDrawing = function() {
	
	this.getMap().setOptions(
	{
		draggableCursor:"crosshair",
		draggingCursor:"crosshair"
	});
	currentLine = this;
	google.maps.event.addListener(this.getMap(), 'click', function(event) {
		currentLine.addDrawMarker(event.latLng);
		currentLine.getPath().push(event.latLng);
  });
}

EditablePolyline.prototype.addDrawMarker = function(position) {

	var marker = new google.maps.Marker({
    position: position,
		icon: endMarkerImage
  });
	marker.setMap(this.getMap());	
	this.drawMarkers.push(marker)
	currentLine.refreshMarkersListeners();
}

EditablePolyline.prototype.refreshMarkersListeners = function() {
	for (var i = this.drawMarkers.length - 1; i >= 0; i--){
		currentLine = this;
		google.maps.event.clearListeners(this.drawMarkers[i], 'click');
		if (i==this.drawMarkers.length - 1) {
			google.maps.event.addListener(this.drawMarkers[i], 'click', function() {
				//Last Marker, ends drawing if clicked
				currentLine.endDrawing();
			});
		}
		else if(i==0)
		{
			google.maps.event.addListener(this.drawMarkers[i], 'click', function() {
				// First marker, ends drawing, add point to the line, and sets the line as looped
				currentLine.getPath().push(this.getPosition())
				currentLine.endDrawing();
			});
		}
		else
		{
			google.maps.event.addListener(this.drawMarkers[i], 'click', function() {
				// Other markers, add point to the line
				currentLine.getPath().push(this.getPosition())
				currentLine.refreshMarkersListeners();
			});
			
		};
		
	};
}



EditablePolyline.prototype.endDrawing = function() {
	google.maps.event.clearListeners(this.getMap(), 'click');
	for (var i = this.drawMarkers.length - 1; i >= 0; i--){
		this.drawMarkers[i].setMap(null);
	}
	 this.drawMarkers.length = 0;
	
	
this.getMap().setOptions({draggableCursor:null,
draggingCursor:null
});

}


EditablePolyline.prototype.isEditing = function() {
	return this.is_editing;
}

EditablePolyline.prototype.attachData = function(new_data) {
	return this.attached_data = new_data;
}


EditablePolyline.prototype.enableEditing = function() {
	this.endDrawing();
	this.editPolyline.setOptions({strokeColor: this.strokeColor})
	this.addEditMarkers();
	this.is_editing = true;
}
EditablePolyline.prototype.disableEditing = function() {
	this.removeEditMarkers();
	this.is_editing = false;
	
}

EditablePolyline.prototype.removeEditMarkers = function() {
	for (var i = this.editMarkers.length - 1; i >= 0; i--){
		this.editMarkers[i].setMap(null);
	};
	 this.editMarkers.length = 0;
}
EditablePolyline.prototype.addEditMarkers = function() {
	length = this.getPath().getLength();
	for (var i = length - 1; i >= 0; i--){
		curLatLng = this.getPath().getAt(i);
		this.addEditMarker(curLatLng, false, i);
		if (i != length - 1) {		
			oldLatLng = this.getPath().getAt(i + 1);
			var center = new google.maps.LatLng( 
				(curLatLng.lat() + oldLatLng.lat())/2,
				(curLatLng.lng() + oldLatLng.lng())/2
			);
			if (radius(center,curLatLng) > radius(oldLatLng,curLatLng))
			// to prevent errors when going through the 180 degrees, this makes an issue for big lines, but
			// this is less common i think. Needs to be fixed though...
			{
				center = new google.maps.LatLng( 
					center.lat(),
					center.lng()-180
				);
			};
			
			this.addEditMarker(center, true, i); 
		};
	};

}


EditablePolyline.prototype.addEditMarker = function(location,middle,i)
{
	var marker = new google.maps.Marker({
    position: location,
		draggable: true
  });
	if (middle) {
		marker.setIcon(midMarkerImage);
		marker.setTitle('Drag me to add a point.')
				var currentLine = this;
				//keeps a reference to the object, since "this" in event listener is replaced by the marker
				
				google.maps.event.addListener(marker, 'dragstart', function(event) {
					path = [currentLine.getPath().getAt(i), location, currentLine.getPath().getAt(i+1) ];
				  currentLine.editPolyline.setPath(path);
					currentLine.editPolyline.setMap(this.getMap());
		    });
				google.maps.event.addListener(marker, 'drag', function(event) {
				  currentLine.editPolyline.getPath().removeAt(1);
					currentLine.editPolyline.getPath().insertAt(1, event.latLng);
		    });
				google.maps.event.addListener(marker, 'dragend', function() {
					currentLine.editPolyline.setMap(null);
					currentLine.getPath().insertAt(i +1, this.getPosition());
					currentLine.removeEditMarkers();
					currentLine.addEditMarkers();
				});
	
	}
	else {
		marker.setIcon(endMarkerImage);
		marker.setTitle('Click me to remove me, drag me to change my position.')
		
		var currentLine = this;
		//keeps a reference to the object, since "this" in event listener is replaced by the marker
			google.maps.event.addListener(marker, 'click', function() {
				currentLine.getPath().removeAt(i);
				currentLine.removeEditMarkers();
				currentLine.addEditMarkers();
	    });
			google.maps.event.addListener(marker, 'dragstart', function(event) {
				path = [];
				if (i > 0) {
					path.push(currentLine.getPath().getAt(i-1));
					path.push(location)
					if (i < currentLine.getPath().getLength() -1) {
						path.push(currentLine.getPath().getAt(i+1))
					};
				}
				else
				{
					path.push(currentLine.getPath().getAt(i+1))
					path.push(location)
				};
				//path = [currentLine.getPath().getAt(i-1), location, currentLine.getPath().getAt(i+1) ];
				
			  currentLine.editPolyline.setPath(path);
				currentLine.editPolyline.setMap(currentLine.getMap());
	    });
			google.maps.event.addListener(marker, 'drag', function(event) {
			  currentLine.editPolyline.getPath().removeAt(1);
				currentLine.editPolyline.getPath().insertAt(1, event.latLng);
	    });
			google.maps.event.addListener(marker, 'dragend', function() {
				currentLine.editPolyline.setMap(null);
				currentLine.getPath().insertAt(i, this.getPosition());
				currentLine.getPath().removeAt(i+1);
				currentLine.removeEditMarkers();
				currentLine.addEditMarkers();
			});
	
		
	}
	
	marker.setMap(this.map);
	this.editMarkers.push(marker);
}
