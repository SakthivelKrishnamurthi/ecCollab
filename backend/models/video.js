const mongoose = require("mongoose");

const videoSchema = mongoose.Schema({
    url: String,
});

const VideoModel = mongoose.model("video", videoSchema);

console.log(VideoModel);

module.exports = VideoModel;
