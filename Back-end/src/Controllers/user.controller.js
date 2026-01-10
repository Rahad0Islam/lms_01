import { User } from "../Models/User.Model.js";
import { Bank } from "../Models/bank.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { AsynHandler } from "../Utils/AsyncHandler.js";
import { FileDelete, FileUpload } from "../Utils/Cloudinary.js";
import jwt from 'jsonwebtoken';

const Option={
    httpOnly:true,
    secure:true
}


const Register=AsynHandler(async(req,res)=>{
  console.log("Register proccsing started ");

    const {FullName="",UserName="",Email="",Gender="",Password="",PhoneNumber="",Role=""}=req.body;
    console.log(UserName,"   dff");
    if(FullName==="" || UserName==="" || Role==""||
        Email===""||Gender==="" || Password===""){
            throw new ApiError(401,"All feilds are required")
         }

    const AlreadyExistEmailUsername= await User.findOne({
        $or:[{Email},{UserName}]
    })

    if(AlreadyExistEmailUsername)throw new ApiError(401,"Username or Email already Exist");

    let ProfileImageLocalPath="";
    if (
            Array.isArray(req.files?.ProfileImage) &&
            req.files?.ProfileImage.length > 0 
           )
       {
      ProfileImageLocalPath=req.files?.ProfileImage[0]?.path;
    }



    if(!ProfileImageLocalPath){
        throw new ApiError(401,"profile picture is required");
    }
  
    console.log(ProfileImageLocalPath);



    const ProfileImage=await FileUpload(ProfileImageLocalPath);

    if(!ProfileImage)throw new ApiError(501,"Cloudinary problem")
    
    
   const user=await User.create({
      FullName,
      UserName,
      Email,
      Gender,
      Password,
      PhoneNumber,
      Role,
      ProfileImage:ProfileImage?.url,
      ProfilePublicId:ProfileImage?.public_id,
   })

   const CreateUser=await User.findById(user._id).select("-Password -RefreshToken");
   if(!CreateUser)throw new ApiError(501,"Something Went Wrong while regestering! ")

    return res.status(201).json(new ApiResponse(201,CreateUser,"Registered succesfully! "))
})

const GenerateAccessAndRefreshToken=async function (UserID) {

  try {
      const user=await User.findById(UserID);
      if(!user)throw new ApiError(501,"user not found ! ")

      const AccessToken=  user.GenerateAccessToken();
      const RefreshToken=user.GenerateRefreshToken();
  
      user.RefreshToken=RefreshToken;
      await user.save({validateBeforeSave:false})
      return {AccessToken,RefreshToken}
  } catch (error) {
      throw new ApiError(501,"cannot generate access and refresstoken ")
  }
}



const LogIn=AsynHandler(async(req,res)=>{

    
    const {UserName,Email,Password}=req.body;

    if ((!UserName?.trim() && !Email?.trim()) || !Password?.trim()) {
    throw new ApiError(401, "Username or Email and Password are required!");
    }

    const user=await User.findOne({
        $or:[{Email},{UserName}]
    })

    if(!user)throw new ApiError(401,"user not found!");

    const IsPassCorr=await user.IsPasswordCorrect(Password)
    if(!IsPassCorr)throw new ApiError(401,"Password is not correct ");

    const {AccessToken,RefreshToken}=await GenerateAccessAndRefreshToken(user._id)
    console.log("AccessToken : ",AccessToken);
    
    const LogInUser=await User.findById(user._id).select("-Password -RefreshToken")
    if(!LogInUser)throw new ApiError(501,"User not found")

    console.log("Log in succesfully! ");
    return res
    .status(201)
    .cookie("AccessToken",AccessToken,Option)
    .cookie("RefreshToken",RefreshToken,Option)
    .json(
        new ApiResponse(201,{AccessToken,RefreshToken,LogInUser},"log in successfully ")
    )

})

const LogOut=AsynHandler(async(req,res)=>{

   const L_user= await User.findByIdAndUpdate(req.user._id,{
        $unset:{RefreshToken:""}
    },
    {
         new:true   //RETURN USER DB AFTER UPDATE
    }

    )
        
    
    console.log("Log out SuccesFully!");
    return res
    .status(201)
    .clearCookie('AccessToken',Option)
    .clearCookie('RefreshToken',Option)
    .json(
        new ApiResponse(201,L_user,"Logout Succesfully!")
    )
})

const RenewAccesToken=AsynHandler(async(req,res)=>{
      const IncomingRefreshToken=req.cookies?.RefreshToken || req.body?.RefreshToken
       || (await User.findById(req.user?._id).select("RefreshToken"))?.RefreshToken;
    

        if(!IncomingRefreshToken)throw new ApiError(401,"Refresh token invalid !")


        try {
    
          const Decode_User_id=jwt.verify(IncomingRefreshToken,process.env.REFRESS_TOKEN_SECRET);
    
          const user=await User.findById(Decode_User_id?._id);
          if(!user)throw new ApiError(401,"invalid refresh token")
    
    
          if(IncomingRefreshToken!==user?.RefreshToken)throw new ApiError(401,"Refresh token expired ")
    
          const{AccessToken,RefreshToken} = await GenerateAccessAndRefreshToken(user?._id);
          console.log("renew the access token ");
        
          return res
          .status(201)
          .cookie("AccessToken",AccessToken,Option)
          .cookie("RefreshToken",RefreshToken,Option)
          .json(
            new ApiResponse(201,{AccessToken,RefreshToken},"Renew the accesstoken !")
          )

    } catch (error) {
        throw new ApiError(401,"invalid refresh token(catch)")
    }

})


const ChangePassword=AsynHandler(async(req,res)=>{
    const {NewPassword,OldPassword}=req.body
    //check password is correct or wrong

    const user=await User.findById(req.user?._id);
    if(!user)throw new ApiError(401,"User not found ! ");

    const IsPassCorr=await user.IsPasswordCorrect(OldPassword);
    if(!IsPassCorr)throw new ApiError(401,"Current Password is incorrect! ");

    user.Password=NewPassword;
    const SavePass=await user.save({validateBeforeSave:false});   
    console.log("Password changed successfully");

    return res
    .status(201)
    .json(
        new ApiResponse(201,{"savePass":SavePass},"Password changed successfully! ")
    )

})

const UpdateProfilePic=AsynHandler(async(req,res)=>{
      const ProfileImageLocalPath=req.file?.path;

      if(!ProfileImageLocalPath)throw new ApiError(401,"profile picture required");

     const DelOldProfile= await FileDelete(req.user?.ProfilePublicId);

     if(!DelOldProfile)throw new ApiError(501,"Can not deleted Old Profile Picture");

      console.log("deleted Old Profile Picture");

     const NewProfilePic= await FileUpload(ProfileImageLocalPath);

     if(!NewProfilePic)throw new ApiError(501,"can not upload profile picture in cloudinary ")
     console.log("New Profile picture uploaded Succesfully ");

     const user=await User.findByIdAndUpdate(req.user?._id,
         {  
            $set:{
                ProfileImage:NewProfilePic.url,
                ProfilePublicId:NewProfilePic.public_id
                }
        },{
            new:true
        }
     ).select("-Password -RefreshToken");

     return res
     .status(201)
     .json(
        new ApiResponse(201,user,"profile pic updated succesfully! ")
     )
})



const GetUserPublicProfile = AsynHandler(async (req, res) => {
  const { id } = req.params;
  const cleanId=id.trim()
  const user = await User.findById(cleanId).select("-Password -RefreshToken -secretKey");
  if (!user) throw new ApiError(404, "User not found");
  console.log("User profile fetched");
  return res.status(200).json(new ApiResponse(200, user, "User profile fetched"));
})


const addBankAccount=AsynHandler(async(req,res)=>{
    const {accountNumber,secretKey} = req.body;
    if(!accountNumber || !secretKey){
        throw new ApiError(401,"accountNumber and SecretKey are needed ");
    }
    const user=await User.findById(req.user?._id);
    if(!user){
        throw new ApiError(401,"userID not valid");
    }
    if(user.accountNumber!=null){
        throw new ApiError(401,"already accountNumber exist");
    }
    user.accountNumber=accountNumber;
    user.secretKey=secretKey;
    await user.save({validateBeforeSave:false});

    console.log("Bank account added succesfully! ");
    const currUser=await User.findById(req.user?._id).select("-RefreshToken -Password -secretKey")
    return res
    .status(201)
    .json(
        new ApiResponse(201,currUser,"Bank account added succesfully! ")
    )
})

const addBalance=AsynHandler(async(req,res)=>{
          
    const {balance,secretKey}=req.body;
   
    if(!balance || !secretKey){
        throw new ApiError(401,"balance and secretkey are required ")
    }

    if(balance<0){
        throw new ApiError(401,"balance can not negative ");
    }

    const user=await User.findById(req.user?._id);
    if(!user){
        throw new ApiError(401,"userID not valid");
    }
    const IsSecretCorr=await user.IssecretKeyCorrect(secretKey);
    if(!IsSecretCorr)throw new ApiError(401,"secret key invalid");

    user.balance=Number(balance)+Number(user.balance);
    await user.save({validateBeforeSave:false});
    console.log("balance add successfully current balace ",user.balance);
     const currUser=await User.findById(req.user?._id).select("-RefreshToken -Password -secretKey")
    return res
    .status(201)
    .json(
        new ApiResponse(201,currUser,"balance add succesfully! ")
    )
})

const getTransactions=AsynHandler(async(req,res)=>{
    const userID=req.user?._id;
    
    if(!userID){
        throw new ApiError(401,"User not authenticated");
    }
    
    // Find all transactions where user is either sender or receiver
    const transactions=await Bank.find({
        $or:[
            {fromUserID:userID},
            {toUserID:userID}
        ]
    }).sort({transactionTime:-1}); // Sort by newest first
    
    console.log(`Fetched ${transactions.length} transactions for user`);
    
    return res
    .status(200)
    .json(
        new ApiResponse(200,transactions,"Transactions fetched successfully")
    )
})

export {
    Register,
    LogIn,
    LogOut,
    RenewAccesToken,
    ChangePassword,
    UpdateProfilePic,
    GetUserPublicProfile,
    addBankAccount,
    addBalance,
    getTransactions
}