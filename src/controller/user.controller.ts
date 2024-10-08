import { prisma } from "../lib/db";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  loginService,
  refreshTokenService,
} from "../service/auth.service";
import { authenticate } from "../middleware/authenticate-jwt";
const jwt = require("jsonwebtoken");

export const register = async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    ph_number
  }: {
    name: string;
    email: string;
    password: string;
    ph_number: string
  } = req.body;

  try {
    //check if the user already exist
    // console.log(ph_number);
    const alreadyExist = await prisma.user.findUnique({ where: { email } });
    if (alreadyExist)
      return res.status(400).json({ message: "User already exist" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        ph_number
      },
    });
    const isMailSent = await sendVerificationMail(user.id, user.name, user.email);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    res.status(201).json({
      message: `User created successfully. ${isMailSent}.`,
      data: {
        name: user.name,
        email: user.email,
        verified: user.verified,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while creating the user",
      error: error,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const payload = {
      name: user.name,
      email,
    };

    return res.json({ message: "login success", data: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while logging in" });
  }
};
export const login_v2 = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const payload = await loginService(email, password);

    return res.json({ message: "login success", data: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Invalid Credentials" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const newTokens = await refreshTokenService(refreshToken);
    return res.json({ message: "refresh token success", data: newTokens });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Invalid or expired refresh token." });
  }
};

// const sendVerificationMail = async (id: string, name: string, email: string) => {
//   console.log("email", email);
//   //generate token with email
//   const token = await generateVerificationToken({ id, email });
//   const verificationUrl = `${process.env.BASE_URL}/v2/verify?token=${token}`;
//   (async function () {
//     const { data, error } = await resend.emails.send({
//       from: "WhatsTrek <support@whatstrek.com>",
//       to: [email],
//       subject: "Just One More Step – Verify Your Whatstrek Email!",
//       html: `
//       Hi ${name},<br/>
//       You’re almost there! To complete your Whatstrek setup and unlock your marketing toolkit, please confirm your email by clicking the link below:<br/>
//       <a href=${verificationUrl}>Verify My Email</a><br/>
//       Once verified, you'll be all set to explore features like lead automation, contact management, and more.<br/>
//       If you didn’t sign up, no need to worry – just ignore this email.<br/>
//       Welcome aboard!<br/>
//       Here's a Introduction video to get you started:<br/>
//       <iframe
//           src="https://www.youtube.com/embed/lJIB4Ct5y2U"
//           allow="autoplay; encrypted-media"
//           allowFullScreen
//           title="video"
//           className="h-[300px] md:h-[400px] w-[100%] md:w-[70%] rounded-md"
//         />
//       <br/>
//       https://youtu.be/lJIB4Ct5y2U <br/> <br/>
//       Regards,<br/>
//       The Whatstrek Team`
//     });

//     if (error) {
//       console.error({ error });
//       return "Error while sending verification email, please try again later. If the issue persists, please report this bug.";
//     }

//     console.log({ data });
//     return "Verification email sent";
//   })();
// };
const sendVerificationMail = async (id: string, name: string, email: string) => {
  console.log("email", email);
  const token = await generateVerificationToken({ id, email });
  const verificationUrl = `${process.env.BASE_URL}/v2/verify?token=${token}`;
  
  (async function () {
    const { data, error } = await resend.emails.send({
      from: "WhatsTrek <support@whatstrek.com>",
      to: [email],
      subject: "Just One More Step – Verify Your Whatstrek Email!",
      html: `
      Hi ${name},<br/><br/>
      You’re almost there! To complete your Whatstrek setup and unlock your marketing toolkit, please confirm your email by clicking the button below:<br/><br/>
      <a href="${verificationUrl}" style="
        background-color: #4CAF50;
        color: white;
        padding: 12px 20px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        border-radius: 8px;
        margin: 10px 0;
        cursor: pointer;">
        Verify My Email
      </a><br/><br/>
      Once verified, you'll be all set to explore features like lead automation, contact management, and more.<br/><br/>
      If you didn’t sign up, no need to worry – just ignore this email.<br/><br/>
      Welcome aboard!<br/><br/>
      Here's an Introduction video to get you started:<br/>
      <a href="https://youtu.be/lJIB4Ct5y2U">
        <img src="https://img.youtube.com/vi/lJIB4Ct5y2U/0.jpg" alt="Watch the introduction video" style="width:100%; max-width:600px; border-radius:8px;"/>
      </a><br/><br/>
      If you can't see the video, click here: <a href="https://youtu.be/lJIB4Ct5y2U">https://youtu.be/lJIB4Ct5y2U</a> <br/><br/>
      Regards,<br/>
      The Whatstrek Team`
    });

    if (error) {
      console.error({ error });
      return "Error while sending verification email, please try again later. If the issue persists, please report this bug.";
    }

    console.log({ data });
    return "Verification email sent";
  })();
};

export const resendVerificationMail = async (req: Request, res: Response) => {
  try {
    //authenticate
    const authHeader = req.headers["authorization"];
    const authObj = await authenticate(authHeader);
    if (!authObj.id) {
      return res.status(401).json({ message: authObj.message });
    }
    console.log("v2: resendVerificationMail->", new Date());

    // const { id, email } = req.body;
    sendVerificationMail(authObj.id, authObj.name, authObj.email);
    return res.json({ message: "Verification email sent" });
  } catch (error) {
    res
      .status(500)
      .json({
        message:
          "Error while sending verification email, please try again later. If the issue persists, please report this bug.",
      });
  }
};

export const verifyAccount = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    // const { id } = verify(token, process.env.JWT_SECRET) as { id: string };
    const { id } = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET);
    const user = await prisma.user.update({
      where: { id },
      data: { verified: true },
    });
    console.log("verified", user);
    return res.json({ message: "Account verified. Please close this tab.", data: user.email });
  } catch (error) {
    console.log(error);

    if (error.name === "TokenExpiredError") {
      res
        .status(400)
        .send({ message: "Verification Link expired, please try again" });
      // throw new Error('Refresh token expired');
    }
    res
      .status(400)
      .send({ message: "Invalid verification token, please try again" });

    // throw new Error('Invalid refresh token');
  }
};
