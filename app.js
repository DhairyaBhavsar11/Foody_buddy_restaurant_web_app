const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const flash = require("express-flash");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { Client } = require("@googlemaps/google-maps-services-js");

dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
mongoose
  .connect("", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

// Define User schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  address: String,
  location: String,
});

const User = mongoose.model("User", userSchema);

// Configure passport for user authentication
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return done(null, false, {
          message: "Incorrect username or password.",
        });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false, {
          message: "Incorrect username or password.",
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Set up EJS view engine
app.set("view engine", "ejs");

// Parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public folder
app.use(express.static("public"));

// Render the sign-up page
app.get("/signup", (req, res) => {
  res.render("signup");
});

// Route for handling sign-up form submission
app.post("/signup", async (req, res) => {
  const { username, password, address, location } = req.body;
  try {
    // Create a new user in the database with address and location
    const user = new User({ username, password, address, location });
    await user.save();
    req.flash("success", "Sign up successful! You can now log in.");
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred during sign up. Please try again.");
    res.redirect("/signup");
  }
});

// Render the login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Route for handling login form submission
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

// Render the home page after successful login
app.get("/", (req, res) => {
  res.render("home", { user: req.user });
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
