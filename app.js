// WEATHER APP
const express = require('express')
const hbs = require('hbs')
const fs = require('fs')
const axios = require('axios')
const bodyParser = require('body-parser')
const expressValidator = require('express-validator')
const time = require('./time')

const key = fs.readFileSync('./access-key.txt').toString();

const port = process.env.PORT || 3000 // let heroku or vultr to configure port
var app = express()

app.set('view engine', 'hbs') // set the view engine for express
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(expressValidator())


app.use((req, res, next) => {
  var now = new Date().toString()
  var log = `${now}: ${req.method} ${req.url}`

  console.log(log)
  fs.appendFile('server.log', log + 'n', (err) => {
    if (err) console.log('Unable to append server.log')
  })
  next()
})

app.get('/', (req, res) => {
  // // Check that the field is not empty
  // req.checkBody('address', 'Address is required').notEmpty()
  //
  // // trim and escape the address field
  // // req.sanitize('address').escape()
  // // req.sanitize('address').trim()
  //
  // // run the validators
  // var errors = req.getValidationResult()

  var addressInput = req.query.address

  var encodedAddress = encodeURIComponent(addressInput)
  var geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}`

  var array = []
  // http get request
  var a = axios.get(geocodeUrl).then((response,reject) => {
    if (response.data.status ==='ZERO_RESULTS') throw new Error('Unable to find that address')

    var fullAddress = response.data.results[0].formatted_address
    var lat = response.data.results[0].geometry.location.lat
    var lng = response.data.results[0].geometry.location.lng
    var weatherUrl = `https://api.darksky.net/forecast/${key}/${lat},${lng}`

    array.push(fullAddress)

    console.log(fullAddress)
    return axios.get(weatherUrl)

  }).catch((error) => {
    errorMessage = error.message
    res.render('index.hbs', {errorMessage})

  }).then((response, reject) => {
    console.log('Got the address')

    var weather = response.data
    var celsius = (temp) => ((temp - 32) / 1.8).toFixed(1)

    var address = array[0]
    var currentTime = weather.currently.time
    var timeOffset = weather.offset
    var localTime = time.timeNow((currentTime + timeOffset * 3600) * 1000)
    console.log(localTime)

    var summary = weather.hourly.summary
    var temperature = celsius(weather.currently.temperature)
    var apparentTemperature = celsius(weather.currently.apparentTemperature)
    var precipProbability = (weather.currently.precipProbability * 100).toFixed(0)
    var humidity = (weather.currently.humidity * 100).toFixed(0)
    var cloudCover = (weather.currently.cloudCover * 100).toFixed(0)
    var pressure = weather.currently.pressure.toFixed(2)

    var hourlyData = weather.hourly.data
    var hourlyTime = hourlyData.map((data) => {
      return {
        time: time.timeNow((data.time + timeOffset * 3600) * 1000),
        temp: celsius(data.temperature)
      }
    })
    console.log(hourlyTime)


    res.render('index.hbs', {
      address,
      localTime,
      summary,
      temperature,
      apparentTemperature,
      precipProbability,
      humidity,
      cloudCover,
      pressure,
      hourlyTime,
      showWeekly: true
    })

  }).catch((error) => {

    if (error.response.status == 403) {
      errorMessage = ('Darksky API access forbidden.\n' +
                  'Did you register at https://darksky.net/dev/ ' +
                  'and copied the key you got to a access-key.txt file?')
    } else if (error.code === 'ENOTFOUND') {
        errorMessage = ('Unable to connect to API servers.')
    } else {
      errorMessage = error.message
    }
    res.render('index.hbs', {errorMessage})
  })
})

app.listen(port, () => {
  console.log('Server is up on port:', port)
})