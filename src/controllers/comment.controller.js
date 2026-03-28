import mongoose, { mongo } from "mongoose"
import {Comment} from "../models/comment.models.js"
import { Video } from "../models/video.model.js"
import {APIerror} from "../utils/APIerror.js"
import {APIresponse} from "../utils/APIresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new APIerror(400,"Invalid videoId")
    }
    const video = await Video.findById(videoId)

    if(!video){
    throw new APIerror(404, "Video not found")
    }

    let pageNum= Number(page)
    let limitNum= Number(limit)

    
    if(!Number.isInteger(pageNum) || pageNum<1){
        throw new APIerror(400,"Page must be a positive integer")
    }

    if(!Number.isInteger(limitNum)|| limitNum<1){
        throw new APIerror(400,"Limit must be a positive integer")
    }

    const MAX_LIMIT=50
    if(limitNum>MAX_LIMIT){
        limitNum=MAX_LIMIT
    }

    const skip= (pageNum-1)*limitNum

    const comments= await Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as: "owners"
            }
        },
        {
            $unwind: "$owners"
        },
        {
            $sort:{createdAt:-1}
        },
        {
            $skip:skip
        },
        {
            $limit:limitNum
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: {
                    _id: "$owners._id",
                    username: "$owners.username",
                    avatar: "$owners.avatar"
                }
            }
        }
    ])

    const totalComments= await Comment.countDocuments({
        video: new mongoose.Types.ObjectId(videoId)
    })

    return res.status(200).json(new APIresponse(200,{comments, totalComments ,currentPage:pageNum},"Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content}= req.body

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new APIerror(400,"Invalid video id")
    }

    const video= await Video.findById(videoId)
    if(!video){
        throw new APIerror(404,"No video found")
    }

    if(!content|| !content.trim()){
        throw new APIerror(400,"Your comment is empty")
    }

    const comment= await Comment.create({
        content,
        video: new mongoose.Types.ObjectId(videoId) ,
        owner: req.user._id
    })

    if(!comment){
        throw new APIerror(500,"Something went wrong")
    }

    return res.status(200).json(new APIresponse(200,comment,"Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId}=req.params
    const {content}= req.body

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new APIerror(400,"Invalid comment id")
    }

    if(!content|| !content.trim()){
        throw new APIerror(400,"Plz enter some content for updation")
    }

    const existingComment = await Comment.findById(commentId)

    if (!existingComment) {
    throw new APIerror(404, "Comment not found");
    }

    if (existingComment.owner.toString() !== req.user._id.toString()) {
    throw new APIerror(403, "Unauthorized")
    }

    const comment= await Comment.findByIdAndUpdate(commentId,{content:content},{new:true})

    if(!comment){
        throw new APIerror(404,"Comment not found")
    }

    return res.status(200).json(new APIresponse(200,comment,"Comment updated succesfully"))


})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId}=req.params

    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new APIerror(400,"Invalid comment id")
    }

    const comment=await Comment.findById(commentId)

    if(!comment){
        throw new APIerror(404,"No comment found")
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new APIerror(403, "Unauthorized")
    }

    await comment.deleteOne()

    return res.status(200).json(new APIresponse(200,"Comment deleted succesfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }