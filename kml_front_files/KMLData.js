//
// KML utility functions for use with the Mapstraction API
//
function assert(x) {
    if (!x) {
        if (Error) alert("assertion failed: " + Error().stack);
        else alert("assertion failed");
    }
}

// Work-around for IE's lack of proper namespace support in their
// DOM interface.
var gpx_ns_prefix = "";
var gpx_ns = "http://www.opengis.net/kml/2.2";

if (document.getElementsByTagNameNS) {
    var kmlGetElements = function (node, name) {
            try {
                return node.getElementsByTagName(name);
            } catch (e) {
                alert(e.toString() + "\n" + e.stack);
                return null;
            }
        };
} else {
    var kmlGetElements = function (node, name) {
            return node.getElementsByTagName(gpx_ns_prefix + name);
        };
}

if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        var F = function (o) {};
        F.prototype = o;
        return new F();
    };
};

function ReqObject() {
	var callbackObject;
	var req;
	var cache;
	var theProc;
	var theCallback;
	var theError;
	var theUrl;

    this.fetch = function(url, cbackObject, cback, err, f_proc) {
	    theProc = f_proc;
	    theCallback = cback;
	    callbackObject = cbackObject;
	    theError = err;
	    theUrl = url;
	    
	 	req = $.ajax({
                     url:	url,
		     cache: false,
	             dataType: "xml"})
    .done(f_success)
    .fail(f_error); 
    };
    
            f_success = function() {
                    var content;
                    if(req.responseXML && req.responseXML.documentElement)
                        content = theProc(req.responseXML);
                    else
                        content = theProc(req.responseText);
			
                    theCallback(content);
    };
		    
	f_error = function(){
                    if(theError)
                        theError(req);
                    else
                        alert("GET " + theUrl + " returns: " + req.statusText);
                };
}

var KMLPoint = function (theCoords) {
	var splitCoords = theCoords.split(",");
	this.isValid = false;
	
	if(splitCoords.length === 2.0){
		this.latitude = parseFloat(splitCoords[1]);
		this.longitude = parseFloat(splitCoords[0]);
		this.isValid = true;
	}
    };

KMLPoint.prototype.setURL = function(extendedDataNode) {
	if(extendedDataNode && extendedDataNode.length > 0){
		var dataNode = kmlGetElements(extendedDataNode[0], "Data");

		if(dataNode){
			var dataNodeLength = dataNode.length;
			for(var i = 0; i < dataNodeLength; ++i){
				var theName = dataNode[i].getAttribute("name");
				
				if(theName){
					if(theName === "Url"){
						var valueNode = kmlGetElements(dataNode[i], "value");
						if(valueNode && valueNode.length > 0){
							this.theURL = $(valueNode).first().text();
						}
					}
				}
			}
		}
	}
}

KMLPoint.prototype.setName = function(nameDataNode) {
	if(nameDataNode && nameDataNode.length > 0){
		this.theName = $(nameDataNode).first().text();
	}
}

KMLPoint.prototype.setDescription = function(descriptionDataNode) {
	if(descriptionDataNode && descriptionDataNode.length > 0){
		this.theDescription = $(descriptionDataNode).first().text();
	}
}

KMLPoint.prototype.plot = function(map, lw, colour, markIcon) {
    if (!colour) colour = ["#0000aa"];
    this.marker = plotPoint(this, map, markIcon);
}

KMLPoint.prototype.hide = function(map) {
    hidePoint(this.marker, map);
}

KMLPoint.prototype.getBoundsCoords = function () {
    var theBounds = {
        minX: this.longitude,
        maxX: this.longitude,
        minY: this.latitude,
        maxY: this.latitude
    };

    return theBounds;
};

var PolylinePoint = function (theCoords) {
	var splitCoords = theCoords.split(",");
	this.isValid = false;
	
	if(splitCoords.length >= 2.0){
		this.latitude = parseFloat(splitCoords[1]);
		this.longitude = parseFloat(splitCoords[0]);
		this.isValid = true;
	}
    };
    
PolylinePoint.prototype.getBoundsCoords = function () {
    var theBounds = {
        minX: this.longitude,
        maxX: this.longitude,
        minY: this.latitude,
        maxY: this.latitude
    };

    return theBounds;
};

var LineString = function (pts, isPolygon) {
        this.points = new Array();
	var pointString = "";
	this.isClosed = isPolygon;
	
        var ptsLength = pts.length;
        for (var i = 0; i < ptsLength; ++i) {
	    pointString = pts[i];
	    if(pointString.length > 0){
                var thePoint = new PolylinePoint(pointString);
                this.points.push(thePoint);
	    }
        }
    };
    
LineString.prototype.getBoundsCoords = function () {
    var firstPoint = this.points[0];
	
    var theMinLon = firstPoint.longitude;
    var theMaxLon = firstPoint.longitude;
    var theMinLat = firstPoint.latitude;
    var theMaxLat = firstPoint.latitude;

    var pointsLength = this.points.length;
    for (var i = 0; i < pointsLength; ++i) {
        var thePoint = this.points[i];

        theMinLon = Math.min(theMinLon, thePoint.longitude);
        theMaxLon = Math.max(theMaxLon, thePoint.longitude);
        theMinLat = Math.min(theMinLat, thePoint.latitude);
        theMaxLat = Math.max(theMaxLat, thePoint.latitude);
    }

    var theBounds = {
        minX: theMinLon,
        maxX: theMaxLon,
        minY: theMinLat,
        maxY: theMaxLat
    };

    return theBounds;
};

LineString.prototype.plot = function(map, lw, colour) {
    if (!lw) lw = 2;
    if (!colour) colour = ["#0000aa"];

    var pts = this.points; 
    var ptsLength = pts.length;
     this.polyline = plotPointlist(pts, map, lw, colour, this.isClosed);
}

LineString.prototype.hide = function(map) {
     hidePolyline(this.polyline, map);
}

var Placemark = function (placemarkXML, theColour, markIcon) {
	var self = this;
	this.isVisible = false;
	self.lineColour = theColour;  // set to default if null
	self.markIcon = markIcon;

	self.theLineString = new Object();

	self.theBounds = new mxn.BoundingBox(0.0, 0.0, 0.0, 0.0);
	self.startDateTime	= null;
	self.endDateTime = null;

	// the placemark data is LineString, Point or Polygon (todo - build polygons also)
	var theLineString = kmlGetElements(placemarkXML, "LineString");
	var thePoint = kmlGetElements(placemarkXML, "Point");
	var thePolygon = kmlGetElements(placemarkXML, "Polygon");
	var isValid = false;

	if(thePolygon && thePolygon.length >= 1.0){
		var lsLength = thePolygon.length;
		var lsFirst = thePolygon[0];
		var coordString = "";
		
		var theCoords = kmlGetElements(lsFirst, "coordinates");
		
		// TODO deal with inner boundaries as well as outer
		if(theCoords && theCoords.length >= 1.0){	
			coordString = $(theCoords).first().text();
			coordString = coordString.replace(/[\r\n]/g, " ");
			coordString = coordString.replace(/\s+/g, " ");
			coordString = coordString.replace(/^\s+/,'');
			coordString = coordString.replace(/\s+$/,'');
			//~ var newlineSplitCoords = coordString.split('\n');
			
			//~ if(newlineSplitCoords.length > 0){
				var splitCoords = coordString.split(' ');
				if(splitCoords.length > 0){
				    this.theObject = new LineString(splitCoords, true);			
				    isValid = true;
				}
			//~ }
		}
	}
	
	if(theLineString && theLineString.length === 1.0){
		var lsLength = theLineString.length;
		var lsFirst = theLineString[0];
		
		var theCoords = kmlGetElements(lsFirst, "coordinates");
		
		if(theCoords && theCoords.length === 1.0){			
			var splitCoords = $(theCoords).first().text().split(' ');
			var splitLength = splitCoords.length;

			if(splitLength > 0){
			    this.theObject = new LineString(splitCoords, false);			
			    isValid = true;
			}
		}
	}

	if(thePoint && thePoint.length === 1.0){
		var theCoords = kmlGetElements(thePoint[0], "coordinates");
		
		if(theCoords  && theCoords.length === 1.0){
		    var theCoordsString = $(theCoords).first().text();
			
		    this.theObject = new KMLPoint(theCoordsString);			
		    isValid = true;
		
		    var extendedData = kmlGetElements(placemarkXML, "ExtendedData");
		    var desc = kmlGetElements(placemarkXML, "description");
		    var name = kmlGetElements(placemarkXML, "name");
		
		    this.theObject.setURL(extendedData);
		    this.theObject.setName(name);
		    this.theObject.setDescription(desc);
		}
	}
	
	// the time data comes from either a TimeStamp or a TimeSpan node
	var timeSpanElement = kmlGetElements(placemarkXML, "TimeSpan");
	var timeStampElement = kmlGetElements(placemarkXML, "TimeStamp");

	if (timeSpanElement){
		if(timeSpanElement.length && timeSpanElement.length > 0) {
			var timeSpan = timeSpanElement[0];
			var startTimeNode = kmlGetElements(timeSpan, "begin");
			var endTimeNode = kmlGetElements(timeSpan, "end");
			var startTime = $(startTimeNode).first().text();
			var endTime = $(endTimeNode).first().text();

			this.startDateTime =  kml_datetime(startTime);	
			this.endDateTime =  kml_datetime(endTime);	
		}
        } 
	
	if (timeStampElement){
		if(timeStampElement.length && timeStampElement.length > 0) {
			var timeStamp = timeStampElement[0];
			var startTimeNode = kmlGetElements(timeStamp, "when");
			var startTime = $(startTimeNode).first().text();

			this.startDateTime =  kml_datetime(startTime);	
			this.endDateTime =  kml_datetime(startTime);	
		}
        } 
};

Placemark.prototype.getBoundsCoords = function () {
    var theBounds = this.theObject.getBoundsCoords();
    return theBounds;
}

Placemark.prototype.display = function (map, start, end, lineColour, markIcon) {
	var shouldDisplay = (this.startDateTime === null);
	if(!shouldDisplay){
            shouldDisplay = !(this.startDateTime > end || this.endDateTime < start);
	}
	
    if(shouldDisplay){
        if(!this.isVisible){
		this.theObject.plot(map, 2, this.lineColour, this.markIcon);
		this.isVisible = true;
	}
    } else {
        if(this.isVisible){
		this.theObject.hide(map);
		this.isVisible = false;
	}
    }
};

var KMLData = function (theFileName, onLoadValidFunction, onLoadErrorFunction, lineColour, markIcon) {
        var self = this;
        self.fileName = theFileName;
	self.lineColour = lineColour;
	self.markIcon = markIcon;

        self.isFetched = false;
	self.onLoadValid = onLoadValidFunction;
	self.onLoadError = onLoadErrorFunction;

        self.thePlacemarks = new Array();
	self.isValid = false;

        self.theBounds = new mxn.BoundingBox(0.0, 0.0, 0.0, 0.0);
    };
    
KMLData.prototype.fetch = function (cback, err) {
    var self = this;
    var req_cache = new ReqObject();
	
    var theUrl = self.fileName;
	
    //~ fetch_kml(req_cache, theUrl, self, this.setup.bind(this), err);
    fetch_kml(req_cache, theUrl, self, function(gpx){self.setup(gpx);}, err);

    this.isFetched = true; // this is useless I think 
    return this.isFetched;
};

KMLData.prototype.setup = function (kml) {
    var theMarks = kmlGetElements(kml, "Placemark");
    var marksLength = theMarks.length;
    this.isValid = true;

    for (var i = 0; i < marksLength; ++i) {
	var thePlacemark = new Placemark(theMarks[i], this.lineColour, this.markIcon);
	    
	if(thePlacemark.isValid === false){
		this.isValid = false;
	} else {
		this.thePlacemarks.push(thePlacemark);
	}
   }
   
    if(this.isValid){
	    this.setTimes();
	    
 	    if(this.onLoadValid){
		    this.onLoadValid(this);
	    }
    } else {
	    if(this.onLoadError){
		    this.onLoadError(this.fileName);
	    }
    }
}

KMLData.prototype.getBounds = function () {
    var firstMarkBounds = this.thePlacemarks[0].getBoundsCoords();
	
    var theMinLon = firstMarkBounds.minX;
    var theMaxLon = firstMarkBounds.maxX;
    var theMinLat = firstMarkBounds.minY;
    var theMaxLat = firstMarkBounds.maxY;

    var marksLength = this.thePlacemarks.length;
    for (var i = 0; i < marksLength; ++i) {
        var markBounds = this.thePlacemarks[i].getBoundsCoords();

        theMinLon = Math.min(theMinLon, markBounds.minX);
        theMaxLon = Math.max(theMaxLon, markBounds.maxX);
        theMinLat = Math.min(theMinLat, markBounds.minY);
        theMaxLat = Math.max(theMaxLat, markBounds.maxY);
    }

    var theBounds = {
        minX: theMinLon,
        maxX: theMaxLon,
        minY: theMinLat,
        maxY: theMaxLat
    };
    
    return theBounds;
};

KMLData.prototype.setTimes = function () {
	this.startDateTime = null;
	this.endDateTime = null;
	
    for(var i = 0; i < this.thePlacemarks.length; ++i){	
	if(this.thePlacemarks[i].startDateTime !== null){
	    if(this.startDateTime === null){
		this.startDateTime = this.thePlacemarks[i].startDateTime;
	    } else {
		    if(this.thePlacemarks[i].startDateTime.getTime() < this.startDateTime.getTime() ){
	        this.startDateTime = this.thePlacemarks[i].startDateTime;	
		    }
	    }
        }
	
	if(this.thePlacemarks[i].endDateTime !== null){
		if(this.endDateTime === null){
		    this.endDateTime = this.thePlacemarks[i].endDateTime;
	        } else {	    
			if(this.thePlacemarks[i].endDateTime.getTime() > this.endDateTime.getTime()){
		    this.endDateTime =  this.thePlacemarks[i].endDateTime;	
			}
	        }
	}
    }
};

KMLData.prototype.display = function (map, start, end, icon) {
	var marksLength = this.thePlacemarks.length;
    for(var i = 0; i < marksLength; ++i){
	    this.thePlacemarks[i].display(map, start, end, icon);
    }
};

KMLData.prototype.clearAll = function () {
    for(var i = 0; i < this.thePlacemarks.length; ++i){
	    this.thePlacemarks[i].isVisible = false;
    }
};

/**
 * Asynchronously fetch the KML file from the specified URL,
 * The KML DOM is passed to the callback when the operation
 * is complete.
 *
 * @param  url    URL for the KML file
 * @param  cback  callback function
 * @param  err    error handler function
 */
var parser = function (s) {
            return $.parseXML(s); //GXml.parse(s);
};
	
function parse_kml(resp) {
        var doc;
        if (resp.documentElement) doc = resp;
        else doc = parser(resp);
        // Try to find the GPX namespace prefix (IE sucks)
        var attrs = doc.documentElement.attributes;
        for (var i = 0; i < attrs.length; i++) {
            if (attrs[i].nodeValue == gpx_ns) {
                var name = attrs[i].nodeName;
                if (name == "xmlns") gpx_ns_prefix = "";
                else gpx_ns_prefix = name.substr(6) + ":";
            }
        }

        return doc;
    };
    
function fetch_kml(req_cache, url, callbackObject, cback, err) {
    // Use a processing function to insure that an XML DOM is
    // passed to the callback even if the content-type was
    // text/plain.
    var parser = function(s) {
                     return  $.parseXML(s);   //GXml.parse(s);
                 };
    req_cache.fetch(url,
		    callbackObject,
                    function(xml) {
                        if(!xml)
                            alert("Document contains no data: " + url);
                        else
                            cback(xml);
                    },
                    err,
                    function(resp) {
                        var doc;
                        if(resp.documentElement)
                            doc = resp;
                        else
                            doc = $.parseXML(resp); 
                        // Try to find the GPX namespace prefix (IE sucks)
                        var attrs = doc.documentElement.attributes;
                        for(var i = 0;i < attrs.length;i++) {
                            if(attrs[i].nodeValue == gpx_ns) {
                                var name = attrs[i].nodeName;
                                if(name == "xmlns")
                                    gpx_ns_prefix = "";
                                else
                                    gpx_ns_prefix = name.substr(6) + ":";
                            }
                        }

                        return doc;
                    });
}


var KML = { 
	getPoint : function(placemarkXML){
	    var theResult = null;
	    var theGMLPoint = gmlGetElements(placemarkXML, "", "Point");
	    var theCoordsString = "";
		
	    if (theGMLPoint && theGMLPoint.length === 1.0) {
		var theCoords = gmlGetElements(theGMLPoint[0], "", "pos");

		if (theCoords && theCoords.length === 1.0) {
		    theCoordsString = $(theCoords).first().text();
		} else {
		    theCoords = gmlGetElements(theGMLPoint[0], "", "coordinates");
		    if (theCoords && theCoords.length === 1.0) {
			theCoordsString = $(theCoords).first().text();
		    }
		}
		
		if(theCoordsString !== ""){
		    var theSplitCoords = theCoordsString.split(" ");
		    var theCoordsArranged = theSplitCoords[1] + "," + theSplitCoords[0];
		    
		     theResult = new GMLPoint(theCoordsArranged);

		    var extendedData = gmlGetElements(placemarkXML, "", "ExtendedData");
		    var desc = gmlGetElements(placemarkXML, "", "description");
		    var name = gmlGetElements(placemarkXML, "", "name");

		    theResult.setURL(extendedData);
		    theResult.setName(name);
		    theResult.setDescription(desc);
		}
	    }
	    
	    return theResult;
	},

	getPolyline : function(placemarkXML){
	    var theResult = null;
	    var theGMLLineString = gmlGetElements(placemarkXML, "", "LineString");
	    var theCoordsString = "";
		
	    if (theGMLLineString && theGMLLineString.length === 1.0) {
		var lsFirst = theGMLLineString[0];
		var theCoords = gmlGetElements(lsFirst, "", "posList");
		    
		if (theCoords && theCoords.length === 1.0) {
		    theCoordsString = $(theCoords).first().text();
		} else {
		    theCoords = gmlGetElements(lsFirst, "", "coordinates");
		    if (theCoords && theCoords.length === 1.0) {
			theCoordsString = $(theCoords).first().text();
		    }
		}
		
		if(theCoordsString !== ""){
		    var splitCoords = theCoordsString.split(' ');
		    var splitLength = splitCoords.length;

		    if (splitLength > 0) {
			var coordsArray = [];

			for (var i = 0; i < splitLength / 2; ++i) {
			    var coordStr = splitCoords[(i * 2) + 1] + "," + splitCoords[(i * 2) + 0];
			    coordsArray.push(coordStr);
			}
			
			theResult = new LineString(coordsArray);
		    }
		}
	    }
    
	    return theResult;
	},

	getPolygon : function(placemarkXML){
	    var theResult = null;
	    var theGMLPolygon = gmlGetElements(placemarkXML, "", "Polygon");
	    var theCoordsString = "";
		
	    if (theGMLPolygon && theGMLPolygon.length === 1.0) {
		var lsFirst = theGMLPolygon[0];
	       var theCoords = gmlGetElements(lsFirst, "", "posList");
		    
		if (theCoords && theCoords.length === 1.0) {
		    theCoordsString = $(theCoords).first().text();
		} else {
		    theCoords = gmlGetElements(lsFirst, "", "coordinates");
		    if (theCoords && theCoords.length === 1.0) {
			theCoordsString = $(theCoords).first().text();
		    }
		}
		
		if(theCoordsString !== ""){
		    var splitCoords = theCoordsString.split(' ');
		    var splitLength = splitCoords.length;

		    if (splitLength > 0) {
			var coordsArray = [];

			for (var i = 0; i < splitLength / 2; ++i) {
			    var coordStr = splitCoords[(i * 2) + 1] + "," + splitCoords[(i * 2) + 0];
			    coordsArray.push(coordStr);
			}
			
			theResult = new LineString(coordsArray);
		    }
		}
	    }
	    
	    return theResult;
	}
};

/**
 * Convert a KML datetime string into a JS Date object
 * @param  input  GPX timestamp string (DOW MMM DD YYYY HH:MM:SS)
 * @return        a Date object
 */
function kml_datetime(input) {
    var dts = new String(input); 
    var dt = dts.split(" ");
    var hms = dt[3].split(":");
    var monthNo = getMonthIndex(dt[1]);
    var yearNo = 0;
    var dayNo = 0;
	
    if(dt.length > 5){
	    yearNo = parseInt(dt[5]);
	    dayNo = parseInt(dt[2]);
    } else {
	    yearNo = parseInt(dt[2]);
	    dayNo = parseInt(dt[0]);
    }
	
    return new Date(yearNo, monthNo, dayNo, hms[0], hms[1], hms[2]);
}
  

function getMonthIndex(monthString){	
	var monthNo = 0;
	
	switch(monthString){
	    case "Feb":
		monthNo = 1;
		break;
	    case "Mar":
		monthNo = 2;
		break;
	    case "Apr":
		monthNo = 3;
		break;
	    case "May":
		monthNo = 4;
		break;
	    case "Jun":
		monthNo = 5;
		break;
	    case "Jul":
		monthNo = 6;
		break;
	    case "Aug":
		monthNo = 7;
		break;
	    case "Sep":
		monthNo =  8;
		break;
	    case "Oct":
		monthNo = 9;
		break;
	    case "Nov":
		monthNo = 10;
		break;
	    case "Dec":
		monthNo = 11;
		break;
	    default:
	        monthNo = 0;
	}
	
	return monthNo;
}

/**
 * Plot a polyline connecting a list of KMLPoints. 
 *
 * @param     pts     list (Array) of KMLPoints
 * @param     map   Map object
 * @param     lw      line width (optional: default 2)
 * @param     color   line color (optional: default #0000aa)
 */
function plotPointlist(pts, map, lw, lineColor, isClosed) {
	if (!lw) lw = 2;
	if (!lineColor) lineColor = "#0000aa";
	var thePolyline = null;

	var thePoints = new Array();

	for (var i = 0; i < pts.length; i++) {
	     var thePoint = new mxn.LatLonPoint(pts[i].latitude, pts[i].longitude);
	     thePoints.push(thePoint);		     
	}

	if(thePoints.length > 1){
	    thePolyline = showPoints(thePoints, map, lineColor, lw, isClosed);
	}
	
	return thePolyline;
}

/**
 * Show the poinrs on a map as a polyline
 *
 * @param     thePoints     array of points
 * @param     map     the map
 * @param     color     the colour of the polyline
 * @param     lw     the line widthS
 * @return      nothing
 */
 function showPoints(thePoints, map, color, lw, isClosed){
	    var thePolyline = new mxn.Polyline(thePoints);
	    var opacity = 0.3;
	    var fillColour;
	    var lineOpacity = 1.0;
	 
	   if(isClosed){
		   lineOpacity = opacity;
		   fillColour = color;
	   }

	    thePolyline.addData({
		color: color,
		width: lw, 
		opacity: lineOpacity, 
		closed: isClosed, 
		fillColor: fillColour,
		fillOpacity: opacity
	    });

	    map.addPolyline(thePolyline);
	    return thePolyline;
 }
 
  function hidePolyline(thePolyline, map){
	    map.removePolyline(thePolyline);
	    return thePolyline;
 }
 
mxn.Marker.prototype.openInfoWindow = function(){
	this.openBubble();
}

/**
 * Show the point on the map as a marker (a point that when clicked displays
 * an info bubble).
 * @param     pts     a single KMLPoint
 * @param     map     Map object
 * @param     icon    Icon for each marker (optional)
 */
function plotPoint(pt, map, markIcon) {
	if(!markIcon && markIcon.length < 1){
		markIcon =  "./timemap/images/red-circle.png";
	}
	
	function make_handler(marker, html) {
	return function () {
		marker.openInfoWindow()
		}
	}

	var marker = new mxn.Marker(new mxn.LatLonPoint(pt.latitude, pt.longitude)); //, icon);

	var url = pt.theURL;
	var desc = pt.theDescription;
	var name = pt.theName;
	var html = [];
	    
	if(name && name.length > 0) {
		if(url && url.length > 0){
			html.push("<a href='" + url + "' target='_new'>" + name + "</a>");
		} else {
			html.push(name);
		}
	}
	    
	if(desc && desc.length > 0) {
		html.push("<p class='desc'>" + desc + "</p>");
	}

	var joinedHtml = html.join("");

	var options = {
	    icon: markIcon,
	    iconSize: [16, 16],
	    iconAnchor: [8, 8],
	    infoBubble: joinedHtml
	};

	// options that are available 
	//~ infoBubble : html,
	//~ label : item.title,
	//~ date : "new Date(\""+item.date+"\")",
	//~ iconShadow : item.icon_shadow,
	//~ marker : item.id,
	//~ iconShadowSize : item.icon_shadow_size,
	//~ icon : item.icon,
	//~ iconSize : item.icon_size,
	//~ category : item.source_id,
	//~ draggable : false,
	//~ hover : false
	
        marker.addData(options);
        map.addMarker(marker);
	
	marker.click.addHandler(make_handler(marker, joinedHtml));
	
	return marker;
}

function hidePoint(marker, map) {
	if(marker){
		map.removeMarker(marker);
	}
}






