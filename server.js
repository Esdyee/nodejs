const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: true })); // 이해할 필요 X 이렇게 쓰라고 되어있을뿐

const MongoClient = require("mongodb").MongoClient;
MongoClient.connect("mongodb+srv://sd0809:1212123@nestcluster.axt8d.mongodb.net/?retryWrites=true&w=majority", (err, client) => {
	app.listen(8080, () => {
		console.log("listening on 8080");
	});
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

app.post("/add", (req, res) => {
	res.send("success!");
	console.log(req.body);
});
