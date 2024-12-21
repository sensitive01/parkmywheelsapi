const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");

const { PORT } = require("./config/variables.js");
const dbConnect = require("./config/dbConnect.js");
const userRoute = require("./routes/user/userRoute.js");
const vendorRoute = require("./routes/vendor/vendorRoute.js")

app.set("trust proxy", true);

// DATABASE CONNECTION
dbConnect();

app.use(cookieParser()); 
app.use(express.json());

const allowedOrigins = ["http://localhost:5173","http://127.0.0.1:5500","http://localhost:4000/","http://localhost:56222","http://localhost:56966","https://parkmywheel.netlify.app"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS error for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.disable("x-powered-by");

app.use("/", userRoute);
app.use("/vendor", vendorRoute);


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
