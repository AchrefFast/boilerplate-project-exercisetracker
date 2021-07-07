const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config({ path: __dirname + '/sample.env' });
const mongoose = require('mongoose');
const StringDate = require('./StringDate');


mongoose.Schema.Types.StringDate = StringDate;



app.use(express.urlencoded({ extended: true }));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('error', (err) => console.log("Can't connect to the DataBase"));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const exerciseSchema = new mongoose.Schema({
  user_id: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: StringDate, default: () => new Date() }
});

// ******************************************************************************
// To join tow collection on mongodb:
// Lock for ($lookup aggregate , $project aggreagte, count function)

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
//const achref = User({ username: 'AchrefFast' });
// var user_id;
// achref.save(function (err, doc) {
//   if (err) return err;
//   console.log(doc);
//   user_id = doc._id;
//   const first_exr = new Exercise({ "user_id": user_id, "description": 'Test', "duration": 2, "date": '2020-05-01' });
//   first_exr.save();
// });

// User.aggregate([{
//   $lookup:
//   {
//     from: 'exercises',
//     localField: '_id',
//     foreignField: 'user_id',
//     as: 'log'

//   }
// }]).then(function (res) {
//   console.log(res);
// });

// Create a new user POST request.
app.post('/api/users', function (req, res) {
  const new_user = new User({ "username": req.body.username });
  new_user.save(function (err, data) {
    if (err) {
      const e = err.errors;
      res.json(err.errors[Object.keys(e)[0]].properties.message);
    }
    else
      res.json({ "username": data.username, "_id": data._id });
  });
});
// Show all the users as json data.
app.get('/api/users', function (req, res) {
  User.find().then(data => res.json(data));
});
// The exercise POST  request;
app.post('/api/users/:_id/exercises', function (req, res) {
  const id = req.params._id;

  User.findById({ "_id": id }, function (err, doc) {

    // Handling the error of findById method;;

    if (err) {
      console.log(err);
      res.type('text');
      if (err.path === '_id') {
        res.send('Cast to ' + err.kind + ' failed for value "' + err.value[err.path] + '" at path ' + err.path + ' for model "User"');
      }
      else res.send('Something went wrong');
    }
    // Check if a document was found
    else if (!doc) {
      res.type('text');
      res.send('unknown userId');
    }
    // If the document has been found
    else {
      const username = doc.username;
      const new_exercise = new Exercise({ "user_id": id, "description": req.body.description, "duration": req.body.duration });
      // Check if the date was entered by the user
      if (req.body.date) {
        new_exercise.date = req.body.date; // Use the date that was entered by the user
        // if the user didn't enter the date the default value of date will be used.
      }
      new_exercise.save(function (err, data) {
        // Check if the user has entered wrong information(wrong type || empty input field)
        if (err) {
          res.type('text');
          const path = Object.keys(err.errors)[0]; // if the error coming from the input fileds
          console.log(err);
          if (path == undefined) { // if the error isn't from input fields
            console.log('There is no path');
            res.send('not found');
          }
          // if the user didn't enter anything inside one of the input fields
          else if (err.errors[path] instanceof mongoose.Error.ValidatorError) {

            res.send(err.errors[path].properties.message);
          }
          // if the user typed a wrong type of data inside the input fields
          else if (err.errors[path] instanceof mongoose.Error.CastError) {

            res.send('Cast to ' + err.errors[path].kind + ' failed for value "' + err.errors[path].value + '" at path ' + err.errors[path].path + ' for model "User"');
          }
          else {
            console.log('There is no path');
            res.send('not found');
          }
        }
        else {
          // if everything is fine then send  a json response the user containing all the data that was entered.
          console.log(data);
          res.json({ "_id": id, "username": username, "date": data.date, "duration": data.duration, "description": data.description });
        }
      });
    }
  });
}); // end of the POST request

app.get('/api/users/:_id/logs', function (req, res) {
  const id = req.params._id;
  User.findById({ "_id": id }, { 'username': 1 }, function (err, doc) {
    if (err) {
      console.log(err);
      res.type('text');
      if (err.path === '_id') {
        res.send('Cast to ' + err.kind + ' failed for value "' + err.value[err.path] + '" at path ' + err.path + ' for model "User"');
      }
      else (res.send('Something Went Wrong'));
    }
    else if (!doc) {
      res.type('text');
      res.send('unknown userId');
    }
    else {
      Exercise.find({ "user_id": id }, { '_id': 0, 'date': 1, 'duration': 1, 'description': 1 }, function (err, docs) {
        if (err) {
          res.send('Error');
        }
        var response = doc.toObject();
        var log = docs;
        let from = req.query.from;
        let to = req.query.to;
        let limit = req.query.limit;


        // Analysing the "from" query paramater input
        if (from) {
          const regex = /\d{4}-\d{2}-\d{2}/;
          if (new Date(from).toDateString() && regex.test(from)) {

            // we're replacing the dashes with the front slashes so
            // that the date will be created depending on the local time zone.
            // We need to do so because the date that we saved in the database was created locally ,
            // as a result we have to do the same with the date coming from the query input, thus we can compare them.
            // To avoid all of this complexity ,we could've saved the date in UTC time zone ,and then converted it locally when displaying it.
            from = from.replace('-', '/');
            var date = new Date(from);
            log = log.filter(doc => {
              // console.log('from Date ', date.toDateString());
              const doc_date = new Date(doc.date);
              // console.log(doc_date, 'from the database');
              // console.log(doc_date >= date);
              return doc_date >= date;
            });
            response.from = new Date(from).toDateString();
            console.log(log);
          }
        }

        // Analysing the "to" query paramater input 
        if (to) {
          const regex = /\d{4}-\d{2}-\d{2}/;
          if (new Date(to).toDateString() && regex.test(to)) {

            // we're replacing the dashes with the front slashes so
            // that the date will be created depending on the local time zone.
            // We need to do so because the date that we saved in the database was created locally ,
            // as a result we have to do the same with the date coming from the query input, thus we can compare them.
            // To avoid all of this complexity ,we could've saved the date in UTC time zone ,and then converted it locally when displaying it.
            to = to.replace('-', '/');
            var date = new Date(to);
            log = log.filter(doc => {
              // console.log('from Date ', date.toDateString());
              const doc_date = new Date(doc.date);
              // console.log(doc_date, 'from the database');
              // console.log(doc_date >= date);
              return doc_date <= date;
            });
            response.to = new Date(to).toDateString();
            console.log(log);
          }
        }
        // Analysing the "limit" query paramater input;
        if (limit) {
          limit = new Number(limit);

          if (!isNaN(limit)) {
            if (limit > log.length) limit = log.length;
            log = log.splice(0, limit);
            response.limit = limit;

          }
        }
        response.count = docs.length;
        response.log = log;
        // console.log(response);
        res.json(response);
      });


    }

  })
  // res.redirect('/api/users');
});



app.all('*', function (req, res) {
  throw new Error("Bad request")
});

app.use(function (e, req, res, next) {
  if (e.message === "Bad request") {
    res.type('text');
    res.status(400).send(e.message);
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
