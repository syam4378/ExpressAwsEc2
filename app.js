require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const aws = require('aws-sdk')
const multer = require('multer')
const path = require('path')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, "public")))


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas connected"))
  .catch((err) => console.log("MongoDB Atlas error:", err))

const loginSchema = new mongoose.Schema({
  user: String,
  pass: String
}, { versionKey: false })

const User = mongoose.model("csecrypt", loginSchema, "csecrypt")


app.post("/register", async (req, res) => {
  const { user, pass } = req.body
  try {
    const hash = await bcrypt.hash(pass, 10)
    await new User({ user, pass: hash }).save()
    res.send("User registered successfully")
  } catch {
    res.status(500).send("Registration failed")
  }
})


app.post("/login", async (req, res) => {
  const { user, pass } = req.body
  const u = await User.findOne({ user })
  if (!u) return res.send("Invalid user")

  const match = await bcrypt.compare(pass, u.pass)
  if (match) res.redirect("/upload.html")
  else res.send("Invalid password")
})


const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "us-east-1"
})

const upload = multer({ storage: multer.memoryStorage() })


app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.send("File required")

  const params = {
    Bucket: "syam-1492006",
    Key: `${req.body.user}/${req.file.originalname}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  }

  s3.upload(params, (err, data) => {
  if (err) {
    console.error(" S3 UPLOAD ERROR:", err)
    return res.send("Upload failed")
  }

  console.log(" S3 UPLOAD SUCCESS:", data.Location)
  res.send("File uploaded successfully")
})

})

app.listen(3000, () => {
  console.log("Server running on port 3000")
})
