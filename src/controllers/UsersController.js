const UsersModel = require("../models/UsersModel");
const jwt = require("jsonwebtoken");
const OTPModel = require("../models/OTPModel");
const SendEmailUtility = require("../utility/SendEmailUtility");

//register user
exports.registration = (req, res) => {
  let reqBody = req.body;
  UsersModel.create(reqBody, (err, result) => {
    if (err) {
      res.status(200).json({
        status: "fail",
        err: err,
      });
    } else {
      res.status(200).json({
        status: "success",
        data: result,
      });
    }
  });
};

// users login
exports.login = (req, res) => {
  let reqBody = req.body;
  UsersModel.aggregate(
    [
      { $match: reqBody },
      {
        $project: {
          _id: 0,
          email: 1,
          firstName: 1,
          lastName: 1,
          phone: 1,
          photo: 1,
        },
      },
    ],
    (err, data) => {
      if (err) {
        res.status(400).json({
          status: "fail",
          err: err,
        });
      } else {
        if (data.length > 0) {
          let Payload = {
            exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            data: data[0]["email"],
          };
          let token = jwt.sign(Payload, "SecretKey12345678");
          res.status(200).json({
            status: "success",
            token: token,
            data: data[0],
          });
        } else {
          res.status(400).json({
            status: "fail",
            err: "Invalid email or password",
          });
        }
      }
    }
  );
};

// users profile details
exports.profileUpdate = (req, res) => {
  let email = req.headers["email"];
  console.log(email);
  let reqBody = req.body;
  console.log(reqBody);

  UsersModel.updateOne(
    { email: email },
    reqBody,
    { new: true },
    (err, result) => {
      if (err) {
        res.status(400).json({
          status: "fail",
          err: err,
        });
      } else {
        res.status(200).json({
          status: "success",
          data: result,
        });
      }
    }
  );
};

exports.profileDetails = (req, res) => {
  let email = req.headers["email"];
  UsersModel.aggregate(
    [
      { $match: { email: email } },
      {
        $project: {
          _id: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          phone: 1,
          photo: 1,
          password: 1,
        },
      },
    ],
    (err, data) => {
      if (err) {
        res.status(400).json({
          status: "fail",
          err: err,
        });
      } else {
        res.status(200).json({
          status: "success",
          data: data,
        });
      }
    }
  );
};

exports.RecoverVerifyEmail = async (req, res) => {
  let email = req.params.email;
  let OTPCode = Math.floor(100000 + Math.random() * 900000);
  try {
    let UserCount = await UsersModel.aggregate([
      { $match: { email: email } },
      { $count: "total" },
    ]);
    if (UserCount.length > 0) {
      let CreateOTP = await OTPModel.create({ email: email, otp: OTPCode });
      let SendEmail = await SendEmailUtility(
        email,
        "Your Pin Code is " + OTPCode,
        "Task Manger PIN Verification"
      );
      res.status(200).json({
        status: "success",
        data: SendEmail,
      });
    } else {
      res.status(200).json({
        status: "fail",
        data: "No User Found",
      });
    }
  } catch (err) {
    res.status(400).json({
      status: "fail",
      data: err,
    });
  }
};

exports.RecoverVerifyOTP = async (req, res) => {
  let email = req.params.email;
  let OTPCode = req.params.otp;
  let status = 0;
  let statusUpdate = 1;
  try {
    let OTPCount = await OTPModel.aggregate([
      { $match: { email: email, otp: OTPCode, status: status } },
      { $count: "total" },
    ]);
    if (OTPCount.length > 0) {
      let UpdateOTP = await OTPModel.updateOne(
        { email: email, otp: OTPCode, status: status },
        { email: email, otp: OTPCode, status: statusUpdate },
        { new: true }
      );
      res.status(200).json({
        status: "success",
        data: UpdateOTP,
      });
    } else {
      res.status(200).json({
        status: "fail",
        data: "Invalid OTP Code",
      });
    }
  } catch (err) {
    res.status(400).json({
      status: "fail",
      data: err,
    });
  }
};

exports.RecoverResetPass = async (req, res) => {
  let email = req.body["email"];
  let OTPCode = req.body["OTP"];
  let NewPass = req.body["password"];
  let statusUpdate = 1;
  try {
    let OTPUsedCount = await OTPModel.aggregate([
      { $match: { email: email, otp: OTPCode, status: statusUpdate } },
      { $count: "total" },
    ]);
    if (OTPUsedCount.length > 0) {
      // console.log(email);
      let PassUpdate = await UsersModel.updateOne(
        { email: email },
        { password: NewPass },
        { new: true }
      );
      res.status(200).json({
        status: "success",
        data: PassUpdate,
      });
    } else {
      res.status(200).json({
        status: "fail",
        data: "Invalid OTP Code",
      });
    }
  } catch (err) {
    res.status(400).json({
      status: "fail",
      data: err,
    });
  }
};