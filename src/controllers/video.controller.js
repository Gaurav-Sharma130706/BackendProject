import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {APIerror} from "../utils/ApiError.js"
import {APIresponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { v2 as cloudinary } from "cloudinary";


// helper to get public_id from cloudinary url
const getPublicId = (url) => {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1]; // abc123.jpg
  return fileName.split(".")[0]; // abc123
};


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query  
    //TODO: get all videos based on query, sort, pagination

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

    // Build filter object
    const filter = {
        isPublished: true   // only published videos
    }

    // Search logic
    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    // Filter by userId if provided
    if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new APIerror(400, "Invalid User ID")
        }
        filter.owner = userId
    }

    // Sorting logic
    const sortOrder = sortType === "asc" ? 1 : -1
    const sortOptions = { [sortBy]: sortOrder }

    // Fetch videos
    const videos = await Video.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("owner", "username fullName avatar")   //For when the frontend filters videos on basis of the owner

    // Get total count for pagination metadata
    const totalVideos = await Video.countDocuments(filter)
    const totalPages = Math.ceil(totalVideos / limitNum)

    return res.status(200).json(
        new APIresponse(200, {
            totalVideos,
            totalPages,
            currentPage: pageNum,
            videos
        }, "Videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
// TODO: get video, upload to cloudinary, create video

    //STEP-1 get video details from frontend
    const { title, description} = req.body

    //STEP-2 validation
    if([title,description].some((field)=>field?.trim()==="")){
        throw new APIerror(400,"All fields are compulsory")
    }
    
    //Step-3 Check for thumbnail and video
    const videoLocalPath= req.files?.videoFile[0]?.path
    const thumbnailLocalPath= req.files?.thumbnail[0]?.path

    if(!videoLocalPath){
        throw new APIerror(400,"Video file is missing")
    }

    if(!thumbnailLocalPath){
        throw new APIerror(400,"Thumbnail is missing")
    }

    //Step-4 upload video and thumbnail to cloudinary and check if they are updated succesfully
    const videoFile= await uploadOnCloudinary(videoLocalPath)
    const thumbnail= await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile){
        throw new APIerror(400,"Video file is required")
    }

    if(!thumbnail){
        throw new APIerror(400,"Thumbnail is required")
    }

    const duration= videoFile.duration

    //Step-5 create video object and create entry in DB
    const video= await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail:thumbnail.url,
        isPublished:true,
        owner:req.user?._id,
        duration: duration
    }
    )

    //Step-6  is video created in above step
    if(!video){
        throw new APIerror(500,"Something went wrong while uploading the video")
    }

    //Step-7 sending the response
    return res.status(201).json(
        new APIresponse(201,video,"Video uploaded succesfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
        throw new APIerror(400, "Invalid Video ID")
    }
    const video= await Video.findById(videoId)
    if (!video) {
        throw new APIerror(404, "Video not found")
    }
    return res.status(200).json(new APIresponse(200, video, "Video Id fetched succesfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params
    const {title, description} = req.body

    //Is request coming from a correct URL
    if (!mongoose.Types.ObjectId.isValid(videoId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
        throw new APIerror(400, "Invalid Video ID")
    }

    //Does that video exist
    const video=await Video.findById(videoId)
    if (!video) {
        throw new APIerror(404, "Video not found")
    }

    //By now we know it is a valid request

    //But now we check that the user who is sending the request is the owner of video? if not throw error

    if(video.owner.toString() !== req.user._id.toString()){
        throw new APIerror(403,"You are not allowed to edit this video. Only the owner can edit")
    }

    //Now the req might send only one parameter(title,desc,thumbnail) OR two OR all 3 OR none
    //So now we check for each field that is it send in req?

    let isUpdated = false //We are maintaining it for when nothing sent in request, none of the parameters

    if(title !== undefined){
        if(title.trim()==="") throw new APIerror(400,"You entered an empty title")
        video.title=title.trim()
        isUpdated=true
    }
    if(description!== undefined){
        if(description.trim()==="") throw new APIerror(400,"You entered an empty description")
        video.description= description.trim()
        isUpdated=true
    }

    const thumbnailLocalPath= req.file?.path
    if(thumbnailLocalPath){

        
        const oldThumbnail = video.thumbnail

        const thumbnailNew= await uploadOnCloudinary(thumbnailLocalPath)

        if(!thumbnailNew.url){
                throw new APIerror(500, "Error while uploading the thumbnail")
            }

        if(oldThumbnail){
            const publicID= getPublicId(oldThumbnail)
            await cloudinary.uploader.destroy(publicID)
        }

        video.thumbnail=thumbnailNew.url
        isUpdated=true
    }

    if (!isUpdated) {
    throw new APIerror(400, "No fields provided for update")
    }

    await video.save()

    return res.status(200).json(new APIresponse(200,video,"Video details updated succesfully"))
 
})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params

    //Is request coming from a correct URL
    if (!mongoose.Types.ObjectId.isValid(videoId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
        throw new APIerror(400, "Invalid Video ID")
    }

    //Does that video exist
    const video=await Video.findById(videoId)
    if (!video) {
        throw new APIerror(404, "Video not found")
    }

    //Ownership check
    if(req.user._id.toString() !== video.owner.toString())
    {
        throw new APIerror(403, "You are not allowed to delete the video, only the owner may delete")
    }

    //Deleting the thumbnail and video from the cloudinary (cloudinary cleanup)
    const videoFile= video.videoFile
    const thumbnail= video.thumbnail


    if(videoFile){
            const publicID= getPublicId(videoFile)
            await cloudinary.uploader.destroy(publicID)
    }

    if(thumbnail){
        const publicID= getPublicId(thumbnail)
        await cloudinary.uploader.destroy(publicID)
    }

    const deletedVideo=await Video.findByIdAndDelete(videoId)

    return res.status(200).json(new APIresponse(200,deletedVideo,"The video has been succesfully deleted"))
    
    
    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

     //Is request coming from a correct URL
    if (!mongoose.Types.ObjectId.isValid(videoId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
        throw new APIerror(400, "Invalid Video ID")
    }

    //Does that video exist
    const video=await Video.findById(videoId)
    if (!video) {
        throw new APIerror(404, "Video not found")
    }

    //Ownership check
    if(req.user._id.toString() !== video.owner.toString())
    {
        throw new APIerror(403, "You are not allowed to modify this video")
    }

    video.isPublished= !video.isPublished

    await video.save()

    return res.status(200).json(
    new APIresponse(200, video, "Publish status has been successfully toggled")
    )

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}