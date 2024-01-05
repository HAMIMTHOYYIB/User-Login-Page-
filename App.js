const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');


const app = express();
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Connect to MongoDB 
mongoose.connect('mongodb://localhost:27017/ex-crud-database', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema structure of document
const User = mongoose.model('User', {
    username: String,
    email: String,
    password: String,
});
  

// Serve the login page
app.get('/', async (req, res) => {
  try {
    // Check if the user is already logged in by checking the session
    if (req.session && req.session.username) {
      res.redirect('/loggedin?username=' + req.session.username);
    } else {
      // const usersCount = await User.countDocuments();
      // if (usersCount === 0) {
        // res.redirect('/signup');
      // } else {
        res.render('login', { message: '' });
      // }
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking users', error });
  }
});


// Handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.render('login', { message: 'User not exist. Please sign up.' });
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.render('login', { message: 'Incorrect password. Please try again.' });
      }
      req.session.username = user.username;
      res.redirect('/loggedin?username=' + user.username);
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error });
    }
  });

// Serve the signup page
app.get('/signup', (req, res) => {
  let errorMessage = '';
  res.render('signup', { errorMessage })
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      let errorMessage = '';
      if (existingUser.username === username) {
        errorMessage = 'Username already exists. Please choose another username.';
      }
      return res.render('signup', { errorMessage });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    res.redirect('/loggedin?username=' + username);
  } catch (error) {
    res.status(500).json({ message: 'Sign up failed', error });
  }
});


app.get('/loggedin', async (req, res) => {
  try {
    if (!req.session || !req.session.username) {
      return res.redirect('/'); // Redirect to login if session doesn't exist
    }
    const { username } = req.query;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { email } = user;
    res.render('loggedin', { username, email });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error });
  }
});

app.post('/delete', async (req, res) => {
    try {
      const { username } = req.body;
      console.log("username : " , req.body);
      const deletedUser = await User.findOneAndDelete({ username });
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.redirect('/login'); // Redirect to the login page after successful deletion
    } catch (error) {
      res.status(500).json({ message: 'Error deleting user', error });
    }
  });

  // Add/Edit User Form
  app.get('/edit', async (req, res) => {
    try {
      const { username } = req.query;
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      let errorMessage = req.query.error ? req.query.error : '';
      res.render('editUser', { user, errorMessage });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user details for editing', error });
    }
  });  


// Handle Edit User form submission
app.post('/edit', async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.redirect(`/edit?username=${username}&error=Current%20password%20is%20incorrect.`);
      // Redirect to the edit page with the error message as a query parameter
    }

    // Update email if changed
    if (email !== user.email) {
      user.email = email;
    }

    // Update password if new password provided
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }
    await user.save();
    res.redirect(`/loggedin?username=${username}`);
    
  }  catch (error) {
    res.status(500).json({ message: 'Error updating user details', error });
  }
});




app.get('/login', (req, res) => {
    res.render('login' , {message : ''});
  });

// Handle logout
app.get('/logout', (req, res) => {
  // Destroy the session on logout
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

  

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on: http://localhost:${PORT}`);
});