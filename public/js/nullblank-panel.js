var data;

socket.on('data', function (newData) {
    console.log("Updating new data...");
    data=newData;
    updateData();
});

socket.on('dataBit', function (dataBit) {
	var current = data;
	//Go to space that needs to be updated.
	var i
	for (i=0;i<dataBit.field.length-1;i++) {
		current = current[dataBit.field[i]];
	}
    if (dataBit.value!="DELETE") {
    	console.log("Updating a bit of data...");
		current[dataBit.field[i]]=dataBit.value;
		//if options added, we need to update ballotboxes
		if (dataBit.field[0]=="options" && dataBit.field.length==2) {
			for(var i=0;i<data.ballotBoxes.length;i++) {
				var options = data.ballotBoxes[i].options;
				options[options.length] = 0;
			}
		}
	} else {
		//if delete, last argument is a number...
		var num = dataBit.field[i];
		current.splice(num,1);
		//Delete data!
		console.log("data deleted!");
		//If options deleted, we need to delete ballotboxes options
		if (dataBit.field[0]=="options" && dataBit.field.length==2) {
			for(var i=0;i<data.ballotBoxes.length;i++) {
				data.ballotBoxes[i].options.splice(num,1);
			}
		}
	}
	//Update all... (I want to sleep)
	updateData();
});

function updateData() {
	//Set title and description
	$("#load-save").val(JSON.stringify(data));
	$("#title-value").val(data.title);
	$("#description-value").val(data.description);
	var bbData = data.ballotBoxes;
	var bbSelect = $("#ballot-boxes");
	var bbVal = bbSelect.val() === null ? 0 : bbSelect.val();
	//Show ballot boxes
	//TODO: Empty ballot boxes
	bbSelect.empty();
	for (var i=0;i<bbData.length;i++) {
		bbSelect
			.append($("<option>", {
				"id":"bb-option-"+i,
				"value":i,
				"text":bbData[i].name
			})
		);
	}
	bbVal = Math.min(bbVal,(bbData.length-1));
	bbSelect.val(bbVal);
	// Show actual ballot box data
	setBallotBoxesVal(bbVal);
	//Show actual options data
	var optionsData = data.options;
	$("#options").empty();
	for (var i=0;i<optionsData.length;i++) {

		name = optionsData[i].name;
		color = optionsData[i].color;
		votes = bbData[bbVal].options[i];

		genBBOption(name,color,votes,i);
	}
	bindOptionButtons();
}

function sendData(dataBit) {
	socket.emit('update',dataBit);
}

function bindStaticButtons() {
	//Binding context buttons
	$(".ballot-context").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var textField = $("#"+idSplit[0]+"-"+idSplit[1]);
		$(this).click({"field":textField, "button":$(this)},ballotContextAction);
	})

	//Binding ballot boxes options buttons
	$(".ballot-boxes").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var textField = $("#"+idSplit[0]+"-"+idSplit[1]+"-"+idSplit[2]);
		$(this).click({"field":textField, "button":$(this)},ballotBoxesAction);
	})

	//Binding add-delete ballot box button

	$("#add-bb-value-set").click({"field":$("#add-bb-value"), "button":$(this)},addBallotBoxesAction);
	$("#ballot-boxes-remove").click({"field":$("#ballot-boxes"), "button":$(this)},removeBallotBoxesAction);

	//Binding change Ballot Box Select.

	$("#ballot-boxes").change(selectBallotBoxesAction);

	//Binding Add Option Buttons

	$("#options-add").click(optionAdd);

	$("#load-data").click(loadData);
}

function loadData() {
	console.log("trying to load data...")
	try {
		var newData = JSON.parse($("#load-save").val());
		console.log("data loaded! updating...")
	} catch(e) {
		return false;	
	}
	var sending = {"password":password,"data":newData};
	socket.emit('loaddata',sending);
	return true;
}

function bindOptionButtons() {

	//Remove Option
	$(".option-delete").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var option = idSplit[1];
		$(this).click({"option":option},optionDelete);
	});

	//Set Values
	$(".ballot-options").each( function() {
		var idSplit = $(this).attr("id").split("-").slice(0,-1);
		var text="#"+idSplit.join("-");
		var textField=$(text);
		$(this).click({"field":textField},optionSet);
	});

	//+1-1
	$(".add-remove-votes").each( function() {
		var idSplit = $(this).attr("id").split("-");
		var text = "#"+idSplit[0]+"-"+idSplit[1]+"-value";
		var textField=$(text);
		var num = idSplit[2]=="plus" ? 1 : -1;
		$(this).click({"field":textField, "indecremental":num},optionInDecrement)

	})
}

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

function addBallotBoxesAction(event) {
	fieldValue = event.data.field.val();
	var bbSize = data.ballotBoxes.length;
	var dataBit = {
		"password":	password,
		"field": ["ballotBoxes",bbSize],
		"value": {
			"name":fieldValue,
			"votes":0,
			"quorum":1,
			"options":[]
		}
	};
	for (var i=0;i<data.options.length;i++) {
		dataBit.value.options[i]=0;
	}
	sendData(dataBit);
	event.data.field.val("");
	$("#ballot-boxes").val(bbSize);
}

function removeBallotBoxesAction(event) {
	var bbVal = event.data.field.val();
	var dataBit = {
		"password": password,
		"field": ["ballotBoxes",bbVal],
		"value":"DELETE"
	}
	sendData(dataBit);
}

function selectBallotBoxesAction(event) {
	var val = $("#ballot-boxes").val();
	setBallotBoxesVal(val);
	setOptionsVal(val);
}

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

function optionDelete(event) {
	var dataBit = {
		"password":password,
		"field":["options",event.data.option],
		"value":"DELETE"
	}
	sendData(dataBit);
}

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

function genBBOption(name,color,votes,i) {
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

function setBallotBoxesVal(bbVal) {
	var bbData = data.ballotBoxes;
	$("#bb-name-value").val(bbData[bbVal].name);
	$("#bb-votes-value").val(bbData[bbVal].votes);
	$("#bb-quorum-value").val(bbData[bbVal].quorum);
}

function setOptionsVal(val) {
	var prefix = "option-";
	for (var i=0;i<data.options.length;i++) {
		$("#"+prefix+i+"-value").val(data.ballotBoxes[val].options[i]);
	}
}

function randColor() {
	var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

$(document).ready(function() {
	bindStaticButtons();
});
