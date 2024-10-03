import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import mongoose from "mongoose";
import Payment from "./models/paymentModel.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;



mongoose.connect(process.env.MONGO_URI)
 .then(()=>{
  console.log("Database connected successfully")
})
  .catch((err)=>{
    console.log(err.message)

});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello DarajaAPI!");
});

// Function to get access token
const getAccessToken = async () => {
  const consumerKey = process.env.CONSUMER_KEY;
  const consumerSecret = process.env.CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error.response.data);
    throw error;
  }
};

// Testing the token
app.get("/token", async (req, res) => {
  try {
    const token = await getAccessToken();
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Function to format phone number
const formatPhoneNumber = (phoneNumber) => {
  if (phoneNumber.startsWith("0")) {
    return "254" + phone.substring(1);
  } else if (phoneNumber.startsWith("+")) {
    return phoneNumber.substring(1);
  } else if (phoneNumber.startsWith("254")) {
    return phoneNumber;
  } else {
    return "254" + phoneNumber;
  }
};

// Endpoint to initiate STK Push
app.post("/stkpush", async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: "Please provide phoneNumber and amount in the request body." });
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Generate Timestamp
  const date = new Date();
  const timestamp =
    date.getFullYear().toString() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  // Generate Password
  const businessShortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const password = Buffer.from(businessShortCode + passkey + timestamp).toString("base64");

  try {
    // Get Access Token
    const token = await getAccessToken();
    console.log(token);

    // STK Push Request
    const response = await axios.post(
      `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: 174379,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // or "CustomerBuyGoodsOnline" for till numbers
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: businessShortCode, // For till numbers, use the till number
        PhoneNumber: formattedPhone,
        CallBackURL: "https://3b87-196-250-210-145.ngrok-free.app/callback", // Replace with your actual callback URL
        AccountReference: "Test", // Any reference for your accounting
        TransactionDesc: "Test",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Send success response
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error initiating STK Push:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: error.response ? error.response.data : "Internal Server Error",
    });
  }
});

app.post('/callback', (req,res) =>{
 const callBackData = req.body;
  console.log(callBackData.Body);

  if(!callBackData.Body.stkCallback.CallbackMetadata){
    console.log(callBackData.Body)
    return res.json('ok');
  }
console.log(callBackData.Body.stkCallback.CallbackMetadata)

const phoneNumber = callBackData.Body.stkCallback.CallbackMetadata.Item[4].Value;
const amount = callBackData.Body.stkCallback.CallbackMetadata.Item[0].Value;
const transaction_id = callBackData.Body.stkCallback.CallbackMetadata.Item[1].Value;

const payment = new Payment();

payment.phone = phoneNumber;
payment.amount = amount;
payment.transaction_id = transaction_id;



payment.save()
.then((data) =>{
  console.log({message: "Payment saved successfully", data});
})
//catch the error
.catch((err) =>{
  console.log(err.message)
})
});