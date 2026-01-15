import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"

const router =Router()

router.route("/register").post(
    upload.fields([                //Here by using upload.fields we are injecting our middleware that will be executed just before going to registerUser, this will alow the user to send images
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)



export default router