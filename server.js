const express = require("express");
const app = express();

//express 문법 시작
app.use(express.urlencoded({ extended: true })); // 이해할 필요 X 이렇게 쓰라고 되어있을뿐
app.set("view engine", "ejs");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const multer = require("multer");  // 이미지 업로드에 사용 됨

//diskStorage : 디스크에 저장, memoryStorage : 메모리에 저장
const uploadStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/images"); // 파일이 저장될 경로
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname); // 저장한 이미지의 파일명 설정하는 부분
	},
});

const upload = multer({
	storage: uploadStorage,
	fileFilter: function (req, file, cb) {
		if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
			return cb(new Error("Only image files are allowed!"), true);
		}
	}
});

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
	db = client.db('todoapp');

	// 데이터 insert
	app.listen(process.env.PORT, () => {
		console.log("listening on 8080");
	});
});

// export db connect
module.exports = {
	app,
	db,
	getDb: () => {
		return db;
	}
};


app.get("/login", (req, res, next) => {
	res.render("login.ejs");
});

//faukyreRedurect is CurrentPage Setting
app.post("/login", passport.authenticate("local", {
	failureRedirect: "/login",
}), (req, res) => {
	res.redirect("/");
});

passport.use(new LocalStrategy({
	usernameField: "id",
	passwordField: "pw",
	session: true,
	// passReqToCallback: false
}, (username, password, done) => {

	db.collection("login").findOne({ id: username }, (err, result) => {
		if (err) return done(err);

		if (!result) {
			// send custom error message
			return done(null, false, { message: "존재하지 않는 아이디입니다." });
		}

		if (result.pw !== password) {
			return done(null, false, {message: "비밀번호가 틀렸습니다."});
		}
		return done(null, result);
	});
}));

app.get("/mypage", checkLogin, (req, res) => {
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
		done(null, result);
	});
});

app.post("/register", (req, res) => {

	// check if user exists
	db.collection("login").findOne({
		id: req.body.id
	}, (err, result) => {
		if (result) {
			res.send("이미 존재하는 아이디입니다.");
		} else {
			// create user
			db.collection("login").insertOne({
				id: req.body.id,
				pw: req.body.pw,
			}, (err, result) => {
				res.redirect("/login");
			});
		}
	})
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
	const userId = req.user._id;
	insertData(title, date, userId);
	res.send("success!");
});

// data update
app.post("/update", (req, res) => {
	const {title, id, date} = req.body;
	db.collection("post")
		.updateOne(
			{_id: parseInt(id)},
			{$set: {title: title, date: date}},
			(err, result) => {
				// res.send("success!");
				res.redirect("/list");
			});
});

//list 조회
// app.get("/list", (req, res) => {
// 	db.collection("post").find().toArray((err, result) => {
// 		console.log(result);
// 		res.render("list.ejs", { posts: result });
// 	});
// });

// chat router with db
app.use("/chat", checkLogin, require("./routes/chat.js"));

// use router with db
app.use("/", require("./routes/post.js"));

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

	db.collection("post").aggregate(aggregateParam).toArray((err, result) => {
		res.render("search.ejs", { posts: result });
	});
});

app.delete("/delete", (req, res) => {
	// get ajax data
	const { id } = req.body;
	let deletedPost = { _id: parseInt(id), author: req.user._id };

	db.collection("post").deleteOne(
		deletedPost,
		(err, result) => {
			if (err) {
				res.status(400).send({ message: "fail" });
				return console.log(err);
			}
			// console.log(result.deletedCount);
			if (result.deletedCount === 0) {
				res.status(400).send({ message: "no-data" });
				return console.log("삭제할 데이터가 없습니다.");
			}
			res.status(200).send({ message: "success" });

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

app.get("/upload", (req, res) => {
	res.render("upload.ejs");
});

app.post("/upload", upload.single("profile"), (req, res) => {
	console.log(req.file);
	res.send("success!");
});




// 404 에러 처리
app.use(function (req, res, next) {
	res.status(404).render("not-find.ejs");
});

// 데이터 insert
async function insertData(title, date, userId) {
	const postCount = await autoIncrement("post-count");
	console.log(postCount);

	db.collection("post")
		.insertOne({
			_id: postCount + 1,
			title: title,
			date: date,
			author: userId,
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


