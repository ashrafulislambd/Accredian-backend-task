const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');

require("dotenv").config()
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const prisma = new PrismaClient();

const sendMailUtility = async ({subject, to, text, html}) => {
    const createTransporter = async () => {
        try {
          const oauth2Client = new OAuth2(
              process.env.CLIENT_ID,
              process.env.CLIENT_SECRET,
              "https://developers.google.com/oauthplayground"
            );
     
            oauth2Client.setCredentials({
              refresh_token: process.env.REFRESH_TOKEN,
            });
     
            const accessToken = await new Promise((resolve, reject) => {
              oauth2Client.getAccessToken((err, token) => {
                if (err) {
                  console.log("*ERR: ", err)
                  reject();
                }
                resolve(token); 
              });
            });
     
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                type: "OAuth2",
                user: process.env.USER_EMAIL,
                accessToken,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
              },
            });
            return transporter;
        } catch (err) {
          return err
        }
    };

    const sendMail = async () => {
        try {
          const mailOptions = {
            from: `Accredian <${process.env.USER_EMAIL}>`,
            to,
            subject,
            text,
            html,
          }
     
          let emailTransporter = await createTransporter();
          await emailTransporter.sendMail(mailOptions);
        } catch (err) {
          console.log("ERROR: ", err)
        }
    };
    await sendMail();
}

const app = express();

const emailValidator = require("email-validator");

app.use(express.json());
app.use(cors());

app.get('/courses', async (req, res) => {
    try {
        let query = {}
        if(req.query.categoryId) {
            const categoryId = req.query.categoryId;
            query.where = {
                category: {
                    id: parseInt(categoryId),
                }
            }
        }
        const data = await prisma.course.findMany(query);

        const response = {
            "data": data,
        };
        res.json(response);
    } catch (err) {
        res.json({
            "error": err.message,
        });
    }
});

app.get('/categories', async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        res.json({
            data: categories
        });
    } catch (err) {
        res.json({
            "error": err.message,
        })
    }
})

const addError = (object, error) => {
    if(!("errors" in object)) {
        object.errors = {}
    };
    object.errors = {
        ...object.errors,
        ...error,
    }
}

app.post('/referal', async (req, res) => {
    try {
        request = req.body;
        const response = {}
        const requiredFields = [
            "courseId",
            "referrerName",
            "refereeName",
            "refereeEmail",
        ]

        requiredFields.forEach(field => {
            console.log(request[field])
            if(!(field in request) || (!request[field] && request[field].trim() === '')) {
                err = {}
                err[field] = "The field is required";
                addError(response, err);
            }
        })

        if("refereeEmail" in request) {
            console.log(request.refereeEmail);
            if(!emailValidator.validate(request.refereeEmail)) {
                addError(response, {
                    "refereeEmail": "Not a valid email",
                });
            }
        }

        if(!("message in request")) {
            request.message = "";
        }

        if(!("errors" in response)) {
            const referal = await prisma.referal.create({
                data: {
                    courseId: request.courseId,
                    referrerName: request.referrerName,
                    refereeName: request.refereeName,
                    refereeEmail: request.refereeEmail,
                    message: request.message,
                }
            });
            const course = await prisma.course.findUnique({
                where: {
                    id: request.courseId,
                }
            });

            response.data = referal;
            await sendMailUtility({
                to: request.refereeEmail,
                subject: "Congratulations! You got referal on our course",
                body: "",
                html: `
                    <h1>Congratulations!</h1>
                    <p>${request.refereeName}, has refered you the course <b>${ course.title }</b></p>
                    <p>He/She left the following message for you:</p>
                    <p>${request.message}</p>
                `
            });
        }


        res.json(response);
    } catch (err) {
        res.json({
            "error": err.message,
        })
    }
});



app.listen(5000, () => {
    console.log("Server running on port 5000");
});