// const router = require('express').Router();
// get router & db connection from server.js
const router = require('express').Router();

// get server.js of mongodb connection
const server = require('../server.js');

// get chat data from db
router.get("/:postId", (req, res) => {

	const getDb = server.getDb;
	const db = getDb();
	const postId = Number(req.params.postId);

	// get chat data from db
	db.collection("chat").find({parentPostId: postId}).toArray((err, result) => {
		console.log(result);
		// add property to result
		result.forEach((item) => {
			item.isMine = item.userId === req.user.id;
		});
		res.render("chat.ejs", { posts: result });
	});
})

// post chat data to db
router.post("/:postId", (req, res) => {
	const getDb = server.getDb;
	const db = getDb();
	const postId = Number(req.params.postId);

	// get chat data from db
	db.collection("chat").insertOne({
		parentPostId: postId,
		userId: req.user.id,
		content: req.body.content,
		date: new Date(),
	}, (err, result) => {
		res.redirect(`/chat/${postId}`);
	});
})

module.exports = router;
