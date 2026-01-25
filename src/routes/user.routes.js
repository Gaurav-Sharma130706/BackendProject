import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser)

//Secured Routes
router.route("/logout").post(verifyJWT, logoutUser) //VerifyJWT is a middelwaare, in the aruments inside post it is written 1st there executed first, than the next() inside it tells that now run the next one

router.route("/refresh-token").post(refreshAccessToken)



export default router