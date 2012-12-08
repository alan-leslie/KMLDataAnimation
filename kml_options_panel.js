function initOptionsPanel(){
	$("#intro").dialog({
	    autoOpen: false,
	    modal: true,
	    width: 450
	});
	$("#source_code").dialog({
	    autoOpen: false,
	    modal: true,
	    width: 400
	});
	$("#add_empty").dialog({
	    autoOpen: false,
	    modal: true
	});
	$("#add_already_exists").dialog({
	    autoOpen: false,
	    modal: true
	});
	$("#no_gps_data").dialog({
	    autoOpen: false,
	    modal: true
	});
	$("#no_file").dialog({
	    autoOpen: false,
	    modal: true
	});
	
	$('#SingleFrontButton').bind("click", function () {
	    if (!showSingleFront) {
		if ($("#playPauseButton").attr("class") == pauseClass) {
		    $("#playPauseButton").click();
		}
	    }
	    showSingleFront = true;
	});
	$('#AllFrontsButton').bind("click", function () {
	    if (showSingleFront) {
		if ($("#playPauseButton").attr("class") == pauseClass) {
		    $("#playPauseButton").click();
		}
	    }
	    showSingleFront = false;
	});
}
	
// removes items from listBox identified by sourceID
// assumes that multi select is possible
function listbox_remove(sourceID) {
    var listBox = document.getElementById(sourceID);
    var removedItems = new Array();

    //iterate through each option of the listbox
    for (var count = listBox.options.length - 1; count >= 0; count--) {
	//if the option is selected, delete the option
	if (listBox.options[count].selected == true) {
	    var itemText = listBox.options[count].text;
	    removedItems.push(count);

	    try {
		listBox.remove(count, null);
	    } catch (error) {
		listBox.remove(count);
	    }
	}
    }
    
    theData.removeItems(removedItems);

    var lsLength = listBox.length;

    // mobile list box is showing up as dropdown 
    // select last option to make sure that an option is shown
    if (lsLength > 0) {
	if (isMobile === true) {
	    var itemSelector = '#lsbox :nth-child(' + lsLength + ')';
	    $(itemSelector).attr('selected', 'selected');
	}
    }
    
    sliderTimeIncrement = theData.getLongestTimeOffset() / 100;

    isSetup = false;
    reset();
    set_elapsed_time_display();
}

// initital attempt to add item to list box
// note that if the file has valid KML data completeAdd is called
function addNewListItem(newItem) {
    var listBox = document.getElementById('lsbox');
    var itemValue = document.getElementById('txtValue');
    if (newItem) {
	itemValue.value = newItem;
	itemValue.text = newItem;
    }

    if (itemValue.value == '') {
	$("#add_empty").dialog('open');
	itemValue.focus();
	return false;
    }

    if (isOptionAlreadyExist(listBox, itemValue.value)) {
	$("#add_already_exists").dialog('open');
	itemValue.focus();
	return false;
    }

    var trackIndex = theData.theData.length;
    var lineColour = get_available_colour(trackIndex);
    var theDataItem = new KMLData(itemValue.value, completeAdd, errorAdd, lineColour);
    var fetched = theDataItem.fetch(null, fileNotFoundError);

    $("#btnAddItem").attr("disabled", true);
    return true;
}

function isOptionAlreadyExist(listBox, value) {
    var exists = false;
    for (var x = 0; x < listBox.options.length; x++) {
	if (listBox.options[x].value == value || listBox.options[x].text == value) {
	    exists = true;
	    break;
	}
    }
    return exists;
}

// complete adding the track to the list box and list of tracks
// called when KML data is successfully fetched for track
function completeAdd(theItem) {
    theData.addItem(theItem);
    sliderTimeIncrement = theData.getLongestTimeOffset() / 100;

    var listBox = document.getElementById('lsbox');
    var listBoxItem = document.createElement("option");

    var displayText = theItem.fileName;

    if (isMobile === true) {
	var colourName = getColourName(theItem.colour);
	displayText = "(" + colourName + ") " + displayText;
    }

    listBoxItem.value = theItem.fileName;
    listBoxItem.text = displayText;
    listBox.add(listBoxItem, null);
    var lsLength = listBox.length;

    // todo - using this selector is silly
    // should use jquery from the start (to create option etc).
    if (lsLength > 0) {
	var itemSelector = '#lsbox :nth-child(' + lsLength + ')';
	// mobile list box is showing up as dropdown 
	// select last option to make sure that an option is shown
	if (isMobile === true) {
	    $(itemSelector).attr('selected', 'selected');
	} else {
	    $(itemSelector).css('background', theItem.lineColour);
	    var foregroundColour = getForegroundColour(theItem.lineColour);
	    $(itemSelector).css('color', foregroundColour);
	}
    }

    isSetup = false;
    set_elapsed_time_display();
    reset();
    $("#btnAddItem").attr("disabled", false);
}

function get_available_colour(trackIndex) {
	var colors = ["#ff0000", "#ff8c00", "#ffd700", "#00ff00", "#0000ff", "#480082",  "#ee82ee", "#a52a2a", "#00ffff", "#ff00ff", "#000000"];
	var n = colors.length;
	var theColour = colors[colourIndex % n];
	++colourIndex;
	return theColour;
 }

// get a colour that contrasts with the background colour
function getForegroundColour(backgroundColour) {
    if (backgroundColour === "#ff0000" || 
	backgroundColour === "#0000ff" || 
	backgroundColour === "#480082" || 
	backgroundColour === "#a52a2a" || 
	backgroundColour === "#ff8c00" || 
	backgroundColour === "#000000") {
	return '#ffffff';
    }

    return '#000000';
}

function getColourName(colour) {
	var colourName = "";
	switch(colour){
            case "#ff0000":
	        colourName = 'red';
		break;
             case "#ff8c00":
	        colourName = 'orange';
		break;
            case "#ffd700":
		colourNamecolourName = 'gold';
		break;
            case "#00ff00":
	        colourName = 'green';
		break;
            case "#0000ff":
	        colourName = 'blue';
		break;
            case "#480082":
	        colourName = 'indigo"';
		break;
             case "#ee82ee":
	        colourName = 'violet"';
		break;
            case "#a52a2a":
	        colourName = 'brown"';
		break;
            case "#00ffff":
	        colourName = 'cyan';
		break;
            case "#ff00ff":
	        colourName = 'magenta';
		break;
            case "#000000":
	        colourName = 'black';
		break;
            case "#ffffff":
	        colourName = 'white';
		break;
    }
    
    return colourName;
}

function errorAdd(itemText) {
    $("#no_gps_data").dialog('open');
    resetAddButton();
}

function fileNotFoundError() {
    $("#no_file").dialog('open');
    resetAddButton();
}

function resetAddButton() {
    $("#btnAddItem").attr("disabled", false);
}

function help_button() {
    // todo - need style set correctly
    $("#intro").dialog('open');
}

function credits_button() {
    // todo - need style set correctly
    $("#source_code").dialog('open');
}