import {asyncHandler} from "../utils/asyncHandler.js"
import {APIerror} from "../utils/APIerror.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {APIresponse} from "../utils/APIresponse.js"

const registerUser= asyncHandler( async(req,res)=>{
    
    //Step-1 get user details from frontend
    const {username,email,fullname,password}= req.body
    console.log("email:",email);

    //Step-2 Validation
    /*
    if (fullname==="") {
        throw new Apierror(400,"Full name is required")
    } similarly apan har field ke liye ese hi if else karke validate kar sakte hain
     */

    if ( [username,email,fullname,password].some( (field)=> field?.trim()=== "")) { //complex code to avoid multiple if else
            throw new APIerror(400,"All fields are complursory")
    }

    //Step-3 Check if user already exists
    const existedUser= User.findOne({                        //This User is imported from user model and it has acces to DB, findOne returns the 1st thing that matches what you asked
        $or:[{username},{email}]          //we are using both username and email to to check if user exists   to know more about $or refer GPT
    })

    if(existedUser){
        throw new APIerror(409, "User with same Username OR Email exists")
    }

    //Step-4 Check for images
    //req.files is provided by multer which provides with the acces for all the files

    const avatarLocalPath = req.files?.avatar[0]?.path    //? is used for chaining ki agar mile ya na mile
    const coverImageLocalPath= req.files?.coverImage[0]?.path;  //Here we are taking the local paths of both these images in our server which were stored by multer

    if (!avatarLocalPath) {                            //If we dont find any path for our avatar that means we dont have any avatar therefore throw error since avatar is required
        throw new APIerror(400, "Avatar file is required")
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
        fullname,
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

export {registerUser}

