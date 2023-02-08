const express = require('express')
const bcrypt = require('bcrypt')
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken')
const cors = require('cors')
var bodyParser = require('body-parser');
const { response } = require('express');
const app = express()
const secretKey = "kawaiidesu"
const uri = "mongodb://127.0.0.1:27017"
const client = new MongoClient(uri);
const saltRounds = 10

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
}

app.use(cors(corsOptions));
// app.options('*', cors());  // enable pre-flight
app.use(bodyParser.json());


async function verifyToken(token){
    let out = {valid : false};
    await jwt.verify(token, secretKey, (err, decoded) => {
        if(!err){
            out.uname = decoded.username;
            out.valid = true;
        }
    });
    return out;
    
}

app.post('/mysubgreddit', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    var srobj = req.body;
    srobj.moderator = verify.uname;
    srobj.users = [verify.uname];
    srobj.blockedUsers = [];
    srobj.joinRequests = [];
    // stats left
    let result = await client.connect();
    result = await client.db("konoha").collection("subreddit").insertOne(srobj);
    res.json({"created" : true})
    }
})

app.get('/joinedSubgreddit', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
        console.log("hi");
    let result = await client.connect();
    const options = {
        projection : {_id : 0, joinRequests : 0, blockedUsers : 0, users : 0}
    }
    result = await client.db("konoha").collection("subreddit").find({users : verify.uname}, options).toArray();
    console.log(result)
    res.json(result)
    }
})

app.get('/allSubgreddits', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{

    let result = await client.connect();
    const options = {
        projection : {_id : 0, joinRequests : 0, blockedUsers : 0, users : 0}
    }
    result = await client.db("konoha").collection("subreddit").find({}, options).toArray();
    console.log(result)
    res.json(result)
    }
})

app.get('/joinsr/:name', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    const options = {
        projection : {_id : 0, joinRequests : 0, blockedUsers : 0, users : 0}
    }
    filter = await client.db("konoha").collection("subreddit").findOne({name : req.params.name}, options);
    console.log(filter);
    const update = {$push : {joinRequests : verify.uname}};
    const updateSrdt = await client.db("konoha").collection("subreddit").updateOne(filter, update);
    console.log(updateSrdt)
    res.json(updateSrdt)
    }
})

// get all posts in the subreddit
// the requesting user must be a part of the subreddit
app.get('/subgreddits/:name', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
        var post = {text : req.body.text};
        // stats left
        let result = await client.connect();
        result = await client.db("konoha").collection("subreddit").findOne({name : req.params.name});
        var usersList = result.users;
        memberFlag = 0;
        for(i=0;i<usersList.length;i++){
            if(usersList[i] == verify.uname){
                memberFlag = 1
            }
        }
        if(memberFlag){
            result = await client.db("konoha").collection("posts").find({postedIn : req.params.name}).toArray();
            res.json(result)
        }
        }
})



// report a post with post_id

app.post('/report/:id', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
        // stats left
        console.log("in id");
        let result = await client.connect();
        result = await client.db("konoha").collection("posts").findOne({_id : new ObjectId(req.params.id)});
        console.log(result);
        var reportedsrd = await client.db("konoha").collection("subreddit").findOne({name : result.postedIn});
        var usersList = reportedsrd.users;
        memberFlag = 0;
        for(i=0;i<usersList.length;i++){
            if(usersList[i] == verify.uname){
                memberFlag = 1
            }
        }
        if(memberFlag){
            let report = {};
            report.reportedBy = verify.uname;
            report.text = result.text
            report.reportedUser = result.postedBy
            report.concern = req.body.concern;
            report.post = result._id;
            report.moderator = reportedsrd.moderator
            report.srd = reportedsrd.name;
            result = await client.db("konoha").collection("reports").insertOne(report);
            res.json(result)
        }
        }
})

// create a post in the subreddit with name 'name'
// the requesting user must be a part of the subreddit

app.post('/subgreddits/:name', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
        var post = {text : req.body.text};
        // stats left
        let result = await client.connect();
        result = await client.db("konoha").collection("subreddit").findOne({name : req.params.name});
        var usersList = result.users;
        memberFlag = 0;
        for(i=0;i<usersList.length;i++){
            if(usersList[i] == verify.uname){
                memberFlag = 1
            }
        }
        if(memberFlag){
            post.upvotes = 0
            post.downvotes = 0
            post.comments = []
            post.postedBy = verify.uname
            post.postedIn = req.params.name
            result = await client.db("konoha").collection("posts").insertOne(post);
            res.json(result)
        }
        }
})

// get all the subgreddits of the user
app.get('/mysubgreddit', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    result = await client.db("konoha").collection("subreddit").find({moderator : verify.uname}).toArray();
    for(i=0;i<result.length;i++){
        posts = await client.db("konoha").collection("posts").find({postedIn : result[i].name}).toArray();
        console.log(posts);
        result[i].num_posts = posts.length;
    }
    console.log(result);
    res.json(result)
    }
})

// block a user
// adds it to the block list and removes it from the userlist of the subreddit
app.get('/mysubgreddit/:name/block/:uname', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    filter = await client.db("konoha").collection("subreddit").findOne({name : req.params.name, moderator : verify.uname});
    update = {$push : {blockedUsers : req.params.uname}};
    result = await client.db("konoha").collection("subreddit").updateOne(filter, update);
    filter = await client.db("konoha").collection("subreddit").findOne({name : req.params.name, moderator : verify.uname});
    update = {$pull : {users : req.params.uname}};
    result = await client.db("konoha").collection("subreddit").updateOne(filter, update);
    
    console.log(result);
    res.json(result)
    }
})

// delete a post of a subgreddit of a user
app.delete('/mysubgreddit/:name/deletePost/:id', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    console.log("in delete post")
    console.log(req.params.id)
    result = await client.db("konoha").collection("posts").deleteOne({_id : new ObjectId(req.params.id)});
    console.log(result);
    res.json(result);
    }
})

// get the details of the subreddit's report

app.get('/mysubgreddit/:name/reports', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    result = await client.db("konoha").collection("reports").find({srd : req.params.name, moderator : verify.uname}).toArray();
    console.log("in");
    console.log(result);
    res.json(result)
    }
})

// deletes the subreddit
app.delete('/mysubgreddit/:name', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    console.log(req.params.name);
    result = await client.db("konoha").collection("subreddit").findOne({moderator : verify.uname, name : req.params.name});
    if(result){
        result = await client.db("konoha").collection("posts").deleteMany({postedIn : req.params.name});
        result = await client.db("konoha").collection("reports").deleteMany({srd : req.params.name});
        result = await client.db("konoha").collection("subreddit").deleteMany({name : req.params.name});
    }
    console.log(result);
    res.json(result)
    }
})

// get the details of the subreddit of a given user

app.get('/mysubgreddit/:name', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    result = await client.db("konoha").collection("subreddit").findOne({moderator : verify.uname, name : req.params.name})
    res.json(result)
    }
})

// get the details of the join requests of a user for a given subreddit of name 'name'
app.get('/mysubgreddit/:name/jr', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    result = await client.db("konoha").collection("subreddit").findOne({moderator : verify.uname, name : req.params.name})
    if(!result){
        res.send("error");
    }
    let users = result.joinRequests
    console.log(users)
    const options = {
        projection : {_id : 0, password : 0, email :0}
    }
    result2 = await client.db("konoha").collection("users").find({uname : {$in : users}}, options).toArray()

    console.log(result2);

    // console.log(result);
    res.json(result2)
    }
})

// accept the request of a user with uname for a given subreddit
app.get('/mysubgreddit/:name/jr/accept/:uname', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    filter = await client.db("konoha").collection("subreddit").findOne({moderator : verify.uname, name : req.params.name})
    if(!result){
        req.send("error");
    }
    let acceptFlag = 0
    let users = filter.joinRequests
    console.log(users);
    for(i=0;i<users.length;i++){
        if(users[i] == req.params.uname){
            acceptFlag = 1
        }
    }
    if(acceptFlag){
        let update = {$pull : {joinRequests : req.params.uname}};
        result = await client.db("konoha").collection("subreddit").updateOne(filter, update);
        update = {$push : {users : req.params.uname}};
        filter = await client.db("konoha").collection("subreddit").findOne({moderator : verify.uname, name : req.params.name})
        result = await client.db("konoha").collection("subreddit").updateOne(filter, update);
        console.log(result);
        res.send(result)
    }
    else{
        console.log("no");
        res.send("error")
    }
    }
})

// reject the request of a user with uname for a given subreddit
app.get('/mysubgreddit/:name/jr/reject/:uname', async (req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    filter = await client.db("konoha").collection("subreddit").findOne({moderator : verify.uname, name : req.params.name})
    if(!result){
        req.send("error");
    }
    let rejectFlag = 0
    let users = filter.joinRequests
    console.log(users);
    console.log("uoh");
    for(i=0;i<users.length;i++){
        if(users[i] == req.params.uname){
            rejectFlag = 1
        }
    }
    if(rejectFlag){
        console.log("hi");
        let update = {$pull : {joinRequests : req.params.uname}};
        result = await client.db("konoha").collection("subreddit").updateOne(filter, update);
        console.log(result);
        res.send(result)
    }
    else{
        console.log("no");
        res.send("error")
    }
    }
})

// remove from followers list the user with uname 'name'
app.delete('/dontFollowMe/:name', async(req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    const options = {
        projection : {_id : 0, password : 0, email : 0, uname : 0}
    }
    filter = await client.db("konoha").collection("users").findOne({uname : req.params.name});
    console.log(filter)
    update = {$pull : {following : verify.uname}};
    result = await client.db("konoha").collection("users").updateOne(filter, update);
    filter = await client.db("konoha").collection("users").findOne({uname : verify.uname});
    update = {$pull : {followers : req.params.name}};
    result = await client.db("konoha").collection("users").updateOne(filter, update);
    // console.log(result);
    res.json(result);
    }
})

// unfollow a person with uname 'name'
app.delete('/unfollow/:name', async(req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    const options = {
        projection : {_id : 0, password : 0, email : 0, uname : 0}
    }
    filter = await client.db("konoha").collection("users").findOne({uname : req.params.name});
    update = {$pull : {followers : verify.uname}};
    result = await client.db("konoha").collection("users").updateOne(filter, update);
    filter = await client.db("konoha").collection("users").findOne({uname : verify.uname});
    update = {$pull : {following : req.params.name}};
    result = await client.db("konoha").collection("users").updateOne(filter, update);
    console.log(result);
    res.json(result);
    }
})

// follow a person with uname 'name'
app.put('/follow/:name', async(req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    const options = {
        projection : {_id : 0, password : 0, email : 0, uname : 0}
    }
    filter = await client.db("konoha").collection("users").findOne({uname : req.params.name});
    console.log(result)
    update = {$push : {followers : verify.uname}};
    result = await client.db("konoha").collection("users").updateOne(filter, update);
    filter = await client.db("konoha").collection("users").findOne({uname : verify.uname});
    update = {$push : {following : req.params.name}};
    result = await client.db("konoha").collection("users").updateOne(filter, update);
    console.log(result);
    res.json(result);
    }
})

app.get('/user/:name', async(req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    const options = {
        projection : {_id : 0, password : 0, email : 0, uname : 0}
    }
    result = await client.db("konoha").collection("users").findOne({uname : req.params.name}, options);
    res.json(result);
    }
})

// get the details of the user who requested the resource
app.get('/user', async(req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
    let result = await client.connect();
    const options = {
        projection : {_id : 0, password : 0, email : 0, uname : 0}
    }
    result = await client.db("konoha").collection("users").findOne({uname : verify.uname}, options);
    res.json(result);
    }
})


app.put('/user', async(req, res) => {
    var verify = await verifyToken(req.headers['authorization']);
    if(!verify.valid){
        res.send("Invalid Token")
    }
    else{
        console.log(req.body);
    let connect = await client.connect();
    const options = {
        projection : {_id : 0, password : 0, email : 0, uname : 0}
    }
    let filter = await client.db("konoha").collection("users").findOne({uname : verify.uname}, options);
    const update = {$set : req.body};
    const updateUser = await client.db("konoha").collection("users").updateOne(filter, update);
    console.log(updateUser);
    if(updateUser){
        res.json({update : true});
    }
    else{
        res.json({update : false});
    }
    }
})


app.post('/register', async (req, res) => {
    console.log("hi");
    let result = await client.connect();
    var uobj = req.body;
    const hash = await bcrypt.hash(uobj.password, saltRounds)
    uobj.password = hash
    uobj.followers = []
    uobj.following = []
    result = await client.db("konoha").collection("users").insertOne(uobj);
    console.log(result);
    const token = jwt.sign({username : uobj.uname}, secretKey)
    var obj = {allow : 1, "token" : token};
    res.json(obj);
})

app.post('/login', async (req, res) => {
    var uobj = req.body;
    let result = await client.connect();
    var storedUname = await client.db("konoha").collection("users").findOne({uname : uobj.uname});
    console.log(storedUname);
    result = await bcrypt.compare(uobj.password, storedUname.password);
    console.log(result);
    var allow = false;
    let token = null;
    if(result){
        allow = true;
        token = jwt.sign({username : uobj.uname}, secretKey)
    }
    console.log(token);
    var obj = {"allow" : allow, "token" : token};
    res.json(obj);
})

app.listen(5000, () => {
    console.log("server has started")
})
// Create a new MongoClient
async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Establish and verify connection
    console.log("after connect");
    const db = client.db("konoha");
    const result = await client.db("konoha").collection("users").createIndex({"uname" : 1});
    // const result = await collection.findMany();
    // const databases = await client.db('admin').command({ listDatabases: 1 });
    // console.log(result);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
