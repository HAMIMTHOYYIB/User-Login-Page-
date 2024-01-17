const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
 
const app = express();
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// setting the session middleware
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
}));

// connecting to mongodb database named ex-crud-database
mongoose.connect('mongodb://localhost:27017/ex-crud-database', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected to the app'))
  .catch((err) => console.error('MongoDB connection error:', err));

  
// structure for a document (schema)
const User = mongoose.model('User', {
    username: String,
    email: String,
    password: String,
});
  

  //                                         routes

app.get('/', async (req, res) => {
  try {
    // to check if the user has loggedin , if it is show loggedin page 
    if (req.session && req.session.username) { // checking the username where if the user is not deleted
      res.redirect('/loggedin?username=' + req.session.username);
    } else {
      // if not show the loggin page
        res.render('login', { message: '' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking users', error });
  }
});

app.get('/login', (req, res) => {
  res.render('login' , {message : ''});
});


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
      req.session.username = user.username;  //session is created here
      res.redirect('/loggedin?username=' + user.username);
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error });
    }
  });


app.get('/signup', (req, res) => {
  let errorMessage = '';
  res.render('signup', { errorMessage })
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        let errorMessage = '';
        if (existingUser.username === username) {
          errorMessage = 'Username already exists.Choose another username.';
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
      return res.redirect('/'); // Redirect to login if session there is no session
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
      const deletedUser = await User.findOneAndDelete({ username });
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found for delete' });
      }
      res.redirect('/login'); // redirect to login page after deletion
    } catch (error) {
      res.status(500).json({ message: 'Error on deleting user', error });
    }
  });

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

app.post('/edit', async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // check the current password is true or not
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.redirect(`/edit?username=${username}&error=Current password is incorrect.`);
    }

    //update the password and mail if it is changed
    if (email !== user.email) {
      user.email = email;
    }
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    await user.save();
    res.render('loggedin', { username, email });
    
  }  catch (error) {
    res.status(500).json({ message: 'Error updating user details', error });
  }
});


app.get('/logout', (req, res) => {
// remove the session  when logout
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

//  server running
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on: http://localhost:${port}`);
});