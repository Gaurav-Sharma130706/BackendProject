import connectDB from "./db/index.js";
import { app } from "./app.js";
import mongoose from "mongoose";

// require('dotenv').config({path: './env'}) //This is done to make enviorment variables available at the very start but this breaks the consistency of our file since here we are ussing require but below we use import

import dotenv from "dotenv"      //this is the replacement code of above to maintain consistency
dotenv.config({
    path: './env'
})                               //After this we also updated the dev script inside package.json from "nodemon src/index.js"
//all the code and change in dev script done above is just for consistency :|




mongoose.connection.on("error", (err) => {
  console.log("MongoDB runtime error:", err);
});

connectDB()
/*.on("error",(error)=>{
    console.log("Error",error);
    throw error;                    this didnt work therefore to use .on above code is written
})*/
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at port ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO DB connection failed!!!", err) //this will show "MONGO DB connection failed!!!" + even the error in console
})


/*
Modern clean way (recommended) for the .on, .then, .catch code  therefore we laern theere are 2 ways to write the try catch part wala code in JS
try {
   await connectDB();
   app.listen(PORT);
} catch (err) {
   console.log("DB connection failed", err);
} 
   */


















/* 
import express from "express"
const app=express()

//it is a good practice to use ; before writting an IIFE since if no ; exists in previous line of JS it could create a problem
;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERROR: ",error);
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is running at port ${process.env.PORT}`);
        } )

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/