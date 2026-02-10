import {asyncHandler} from "../utils/asyncHandler.js"
import {APIerror} from "../utils/APIerror.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {APIresponse} from "../utils/APIresponse.js"
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose"



// helper to get public_id from cloudinary url
const getPublicId = (url) => {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1]; // abc123.jpg
  return fileName.split(".")[0]; // abc123
};




const generateAccessAndRefreshTokens =async(userID)=>{
    try {
        const user= await User.findById(userID)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken  //Here we inserted the generated refresh token inside our DB, i.e. jo apna uss particular user ka object hai usme apna refresh token save kar rahe hain
        await user.save({validateBeforeSave: false}) //Now we are saving that user object, par save karne se pehle it will need other fields like username password etc. as well therefore to avoid it we use {validateBeforeSave: false}

        return {refreshToken,accessToken}

    } catch (error) {
       throw new APIerror(500,"Something went wrong while generating refresh and access token") 
    }
}

const registerUser= asyncHandler( async(req,res)=>{
    
    //Step-1 get user details from frontend
    const {username,email,fullName,password}= req.body
    console.log("email:",email);

    //Step-2 Validation
    /*
    if (fullname==="") {
        throw new Apierror(400,"Full name is required")
    } similarly apan har field ke liye ese hi if else karke validate kar sakte hain
     */

    if ( [username,email,fullName,password].some( (field)=> field?.trim()=== "")) { //complex code to avoid multiple if else
            throw new APIerror(400,"All fields are complursory")
    }

    //Step-3 Check if user already exists
    const existedUser= await User.findOne({                        //This User is imported from user model and it has acces to DB, findOne returns the 1st thing that matches what you asked
        $or:[{username},{email}]          //we are using both username and email to to check if user exists   to know more about $or refer GPT
    })

    if(existedUser){
        throw new APIerror(409, "User with same Username OR Email exists")
    }

    //Step-4 Check for images
    //req.files is provided by multer which provides with the acces for all the files

    const avatarLocalPath = req.files?.avatar[0]?.path    //? is used for chaining ki agar mile ya na mile
    //Here we are taking the local paths of images in our server which were stored by multer
    
    if (!avatarLocalPath) {                            //If we dont find any path for our avatar that means we dont have any avatar therefore throw error since avatar is required
        throw new APIerror(400, "Avatar file is required")
    }

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){    //If the request contains a cover image file,then store the local file path so we can upload it to cloud or process it.
        coverImageLocalPath= req.files.coverImage[0].path
    }

    //Step-5 Upload images to cloudinary + check if avatar is properly uploaded(since its a required field)
    const avatar=  await uploadOnCloudinary(avatarLocalPath)
    const coverImage=  await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new APIerror(400, "Avatar file is required")
    }

    //Step-6 Create User Object and create entry in DB
    //Abb apne pass ek hi chiz hai jo DB se baat kar rahi hai i.e. User
    const user= await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",   //Here we used ? but not in avatar because for avatar we had validated but for cover image we dont know if its there or not, ? means ki agar cover image hai toh uska url le lo warna rehne do
        email,
        password,
        username: username.toLowerCase()
    })

    //Step-7 Removing password & refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //Step-8 Checking if the user in above step was created succesfully or not
    if(!createdUser){
        throw new APIerror(500, "Something went wrong while regestering the user")
    }

    //Step-9 Return the response  (to return the responses form API we had created APIresponse util to normalize the responses from API)
    return res.status(201).json(      //Wese toh apan pura response hi APIresponse laga kar send karsakte hain but status ko "res.status" use karke bhejna is a good practice
        new APIresponse(200, createdUser, "User registered succesfully")
    )

    
     

    


})
 

const loginUser= asyncHandler(async(req,res)=>{
    //Step-1
    const {email,username,password}= req.body

    if(!username && !email){           //We are giving the option to user to login either from username or email
        throw new APIerror(400,"Either username or email is required")
    }


    const user= await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new APIerror(404,"User does not exist")
    }

    const isPasswordValid= await user.isPasswordCoreect(password)

    if(!isPasswordValid){
        throw new APIerror(401,"Password is incorrect")
    }

    //Step-5 Access and refresh token (for it we have created a method at top of this file)
    const {accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)
    
    //Sending cookies
    const loggedInUser= await User.findById(user._id).select("-password -refreshToken") //we created logged in user, in it we dont take password and refresh token beacause we will send it as cookie and they can be hacked

    const options={
        httpOnly:true,
        secure: true, 
    }
                                   //Key         Value       options that we made above
    return res.status(200).cookie("accessToken", accessToken,options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new APIresponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully"
        )
    )



})

//Inside logoutUser we cant search for the user based on their email OR username inside the DB since it will require the user to fill a form at time of logout with username and email, moreover he may logout any other user as well by filling there username in form, therefore we use middleware
const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,        //this req.user default se req ke pass nhi hota hai but apan ne verifyJWT middleware use kara hai before logoutUser jisne isnko inject kara in req._id
        {
            // $set:{
            //     refreshToken:undefined
            // }    this didnt work like after writing this the refresh token still existed with the user
            $unset:{
                refreshToken:1
            }
        },
        {
            new:true
        }
    )


    const options={
        httpOnly:true,
        secure: true, 
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
    .json(new APIresponse(200,{},"User logged out"))
    


    
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new APIerror(401,"Unauthorized request")
    }

    //here we are decoding the refresh token since in DB it's stored in decode format
   try {

     const decodedToken= jwt.verify(
         incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
     )
 
     const user=await User.findById(decodedToken?._id )
 
     if(!user){
         throw new APIerror(401,"Invalid refresh token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new APIerror(401,"Refresh token is expired OR used")
     }
 
 
     const options ={
         httpOnly:true,
         secure:true
     }
 
    const {accessToken,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
 
    return res.status(200).cookie("accessToken",accessToken, options ).cookie("refreshToken", newRefreshToken,options).json(
     new APIresponse(
         200,
         {accessToken,refreshToken: newRefreshToken},
         "Access token refreshed"
     )
    )

   } catch (error) {
        throw new APIerror(401, error?.message ||"Invalid refresh token")
   }

})

const changeCurrentPassword= asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}= req.body

    const user= await User.findById(req.user?._id)   //In req.user we have thu user due to our auth middleware
    const isPasswordCorrect= await user.isPasswordCoreect(oldPassword)

    if(!isPasswordCorrect){
        throw new APIerror(400,"Invalid old password")
    }

    user.password= newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new APIresponse(200,{},"Password change succesfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new APIresponse(200, req.user, "Current user fetched succesfully")) //In req.user we have thu user due to our auth middleware
})

//To allow user to  change his personal info 
const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){
        throw new APIerror(400,"All fields are required")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new:true} //agar new ko true kar dete hain toh update hone ke baad jo info hai voh return ho jati hai and we are saving it in user
    ).select("-password")


    return res.status(200).json(new APIresponse(200,user,"Account details updated successfully"))
})
//In production grade files update ko alag rakha jata hai like agar user ko apni profile change karni hai toh uske liye alag se fnc banao and dont do it inside "updateAccountDetails"

const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path     //we got this option through multer middlewear

    if(!avatarLocalPath){
        throw new APIerror(400,"Avatar file is missing")
    }

    

    //getting the old avatar since we will remove it once the new one is updated
    const userOld= await User.findById(req.user?._id)
    const oldAvatarURL= await userOld?.avatar

    const avatar= await uploadOnCloudinary(avatarLocalPath)


    if(!avatar.url){
        throw new APIerror(400,"Error while uploading on avatar")
    }

    if (oldAvatarURL) {
        const publicId = getPublicId(oldAvatarURL);
        await cloudinary.uploader.destroy(publicId);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    

    return res.status(200).json(new APIresponse(200,user,"Avatar updated succesfully"))
})

const updateUserCoverImage= asyncHandler(async(req,res)=>{
    const coverLocalPath= req.file?.path

    if(!coverLocalPath){
        throw new APIerror(400,"Cover Image is missing")
    }

    const olduser=await User.findById(req.user?._id)
    const oldCoverURL= await olduser?.coverImage


    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!coverImage.url){
        throw new APIerror(400, "Error while uploading the cover image")
    }
    
    if(oldCoverURL){
        const publicID=getPublicId(oldCoverURL)
        await cloudinary.uploader.destroy(publicID);
    }

    

    const user =await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new APIresponse(200,user,"Cover Image updated succesfully"))

})

const getUserChannelProfile= asyncHandler(async(req,res)=>{
    const {username}=req.params //getting username from the url since channel of mortal will work at ..../mortal URL

    if(!username?.trim()){
        throw new APIerror(400,"Username is missing")
    }

    const channel= await User.aggregate([       //Here we are not finding the user(channel) by using User.findbyId instead for that also we used aggregation
       
        { //1st aggregation pipeline, through which we search the channel
            $match:{
                username:username?.toLowerCase()
            }
        },

        {  //2nd aggregation pipeline through which we get subscibers
            $lookup:{
                from:"subscryptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"             //nayi field bann jayegi of subscribers
            }
        },
        {  //3rd pipeline through which we get the channels to which user is subscribed
            $lookup:{
                from:"subscryptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"  //Here we use $ because now subscribers had become a field
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id,"$subscribers.subscriber"]}, //$in used to check something in arrays or objects
                        then: true,
                        else:false
                    }
                        
                }
            }
        },
        {
            $project:{      //$ project is used to send to frontend only the fields required in frontend
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1

            }
        }


    ])

    if(!channel?.length){
        throw new APIerror(404,"Channel does not exist")
    }

    console.log(channel)

    return res.status(200).json(new APIresponse(200,channel[0],"User channel fetched succesfully"))

})

const getWatchHistory= asyncHandler(async(req,res)=>{
    //"req.user._id" provides us a string which mongoose uses to extract the mongoDB id therefore we use it in findbyid(_id), this is due to mongoose
    //Therefore "req.user._id" is not the mongoDB id
    const user= await User.aggregate([
        {//1st pipeline jiss ke through apan ko user mille ga
            $match:{
               // _id: req.user._id cant pass like this since aggregation pipelines ka code ese hi bheja jata hai without the processing of mongoose
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[     //Using subPipeline
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {//This pipeline we are using so that data is sent to frontend in proper manner, otherwise data will be sent in array, and all datafullName,username,avatar will be the 1st entry of array
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]

            }
        }
    ])

    return res.status(200).json(new APIresponse(200,user[0].watchHistory,"Watch history fetched"))
})

export {registerUser, 
        loginUser, 
        logoutUser, 
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchHistory}

