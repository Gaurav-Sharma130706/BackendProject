import {APIresponse} from "../utils/APIresponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongoose from "mongoose"


const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message
    const dbStatus= mongoose.connection.readyState===1? "connected":"disconnected"

    return res.status(200).json(new APIresponse(200,{
        status:"ok",
        dbStatus,
    },"Server is healthy"))
})

export {
    healthcheck
    }