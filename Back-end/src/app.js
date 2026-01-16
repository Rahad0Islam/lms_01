import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'


const app=express()

app.use(cors({
    origin:(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'),   //Specifies which domain is allowed to access backend
    credentials:true  //Allows the browser to send cookies, 
    // authorization headers, or TLS client certificates along with the request.

    //The browser is allowed to include cookies
    //  (like session tokens or refresh tokens) in cross-origin requests.
}))

app.use(express.json({limit:"16kb"}))  
   // parse JSON payloads in POST, PUT, or PATCH requests-  > req.body directly.
 
app.use(express.urlencoded({extended:true}))
  //get from traditional HTML forms (application/x-www-form-urlencoded).


app.use(express.static('public'))
app.use(cookieParser())


//importing Routers
import UserRoutes from './Routes/User.Route.js'
import courseRoutes from './Routes/course.Route.js'
import classRoutes from './Routes/class.Route.js'
app.use("/api/v1/users",UserRoutes)
app.use("/api/v1/course",courseRoutes)
app.use("/api/v1/class",classRoutes)



export {app}