// require('dotenv').config({path: './env'}) //This is done to make enviorment variables available at the very start but this breaks the consistency of our file since here we are ussing require but below we use import

import dotenv from "dotenv"      //this is the replacement code of above to maintain consistency
dotenv.config({
    path: './env'
})                               //After this we also updated the dev script inside package.json from "nodemon src/index.js"
//all the code and change in dev script done above is just for consistency :|


import connectDB from "./db/index.js";

connectDB()













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