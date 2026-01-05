import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB= async ()=>{
    try {
       const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)   //response of this given by mongoose is an object that we stored in 'connectionInstance'
       console.log(`${connectionInstance}`)
       console.log(`MongoDB connected!! DB HOST: ${connectionInstance.connection.host}`) //We printed this HOST since DB jo hota hai voh development ka aur production ka alag hota hai therefore hum ko pata chal jaye ki hum kiss vale se connected hain

    } catch (error) {
        console.log("MongoDB connection error", error);
        process.exit(1) //instead of this we can also write "throw error"
    }
}

export default connectDB