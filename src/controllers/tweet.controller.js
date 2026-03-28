import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.models.js"
import {User} from "../models/user.model.js"
import {APIerror} from "../utils/APIerror.js"
import {APIresponse} from "../utils/APIresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    //Get cocntents from frontend
    const {content}= req.body

    //Validate
    if(!content || content?.trim()===""){
        throw new APIerror(400,"You cant tweet without any content")
    }

    //Create tweet object and upload in DB
    const tweet= await Tweet.create({
        content,
        owner:req.user?._id
    })

    //Checking if tweet was created in above step
    if(!tweet)
    {
        throw new APIerror(500,"Something went wrong")
    }

    //Return the response
    return res.status(201).json(new APIresponse(201,tweet,"Tweet was succesfuly created"))
    
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const user= req.user?._id
    const {page=1,limit=10,}=req.query

    let pageNum= Number(page)
    let limitNum= Number(limit)

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

    //fetch tweets
    const tweets= await Tweet.find({owner:user})
                             .sort({ createdAt: -1 })
                             .skip(skip)
                             .limit(limitNum)
    
    //get total tweets and pages
    const totalTweets= await Tweet.countDocuments({owner:user})
    const totalPages = Math.ceil(totalTweets / limitNum)

    return res.status(200).json(
        new APIresponse(200,{
        totalTweets,
        totalPages,
        currentPage: pageNum,
        tweets
        },"Tweets fetched succesfully"
        )
        

    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    const {content}= req.body
    const {tweetId}= req.params

    //Is request coming from a correct URL
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {    //It is done so that if user sends request from a URL that is not of type of a mongoDB ID it throws error
        throw new APIerror(400, "Invalid Tweet ID")
    }

    //Does that tweet exist
    const tweet=await Tweet.findById(tweetId)
    if (!tweet) {
        throw new APIerror(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new APIerror(403, "You are not allowed to edit this tweet")
    }

    if(!content || content.trim()==="")
    {
        throw new APIerror(400,"There is no content to be updated")
    }

    tweet.content=content.trim()

    await tweet.save()

    return res.status(200).json(new APIresponse(200,tweet,"Tweet has been updated succesfully"))


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const {tweetId}=req.params

    if(! mongoose.Types.ObjectId.isValid(tweetId)){
        throw new APIerror(400,"Invalid tweet ID")
    }

    const tweet=await Tweet.findById(tweetId)
    if(!tweet){
        throw new APIerror(404,"Tweet not found")
    }

    if(req.user._id.toString() !== tweet.owner.toString()){
        throw new APIerror(403, "You are not allowed to delete the tweet, only the owner may delete")
    }

    const deletedTweet= await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json( new APIresponse(200,deletedTweet,"The tweet has been deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}