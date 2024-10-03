import mongoose from "mongoose";
const {Schema} = mongoose;

const paymentSchema = new Schema(
    {
        phone: {type:String, required: true},
        transaction_id: {type: String, required: true},
        amount: {type: String , required: true}
    },
    {timestamps: true}
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;