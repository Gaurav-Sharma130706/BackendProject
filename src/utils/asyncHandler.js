/*const asyncHandler= (fn)=>{ 
    async(req,res,next)=>{
        try {
            await fn(req,res,next)
        } catch (error) {
            res.status(err.code ||500).json({
                success:false,
                message: err.message
            })
        }
    }                     //arrow fnc ke andar arrow fnc
}
*/


//It could be written like this also in some codebases
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
            .catch((err) => next(err));
    };
};
 

export {asyncHandler}