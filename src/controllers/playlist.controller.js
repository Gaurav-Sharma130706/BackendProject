import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import { Video } from "../models/video.model.js"
import {APIerror} from "../utils/APIerror.js"
import {APIresponse} from "../utils/APIresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { error } from "console"
import { title } from "process"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body

    if(!name?.trim() || !description?.trim()){
        throw new APIerror(400,"Both name and description are mandatory fields")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!playlist){
        throw new APIerror(500,"Unable to create the playlist")
    }

    return res.status(201).json(new APIresponse(201,playlist,"Playlist created succesfully"))
    
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new APIerror(400, "Invalid user ID")
    }
    
    const user = await User.findById(userId)
    if (!user) {
        throw new APIerror(404, "User not found")
    }

    //Pagination

    let pageNum = Number(page)
    let limitNum = Number(limit)

    if (!Number.isInteger(pageNum) || pageNum < 1) {
        throw new APIerror(400, "Page must be a valid integer")
    }

    if (!Number.isInteger(limitNum) || limitNum < 1) {
        throw new APIerror(400, "Limit must be a positive integer")
    }

    //To protect against page bombing 
    const MAX_LIMIT = 50
    if (limitNum > MAX_LIMIT) {
        limitNum = MAX_LIMIT
    }

    const skip = (pageNum - 1) * limitNum

    //aggregation pipelines
    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        { 
            $sort: { createdAt: -1 }            //Sort in descending order  newest-> oldest
        },
        {
            $project: {   //Shape the output
                _id: 1,                    // Keep playlist ID
                name: 1,                   //include name
                description: 1,             // include description
                createdAt: 1,               // include created date
                updatedAt: 1,               // include updated date
                videoCount: { $size: "$videos" }  //  add new field = count of videos array
            }
        },
        { $skip: skip },
        { $limit: limitNum }
    ])

    const totalPlaylists = await Playlist.countDocuments({
        owner: new mongoose.Types.ObjectId(userId)
    })

    const totalPages = Math.ceil(totalPlaylists / limitNum)

    return res.status(200).json(
        new APIresponse(
            200,
            { totalPlaylists, totalPages, currentPage: pageNum, playlists },
            "All the playlists fetched successfully"
        )
    )
})


const getPlaylistById = asyncHandler(async (req, res) => {
    
    //TODO: get playlist by id
    const {playlistId} = req.params
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
            throw new APIerror(400, "Invalid Playlist ID")
        }
    
    // const playlist= await Playlist.findById(playlistId)   we could do like this but this will only give the id's of videos inside playlist
    //We want to get there id, title, thumbnail and duration
    //const playlist = await Playlist.findById(playlistId).populate("videos")  for that we could use this but it will take 2 queries
    // one for findbyid and one for populate therefore not efficient in production therefore we use aggregation pipelines

    const playlist = await Playlist.aggregate([
    {
        $match: { _id: new mongoose.Types.ObjectId(playlistId) }
    },
    {
        $lookup: {                              //it joins two collections together.
            from: "videos",                     // which collection to join
            localField: "videos",               // field in current document (playlist)
            foreignField: "_id",                // field in the other collection (video)
            as: "videos"                        // name of the output array
        }
    },
    {
        $project: {
            name: 1,
            description: 1,
            videos: {
                _id: 1,
                title: 1,
                thumbnail: 1,
                duration: 1
            }
        }
    }
    ])

    if(!playlist){
        throw new APIerror(404, "No playlist found")
    }
    return res.status(200).json(new APIresponse(200, playlist, "Playlist fetched succesfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
        throw new APIerror(400, "Invalid Playlist ID")
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
            throw new APIerror(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new APIerror(404,"Video not found")
    }

    //authorization
    if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new APIerror(403, "Not authorized")
    }

    const playlist= Playlist.findByIdAndUpdate(playlistId,{$addToSet:{videos: videoId}},{new:true})   // $addToSet won't add if already exists and new:true will return the updated document

    if(!playlist){
        throw new APIerror(404,"Playlist not found")
    }

    return res.status(200).json(new APIresponse(200,playlist,"Video succesfully added to the playlist"))

    

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    
    // TODO: remove video from playlist
    const {playlistId, videoId} = req.params
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
        throw new APIerror(400, "Invalid Playlist ID")
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
            throw new APIerror(400, "Invalid Video ID")
    }

    //Checking that if video exist in playlist
    const playlist = await Playlist.findOne({
        _id: playlistId,
        videos: videoId
    })

    if(!playlist){
        throw new APIerror(404,"Video not found in playlist")
    }

    //Authorization
    if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new APIerror(403, "Not authorized")
    }

    //Deleting video from playlist
    //Here we cant use findbyidandDelete since it would delete the complete playlist but we want to delete a video from videos array inside playlist

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },   // $pull removes the videoId from array
        { new: true }
    )

    return res.status(200).json(new APIresponse(200, updatedPlaylist,"Video removed from playlist succesfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const {playlistId} = req.params
    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new APIerror(400, "Invalid playlist ID")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new APIerror(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new APIerror(403, "You are not authorized to delete this playlist")
    }

    const deletedPlaylist= await Playlist.findByIdAndDelete(playlistId)
    

    return res.status(200).json(new APIresponse(200,deletedPlaylist,"The playlist has been succesfully deleted"))
    
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new APIerror(400,"Invalid playlist ID")
    }

    if(!name || !description){
        throw new APIerror(400,"No field provided for updation")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
    throw new APIerror(404, "Playlist not found")
    }
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new APIerror(403, "You are not authorized to delete this playlist")
    }


    const playlistUpdated= await Playlist.findByIdAndUpdate(playlistId,{$set:{name:name, description:description}}, {new:true})

    return res.status(200).json(new APIresponse(200,playlistUpdated,"Playlist updated succesfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}