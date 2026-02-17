class APIerror extends Error{
    constructor(
        statusCode,                      //Status code to be sent if some error occurs
        message="Something went wrong",  //what message to print if some error occurs, this is the default msg that we will print if we dont get some argument for that field
        errors=[],                        //Stores all the errors we get so we can print them
        stack=""                         //Error satck if we will get it we will show it

    ){
        super(message)  //is calling the constructor of the built-in Error class.
        this.statusCode=statusCode
        this.data= null
        this.message=message
        this.success =false
        this.errors=errors


        //Can avoid this code it is high level code for production
        if(stack){
            this.stack=stack
        }
        else{
            Error.captureStackTrace(this,this.constructor)
        }


    }
}

export {APIerror}