var data;
var chartData;
var ctx;
var myPieChart=null;

socket.on('data', function (newData) {
    console.log("Updating new data...");
    data=newData;
    updateData();
});

socket.on('dataBit', function (dataBit) {
	console.log(dataBit);
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
		console.log("data Deleted!");
		//If an option is deleted, we need to delete ballotboxes options
		if (dataBit.field[0]=="options" && dataBit.field.length==2) {
			for(var i=0;i<data.ballotBoxes.length;i++) {
				data.ballotBoxes[i].options.splice(num,1);
			}
		}
		//If Ballot Box is deleted, we need to mantain the index of the selector.
		if (dataBit.field[0]=="ballotBoxes") {
			bbID = dataBit.field[1];
			var bbSelect = $("#ballot-boxes");
			var bbVal = bbSelect.val() === null ? -1 : bbSelect.val();
			if (bbVal>=0 && bbID<=bbVal) {
				bbSelect.val(bbVal-1);
			}
		}
	}
	//Update all... (I want to sleep)
	updateData();
});

function updateData() {
	//Set title and description
	$("#title-value").text(data.title);
	$("#description-value").text(data.description);
	var bbData = data.ballotBoxes;
	var bbSelect = $("#ballot-boxes");
	var bbVal = bbSelect.val() === null ? -1 : bbSelect.val();
	//Show ballot boxes
	bbSelect.empty();
	// Add total option
	bbSelect.append($("<option>", {
		"id":"bb-option-total",
		"value":-1,
		"text":"Total",
		"selected":true
	}));
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
		var votes=0;
		var totalvotes=0;
		if (bbVal!=-1) {
			votes = bbData[bbVal].options[i];
			totalvotes = getBBVotes(bbVal);
		} else {
			for (var j=0;j<data.ballotBoxes.length;j++) {
				votes+=data.ballotBoxes[j].options[i];
				totalvotes+=getBBVotes(j);
			}
		}
		percentage = (votes*100.0)/totalvotes;

		genBBOption(name,color,votes,percentage.toFixed(2),i);
	}
	updateChart();
}	

function setBallotBoxesVal(bbVal) {
	var totalVotes = 0;
	var totalQuorum = 0;
	for (var i = 0; i < data.ballotBoxes.length; i++) {
		totalVotes+=parseInt(getBBVotes(i));
		totalQuorum+=parseInt(data.ballotBoxes[i].quorum);
	}
	if (bbVal==-1) {
		var quorum = totalQuorum;
		var votes = totalVotes;
		$("#bb-name-value").text("Total");
		$("#bb-votes-value").text(votes);
	} else {
		var bbData = data.ballotBoxes[bbVal];
		var quorum = bbData.quorum;
		var votes = getBBVotes(bbVal);
		console.log("antes:"+votes);
		$("#bb-name-value").text(bbData.name);
		$("#bb-votes-value").text(votes);
	}
	var quorumPercentage = (votes*100.0/quorum);
	$("#bb-quorum-value").text(""+quorumPercentage.toFixed(2)+"% ("+quorum+")");
}

function getBBVotes(bbVal) {
	var bb = data.ballotBoxes[bbVal]; 
	if (bb.votes>0) {
		return bb.votes;
	} else {
		var votes = 0;
		for (var i=0;i<bb.options.length;i++) {
			votes +=bb.options[i];
		}
		return votes;
	}
}

function setOptionsVal(bbVal) {
	var prefix = "option-";
	for (var i=0;i<data.options.length;i++) {
		if (bbVal==-1) {
			var val=0;
			var total=0;
			for (var j=0;j<data.ballotBoxes.length;j++) {
				val+=parseInt(data.ballotBoxes[j].options[i]);
				total+=parseInt(getBBVotes(j));
			}	
		} else {
			var val = data.ballotBoxes[bbVal].options[i];
			var total = getBBVotes(bbVal);
		}
		var percentage = 100.0*val/total;
		$("#"+prefix+i+"-value").text(val);
		$("#"+prefix+i+"-percentage-value").text(percentage.toFixed(2));

	}
}

function genBBOption(name,color,votes,percentage,i) {
	var options = $("#options");
	var idPrefix = "option-"+i;
			options
				.append($("<tr>", {
					id:idPrefix
				})					
					.append($("<td>",{
						id:idPrefix+"-name-value",
						text:name
					}))
					.append($("<td>",{
						id:idPrefix+"-name-value",
						style:"background-color:"+color
					}))

					.append($("<td>",{
						id:idPrefix+"-value",
						text:votes
					}))

					.append($("<td>",{
						id:idPrefix+"-percentage-value",
						text:percentage
					}))
						
				);
}


function bindSelect() {
	$("#ballot-boxes").change(selectBallotBoxesAction);
}

function selectBallotBoxesAction(event) {
	var val = $("#ballot-boxes").val();
	setBallotBoxesVal(val);
	setOptionsVal(val);
	updateChart();
}


function generateChartData() {
	var chartData=[];
	var val = $("#ballot-boxes").val();
	if (val==-1) {
		var bb={
			"name":"Total",
			"votes":0,
			"quorum":0,
			"options":[]
		};
		for (var j=0;j<data.options.length;j++) {
				bb.options[j]=0;
		}
		for (var i=0;i<data.ballotBoxes.length;i++) {
			bb.votes+=getBBVotes(i);
			bb.quorum+=data.ballotBoxes[i].quorum;
			
			for (var j=0;j<data.options.length;j++) {
				bb.options[j]+=data.ballotBoxes[i].options[j];
			}
		}
	} else {
		var bb = data.ballotBoxes[val];
	}
	for (var j=0;j<data.options.length;j++) {
		chartData[j] = {
			"value":bb.options[j],
			"color":data.options[j].color,
			"highlight": "#BEBEBE",
			"label":data.options[j].name
		}
	}
	return chartData;
}

function updateChart() {
	if (myPieChart!==null) {
		myPieChart.destroy();
	}
	chartData = generateChartData();
	ctx = $("#myChart").get(0).getContext("2d");
	myPieChart = new Chart(ctx).Pie(chartData, {
		    animation:false,
		    segmentShowStroke:false
	});
}

$(document).ready(function() {
	bindSelect();

});