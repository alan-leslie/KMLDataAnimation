function set_elapsed_time_display() {
	if(getTheData().isEmpty()){
		$("#start_date").val("");
		$("#slider_date").val("");
		$("#end_date").val("");
	} else {
		var currentPos = getTheData().getEarliestStart();
		if (end && end > getTheData().getEarliestStart()) {
		    currentPos = end;
		}
		var sliderValue = currentPos;
		var sliderDate = new Date();
		sliderDate.setTime(sliderValue);
		var displayOffset = getTheData().getLongestTimeOffset() / 1000;
		var earliestStartDate = new Date();
		earliestStartDate.setTime(getTheData().getEarliestStart());
		var latestEndDate = new Date();
		latestEndDate.setTime(getTheData().getLatestEnd());

		$("#start_date").val(earliestStartDate.toDateString());
		$("#slider_date").val(sliderDate.toDateString());
		$("#end_date").val(latestEndDate.toDateString());
	}
}
	    
function initControlPanel(){
	$("#playSlider").slider({
		value: 0,
		min: 0,
		max: 100,
		step: 1,
		slide: function (event, ui) {
			if ($("#playPauseButton").attr("class") == pauseClass) {
				$("#playPauseButton").click();
			}
			var fullDuration = getTheData().getLatestEnd() - getTheData().getEarliestStart();
			var prevEnd = end;
			var currentSliderPosValue =  (fullDuration * ui.value) / 100 + getTheData().getEarliestStart();

			if (showSingleFront === true) {
				start = prevEnd;	
				end = currentSliderPosValue;
			} else {
				start = getTheData().getEarliestStart();
				end = currentSliderPosValue;
				clearMap();
			}
			
			set_elapsed_time_display();
			showdata();
			start = end;
		}
	});
	//~ $("#amount").val($("#playSlider").slider("value"));
	$('#playPauseButton').bind("click", function () {
		if ($(this).attr("class") == playClass) {
			$(this).attr("class", pauseClass);
			if (speed_mult == 0) {
				start = getTheData().getEarliestStart();
				end = getTheData().getLatestEnd();
				$("#playSlider").slider("value", 100.0);
				set_elapsed_time_display();
				$(this).attr("class", playClass);
			}
			showdata();
		} else {
			if (fcancel) {
				fcancel();
			}
			$(this).attr("class", playClass);
		}
	});
	$('#playPauseButton').attr('class', playClass);

	$('#stopButton').bind("click", function () {
		if (fcancel) {
			fcancel();
		}
		reset();
		set_elapsed_time_display();
	});
	$('#stopButton').attr('class', stopClass);
}