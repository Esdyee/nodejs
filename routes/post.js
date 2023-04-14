// const router = require('express').Router();
// get router & db connection from server.js
const router = require('express').Router();

// get server.js of mongodb connection
const server = require('../server.js');

// router.use(loginCheck);

//list 조회
router.get("/list", (req, res) => {
	const getDb = server.getDb;

	const db = getDb();

	// get data from db
	db.collection("post").find().toArray((err, result) => {
		res.render("list.ejs", { posts: result });
	});
});

module.exports = router;
