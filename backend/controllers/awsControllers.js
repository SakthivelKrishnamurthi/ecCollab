const asyncHandler = require("express-async-handler");
const aws = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const { promisify } = require("util");
const VideoModel = require("../models/video");

const s3 = new aws.S3({
    accessKeyId: "AKIAZJAQWYAO7ADUUNGI",
    secretAccessKey: "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",
    region: "eu-north-1",
});

const upload = multer({ storage: multer.memoryStorage() }).single("video");

const listVideos = asyncHandler(async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: "sak-srp" }).promise();

        const videos = data.Contents.map((obj) => ({
            key: obj.Key,
            lastModified: obj.LastModified,
        }));
        videos.sort((a, b) => b.lastModified - a.lastModified);

        const latestVideo = videos.length > 0 ? videos[0].key : null;

        res.json({ latestVideo });
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).send("Error fetching videos");
    }
});

const uploadVideo = asyncHandler(async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                console.error("Multer error:", err);
                return res.status(400).send("Multer error");
            } else if (err) {
                console.error("Unknown error:", err);
                return res.status(500).send("Unknown error");
            }

            if (!req.file) {
                console.error("No file uploaded.");
                return res.status(400).send("No file uploaded.");
            }

            const videoFile = req.file;

            const uploadParams = {
                Body: videoFile.buffer,
                Bucket: "sak-srp",
                Key: Date.now().toString() + path.extname(videoFile.originalname),
            };

            const data = await s3.upload(uploadParams).promise();

            const videoUrl = `https://sak-srp.s3.amazonaws.com/${data.Key}`;

            const newVideo = new VideoModel({ url: videoUrl });
            await newVideo.save();
            res.redirect("/");
        });
    } catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).send("Error uploading video");
    }
});

module.exports = { listVideos, uploadVideo };
