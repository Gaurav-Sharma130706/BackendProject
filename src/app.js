import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app= express()

//setting up CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN,   //Means what all urls we are allowing to access our backend
    credentials: true,

}))

app.use(cookieParser())

//Now we will do some configurations kyunki apan ko data json mai aayega body se aayega(matlab forms,etc) toh voh sab aa sake uss ke liye
//doing configuration therefore used .use
app.use(express.json({limit: "16kb"}))           //tells the server that we will take json input we also set the limit to 16kb we can take any limit according to limit of our server
app.use(express.urlencoded({extended: true, limit:"16kb"}))      //tells the server that we will also take url inputs urlencoded is used because if i search Gaurav Sharma on web it will open some url like "https://search.brave.com/search?q=gaurav+sharma"  
app.use(express.static("Public"))    //static allows us to store some files folders in server


//routes import
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscryptionRouter from "./routes/subscryption.routes.js"
import playlistRouter from "./routes/playlist.routes.js"

//routes declaration
app.use("/api/v1/users",userRouter)     ///api/v1/users par jate hi userRouter is activated and control transfered to user.routes.js    

app.use("/api/v1/videos",videoRouter)

app.use("/api/v1/tweets", tweetRouter)

app.use("/api/v1/subscryptions", subscryptionRouter)

app.use("/api/v1/playlists", playlistRouter)




export {app}