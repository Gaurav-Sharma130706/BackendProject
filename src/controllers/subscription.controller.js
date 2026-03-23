import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscryption } from "../models/subscryption.models.js"
import {APIerror} from "../utils/ApiError.js"
import {APIresponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    const {channelId} = req.params
    const subscriberId= req.user?._id

    if(!mongoose.Types.ObjectId.isValid(channelId)){
        throw new APIerror(400,"Invalid channel ID")
    }

    //User should not subscribe to themselves.

    if(subscriberId.toString() === channelId){
        throw new APIerror(400,"You cant subscribe to yourself")
    }

    const channel= await User.findById(channelId)
    if(! channel){
        throw new APIerror(404,"Channel not found")
    }
    
    const subscription= await Subscryption.findOne({
        subscriber: subscriberId,
        channel: channelId
    })

    if(subscription){
        await subscription.deleteOne()
        return res.status(200).json(new APIresponse(200,null,"Unsubscribed successfully"))
    }
    else
    {
        const subscribe = await Subscryption.create({
            subscriber:subscriberId,
            channel:channelId
        })

        return res.status(200).json(new APIresponse(200,subscribe,"Subscribed successfully"))
    }


})

// controller to return subscriber list of a channel   (Used aggregation pipelines here)
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const {page=1,limit=10}=req.query

    if(! mongoose.Types.ObjectId.isValid(channelId)){
        throw new APIerror(400,"Invalid channel ID")
    }

    const channel= await User.findById(channelId)
    if(! channel){
        throw new APIerror(404,"Channel not found")
    }

    //Pagination

    let pageNum= Number(page)
    let limitNum= Number(limit)

    if(!Number.isInteger(pageNum) || pageNum<1)
    {
        throw new APIerror(400,"Page must be a valid integer")
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

    //This .find and . populate wala method is correct but not suitable for large number of requests
    // const subscribers= await  Subscryption
    //                             .find({channel:channelId})
    //                             .sort({createdAt: -1})
    //                             .skip(skip)
    //                             .limit(limitNum)
    //                             .populate("subscriber","username fullName avatar")

    // const totalSubscribers= await Subscryption.countDocuments({channel:channelId})


    //Aggregation pipeline method - Better for production(effective for large list of subscribers)
    const subscribers = await Subscryption.aggregate([
    {
    $match: {
      channel: new mongoose.Types.ObjectId(channelId)
    }
  },
  { $sort: { createdAt: -1 } },
  {
    $lookup: {                             //We used lookup beacuse match would only send the subscriberId but we want to get the user data corresponding to  that subscriberId
      from: "users",
      localField: "subscriber",
      foreignField: "_id",
      as: "subscriber"
    }                                      //When you use lookup, MongoDB always returns an array, even if only one match exists.
  },
  { $unwind: "$subscriber" },              //$unwind converts an array into a normal object.   Array->Object
  {
    $project: {                            //project controls: What fields should be included, excluded, or reshaped.
      _id: 0,                              //This is is "subscriptionId" and we dont want to send it therefore set it to 0
      subscriber: {
        _id: "$subscriber._id",
        username: "$subscriber.username",
        fullName: "$subscriber.fullName",
        avatar: "$subscriber.avatar"
      }
    }
  },
  { $skip: skip },
  { $limit: limitNum }
])


const totalSubscribers = await Subscryption.countDocuments({
  channel: channelId
})

    const totalPages = Math.ceil(totalSubscribers / limitNum)

    return res.status(200).json( new APIresponse(200,{totalSubscribers,totalPages,currentPage: pageNum,subscribers},"Channel Subscribers fetched succesfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const {page=1,limit=10}= req.query

    if(!mongoose.Types.ObjectId.isValid(subscriberId)){
        throw new APIerror(400,"Invalid subscriberId")
    }

    const subscriber= await User.findById(subscriberId)
    if(!subscriber){
        throw new APIerror(404,"User not found")
    }

    //Pagination

    let pageNum= Number(page)
    let limitNum= Number(limit)

    if(!Number.isInteger(pageNum) || pageNum<1){
        throw new APIerror(400,"Page must be a positive number")
    }

    if(!Number.isInteger(limitNum) || limitNum<1){
        throw new APIerror(400,"Limit must be a positive number")
    }

    const MAX_LIMIT=50
    if(limitNum>MAX_LIMIT){
        limitNum=MAX_LIMIT
    }

    const skip= (pageNum-1) * limitNum

    const channels= await Subscryption.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $sort:{ createdAt:-1}
        },
        {
             $lookup: {                             //We used lookup beacuse match would only send the subscriberId but we want to get the user data corresponding to  that subscriberId
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$channel" }, 
        {
          $project: {                            //project controls: What fields should be included, excluded, or reshaped.
                _id: 0,                              //This is is "subscriptionId" and we dont want to send it therefore set it to 0
                channel: {
                _id: "$channel._id",
                username: "$channel.username",
                fullName: "$channel.fullName",
                avatar: "$channel.avatar"
                    }
                }
        },
        { $skip: skip },
        { $limit: limitNum }

    ])


    const totalChannels = await Subscryption.countDocuments({
                                        subscriber: subscriberId
                                        })

    const totalPages = Math.ceil(totalChannels / limitNum)

    return res.status(200).json(new APIresponse(200,{totalChannels,totalPages,currentPage: pageNum, channels},"Subscribed channels fetched succesfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}