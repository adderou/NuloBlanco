var data;
var addedBB=false;

// Socket receives actual data on connect.
socket.on('data', function (newData) {

    // Load actual data.
    console.log("Updating new data.");
    data = newData;

    // Render the data on the view.
    renderData();
});

// Socket receives "DataBit" on update.
socket.on('dataBit', function (dataBit) {

    // Initialize some variables.
	var current = data;
	var i;
	var fields = dataBit.field;
	var last = dataBit.field.length - 1;

	// Go to space that needs to be updated.
	for (i = 0; i < fields.length - 1; i++) {
		current = current[fields[i]];
	}
	// Update that space.
    if (dataBit.value != "DELETE") {
    	console.log("Some data was updated.");

    	// Update value.
		current[fields[last]]=dataBit.value;

		// If options were added, we need to update ballotboxes.
		if (fields[0] == "options" && fields.length == 2) {
			var bb = data.ballotBoxes;
			for(var i = 0; i < bb.length; i ++) {
				var options = data.ballotBoxes[i].options;
				options[options.length] = 0;
			}
		}
	} else {

		// If the update order is about delete something,
		// the last argument must be a number.
		var num = fields[last];

		// Delete the element from the data array.
		current.splice(num,1);
		console.log("Some data was deleted.");

		// If options deleted, we need to delete ballotboxes options.
		if (fields[0] == "options" && fields.length==2) {

			// For each ballot box:
			for(var i=0;i<data.ballotBoxes.length;i++) {

				// Delete the option from it. 
				data.ballotBoxes[i].options.splice(num,1);
			}
		}

		// If Ballot Box is deleted, we need to mantain the index
		// of the selector.
		if (fields[0]=="ballotBoxes") {

			// Select the id of the ballot box.
			bbID = fields[1];

			// Select the actual index of Selector.
			var bbSelect = $("#ballot-boxes");
			var bbVal = bbSelect.val();

			// If modified index is less-or-equal than actual:
			if (bbVal>0 && bbID<=bbVal) {

				//Modify actual index.
				bbSelect.val(bbVal-1);
			}
		}
	}

	// Render all.
	renderData();
});

// Regenerates the view and shows the data again
function renderData() {

	//Initialize variables
	var bbData = data.ballotBoxes;
	var bbSelect = $("#ballot-boxes");
	var bbVal = bbSelect.val() === null ? 0 : bbSelect.val();
	var options = data.options;

	// Set title, description and JSON data.
	$("#title-value").val(data.title);
	$("#description-value").val(data.description);
	$("#load-save").val(JSON.stringify(data));

	// Empty ballot boxes.
	bbSelect.empty();
	
	// For each ballot box:
	for (var i = 0; i < bbData.length; i++) {

		// Create option for the Selector.
		bbSelect
			.append($("<option>", {
				"id":"bb-option-"+i,
				"value":i,
				"text":bbData[i].name
			})
		);
	}

	// If the current user added the ballot box: 
	if (addedBB==true) {

		// Change the Selector index.
		bbVal = bbData.length-1;
		addedBB=false;
	}
    bbSelect.val(bbVal);
	// Show actual ballot box data
	setBallotBoxesVal(bbVal);

	// Empty actual options data
	$("#options").empty();

	// For each option:
	for (var i=0;i<options.length;i++) {

		// Show it on the page.
		var name = options[i].name;
		var key = options[i].key;
		var color = options[i].color;
		var votes = bbData[bbVal].options[i];
		genOptions(name,key,color,votes,i);

	}

	// Generate the binding between option buttons
	// And actions.
	bindOptionButtons();
}

// Sends new data to the server.
function sendData(dataBit) {
	socket.emit('update',dataBit);
}

// Binds the buttons of the panel to actions.
function bindStaticButtons() {

	//Binding Ballot Context buttons
	$(".ballot-context").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var textField = $("#"+idSplit[0]+"-"+idSplit[1]);
		$(this).click({"field":textField, "button":$(this)},ballotContextAction);
	})

	//Binding ballot boxes context buttons
	$(".ballot-boxes").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var textField = $("#"+idSplit[0]+"-"+idSplit[1]+"-"+idSplit[2]);
		$(this).click({"field":textField, "button":$(this)},ballotBoxesAction);
	})

	//Binding add-delete ballot box buttons.
	$("#add-bb-value-set").click({"field":$("#add-bb-value"), "button":$(this)},addBallotBoxesAction);
	$("#ballot-boxes-remove").click({"field":$("#ballot-boxes"), "button":$(this)},removeBallotBoxesAction);

	//Binding change Ballot Box select.
	$("#ballot-boxes").change(selectBallotBoxesAction);

	//Binding Add Option button.
	$("#options-add").click(optionAdd);

	//Binding Load JSON data button.
	$("#load-data").click(loadData);
}


function bindOptionButtons() {

	// Button for removing the option.
	$(".option-delete").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var option = idSplit[1];
		$(this).click({"option":option},optionDelete);
	});

	// Button for set an option value (Name, color, votes, key-to-bind)
	$(".ballot-options").each( function() {
		var idSplit = $(this).attr("id").split("-").slice(0,-1);
		var text="#"+idSplit.join("-");
		var textField=$(text);
		$(this).click({"field":textField},optionSet);
	});

	// Button for increment-decrement votes.
	$(".add-remove-votes").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var text = "#"+idSplit[0]+"-"+idSplit[1]+"-value";
		var textField=$(text);
		var num = idSplit[2]=="plus" ? 1 : -1;
		$(this).click({"field":textField, "indecremental":num},optionInDecrement)

	})
}

// Loads data via JSON.
function loadData() {
	console.log("Trying to load data.")
	// Try to parse the JSON data.
	try {
		var newData = JSON.parse($("#load-save").val());
		console.log("Data loaded! Updating.")
	} catch(e) {
		return false;	
	}

	//Create the whole data object and send it to server.
	var sending = {"password":password,"data":newData};
	socket.emit('loaddata',sending);
	return true;
}

// Modifies values of ballot.
function ballotContextAction(event) {
	var fieldName = event.data.field.attr("id").split("-")[0];
	var fieldValue = event.data.field.val();
	var dataBit = {
		"password":	password,
		"field": [fieldName],
		"value":fieldValue
	}
	sendData(dataBit);
}

// Modifies values of ballot boxes.
function ballotBoxesAction(event) {
	var fieldName = event.data.field.attr("id").split("-")[1];
	var fieldValue = event.data.field.val();
	var bbValue = $("#ballot-boxes").val();
	if (fieldName!="name") {
		fieldValue = parseInt(fieldValue);
	}
	var dataBit = {
		"password":	password,
		"field": ["ballotBoxes",bbValue,fieldName],
		"value":fieldValue
	}
	sendData(dataBit);
}

// Adds a ballot box.
function addBallotBoxesAction(event) {

	// Initializes values
	var fieldValue = event.data.field.val();
	var bbSize = data.ballotBoxes.length;

	// Creates the ballot box
	var dataBit = {
		"password":	password,
		"field": ["ballotBoxes",bbSize],
		"value": {
			"name":fieldValue,
			"votes":0,
			"quorum":0,
			"options":[]
		}
	};

	// Creates options for the ballot box.
	for (var i=0;i<data.options.length;i++) {
		dataBit.value.options[i]=0;
	}
	sendData(dataBit);

	// Clears old text ond field.
	event.data.field.val("");
	addedBB = true;
}

// Deletes a Ballot Box.
function removeBallotBoxesAction(event) {
	var bbVal = event.data.field.val();
	var dataBit = {
		"password": password,
		"field": ["ballotBoxes",bbVal],
		"value":"DELETE"
	}
	sendData(dataBit);
}

// Selects a ballot box.
function selectBallotBoxesAction(event) {
	var bbVal = $("#ballot-boxes").val();
	setBallotBoxesVal(bbVal);
	setOptionsVal(bbVal);
}

// Adds an option.
function optionAdd(event) {
	var size = data.options.length;
		var dataBit = {
		"password": password,
		"field": ["options",size],
		"value":{
			"name": "Option "+size,
			"color": randColor()
		}
	}
	sendData(dataBit);
}

// Deletes an option.
function optionDelete(event) {
	var dataBit = {
		"password":password,
		"field":["options",event.data.option],
		"value":"DELETE"
	}
	sendData(dataBit);
}

// Sets values on an option.
function optionSet(event) {
	var fieldValue = event.data.field.val();
	var SplitId =event.data.field.attr("id").split("-"); 
	var field = SplitId[2];
	var num = SplitId[1];
	if (field=="value") {
		var BBid = $("#ballot-boxes").val();
		var dataBit = {
			"password":password,
			"field":["ballotBoxes",BBid,"options",num],
			"value":parseInt(fieldValue)
		};
	} else {
		var dataBit = {
			"password":password,
			"field":["options",num,field],
			"value":fieldValue
		};
	}
	sendData(dataBit);
}

// Increments/Decrements votes on an option.
function optionInDecrement(event) {
	var val = $("#ballot-boxes").val();
	var indec = event.data.indecremental;
	var SplitId =event.data.field.attr("id").split("-"); 
	var num = SplitId[1];
	var newValue = parseInt(data.ballotBoxes[val].options[num])+parseInt(indec);
	var dataBit = {
		"password":password,
		"field":["ballotBoxes",val,"options",num],
		"value":newValue
	};
	sendData(dataBit);
}

// Shows all the Options in a BB.
function genOptions(name,key,color,votes,i) {
	var options = $("#options");
	var idPrefix = "option-"+i;
			options
				.append($("<tr>", {
					id:idPrefix
				})
					.append($("<td>")
						.append($("<button>",{
							"text":"X",
							"id":idPrefix+"-delete",
							class:"btn btn-danger option-delete"
						}))
					)
					.append($("<td>")
						.append($("<div>",{
							class:"col-md-8"
						})
							.append($("<input>",{
								type:"text",
								class:"form-control input-sm",
								id:idPrefix+"-name-value",
								value:name
							}))
						)
						.append($("<div>",{
							class:"col-md-4"
						})
							.append($("<button>",{
								text:"Set",
								id:idPrefix+"-name-value-set",
								class:"btn btn-success ballot-options"
							}))
						)
					)
					.append($("<td>")
						.append($("<div>",{
							class:"col-md-8"
						})
							.append($("<input>",{
								type:"text",
								class:"form-control input-sm color",
								id:idPrefix+"-color-value",
								value:color
							}))
						)
						.append($("<div>",{
							class:"col-md-4"
						})
							.append($("<button>",{
								id:idPrefix+"-color-value-set",
								text:"Set",
								class:"btn btn-success ballot-options"
							}))
						)
					)
					.append($("<td>")
						.append($("<div>",{
							class:"col-md-6"
						})
							.append($("<input>",{
								type:"text",
								class:"form-control input-sm",
								id:idPrefix+"-value",
								value:votes
							}))
						)
						.append($("<div>",{
							"class":"col-md-2"
						})
							.append($("<button>",{
								"id":idPrefix+"-value-set",
								"text":"Set",
								"class":"btn btn-success ballot-options"
							}))
						)
						.append($("<div>",{
							"class":"col-md-2"
						})
							.append($("<button>",{
								"text":"+1",
								"id":idPrefix+"-plus",
								"class":"btn btn-success add-remove-votes"
							}))
						)
						.append($("<div>",{
							class:"col-md-2"
						})
							.append($("<button>",{
								"text":"-1",
								"id":idPrefix+"-minus",
								"class":"btn btn-danger add-remove-votes"
							}))
						)
					)
				);
}

// Changes the values of a ballot box using index of Select.
function setBallotBoxesVal(bbVal) {
	var bbData = data.ballotBoxes;
	$("#bb-name-value").val(bbData[bbVal].name);
	$("#bb-votes-value").val(bbData[bbVal].votes);
	$("#bb-quorum-value").val(bbData[bbVal].quorum);
}

// Updates the values of botes if Current Ballot Box changes.
function setOptionsVal(val) {
	var prefix = "option-";
	for (var i=0;i<data.options.length;i++) {
		$("#"+prefix+i+"-value").val(data.ballotBoxes[val].options[i]);
	}
}

// Generates a random color.
function randColor() {
	var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Binds static buttons.
$(document).ready(function() {
	bindStaticButtons();
});
