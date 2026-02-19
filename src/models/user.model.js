 import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema=new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,           //It automatically removes extra spaces from the start and end of a string before saving it to the database. 
            index:true          //Improves searching for usernames in DB but it effects the performance isliye bohot soch samaj kar index rakha jata hai
        },

        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,                    
        },

        fullName:{
            type:String,
            required:true,
            trim:true,      
            index:true              
        },

        avatar:{
            type:String,                 //cloudinary URL
            required:true,                  
        },
        coverImage:{
            type:String,                 //cloudinary URL
        },

        watchHistory:[
            {
                type:mongoose.Types.ObjectId,
                ref:"Video"
            }
        ],

        password:{                 //Some disscussion left kyunki apan password ese hi store nhi karsakte beacause if DB is leaked all passwords will be leaked therefore must be stored in encrypted format, but phir jab user password dale ga than how will we compare it to encrypted one :(
            type:String,
            required:[true,'Password is required']
        },

        refreshToken:{
            type:String
        }
    },{timestamps:true})

//To encrypt the new password whenever the password is changed
userSchema.pre("save", async function () {      //we use async fnc beacuse this encryption procces takes some time

    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);    //10 is the rounds we gave , can be any value it is something related to encryption of pass
});      //the code inside pre will be executed just before saving the data into DB since we used "save" as the 1st argument



userSchema.methods.isPasswordCoreect= async function (password) {          //here we are creating a method for the userSchema to compare textpassword and encrypted password
    return await  bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){
   return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){  //refresh token mai info is less
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema)