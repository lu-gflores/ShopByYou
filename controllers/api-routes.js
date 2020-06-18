const db = require("../models");
const passport = require("../config/passport.js");
const Multer = require("multer");
// env
require("dotenv").config();
const { Storage } = require("@google-cloud/storage");
// Instantiate a storage client
const uuid = require("uuid");
const uuidv1 = uuid.v1;

const storage = new Storage();
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});
const bucket = storage.bucket(process.env.GCS_BUCKET);
//const uploadHandler = multer({ storage: storage });

//Init upload
// const uploadHandler = multer({
//   storage: multerGoogleStorage.storageEngine(),
// });
console.log(process.env.GCS_BUCKET);
module.exports = function (app) {
  // Authenitcate login
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });
  // Create new user
  app.post("/api/signup", (req, res) => {
    db.User.create({
      email: req.body.email,
      password: req.body.password,
    })
      .then(function () {
        res.redirect(307, "/api/login");
      })
      .catch(function (err) {
        res.status(401).json(err);
      });
  });
  // Get user data
  app.get("/api/user_data", (req, res) => {
    if (!req.user) {
      res.json({});
    } else {
      res.json({
        email: req.user.email,
        id: req.user.id,
      });
    }
  });

  // Creating new item
  app.post("/api/sellitem", multer.single("file"), (req, res) => {
    // Create a new blob in the bucket and upload the file data.
    const newFileName = uuidv1() + "-" + req.file.originalname;
    const blob = bucket.file(newFileName);
    const blobStream = blob.createWriteStream();

    blobStream.on("error", (err) => {
      //next(err);
      console.log(err);
    });

    blobStream.on("finish", () => {
      // The public URL can be used to directly access the file via HTTP.
      const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${blob.name}`;
      console.log(publicUrl);
      
      const itemDetails = JSON.parse(req.body.item);
      itemDetails.image = publicUrl;
      console.log(itemDetails);
      db.Item.create(itemDetails)
        .then(() => res.json(itemDetails))
        .catch((err) => {
          console.log(err);
          res.status(401).json(err);
        });
    });

    blobStream.end(req.file.buffer);
  });

  app.get("/api/categories/:value", (req, res) => {
    db.Item.findAll({
      where: {
        category: req.params.category,
      },
    }).then(function (cat) {
      res.json(cat);
    });
  });
  // Get all items
  app.get("/api/items", (req, res) => {
    db.Item.findAll({}).then((items) => res.json(items));
  });
};
