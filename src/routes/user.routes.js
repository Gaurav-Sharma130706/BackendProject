import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
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
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)  //isko galti se post mat rakh dena
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar) //1st we use verifyJWT to verify user than use upload.single("avatar") and here we used single because we are uplodaing only one file
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)// here in this controller we got data from URL and there we declared username therefore here also we must use username
router.route("/history").get(verifyJWT,getWatchHistory)



export default router