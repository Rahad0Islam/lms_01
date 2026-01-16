    import mongoose from "mongoose";
    import bcrypt from 'bcrypt'
    import jwt from "jsonwebtoken";

    const UserSchema=new mongoose.Schema({

        FullName:{
            type:String,
            required:true,
            trim:true,
            index:true     //MongoDB will create an index on this field. for find data faster
        },

        UserName:{
            type:String,
            required:true,
            trim:true,
            index:true,
            unique:true,
            lowercase:true,
        },

        Email:{
            type:String,
            required:true,
            trim:true,
            unique:true,
            lowercase:true
        },


        Gender:{
            type:String,
            required:true,
            enum:["male","female","other"]
        },

        Password:{
            type:String,
            required:[true,"password is required"]
        },

    

        PhoneNumber:{
        type:String,   //not use Number type because mongodb store data without leading zero
        //    required:true,
        match: [/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number"]
        },

        ProfileImage:{
            type:String,
            required:true,
        },

        ProfilePublicId:{
            type:String,
            required:true,
        },

        RefreshToken:{
            type:String
        },

        Role:{
            type:String,
            required:true,
            enum:["learner",'instructor','admin'],
            default:"learner"  
        },

        //bank info
        accountNumber:{
            type:String,
            default:null,
            unique:true
        },
        
        secretKey:{
        type:String,
            default:null
        },
        balance:{
            type:Number,
            default:0
        }



    },{timestamps:true})


    UserSchema.pre("save",async function (next) {
       if (this.isModified("Password")) {
       this.Password = await bcrypt.hash(this.Password, 10);
       }

      if (this.isModified("secretKey")) {
       this.secretKey = await bcrypt.hash(this.secretKey, 10);
  }
        next();
    })

    UserSchema.methods.IsPasswordCorrect=async function (Password) {
        return await bcrypt.compare(Password,this.Password);
    }
    
     UserSchema.methods.IssecretKeyCorrect=async function (secretKey) {
        return await bcrypt.compare(secretKey,this.secretKey);
    }

    UserSchema.methods.GenerateAccessToken=function () {
        return jwt.sign({
            _id:this.id,
            Email:this.Email,
            FullName:this.FullName,
            UserName:this.UserName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
    }

    UserSchema.methods.GenerateRefreshToken= function () {
        return jwt.sign({
            _id:this.id
        },
        process.env.REFRESS_TOKEN_SECRET,
        {
        expiresIn: process.env.REFRESS_TOKEN_EXPIRY
        }
    )
    }

    export const User=mongoose.model("User",UserSchema)