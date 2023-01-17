const express = require("express");
const app = express();

app.listen(8080, () => {

});

app.get("/pet", (req, res) => {
	res.send("Hello World!@@@");
});

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

app.get("/write", (req, res) => {
	res.sendFile(__dirname + "/write.html");
});
