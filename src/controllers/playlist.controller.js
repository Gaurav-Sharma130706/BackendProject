import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/APIerror.js"
import {ApiResponse} from "../utils/APIresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { error } from "console"
import { title } from "process"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body

    if(!name?.trim() || !description?.trim()){
        throw new ApiError(400,"Both name and description are mandatory fields")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!playlist){
        throw new ApiError(500,"Unable to create the playlist")
    }

    return res.status(201).json(new ApiResponse(201,playlist,"Playlist created succesfully"))
    
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }
    
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    //Pagination

    let pageNum = Number(page)
    let limitNum = Number(limit)

    if (!Number.isInteger(pageNum) || pageNum < 1) {
        throw new ApiError(400, "Page must be a valid integer")
    }

    if (!Number.isInteger(limitNum) || limitNum < 1) {
        throw new ApiError(400, "Limit must be a positive integer")
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
            $sort: { createdAt: -1 } 
        },
        {
            $project: {
                _id: 1,                    // Keep playlist ID
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                videoCount: { $size: "$videos" }  // Count number of videos in playlist
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
        new ApiResponse(
            200,
            { totalPlaylists, totalPages, currentPage: pageNum, playlists },
            "All the playlists fetched successfully"
        )
    )
})


const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
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