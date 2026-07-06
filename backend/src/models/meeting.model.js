import mongoose, {Schema} from "mongoose";

const meetingSchema = new Schema({
    user_id = {type:String},
    meetingCode = {type:String, required : true},
    date = {type:Date, default: Date.now, required : true},
});

const user = mongoose.model("Meeting", meetingScheme);

export {Meeting};