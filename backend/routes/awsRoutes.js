// routes/awsRoutes.js
const express = require("express");
const router = express.Router();
const awsController = require("../controllers/awsControllers");

router.route("/")
  .get(awsController.listVideos)
  .post(awsController.uploadVideo);


module.exports = router;
