const express = require("express");
const app = express();

//express 문법 시작
app.use(express.urlencoded({ extended: true })); // 이해할 필요 X 이렇게 쓰라고 되어있을뿐
app.set("view engine", "ejs");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
require("dotenv").config();

app.use(session({ secret: "비밀코드", resave: true}));
app.use(passport.initialize());
app.use(passport.session());


//css middleware
app.use('/public', express.static("public"));

const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

const dbInfo = process.env.DB_URL;

let db;
MongoClient.connect(dbInfo, function (err, client) {
	console.log(err);
	db = client.db('todoapp');

	// 데이터 insert
	app.listen(process.env.PORT, () => {
		console.log("listening on 8080");
	});
});


app.get("/login", (req, res, next) => {
	res.render("login.ejs");
});

//faukyreRedurect is CurrentPage Setting
app.post("/login", passport.authenticate("local", {
	failureRedirect: "/login",
}), (req, res) => {
	console.log("성공후 콜백");
	res.redirect("/");
});

passport.use(new LocalStrategy({
	usernameField: "id",
	passwordField: "pw",
	session: true,
	// passReqToCallback: false
}, (username, password, done) => {

	db.collection("login").findOne({ id: username }, (err, result) => {
		console.log(err, result, password, username);
		if (err) return done(err);

		if (!result) {
			console.log("계정없음");
			// send custom error message
			return done(null, false, { message: "존재하지 않는 아이디입니다." });
		}

		if (result.pw !== password) {
			console.log("비번틀림");
			return done(null, false, {message: "비밀번호가 틀렸습니다."});
		}
		return done(null, result);
	});
}));

app.get("/mypage", checkLogin, (req, res) => {
	console.log(req.user);
	res.render("mypage.ejs", { user: req.user });
});

function checkLogin(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.send("로그인이 필요합니다.");
	}
}

//세션 저장시키는 코드
passport.serializeUser((user, done) => {
	done(null, user.id);
});

//이 세션 데이터를 가진 사람을 DB에서 찾아 올 때 싸는 코드
passport.deserializeUser((id, done) => {
	db.collection("login").findOne({ id: id }, (err, result) => {
		console.log("deserializeUser", id, result);
		done(null, result);
	});
});

app.get("/pet", (req, res) => {
	res.send("Hello World!@@@");
});

app.get("/", (req, res) => {
	// res.sendFile(__dirname + "/index.html");
	res.render("index.ejs");
});

app.get("/write", (req, res) => {
	// res.sendFile(__dirname + "/write.html");
	res.render("write.ejs");
});

app.post("/add", (req, res) => {
	const {title} = req.body;
	const date = new Date();
	insertData(title, date);
	res.send("success!");
});

// data update
app.post("/update", (req, res) => {
	const {title, id, date} = req.body;
	console.log(req.body);
	db.collection("post")
		.updateOne(
			{_id: parseInt(id)},
			{$set: {title: title, date: date}},
			(err, result) => {
				console.log("수정완료");
				// res.send("success!");
				res.redirect("/list");
			});
});

//list 조회
app.get("/list", (req, res) => {
	db.collection("post").find().toArray((err, result) => {
		console.log(result);
		res.render("list.ejs", { posts: result });
	});
});

//search 기능
app.get("/search", (req, res) => {
	const {keyword} = req.query;

	let query = {};
	if(keyword) {
		query = {title: {$regex: keyword}};
	}

	let aggregateParam = [
		{
			$search: {
				index: "titleSearch",
				text: {
					query: keyword,
					path: "title"
				}
			}
		}
	]

	// db.collection("post").aggregate(aggregateParam).toArray((err, result) => {
	// 	console.log(result);
	// 	// res.render("search.ejs", { posts: result });
	// });

	db.collection("post").aggregate(aggregateParam).toArray((err, result) => {
		console.log(result);
		res.render("search.ejs", { posts: result });
	});
});

app.delete("/delete", (req, res) => {
	// get ajax data
	const { id } = req.body;
	console.log(id);
	console.log(req.body);

	let intId = parseInt(id);

	db.collection("post").deleteOne(
		{ _id: intId },
		(err, result) => {
			if (err) return console.log(err);
			console.log("삭제완료");
			// res.status(200).send({ message: "success" });

			res.status(400).send({ message: "fail" });
		});

});

//detail page
app.get("/detail/:id", (req, res) => {
	db.collection("post").findOne({ _id: parseInt(req.params.id) }, (err, result) => {
		if(!result) {
			return res.status(404).render("not-find.ejs");
		}
		res.render("detail.ejs", { post: result });
	});
});

//update page
app.get("/update/:id", (req, res) => {
	db.collection("post").findOne({ _id: parseInt(req.params.id) }, (err, result) => {
		// console.log(result);
		res.render("update.ejs", { post: result });
	});
});

// 404 에러 처리
app.use(function (req, res, next) {
	res.status(404).render("not-find.ejs");
});

// 데이터 insert
async function insertData(title, date) {
	const postCount = await autoIncrement("post-count");
	console.log(postCount);

	db.collection("post")
		.insertOne({
			_id: postCount + 1,
			title: title,
			date: date
		}, (err, result) => {
			db.collection("counter")
				.updateOne(
					{name: "post-count"},
					{$inc: {totalPost: 1}},
					(err, result) => {
						console.log("counter update");
					});

			console.log("저장완료");
		});
}

function autoIncrement(name) {
	return new Promise(function(resolve, reject) {
		db.collection("counter").findOne({ name: name }, (err, result) => {
			console.log(result.totalPost);
			resolve(result.totalPost);
			reject(err);
		});
	})
}


