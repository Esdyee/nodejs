// const router = require('express').Router();
// get router & db connection from server.js
const router = require('express').Router();
const ObjectId = require('mongodb').ObjectId;

// get server.js of mongodb connection
const server = require('../server.js');

// router.use(loginCheck);

//list 조회
router.get("/list", (req, res) => {
	const getDb = server.getDb;

	const db = getDb();
	
	// get data from db
	db.collection("post").find().toArray((err, result) => {
		//isMine property 추가
		result.forEach((item) => {
			const id = new ObjectId(item.author);
			item.isMine = id.toString() === req.user._id.toString();
		});
		
		// page 렌더링
		res.render("list.ejs", { posts: result });
	});
});

module.exports = router;
