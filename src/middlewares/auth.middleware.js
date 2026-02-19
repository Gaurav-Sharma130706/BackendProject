import { APIerror } from "../utils/APIerror.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"


export const verifyJWT = asyncHandler(async(req,res,next)=>{
   try {
     const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")    //Here we are just trying to get the token
     //Token can be extracted either from cookies OR by request Header using Authorization (refer GPT to understand the second method)
 
     if(!token){
         throw new APIerror(401,"Unauthorized request")
     }
 
     const decodedToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
 
     const user= await User.findById(decodedToken?._id).select("-password -refreshToken")
 
     if(!user){
         throw new APIerror(401,"Invalid access token")
     }
 
     req.user=user;
     next()
   } catch (error) {
    throw new APIerror(401,error?.message || "Invalid access token")
   }

})