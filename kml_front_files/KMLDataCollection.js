var KMLDataCollection = function () {
        var self = this;
        self.theData = new Array();
	self.earliestStart = 0.0;
	self.latestEnd = 0.0;
	self.longestTimeOffset = 0.0;

        self.theBounds = new mxn.BoundingBox(0.0, 0.0, 0.0, 0.0);
    };
    
KMLDataCollection.prototype.getEarliestStart = function (theItem) {
	return this.earliestStart;
};

KMLDataCollection.prototype.getLatestEnd = function (theItem) {
	return this.latestEnd;
};

KMLDataCollection.prototype.getLongestTimeOffset = function (theItem) {
	return this.longestTimeOffset;
};
    
KMLDataCollection.prototype.addItem = function (theItem) {
	this.theData.push(theItem);
	this.setBounds();
	this.setTimes();
};

KMLDataCollection.prototype.removeItems = function (removedItems) {
	var newData = new Array();
	var dataLength = this.theData.length;
	var removedItemsLength = removedItems.length;
	var matchFound = false;
	
	for (var i = 0; i < dataLength; ++i) {
		matchFound = false;
		for (var j = 0; j < removedItemsLength; ++j) {
		    if (i === removedItems[j]) {
			matchFound = true;
		    }
		}
		if (!matchFound) {
		    newData.push(this.theData[i]);
		}
	}
	
	this.theData = newData;
	
	this.setBounds();
	this.setTimes();
};

KMLDataCollection.prototype.setBounds = function () {
	var dataLength = this.theData.length;
	var theMinLon = 180.0;
	var theMaxLon = -180.0;
	var theMinLat = 90.0;
	var theMaxLat = -90.0;

	for (var i = 0; i < dataLength; ++i) {
	    var bounds = this.theData[i].getBounds();

	    theMinLon = Math.min(theMinLon, bounds.minX);
	    theMaxLon = Math.max(theMaxLon, bounds.maxX);
	    theMinLat = Math.min(theMinLat, bounds.minY);
	    theMaxLat = Math.max(theMaxLat, bounds.maxY);
	};

	this.centerLon = (theMaxLon + theMinLon) / 2.;
	this.centerLat = (theMinLat + theMaxLat) / 2.;

	this.theBounds = {
	    minX: theMinLon,
	    maxX: theMaxLon,
	    minY: theMinLat,
	    maxY: theMaxLat
	};
};

KMLDataCollection.prototype.setTimes = function () {
	var dataLength = this.theData.length;
	
	if(dataLength === 0.0){
		this.earliestStart  = 0.0;
		this.latestEnd = 0.0;
		this.longestTimeOffset = this.latestEnd - this.earliestStart;
	} else {
		var earliestStartDate = null;
		var latestEndDate = null;

		for (var k = 0; k < dataLength; ++k) {
			if(this.theData[k].startDateTime !== null){
			    if(k === 0.0){
				earliestStartDate = new Date();
				earliestStartDate.setTime(this.theData[k].startDateTime.getTime());
			    } else {
					if(this.theData[k].startDateTime.getTime() < earliestStartDate.getTime()){
					    earliestStartDate =  this.theData[k].startDateTime;	
					}
				}
			}

			if(this.theData[k].endDateTime !== null){
				if(k === 0.0){
				    latestEndDate = new Date();
				    latestEndDate.setTime(this.theData[k].endDateTime.getTime());
				} else {	    
					if(this.theData[k].endDateTime.getTime() > latestEndDate.getTime()){
					    latestEndDate =  this.theData[k].endDateTime;	
					}				
				}
			}
		}
	
		this.earliestStart  = earliestStartDate.getTime();
		this.latestEnd = latestEndDate.getTime();
		this.longestTimeOffset = this.latestEnd - this.earliestStart;
	}
};

KMLDataCollection.prototype.isEmpty = function () {
	return (this.theData.length === 0.0);
};
