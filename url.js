var express = require("express")
var app = express()
var MongoClient = require('mongodb').MongoClient

function validUrl(url) {
    if (url.split(".").length == 3) {
        return true
    }
    return false
}

function handleStringUrl(req, resp)  {
    var url = req.params.url                                                                   // url without http or https prefix: easier to check
    var str = req.originalUrl.split("")
    var orig = "https://freecodecamp-url-asai95.c9users.io/"                                   // add this to short url when displaying
    str.shift()
    str = str.join("")                                                                         // now we have url with http or https prefix: easier to pass to database
    MongoClient.connect(process.env.MONGODB_URI, (err, db) => {
        if (!err && validUrl(url)) {                                                           // check if url is valid
            db.collection("urls").find().limit(1).sort({$natural: -1}).toArray((err, doc) => { // we should get latest entry
            if (!err) {                                                                        // to determine what value of "short-url" will be next
               var answ = {                                                                    // since this field is assigined in ascending order
                    "full-url": str, 
                    "short-url": doc[0]["short-url"]+1,
                }
                db.collection("urls").find({"full-url": str}).toArray((err, arr) => {          // before inserting lets check if this url is already in database
                    if (!err){
                        if (arr.length == 0) {                                                 
                            db.collection("urls").insert(answ)                                 // inserting seems to modify original object by adding _id field but we do not need that
                            answ["short-url"]= orig+answ["short-url"]
                            delete answ["_id"]
                        } else {
                            answ["short-url"]= orig+arr[0]["short-url"]                        // if url exists in database we should display its original short-url because it may not be latest
                        }
                        db.close()
                        resp.json(answ)
                        resp.end()
                    }
                })
                }
            })
        } else {                                                                               // if url isn't valid close connection with error message
            resp.end(err)
        }
    })
}

app.get("/:url", (req, resp) => {                                                             // handle short-urls
    var url = req.params.url
    MongoClient.connect(process.env.MONGODB_URI, (err, db) => {
        if (!err && Number(url)) {                                                            // since short-urls is a number we should check that url value is valid
            db.collection("urls").find({"short-url": parseInt(url)}).toArray((err, doc) => {
                if (!err) {
                    var res = doc[0]["full-url"]                                              // get full url of database entry
                        db.close()
                        resp.redirect(res)                                                    // and redirect there
                       } 
                    })
        } else {
            resp.set("Connection", "close")
            console.log(err)
            resp.end("Wrong URL format")
        }
    })
})

app.get("/http://:url", (req, resp) => handleStringUrl(req, resp))                            // handle http prefix
app.get("/https://:url", (req, resp) => handleStringUrl(req, resp))                           // handle https prefix
app.get("/", (req, resp) => {
    resp.end("URL format should be exactly: 'http(s)://www.example.com'\nAny other format will be rejected")
})


app.listen(process.env.PORT)