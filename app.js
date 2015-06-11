/*
// NuloBlanco V1.0
// Created by Eduardo Riveros (Adderou)
// Under CC 
// Website: http://www.adderou.cl/nuloblanco
// Contact: dev@adderou.cl
*/

/*
// Application Requirements and config	
// The app requires Express and Socket.io. 
*/
var expressPort = 1234;
var socketPort = 1313;
var siteUrl = "localhost";


var io = require("socket.io")(socketPort);
var express = require("express");
var session = require('express-session');
var app = express();
app.use(express.static('public'));
app.set('views', './views')
app.set('view engine', 'jade');


var bodyParser = require('body-parser');

// Create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

// Credentials
// They are used in login page. */
var username = "admin";
var password = "pass";

/*
//Session Middleware
*/

app.use(session({
  secret: 'supersecret',
  resave: false,
  saveUninitialized: true
}));

/*
// Data Structure with Results and Voting Information
*/

var votingData = {
			    "title": "Default Title",
			    "description": "Default Description",
			    "options": [
			        {
			        	"name":"Option 0",
			        	"color":"#FF0000"
			        },
			        {
			        	"name":"Option 1",
			        	"color":"#00FF00"
			        },
			        {
			        	"name":"Option 2",
			        	"color":"#0000FF"
			        }
			        
			    ],
			    "ballotBoxes": [
			        {
			            "name": "Default BB",
			            "votes": 7,
			            "quorum": 7,
			            "options": [
			                1,
			                1,
			                5	
			            ]
			        },
			        {
			            "name": "Second BB",
			            "votes": 10,
			            "quorum": 20,
			            "options": [
			                2,
			                3,
			                5	
			            ]
			        }
			    ]
			};

/*

/*
// People logged in
*/
var loggedin=0;

/*
// Index section
// Used for logging in to the application.
*/
app.get('/', function (req, res) {
	var loggedin = req.session.loggedin;
	if (!loggedin) {
		res.render('index');
	} else {
		res.redirect('/panel');
	}
});

/*
// Login section
// Used for authenticate the users.
*/
app.post('/login', function (req, res) {
	var loggeduser = req.body.username;
	var loggedpwd = req.body.password;
	if (loggeduser==username && loggedpwd==password) {
		req.session.password = password;
		loggedin = req.session.loggedin = true
		res.redirect('/panel');
	} else {
		res.redirect('/');
	}
});

/*
// Panel section
// Used for modifying the data on the votation.
*/
app.get('/panel', function (req, res) {
	  var loggedin = req.session.loggedin;
	  if (!loggedin) {
	  	res.redirect('/');
	  } else {
	  	res.render('panel',{
	  			"host":siteUrl,
	  			"socketPort":socketPort,
	  			"password":req.session.password
	  		});
	  }
});

/*
// Embed section
// Used for showing the data on an external page.
*/
app.get('/embed', function (req, res) {
	res.render('embed',{
		"host":siteUrl,
		"socketPort":socketPort
	});
});

/*
// Initializing Express web server
*/
var server = app.listen(expressPort, function () {

  port = server.address().port;

  console.log('Nullblank Express server listening at port %s', port);

});


/*
// Socket.io definitions
*/

console.log("Socket.io server listening at port %s", socketPort);
io.on('connection', function(socket) {

	socket.on('loaddata',function(newData) {
		if (newData.password==password) {
			console.log("We will load new data!");
			votingData = newData.data;
		   	io.emit("data",votingData);
		   	console.log("Data loaded!");
		} else {
			console.log("Unauthorized load of data");
		}
	});

	socket.on('update', function(dataBit) {
    	if (dataBit.password == password) {
    		console.log("data received!");
    		var current = votingData;
    		//Go to space that needs to be updated.
    		var i;
    		for (i=0;i<dataBit.field.length-1;i++) {
    			current = current[dataBit.field[i]];
    		}
	    	if (dataBit.value!="DELETE") {
	    		current[dataBit.field[i]]=dataBit.value;
		    	//data was updated!
    			console.log("Data updated!");
    			//if options added, we need to update ballotboxes
    			if (dataBit.field[0]=="options" && dataBit.field.length==2) {
	    			for(var i=0;i<votingData.ballotBoxes.length;i++) {
						var options = votingData.ballotBoxes[i].options;
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
	    			for(var i=0;i<votingData.ballotBoxes.length;i++) {
	    				votingData.ballotBoxes[i].options.splice(num,1);
					}
	    		}
	    	}
	    	io.emit("dataBit",dataBit);
    	} else {
    		//You shall not pass!
    		console.log("Warning: Someone tried to change something without authorization")
    	}
    
  	});

  	socket.on('error', function(exception) {
	  console.log(exception);
	});

	socket.on('disconnect',function() {
		console.log("Someone has disconnected!");
		loggedin--;
		console.log("People connected: "+loggedin);
	});
});

io.on("connect", function (socket) {
    console.log("Someone has connected!");
   	loggedin++;
   	console.log("People connected: "+loggedin);
   	console.log("Sending actual data to him/her...");
   	socket.emit("data",votingData);
   	console.log("Data Sent.");

});