
import mongoose, {isValidObjectId, Mongoose} from "mongoose"
import {Like} from "../models/like.models.js"
import {Video} from "../models/video.model.js"
import {Tweet} from "../models/tweet.models.js"
import { Comment } from "../models/comment.models.js"
import {APIerror} from "../utils/APIerror.js"
import {APIresponse} from "../utils/APIresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new APIerror(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if(!video){
    throw new APIerror(404, "Video not found")
    }

    const videoLike= await Like.findOne({
        video: videoId,
        likedBy: req.user._id    //Finding any like on that video by the logged in user
    })

    if(videoLike){
    await videoLike.deleteOne()
    return res.status(200).json(new APIresponse(200,{},"The video has been succesfully unliked"))
    }

    else{
        const like= await Like.create({
            video:videoId,
            likedBy:req.user._id
        })

        return res.status(200).json(new APIresponse(200,like,"Video liked succesfully"))
    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new APIerror(400,"Invalid comment ID")
    }

    const comment= await Comment.findById(commentId)
    if(!comment){
        throw new APIerror(404,"Comment not found")
    }

    const commentLike= await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    if(commentLike){
        await commentLike.deleteOne()
        return res.status(200).json(new APIresponse(200,{},"Comment unliked succesfully"))
    }
    else{
        const like= await Like.create({
            comment: commentId,
            likedBy: req.user._id
        })

        return res.status(200).json(new APIresponse(200,like,"Comment liked succesfully"))
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new APIerror(400,"Invalid tweet ID")
    }

    const tweet= await Tweet.findById(tweetId)
    if(!tweet){
        throw new APIerror(404,"Tweet not found")
    }

    const tweetLike= await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if(tweetLike){
        await tweetLike.deleteOne()
        return res.status(200).json(new APIresponse(200,{},"Tweet unliked successfully"))
    }
    else{
        const like= await Like.create({
            tweet: tweetId,
            likedBy: req.user._id

        })
        return res.status(200).json(new APIresponse(200, like, "Tweet liked successfully"))
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const {page=1, limit=10}= req.query

     //Never trust query params (they are strings).
        let pageNum = Number(page)
        let limitNum = Number(limit)
    
        // Validate page
        if (!Number.isInteger(pageNum) || pageNum < 1) {
        throw new APIerror(400, "Page must be a positive integer")
        }
    
        // Validate limit
        if (!Number.isInteger(limitNum) || limitNum < 1) {
        throw new APIerror(400, "Limit must be a positive integer")
        }
    
        //To protect against page bombing 
        const MAX_LIMIT = 50
        if (limitNum > MAX_LIMIT) {
        limitNum = MAX_LIMIT
        }

    const skip = (pageNum - 1) * limitNum     //Formula to calculate skip

    const likedVideos= await Like.aggregate([
        {
            $match:{
                likedBy: new mongoose.Types.ObjectId(req.user._id),  //Here we can use only "req.user._id" as well but just to be safe we did new mongoose.Types.ObjectId
                video: {$exists: true}
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as:"video"
            }
        },
        {
            $unwind: "$video"  // unwind is an aggregation pipeline stage that breaks an array field into multiple documents — one document per element.
        },
        {
            $match:{
                "video.isPublished": true //only return the published videos
            }
        },
        {
            $project:{
                _id: "$video._id",
                title: "$video.title",
                thumbnail: "$video.thumbnail",
                duration: "$video.duration",
                views: "$video.views",
                createdAt: "$video.createdAt"
            }
        },
        {
            $skip:skip
        },
        {
            $limit:limitNum
        }

    ])
    //.aggregate() returns an array therefore we check length
    if(!likedVideos.length){
    return res.status(200).json(new APIresponse(200, [], "No liked videos found"))
    }

    return res.status(200).json(new APIresponse(200,likedVideos,"Liked Videos fetched successfully"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
