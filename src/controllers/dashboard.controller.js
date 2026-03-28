import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscryption} from "../models/subscryption.models.js"
import {Like} from "../models/like.models.js"
import {APIerror} from "../utils/APIerror.js"
import {APIresponse} from "../utils/APIresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const channelStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        // Step 1: lookup likes per video before grouping
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesPerVideo: { $size: "$likes" }
            }
        },
        // Step 2: group all videos of the channel together
        {
            $group: {
                _id: "$owner",
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 },
                totalLikes: { $sum: "$likesPerVideo" }
            }
        },
        // Step 3: lookup subscribers after grouping (now _id is channel id)
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                totalSubscribers: { $size: "$subscribers" }
            }
        },
        {
            $project: {
                _id: 0,
                totalViews: 1,
                totalVideos: 1,
                totalLikes: 1,
                totalSubscribers: 1
            }
        }
    ])

    // handle if channel has no videos
    if (!channelStats.length) {
        return res.status(200).json(
            new APIresponse(200, {
                totalViews: 0,
                totalVideos: 0,
                totalLikes: 0,
                totalSubscribers: 0
            }, "Channel has no videos yet")
        )
    }

    return res.status(200).json(
        new APIresponse(200, channelStats[0], "Channel stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const {page=1, limit=10} = req.query

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

    const skip = (pageNum - 1) * limitNum
    
    const videos= await Video.aggregate([
        {
            $match:{
                owner: req.user._id
            }
        },
        {
            $sort:{createdAt: -1}
        },
        {
            $skip: skip
        },
        {
            $limit: limitNum
        },
        {
            $project:{
                title:1,
                thumbnail:1,
                views:1,
                createdAt:1
            }
        }
    ])

    

    if(!videos.length){
        return res.status(200).json(new APIresponse(200,{videos:[],totalVideos,currentPage:1},"No videos found"))
    }

    const totalVideos= await Video.countDocuments({
        owner: req.user._id
    })

    return res.status(200).json(new APIresponse(200,{videos,totalVideos,currentPage:pageNum},"Videos fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
    }