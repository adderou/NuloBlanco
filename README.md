# nuloblanco
A Node.js app which keeps track of ballot results in real time using Express and Socket.io

The app uses the following node.js libraries:
* Express
* Express-session
* Socket.io
* body-parser
* Jade

Also, the app uses Bootstrap's CSS for panel design and Charts.js library for the Pie Chart.

# How to install

* Install Node.js and npm
* Download and extract package
* Write on console: 
    npm install
* Edit the app.js file with your prefered Socket.io and Express port
* Edit the username and password values
* Edit the host value
* Execute the app:
    node app.js
* Go to http://your-host.tld:expressPortNumber and enter the login data
* Publish and share the /embed link :) it will update in real-time

# Screenshots

![Viewer Mode](/screenshots/pacman.png?raw=true "Viewer Mode")
![Panel: Preview and context info](/screenshots/panel1.png?raw=true "Panel: Preview and context info")
![Panel: Ballot boxes and options](/screenshots/panel2.png?raw=true "Panel: Ballot boxes and options")