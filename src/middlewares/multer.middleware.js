import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {     //cb refers to callback
    cb(null, "./public/temp")    //in string we give the file where we want to store the image temporarily
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)     //here we updated the code to make it simple the copied code from documentation should be used in production grade
  }                                 //Here we are using the name provided by user to save the file which is not good
})

export const upload = multer({ 
    storage: storage
 })